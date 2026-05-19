/**
 * V1BB — SSH Field Smoke Receipt.
 *
 * Pure deterministic builder + serializers for a sanitized receipt of
 * one Discovery → SSH Capture → Evidence Handoff flow. The receipt
 * lets the operator copy / paste / archive the truth of a real-device
 * smoke run without relying on screenshots or memory.
 *
 * Sanitization invariants (asserted by tests):
 *   - Receipt NEVER contains credential bytes (password, key, passphrase).
 *   - Receipt NEVER contains raw stdout / stderr text. Only byte counts,
 *     exit code, duration, and truncation flags.
 *   - All host-level fields (host, port, username, platform, label) are
 *     operator-provided and therefore safe to surface verbatim — they
 *     are already product-visible in DiscoveryMode.
 *
 * Determinism: same input → identical JSON / Markdown output. The
 * `generated_at` ISO 8601 timestamp is injected by the caller so tests
 * pin it.
 *
 * Doctrine: `docs/architecture/SSH_EVIDENCE_HANDOFF_V1.md` (V1BA) +
 * V1BB stage note.
 */

import type {
  DiscoveryRunOutcome,
  DiscoveryRunReport,
  DiscoveryTarget,
  ServerKeyObservation,
  ServerKeyTrustMode,
} from "../../types/discoveryRunner";
import type { RawNeighborEvidenceImportResult } from "../../types/topology";
import type {
  EvidenceHandoffCandidate,
  EvidenceHandoffPlan,
} from "./sshEvidenceHandoff";

export const FIELD_RECEIPT_SCHEMA_VERSION = 1;

export type FieldReceiptOutcomeKind = DiscoveryRunOutcome["kind"];

export interface FieldReceiptTarget {
  readonly label: string;
  readonly host: string;
  readonly port: number;
  readonly platform_hint: string;
  readonly username: string;
  readonly transport: "ssh";
}

export interface FieldReceiptCommandSummary {
  readonly command: string;
  readonly exit_code: number | null;
  readonly duration_ms: number;
  readonly stdout_byte_length: number;
  readonly stderr_byte_length: number;
  readonly output_truncated: boolean;
}

export interface FieldReceiptOutcomeSummary {
  readonly kind: FieldReceiptOutcomeKind;
  /** Per-kind redacted reason or stage label, when applicable. */
  readonly detail: string | null;
  /** True iff the SSH run produced any command results (success or
   *  partial command_failed). */
  readonly has_command_results: boolean;
}

export interface FieldReceiptHandoffCandidateSummary {
  readonly command: string;
  readonly source_kind: string;
  readonly importable: boolean;
  readonly reason: string | null;
  readonly source_label: string;
}

export interface FieldReceiptHandoffSummary {
  readonly importable_count: number;
  readonly not_importable_count: number;
  readonly candidates: ReadonlyArray<FieldReceiptHandoffCandidateSummary>;
}

export type FieldReceiptImportStatus = "done" | "failed";

export interface FieldReceiptImportSummary {
  readonly command: string;
  readonly status: FieldReceiptImportStatus;
  readonly accepted_evidence_count: number | null;
  readonly rejected_count: number | null;
  readonly stored_evidence_count: number | null;
  readonly evidence_set_id: string | null;
  readonly failure_reason: string | null;
}

/**
 * V1BC: sanitized server-key trust summary lifted from
 * `DiscoveryRunReport.server_key`. `observed: false` when no host key
 * was seen during the attempt (refused, pre-handshake failure, planner-
 * only path). The fingerprint is the OpenSSH-style
 * `SHA256:<base64-nopad>` form and contains no credential material.
 */
export type FieldReceiptServerKeyTrust =
  | {
      readonly observed: false;
      readonly note: string;
    }
  | {
      readonly observed: true;
      readonly algorithm: string;
      readonly fingerprint_sha256: string;
      readonly trust_mode: ServerKeyTrustMode;
      /** Honest one-liner stating the current persistence boundary. */
      readonly persistence_note: string;
    };

