/**
 * V1BA — SSH-to-evidence handoff adapter.
 *
 * Consumes a V1AZ `DiscoveryRunReport` whose outcome is `captured`
 * and produces a pure, deterministic list of import candidates
 * keyed off the V1AP/V1AQ raw-output import contract
 * (`RawNeighborEvidenceImportRequest`).
 *
 * Boundaries:
 *  - No I/O. No store mutation. No automatic import.
 *  - Captured output is RAW evidence — V1BA does not verify topology.
 *  - Importable candidates carry honest source_kind classification;
 *    unknown commands are surfaced as non-importable with a reason.
 *  - Credentials are not part of the V1AZ captured outcome and must
 *    not appear in any candidate field. We assert this in tests.
 *
 * Doctrine: `docs/architecture/SSH_EVIDENCE_HANDOFF_V1.md`.
 */

import type {
  CommandExecutionResult,
  DiscoveryRunReport,
  DiscoveryTarget,
} from "../../types/discoveryRunner";
import type {
  RawNeighborEvidenceImportRequest,
  RawNeighborSourceKind,
  TopologyEvidenceImportMode,
} from "../../types/topology";

export type EvidenceHandoffSourceKind = RawNeighborSourceKind | "unknown";

export type EvidenceHandoffNotImportableReason =
  | "non_neighbour_command"
  | "unrecognised_command"
  | "empty_output"
  | "command_failed_exit"
  | "stdout_only_safe";

/**
 * A single command's import candidate. Always derived from a
 * `CommandExecutionResult` in a `captured` outcome.
 */
export interface EvidenceHandoffCandidate {
  readonly command: string;
  readonly source_kind: EvidenceHandoffSourceKind;
  readonly importable: boolean;
  readonly reason: EvidenceHandoffNotImportableReason | null;
  /** Raw stdout to be imported. Empty string when not importable. */
  readonly raw_text: string;
  /** Stable label tracing this evidence back to live-ssh capture. */
  readonly source_label: string;
  /** Default platform hint passed through from the discovery target. */
  readonly platform_hint: string;
  /** Default local node label — caller may override before import. */
  readonly local_node_default: string;
  /** Exit code from the captured result, for operator inspection. */
  readonly exit_code: number | null;
  /** True when stdout was capped at the V1AZ output limit. */
  readonly output_truncated: boolean;
}

export interface EvidenceHandoffPlan {
  readonly target_label: string;
  readonly platform_hint: string;
  readonly candidates: ReadonlyArray<EvidenceHandoffCandidate>;
  readonly importable_count: number;
  readonly not_importable_count: number;
}

/**
 * Build the V1BA evidence handoff plan from a V1AZ captured outcome.
 * Returns an empty plan when the outcome is not `captured`. Caller
 * decides whether to render the handoff section based on emptiness.
 */
export function buildEvidenceHandoff(
  target: DiscoveryTarget,
  report: DiscoveryRunReport,
): EvidenceHandoffPlan {
  if (report.outcome.kind !== "captured") {
    return {
      target_label: target.data_source_label,
      platform_hint: target.platform_hint,
      candidates: [],
      importable_count: 0,
      not_importable_count: 0,
    };
  }
  const candidates = report.outcome.command_results.map((cr) =>
    classifyCommand(cr, target),
  );
  const importable_count = candidates.filter((c) => c.importable).length;
  return {
    target_label: target.data_source_label,
    platform_hint: target.platform_hint,
    candidates,
    importable_count,
    not_importable_count: candidates.length - importable_count,
  };
}

/**
 * Classify a single command result as importable / not importable.
 * Honest about scope: only LLDP and CDP neighbour output is
 * recognised by the V1AP/V1AQ raw importer today.
 */
