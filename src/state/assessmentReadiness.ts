/**
 * V1BU — Assessment Readiness Spine.
 *
 * Pure deterministic projection from WorkbenchContextSummary into a
 * cross-workbench operator readiness model. Surfaces overall readiness,
 * per-source sub-states, next actions, and blocker reason codes.
 *
 * Hard discipline:
 *   - Inputs are WorkbenchContextSummary only.
 *   - Output is counts/labels/reason-codes only — no raw configs, no raw
 *     evidence, no markdown bodies, no command output, no credentials,
 *     no secrets, no evidence_set_id.
 *   - Deterministic: same summary → same readiness.
 *   - No I/O, no fetch, no mutation.
 *   - Does NOT execute assessments, does NOT decide to run anything; it
 *     only describes what the operator can do next.
 */

import type { WorkbenchContextSummary } from "./workbenchContextSummary";

export type ReadinessState = "empty" | "partial" | "ready" | "blocked";

export type DiscoveryReadiness =
  | "no_seeds"
  | "seeds_only"
  | "preview_built";

export type TopologyReadiness =
  | "no_topology"
  | "nodes_only"
  | "nodes_and_edges";

export type EvidenceReadiness =
  | "no_evidence"
  | "imports_attempted"
  | "evidence_available";

export type IntakeReadiness =
  | "no_parses"
  | "parsing_active"
  | "intake_failed"
  | "devices_parsed";

export type AssessReadiness =
  | "no_context"
  | "context_partial"
  | "context_ready"
  | "blocked";

export type ReadinessNextAction =
  | "stage_seeds"
  | "build_crawl_preview"
  | "import_evidence"
  | "parse_configs"
  | "review_topology"
  | "configure_assess_profile"
  | "ready_for_assess_preflight";

export type ReadinessReasonCode =
  | "no_signals"
  | "evidence_rejected_majority"
  | "intake_failed"
  | "no_topology_after_evidence";

export interface AssessmentReadiness {
  readonly overall_state: ReadinessState;
  readonly discovery_state: DiscoveryReadiness;
  readonly topology_state: TopologyReadiness;
  readonly evidence_state: EvidenceReadiness;
  readonly intake_state: IntakeReadiness;
  readonly assess_state: AssessReadiness;
  readonly missing_inputs: readonly string[];
  readonly available_inputs: readonly string[];
  readonly next_actions: readonly ReadinessNextAction[];
  readonly blocker_reason_codes: readonly ReadinessReasonCode[];
}

export const EMPTY_ASSESSMENT_READINESS: AssessmentReadiness = {
  overall_state: "empty",
  discovery_state: "no_seeds",
  topology_state: "no_topology",
  evidence_state: "no_evidence",
  intake_state: "no_parses",
  assess_state: "no_context",
  missing_inputs: ["discovery_seeds", "topology", "evidence", "intake"],
  available_inputs: [],
  next_actions: ["stage_seeds"],
  blocker_reason_codes: ["no_signals"],
};

function deriveDiscovery(summary: WorkbenchContextSummary): DiscoveryReadiness {
  if (summary.crawl_preview.frontier_count > 0) return "preview_built";
  if (summary.discovery.seed_count > 0) return "seeds_only";
  return "no_seeds";
}

function deriveTopology(summary: WorkbenchContextSummary): TopologyReadiness {
  const n = summary.topology.node_count;
  const e = summary.topology.edge_count;
  if (n > 0 && e > 0) return "nodes_and_edges";
  if (n > 0) return "nodes_only";
  return "no_topology";
}

function deriveEvidence(summary: WorkbenchContextSummary): EvidenceReadiness {
  if (summary.evidence_import.accepted_evidence_total > 0) return "evidence_available";
  if (summary.evidence_import.attempted_import_count > 0) return "imports_attempted";
  return "no_evidence";
}

function deriveIntake(summary: WorkbenchContextSummary): IntakeReadiness {
  if (summary.intake.parse_status === "failed") return "intake_failed";
  if (summary.intake.parsed_device_count > 0) return "devices_parsed";
  if (summary.intake.parse_status === "parsing") return "parsing_active";
  return "no_parses";
}

function hasAnySignal(
  d: DiscoveryReadiness,
  t: TopologyReadiness,
  e: EvidenceReadiness,
  i: IntakeReadiness,
): boolean {
  return (
    d !== "no_seeds" || t !== "no_topology" || e !== "no_evidence" || i === "devices_parsed"
  );
}

