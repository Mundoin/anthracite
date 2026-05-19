/**
 * V1BE — SSH Field Validation Pack.
 *
 * Pure deterministic builder that summarises the current Discovery→SSH
 * Capture→Server-Key Trust→Evidence Handoff→Import state into an
 * operator-facing checklist and recommended next action.
 *
 * Sanitization invariants:
 *   - Never includes raw stdout / stderr bytes.
 *   - Never includes credential material (password, key, passphrase).
 *   - Only operator-provided and computed summary fields.
 *
 * Determinism: same input → identical output (no Date, no random).
 */

import type {
  DiscoveryRunReport,
  DiscoveryTarget,
  ServerKeyObservation,
  ServerKeyPin,
  ServerKeyPinStatus,
} from "../../types/discoveryRunner";
import type { FieldReceiptImportSummary } from "./sshFieldReceipt";
import type { EvidenceHandoffPlan } from "./sshEvidenceHandoff";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValidationPackNextAction =
  | "run_ssh_capture"
  | "fix_reachability"
  | "fix_auth"
  | "investigate_key_change"
  | "pin_server_key"
  | "review_command_coverage"
  | "import_evidence"
  | "inspect_import_error"
  | "review_topology";

export const NEXT_ACTION_DETAILS: Record<ValidationPackNextAction, string> = {
  run_ssh_capture:
    "No run attempted yet. Run SSH capture to begin.",
  fix_reachability:
    "Connection could not be established. Check host reachability, port, and firewall.",
  fix_auth:
    "Authentication failed. Check username and credentials.",
  investigate_key_change:
    "Server key fingerprint differs from stored pin. Investigate host identity before importing or trusting evidence.",
  pin_server_key:
    "No pin stored for this host:port. Pin the observed key before trusting repeated runs.",
  review_command_coverage:
    "SSH capture succeeded but no importable evidence candidates found. Review command/platform coverage.",
  import_evidence:
    "Importable evidence candidates found. Select and import LLDP/CDP evidence.",
  inspect_import_error:
    "Import attempted but failed. Inspect the import error and source command.",
  review_topology:
    "Import succeeded. Open topology evidence / graph to review findings.",
};

export interface SshFieldValidationPackInput {
  readonly target: DiscoveryTarget;
  readonly report: DiscoveryRunReport | null;
  readonly serverKeyPin: ServerKeyPin | null;
  readonly handoff: EvidenceHandoffPlan | null;
  readonly imports: ReadonlyArray<FieldReceiptImportSummary>;
}