function classifyCommand(
  cr: CommandExecutionResult,
  target: DiscoveryTarget,
): EvidenceHandoffCandidate {
  const sourceLabel = `live_ssh_captured:${target.data_source_label}:${cr.command}`;
  const localNodeDefault = target.data_source_label || target.host;
  const baseFields = {
    command: cr.command,
    raw_text: cr.stdout,
    source_label: sourceLabel,
    platform_hint: target.platform_hint,
    local_node_default: localNodeDefault,
    exit_code: cr.exit_code,
    output_truncated: cr.output_truncated,
  };

  if (cr.exit_code !== null && cr.exit_code !== 0) {
    return {
      ...baseFields,
      source_kind: "unknown",
      importable: false,
      reason: "command_failed_exit",
      raw_text: "",
    };
  }

  const sourceKind = matchNeighbourSourceKind(cr.command);
  if (sourceKind === "unknown") {
    if (looksLikeNonNeighbourShow(cr.command)) {
      return {
        ...baseFields,
        source_kind: "unknown",
        importable: false,
        reason: "non_neighbour_command",
        raw_text: "",
      };
    }
    return {
      ...baseFields,
      source_kind: "unknown",
      importable: false,
      reason: "unrecognised_command",
      raw_text: "",
    };
  }

  if (cr.stdout.trim().length === 0) {
    return {
      ...baseFields,
      source_kind: sourceKind,
      importable: false,
      reason: "empty_output",
      raw_text: "",
    };
  }

  return {
    ...baseFields,
    source_kind: sourceKind,
    importable: true,
    reason: null,
  };
}

/**
 * Deterministic substring match against the closed set of neighbour
 * commands the V1AP/V1AQ importer accepts today. Case-insensitive.
 */
function matchNeighbourSourceKind(command: string): EvidenceHandoffSourceKind {
  const c = command.toLowerCase().trim();
  // LLDP neighbour commands (vendor-agnostic forms covered by the V1AQ importer).
  // Match common vendor phrasings explicitly so accidental substring overlap
  // with non-neighbour commands stays out.
  if (
    c.includes("show lldp neighbor") ||
    c.includes("show lldp neighbour") ||
    c.includes("display lldp neighbor") ||
    c.includes("display lldp neighbour") ||
    c === "lldp neighbors" ||
    c === "lldp neighbours"
  ) {
    return "lldp";
  }
  // CDP neighbour commands (Cisco IOS-XE / NX-OS).
  if (c.includes("show cdp neighbor") || c.includes("show cdp neighbour")) {
    return "cdp";
  }
  return "unknown";
}

/**
 * Detect common "show but not a neighbour" commands so we can produce
 * the right non-importable reason for operator clarity.
 */
function looksLikeNonNeighbourShow(command: string): boolean {
  const c = command.toLowerCase().trim();
  return (
    c.startsWith("show version") ||
    c.startsWith("show interfaces") ||
    c.startsWith("show interface ") ||
    c.startsWith("show running") ||
    c.startsWith("show startup") ||
    c.startsWith("show ip route") ||
    c.startsWith("show ip interface") ||
    c.startsWith("show inventory") ||
    c.startsWith("show platform") ||
    c.startsWith("display version")
  );
}

/**
 * Build a `RawNeighborEvidenceImportRequest` from one candidate plus
 * operator overrides. Returns null when the candidate is not
 * importable — callers should pre-filter on the `importable` flag.
 */
export function buildImportRequest(
  candidate: EvidenceHandoffCandidate,
  environment_id: string,
  local_node_override: string | null,
  mode: TopologyEvidenceImportMode | null,
): RawNeighborEvidenceImportRequest | null {
  if (!candidate.importable || candidate.source_kind === "unknown") return null;
  const local_node = (local_node_override ?? candidate.local_node_default).trim();
  if (environment_id.trim().length === 0 || local_node.length === 0) return null;
  return {
    environment_id: environment_id.trim(),
    local_node,
    source_kind: candidate.source_kind,
    platform_hint: candidate.platform_hint,
    raw_text: candidate.raw_text,
    source_label: candidate.source_label,
    mode,
  };
}