function deriveBlockers(
  summary: WorkbenchContextSummary,
  d: DiscoveryReadiness,
  t: TopologyReadiness,
  e: EvidenceReadiness,
  i: IntakeReadiness,
): readonly ReadinessReasonCode[] {
  const codes: ReadinessReasonCode[] = [];
  if (!hasAnySignal(d, t, e, i)) codes.push("no_signals");
  // Evidence rejected majority: rejected > accepted AND attempted > 0.
  if (
    summary.evidence_import.attempted_import_count > 0 &&
    summary.evidence_import.rejected_evidence_total >
      summary.evidence_import.accepted_evidence_total
  ) {
    codes.push("evidence_rejected_majority");
  }
  if (i === "intake_failed") codes.push("intake_failed");
  // Evidence imports happened but topology still empty — likely a wiring/projection gap.
  if (e === "evidence_available" && t === "no_topology") {
    codes.push("no_topology_after_evidence");
  }
  return codes;
}

function deriveAvailable(
  d: DiscoveryReadiness,
  t: TopologyReadiness,
  e: EvidenceReadiness,
  i: IntakeReadiness,
): readonly string[] {
  const out: string[] = [];
  if (d !== "no_seeds") out.push("discovery_seeds");
  if (d === "preview_built") out.push("crawl_preview");
  if (t !== "no_topology") out.push("topology");
  if (e === "evidence_available") out.push("evidence");
  if (i === "devices_parsed") out.push("intake");
  return out;
}

function deriveMissing(available: readonly string[]): readonly string[] {
  const all: readonly string[] = [
    "discovery_seeds",
    "topology",
    "evidence",
    "intake",
  ];
  return all.filter((k) => !available.includes(k));
}

function deriveNextActions(
  d: DiscoveryReadiness,
  t: TopologyReadiness,
  e: EvidenceReadiness,
  i: IntakeReadiness,
  overall: ReadinessState,
): readonly ReadinessNextAction[] {
  if (overall === "ready") {
    return ["configure_assess_profile", "ready_for_assess_preflight"];
  }
  const out: ReadinessNextAction[] = [];
  if (d === "no_seeds") out.push("stage_seeds");
  if (d === "seeds_only") out.push("build_crawl_preview");
  if (e === "no_evidence" && t === "no_topology") out.push("import_evidence");
  if (i === "no_parses") out.push("parse_configs");
  if (t === "nodes_only" || t === "nodes_and_edges") out.push("review_topology");
  // Cap to first 3 honestly — operators read top-of-list.
  return out.slice(0, 3);
}

function deriveAssessState(
  overall: ReadinessState,
): AssessReadiness {
  switch (overall) {
    case "empty":
      return "no_context";
    case "partial":
      return "context_partial";
    case "ready":
      return "context_ready";
    case "blocked":
      return "blocked";
  }
}

function deriveOverall(
  available: readonly string[],
  blockers: readonly ReadinessReasonCode[],
): ReadinessState {
  // Hard-blocker rules: intake_failed alone is not overall-blocking unless
  // it's the only signal. evidence_rejected_majority is informational. We
  // only declare overall "blocked" when blockers exist AND no constructive
  // signal exists to act on.
  if (available.length === 0) {
    return blockers.length > 0 && !blockers.includes("no_signals")
      ? "blocked"
      : "empty";
  }
  // "ready" requires at least two distinct source categories with signal
  // OR (topology AND evidence) which is the assess-preflight minimum.
  const hasTopology = available.includes("topology");
  const hasEvidence = available.includes("evidence");
  const hasIntake = available.includes("intake");
  const categoryCount =
    (available.includes("discovery_seeds") || available.includes("crawl_preview") ? 1 : 0) +
    (hasTopology ? 1 : 0) +
    (hasEvidence ? 1 : 0) +
    (hasIntake ? 1 : 0);
  if ((hasTopology && hasEvidence) || categoryCount >= 3) {
    return "ready";
  }
  return "partial";
}

export function buildAssessmentReadiness(
  summary: WorkbenchContextSummary,
): AssessmentReadiness {
  const discovery_state = deriveDiscovery(summary);
  const topology_state = deriveTopology(summary);
  const evidence_state = deriveEvidence(summary);
  const intake_state = deriveIntake(summary);

  const available_inputs = deriveAvailable(
    discovery_state,
    topology_state,
    evidence_state,
    intake_state,
  );
  const missing_inputs = deriveMissing(available_inputs);
  const blocker_reason_codes = deriveBlockers(
    summary,
    discovery_state,
    topology_state,
    evidence_state,
    intake_state,
  );
  const overall_state = deriveOverall(available_inputs, blocker_reason_codes);
  const assess_state = deriveAssessState(overall_state);
  const next_actions = deriveNextActions(
    discovery_state,
    topology_state,
    evidence_state,
    intake_state,
    overall_state,
  );

  return {
    overall_state,
    discovery_state,
    topology_state,
    evidence_state,
    intake_state,
    assess_state,
    missing_inputs,
    available_inputs,
    next_actions,
    blocker_reason_codes,
  };
}