export interface FieldReceiptRedaction {
  readonly applied: true;
  readonly fields_omitted: ReadonlyArray<
    | "command_stdout"
    | "command_stderr"
    | "password"
    | "private_key_pem"
    | "passphrase"
  >;
}

export interface FieldReceipt {
  readonly schema_version: number;
  readonly generated_at: string; // ISO 8601 from caller; tests pin this
  readonly target: FieldReceiptTarget;
  readonly approved_commands: ReadonlyArray<string>;
  readonly outcome: FieldReceiptOutcomeSummary;
  readonly command_summaries: ReadonlyArray<FieldReceiptCommandSummary>;
  readonly server_key_trust: FieldReceiptServerKeyTrust;
  readonly handoff: FieldReceiptHandoffSummary;
  readonly imports: ReadonlyArray<FieldReceiptImportSummary>;
  readonly redaction: FieldReceiptRedaction;
}

const TOFU_SESSION_NOTE =
  "TOFU session only. Fingerprint observed for this attempt; not persisted.";

const NO_KEY_OBSERVED_NOTE =
  "No server key observed for this attempt (transport stopped before handshake or planner-only).";

const OMITTED_FIELDS: FieldReceiptRedaction["fields_omitted"] = Object.freeze([
  "command_stdout",
  "command_stderr",
  "password",
  "private_key_pem",
  "passphrase",
]);

export interface BuildFieldReceiptInput {
  readonly target: DiscoveryTarget;
  readonly approved_commands: ReadonlyArray<string>;
  readonly report: DiscoveryRunReport | null;
  readonly handoff: EvidenceHandoffPlan | null;
  readonly imports: ReadonlyArray<FieldReceiptImportSummary>;
  /** ISO 8601 timestamp. Caller controls so tests can pin it. */
  readonly generated_at: string;
}

/**
 * Build a deterministic sanitized receipt from the live DiscoveryMode
 * state. The receipt is safe to copy into a chat / ticket / PR body.
 */
export function buildFieldReceipt(input: BuildFieldReceiptInput): FieldReceipt {
  const target: FieldReceiptTarget = {
    label: input.target.data_source_label,
    host: input.target.host,
    port: input.target.port,
    platform_hint: input.target.platform_hint,
    username: input.target.username,
    transport: "ssh",
  };

  const outcome = summariseOutcome(input.report?.outcome ?? null);
  const command_summaries = summariseCommands(input.report?.outcome ?? null);
  const handoff = summariseHandoff(input.handoff);
  const server_key_trust = summariseServerKeyTrust(input.report?.server_key ?? null);

  return Object.freeze({
    schema_version: FIELD_RECEIPT_SCHEMA_VERSION,
    generated_at: input.generated_at,
    target,
    approved_commands: Object.freeze([...input.approved_commands]),
    outcome,
    command_summaries: Object.freeze(command_summaries),
    server_key_trust,
    handoff,
    imports: Object.freeze([...input.imports]),
    redaction: { applied: true as const, fields_omitted: OMITTED_FIELDS },
  });
}

function summariseServerKeyTrust(
  observation: ServerKeyObservation | null | undefined,
): FieldReceiptServerKeyTrust {
  if (!observation) {
    return { observed: false, note: NO_KEY_OBSERVED_NOTE };
  }
  return {
    observed: true,
    algorithm: observation.algorithm,
    fingerprint_sha256: observation.fingerprint_sha256,
    trust_mode: observation.trust_mode,
    persistence_note: TOFU_SESSION_NOTE,
  };
}

function summariseOutcome(
  outcome: DiscoveryRunOutcome | null,
): FieldReceiptOutcomeSummary {
  if (outcome === null) {
    return { kind: "transport_deferred", detail: null, has_command_results: false };
  }
  switch (outcome.kind) {
    case "captured":
      return {
        kind: "captured",
        detail: null,
        has_command_results: outcome.command_results.length > 0,
      };
    case "auth_failed":
    case "connection_failed":
      return {
        kind: outcome.kind,
        detail: outcome.reason_redacted,
        has_command_results: false,
      };
    case "timeout":
      return {
        kind: "timeout",
        detail: `stage:${outcome.stage}`,
        has_command_results: false,
      };
    case "command_failed":
      return {
        kind: "command_failed",
        detail: outcome.reason_redacted,
        has_command_results: outcome.partial_results.length > 0,
      };
    case "transport_deferred":
    case "refused":
      return { kind: outcome.kind, detail: outcome.reason, has_command_results: false };
  }
}

