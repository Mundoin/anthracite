/**
 * V1CD — Environment Profile Spine.
 *
 * Pure deterministic projection of "where am I operating?" identity from
 * cross-workbench spines + topology construct + build intent workspace.
 *
 * Hard discipline:
 *   - Inputs are safe projections only.
 *   - Output is labels/counts/short-tokens only — no raw configs, no raw
 *     evidence, no markdown bodies, no command output, no credentials,
 *     no secrets, no evidence_set_id, no raw error messages.
 *   - Deterministic: same inputs → same profile.
 *   - No I/O, no fetch, no mutation, no persistence.
 *   - This is a projection, NOT environment storage / auth / inventory
 *     mutation. Limitations always declare as much.
 */

import type { WorkbenchContextSummary } from "./workbenchContextSummary";
import type { AssessmentReadiness } from "./assessmentReadiness";
import type { OperatorActivityLedger } from "./operatorActivityLedger";
import type { DiagnoseTriage } from "../modes/diagnose/diagnoseTriage";
import type { WorkbenchActionRouter } from "./workbenchActionRouter";
import type {
  TopologyConstruct,
  TopologyConstructDensity,
} from "../modes/topology/topologyConstructModel";
import type { BuildIntentWorkspace } from "../modes/build/buildIntentWorkspace";
import type { AssessmentPreflightSnapshot } from "../modes/assess/assessmentPreflightSnapshot";

export type EnvironmentProfileState =
  | "empty"
  | "partial"
  | "active"
  | "blocked";

export interface RiskSummary {
  readonly critical_count: number;
  readonly warning_count: number;
  readonly info_count: number;
  readonly primary_reason_code: string | null;
}

export interface EnvironmentProfile {
  readonly environment_id: string;
  readonly display_label: string;
  readonly profile_state: EnvironmentProfileState;
  readonly known_platform_count: number;
  readonly device_count: number;
  readonly topology_node_count: number;
  readonly topology_edge_count: number;
  readonly accepted_evidence_total: number;
  readonly parsed_device_count: number;
  readonly readiness_state: AssessmentReadiness["overall_state"];
  readonly assess_state: AssessmentReadiness["assess_state"];
  readonly triage_total_count: number;
  readonly triage_critical_count: number;
  readonly ledger_event_count: number;
  readonly last_activity_kind: string | null;
  readonly last_activity_at: string | null;
  readonly top_action_id: string | null;
  readonly build_intent_count: number;
  readonly construct_density: TopologyConstructDensity;
  readonly risk_summary: RiskSummary;
  readonly limitations: readonly string[];
}

export const ENVIRONMENT_PROFILE_LIMITATIONS: readonly string[] = [
  "Profile is derived from local workbench context.",
  "No environment persistence or auth boundary changed.",
  "No live polling state is implied.",
];

export const EMPTY_ENVIRONMENT_PROFILE: EnvironmentProfile = {
  environment_id: "local",
  display_label: "Environment: local",
  profile_state: "empty",
  known_platform_count: 0,
  device_count: 0,
  topology_node_count: 0,
  topology_edge_count: 0,
  accepted_evidence_total: 0,
  parsed_device_count: 0,
  readiness_state: "empty",
  assess_state: "no_context",
  triage_total_count: 0,
  triage_critical_count: 0,
  ledger_event_count: 0,
  last_activity_kind: null,
  last_activity_at: null,
  top_action_id: null,
  build_intent_count: 0,
  construct_density: "empty",
  risk_summary: {
    critical_count: 0,
    warning_count: 0,
    info_count: 0,
    primary_reason_code: null,
  },
  limitations: ENVIRONMENT_PROFILE_LIMITATIONS,
};

export interface BuildEnvironmentProfileInputs {
  readonly summary: WorkbenchContextSummary;
  readonly readiness: AssessmentReadiness;
  readonly ledger: OperatorActivityLedger;
  readonly triage: DiagnoseTriage;
  readonly router: WorkbenchActionRouter;
  readonly construct: TopologyConstruct;
  readonly build: BuildIntentWorkspace;
  readonly preflight: AssessmentPreflightSnapshot;
  /** Override environment id source order (defaults: topology→summary→"local"). */
  readonly environmentIdOverride?: string | null;
}

function resolveEnvironmentId(
  inputs: BuildEnvironmentProfileInputs,
): string {
  if (
    inputs.environmentIdOverride !== undefined &&
    inputs.environmentIdOverride !== null &&
    inputs.environmentIdOverride !== ""
  ) {
    return inputs.environmentIdOverride;
  }
  const fromSummary = inputs.summary.topology.environment_id;
  if (fromSummary !== null && fromSummary !== "") return fromSummary;
  return "local";
}

function resolveProfileState(
  summary: WorkbenchContextSummary,
  readiness: AssessmentReadiness,
  triage: DiagnoseTriage,
  ledger: OperatorActivityLedger,
): EnvironmentProfileState {
  if (readiness.overall_state === "blocked" || triage.critical_count > 0) {
    return "blocked";
  }
  const hasReady =
    readiness.overall_state === "ready" ||
    summary.topology.node_count > 0 ||
    summary.evidence_import.accepted_evidence_total > 0;
  if (hasReady) return "active";
  const hasAnySignal =
    summary.discovery.seed_count > 0 ||
    summary.crawl_preview.frontier_count > 0 ||
    summary.intake.parsed_device_count > 0 ||
    ledger.total_count > 0 ||
    triage.total_count > 0 ||
    readiness.overall_state !== "empty";
  return hasAnySignal ? "partial" : "empty";
}

function buildRiskSummary(triage: DiagnoseTriage): RiskSummary {
  const primary = triage.findings.find((f) => f.severity === "critical")
    ?? triage.findings.find((f) => f.severity === "warning")
    ?? triage.findings[0]
    ?? null;
  return {
    critical_count: triage.critical_count,
    warning_count: triage.warning_count,
    info_count: triage.info_count,
    primary_reason_code: primary?.reason_code ?? null,
  };
}

export function buildEnvironmentProfile(
  inputs: BuildEnvironmentProfileInputs,
): EnvironmentProfile {
  const {
    summary,
    readiness,
    ledger,
    triage,
    router,
    construct,
    build,
    preflight,
  } = inputs;

  // preflight carried in inputs for future use (pipeline step exposure
  // alongside profile). Currently unused; deliberately referenced to
  // keep the contract stable.
  void preflight;

  const environment_id = resolveEnvironmentId(inputs);
  const display_label = `Environment: ${environment_id}`;
  const profile_state = resolveProfileState(summary, readiness, triage, ledger);

  return {
    environment_id,
    display_label,
    profile_state,
    known_platform_count: summary.intake.current_platform_id !== null ? 1 : 0,
    device_count: Math.max(
      summary.intake.parsed_device_count,
      summary.topology.node_count,
    ),
    topology_node_count: summary.topology.node_count,
    topology_edge_count: summary.topology.edge_count,
    accepted_evidence_total: summary.evidence_import.accepted_evidence_total,
    parsed_device_count: summary.intake.parsed_device_count,
    readiness_state: readiness.overall_state,
    assess_state: readiness.assess_state,
    triage_total_count: triage.total_count,
    triage_critical_count: triage.critical_count,
    ledger_event_count: ledger.total_count,
    last_activity_kind: ledger.last_event_kind,
    last_activity_at: ledger.last_event_at,
    top_action_id: router.top_action_id,
    build_intent_count: build.total_count,
    construct_density: construct.layout_hints.density,
    risk_summary: buildRiskSummary(triage),
    limitations: ENVIRONMENT_PROFILE_LIMITATIONS,
  };
}