export interface SshFieldValidationPack {
  /** "host:port (label)" */
  readonly target_identity: string;
  readonly platform_hint: string;
  readonly planned_command_count: number | null;
  /** outcome.kind or null if no run */
  readonly run_outcome: string | null;
  readonly server_key_observed: boolean;
  readonly server_key_algorithm: string | null;
  readonly server_key_fingerprint: string | null;
  readonly server_key_pin_status: ServerKeyPinStatus | null;
  /** True when a server key was observed and pin_status is "unpinned" or "changed". */
  readonly pin_action_available: boolean;
  /** True when pin_status is "matched". */
  readonly pin_already_completed: boolean;
  readonly importable_candidate_count: number;
  readonly not_importable_candidate_count: number;
  readonly import_attempt_count: number;
  readonly import_success_count: number;
  readonly import_failure_count: number;
  readonly next_action: ValidationPackNextAction;
  readonly next_action_detail: string;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function computePinStatus(
  obs: ServerKeyObservation | null | undefined,
  pin: ServerKeyPin | null,
): ServerKeyPinStatus | null {
  if (!obs) return null;
  if (!pin) return "unpinned";
  if (
    pin.fingerprint_sha256 === obs.fingerprint_sha256 &&
    pin.algorithm === obs.algorithm
  ) {
    return "matched";
  }
  return "changed";
}

function resolveNextAction(
  report: DiscoveryRunReport | null,
  pinStatus: ServerKeyPinStatus | null,
  importableCount: number,
  importSuccessCount: number,
  importFailureCount: number,
): ValidationPackNextAction {
  if (report === null) return "run_ssh_capture";

  const kind = report.outcome.kind;

  if (kind === "transport_deferred") return "run_ssh_capture";
  if (kind === "connection_failed" || kind === "refused") return "fix_reachability";
  if (kind === "timeout") return "fix_reachability";

  // Key change is highest trust-safety concern — surface before auth.
  if (pinStatus === "changed") return "investigate_key_change";

  if (kind === "auth_failed") return "fix_auth";

  // After auth issues, prompt pinning before evidence work.
  if (pinStatus === "unpinned") return "pin_server_key";

  // Evidence work — applies to captured and command_failed (partial results).
  if (kind === "captured" || kind === "command_failed") {
    if (importSuccessCount > 0 && importFailureCount > 0) return "inspect_import_error";
    if (importSuccessCount > 0) return "review_topology";
    if (importFailureCount > 0) return "inspect_import_error";
    if (importableCount > 0) return "import_evidence";
    return "review_command_coverage";
  }

  return "run_ssh_capture";
}

export function buildSshFieldValidationPack(
  input: SshFieldValidationPackInput,
): SshFieldValidationPack {
  const { target, report, serverKeyPin, handoff, imports } = input;

  const target_identity = `${target.host}:${target.port} (${target.data_source_label})`;
  const planned_command_count = report?.planned_command_count ?? null;
  const run_outcome = report?.outcome.kind ?? null;

  const obs = report?.server_key ?? null;
  const server_key_observed = obs != null;
  const server_key_algorithm = obs?.algorithm ?? null;
  const server_key_fingerprint = obs?.fingerprint_sha256 ?? null;
  const server_key_pin_status = computePinStatus(obs, serverKeyPin);

  const pin_action_available =
    server_key_pin_status === "unpinned" || server_key_pin_status === "changed";
  const pin_already_completed = server_key_pin_status === "matched";

  const importable_candidate_count = handoff?.importable_count ?? 0;
  const not_importable_candidate_count = handoff?.not_importable_count ?? 0;
  const import_attempt_count = imports.length;
  const import_success_count = imports.filter((i) => i.status === "done").length;
  const import_failure_count = imports.filter((i) => i.status === "failed").length;

  const next_action = resolveNextAction(
    report,
    server_key_pin_status,
    importable_candidate_count,
    import_success_count,
    import_failure_count,
  );

  return Object.freeze({
    target_identity,
    platform_hint: target.platform_hint,
    planned_command_count,
    run_outcome,
    server_key_observed,
    server_key_algorithm,
    server_key_fingerprint,
    server_key_pin_status,
    pin_action_available,
    pin_already_completed,
    importable_candidate_count,
    not_importable_candidate_count,
    import_attempt_count,
    import_success_count,
    import_failure_count,
    next_action,
    next_action_detail: NEXT_ACTION_DETAILS[next_action],
  });
}

// ---------------------------------------------------------------------------
// Markdown serializer
// ---------------------------------------------------------------------------

export function toValidationPackMarkdown(pack: SshFieldValidationPack): string {
  const lines: string[] = [];
  lines.push("# SSH Field Validation Pack");
  lines.push("");
  lines.push(`- **Target**: ${pack.target_identity}`);
  lines.push(`- **Platform hint**: ${pack.platform_hint}`);
  lines.push(
    `- **Planned commands**: ${pack.planned_command_count !== null ? pack.planned_command_count : "—"}`,
  );
  lines.push("");
  lines.push("## Run outcome");
  lines.push("");
  lines.push(`- **Outcome**: \`${pack.run_outcome ?? "no run"}\``);
  lines.push("");
  lines.push("## Server key");
  lines.push("");
  lines.push(`- **Observed**: ${pack.server_key_observed ? "yes" : "no"}`);
  if (pack.server_key_observed) {
    lines.push(`- **Algorithm**: \`${pack.server_key_algorithm}\``);
    lines.push(`- **Fingerprint (SHA256)**: \`${pack.server_key_fingerprint}\``);
    lines.push(`- **Pin status**: \`${pack.server_key_pin_status}\``);
    lines.push(`- **Pin action available**: ${pack.pin_action_available ? "yes" : "no"}`);
    lines.push(`- **Pin already completed**: ${pack.pin_already_completed ? "yes" : "no"}`);
  }
  lines.push("");
  lines.push("## Evidence");
  lines.push("");
  lines.push(`- **Importable candidates**: ${pack.importable_candidate_count}`);
  lines.push(`- **Not importable**: ${pack.not_importable_candidate_count}`);
  lines.push(`- **Import attempts**: ${pack.import_attempt_count}`);
  lines.push(`- **Import successes**: ${pack.import_success_count}`);
  lines.push(`- **Import failures**: ${pack.import_failure_count}`);
  lines.push("");
  lines.push("## Recommended next action");
  lines.push("");
  lines.push(`**${pack.next_action}**: ${pack.next_action_detail}`);
  lines.push("");
  return lines.join("\n");
}