function summariseCommands(
  outcome: DiscoveryRunOutcome | null,
): FieldReceiptCommandSummary[] {
  if (outcome === null) return [];
  if (outcome.kind === "captured") return outcome.command_results.map(toCommandSummary);
  if (outcome.kind === "command_failed")
    return outcome.partial_results.map(toCommandSummary);
  return [];
}

function toCommandSummary(cr: {
  readonly command: string;
  readonly exit_code: number | null;
  readonly duration_ms: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly output_truncated: boolean;
}): FieldReceiptCommandSummary {
  return {
    command: cr.command,
    exit_code: cr.exit_code,
    duration_ms: cr.duration_ms,
    // Byte length only — never the bytes themselves.
    stdout_byte_length: byteLength(cr.stdout),
    stderr_byte_length: byteLength(cr.stderr),
    output_truncated: cr.output_truncated,
  };
}

function byteLength(s: string): number {
  // Length in UTF-16 code units is sufficient for the receipt summary;
  // exact UTF-8 byte counts are not needed for ranking decisions, and
  // jsdom's TextEncoder availability varies. Length is deterministic
  // and never includes the bytes themselves.
  return s.length;
}

function summariseHandoff(
  plan: EvidenceHandoffPlan | null,
): FieldReceiptHandoffSummary {
  if (plan === null) {
    return { importable_count: 0, not_importable_count: 0, candidates: [] };
  }
  return {
    importable_count: plan.importable_count,
    not_importable_count: plan.not_importable_count,
    candidates: plan.candidates.map(toHandoffCandidateSummary),
  };
}

function toHandoffCandidateSummary(
  c: EvidenceHandoffCandidate,
): FieldReceiptHandoffCandidateSummary {
  return {
    command: c.command,
    source_kind: c.source_kind,
    importable: c.importable,
    reason: c.reason,
    source_label: c.source_label,
  };
}

/**
 * Build an `ImportSummary` row from a successful import API result.
 */
export function importDoneSummary(
  command: string,
  result: RawNeighborEvidenceImportResult,
): FieldReceiptImportSummary {
  return {
    command,
    status: "done",
    accepted_evidence_count: result.accepted_evidence_count,
    rejected_count: result.rejected_count,
    stored_evidence_count: result.stored_evidence_count,
    evidence_set_id: result.evidence_set_id,
    failure_reason: null,
  };
}

/**
 * Build an `ImportSummary` row from a failed import attempt.
 */
export function importFailedSummary(
  command: string,
  reason: string,
): FieldReceiptImportSummary {
  return {
    command,
    status: "failed",
    accepted_evidence_count: null,
    rejected_count: null,
    stored_evidence_count: null,
    evidence_set_id: null,
    failure_reason: reason,
  };
}

/**
 * Deterministic JSON serializer. Stable key order is React-friendly
 * (no Map ordering) because the field order is fixed in TS interfaces
 * and `JSON.stringify` follows insertion order. Two-space indent so a
 * pasted receipt is readable.
 */
export function toReceiptJSON(receipt: FieldReceipt): string {
  return JSON.stringify(receipt, null, 2);
}

/**
 * Deterministic Markdown serializer. Suitable for pasting into a
 * ticket or chat message. Stays sanitized — no raw output.
 */
export function toReceiptMarkdown(receipt: FieldReceipt): string {
  const lines: string[] = [];
  lines.push(`# SSH Field Smoke Receipt`);
  lines.push("");
  lines.push(`- **Schema version**: ${receipt.schema_version}`);
  lines.push(`- **Generated at**: ${receipt.generated_at}`);
  lines.push(`- **Outcome**: \`${receipt.outcome.kind}\``);
  if (receipt.outcome.detail !== null) {
    lines.push(`- **Outcome detail**: ${receipt.outcome.detail}`);
  }
  lines.push("");
  lines.push(`## Target`);
  lines.push("");
  lines.push(`- **Label**: ${receipt.target.label}`);
  lines.push(`- **Host**: ${receipt.target.host}`);
  lines.push(`- **Port**: ${receipt.target.port}`);
  lines.push(`- **Username**: ${receipt.target.username}`);
  lines.push(`- **Platform hint**: ${receipt.target.platform_hint}`);
  lines.push(`- **Transport**: ${receipt.target.transport}`);
  lines.push("");
  lines.push(`## Approved commands`);
  lines.push("");
  if (receipt.approved_commands.length === 0) {
    lines.push("_(none)_");
  } else {
    for (const c of receipt.approved_commands) {
      lines.push(`- \`${c}\``);
    }
  }
  lines.push("");
  lines.push(`## Command results`);
  lines.push("");
  if (receipt.command_summaries.length === 0) {
    lines.push("_(none)_");
  } else {
    lines.push("| command | exit | duration_ms | stdout_bytes | stderr_bytes | truncated |");
    lines.push("|---------|------|-------------|--------------|--------------|-----------|");
    for (const cs of receipt.command_summaries) {
      lines.push(
        `| \`${cs.command}\` | ${cs.exit_code ?? "?"} | ${cs.duration_ms} | ${cs.stdout_byte_length} | ${cs.stderr_byte_length} | ${cs.output_truncated ? "yes" : "no"} |`,
      );
    }
  }
  lines.push("");
  lines.push(`## Server key trust`);
  lines.push("");
  if (receipt.server_key_trust.observed) {
    lines.push(`- **Observed**: yes`);
    lines.push(`- **Algorithm**: \`${receipt.server_key_trust.algorithm}\``);
    lines.push(
      `- **Fingerprint (SHA256)**: \`${receipt.server_key_trust.fingerprint_sha256}\``,
    );
    lines.push(`- **Trust mode**: \`${receipt.server_key_trust.trust_mode}\``);
    lines.push(`- **Note**: ${receipt.server_key_trust.persistence_note}`);
  } else {
    lines.push(`- **Observed**: no`);
    lines.push(`- **Note**: ${receipt.server_key_trust.note}`);
  }
  lines.push("");
  lines.push(`## Evidence handoff`);
  lines.push("");
  lines.push(
    `- Importable: ${receipt.handoff.importable_count} · Not importable: ${receipt.handoff.not_importable_count}`,
  );
  if (receipt.handoff.candidates.length > 0) {
    lines.push("");
    lines.push("| command | source_kind | importable | reason | source_label |");
    lines.push("|---------|-------------|------------|--------|--------------|");
    for (const c of receipt.handoff.candidates) {
      lines.push(
        `| \`${c.command}\` | ${c.source_kind} | ${c.importable ? "yes" : "no"} | ${c.reason ?? ""} | \`${c.source_label}\` |`,
      );
    }
  }
  lines.push("");
  lines.push(`## Imports`);
  lines.push("");
  if (receipt.imports.length === 0) {
    lines.push("_(no operator import attempts recorded)_");
  } else {
    lines.push(
      "| command | status | accepted | rejected | stored | evidence_set_id | failure_reason |",
    );
    lines.push(
      "|---------|--------|----------|----------|--------|-----------------|----------------|",
    );
    for (const imp of receipt.imports) {
      lines.push(
        `| \`${imp.command}\` | ${imp.status} | ${imp.accepted_evidence_count ?? ""} | ${imp.rejected_count ?? ""} | ${imp.stored_evidence_count ?? ""} | ${imp.evidence_set_id ?? ""} | ${imp.failure_reason ?? ""} |`,
      );
    }
  }
  lines.push("");
  lines.push(`## Redaction`);
  lines.push("");
  lines.push(`- **Applied**: ${receipt.redaction.applied}`);
  lines.push(
    `- **Fields omitted**: ${receipt.redaction.fields_omitted.join(", ")}`,
  );
  lines.push("");
  return lines.join("\n");
}
