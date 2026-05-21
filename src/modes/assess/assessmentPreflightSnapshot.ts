/**
 * V1BZ — Assessment Preflight Snapshot.
 *
 * Pure deterministic preflight artifact describing what Anthracite can
 * assess from current safe workbench state.
 *
 * Hard discipline:
 *   - Inputs are safe projections only (WorkbenchContextSummary,
 *     AssessmentReadiness, DiagnoseTriage, OperatorActivityLedger,
 *     WorkbenchActionRouter, CortexCommandRegistry).
 *   - Output is counts/labels/short reason-codes only — no raw configs,
 *     no raw evidence, no markdown bodies, no command output, no
 *     credentials, no secrets, no evidence_set_id, no raw error messages.
 *   - Deterministic: same inputs + same clock/id factory → same snapshot.
 *   - No I/O, no fetch, no mutation, no execution.
 *   - This is preflight, NOT assessment execution / compliance scan /
 *     PDF generation. The limitations array always declares as much.
 */

import type { WorkbenchContextSummary } from "../../state/workbenchContextSummary";
import type { AssessmentReadiness } from "../../state/assessmentReadiness";
import type { DiagnoseTriage } from "../diagnose/diagnoseTriage";
import type { OperatorActivityLedger } from "../../state/operatorActivityLedger";
import type { WorkbenchActionRouter } from "../../state/workbenchActionRouter";
import type { CortexCommandRegistry } from "../../state/cortexCommandRegistry";

export type PreflightPipelineStepStatus =
  | "ready"
  | "missing"
  | "blocked"
  | "deferred";

export type PreflightPipelineStepId =
  | "discovery_context"
  | "topology_context"
  | "evidence_context"
  | "intake_context"
  | "diagnose_triage"
  | "readiness_review"
  | "report_draft";

export interface AssessmentPreflightPipelineStep {
  readonly id: PreflightPipelineStepId;
  readonly label: string;
  readonly status: PreflightPipelineStepStatus;
  readonly reason_code: string | null;
}

export interface AssessmentPreflightSnapshot {
  readonly snapshot_id: string;
  readonly created_at: string;
  readonly overall_state: AssessmentReadiness["overall_state"];
  readonly can_start: boolean;
  readonly assess_state: AssessmentReadiness["assess_state"];
  readonly available_inputs: readonly string[];
  readonly missing_inputs: readonly string[];
  readonly blocked_reason_codes: readonly string[];
  readonly topology_node_count: number;
  readonly topology_edge_count: number;
  readonly accepted_evidence_total: number;
  readonly rejected_evidence_total: number;
  readonly parsed_device_count: number;
  readonly finding_count: number;
  readonly triage_total_count: number;
  readonly triage_critical_count: number;
  readonly triage_warning_count: number;
  readonly ledger_event_count: number;
  readonly command_available_count: number;
  readonly action_total_count: number;
  readonly top_action_id: string | null;
  readonly pipeline_steps: readonly AssessmentPreflightPipelineStep[];
  readonly limitations: readonly string[];
}

const HONESTY_LIMITATION = "No assessment execution has run yet.";
const COMPLIANCE_LIMITATION = "No compliance scan has run.";
const LIVE_LIMITATION = "No live polling or SNMP has run.";
const REPORT_LIMITATION = "Report draft generation is not bundled here.";

export const EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT: AssessmentPreflightSnapshot = {
  snapshot_id: "preflight-empty",
  created_at: "1970-01-01T00:00:00.000Z",
  overall_state: "empty",
  can_start: false,
  assess_state: "no_context",
  available_inputs: [],
  missing_inputs: [],
  blocked_reason_codes: [],
  topology_node_count: 0,
  topology_edge_count: 0,
  accepted_evidence_total: 0,
  rejected_evidence_total: 0,
  parsed_device_count: 0,
  finding_count: 0,
  triage_total_count: 0,
  triage_critical_count: 0,
  triage_warning_count: 0,
  ledger_event_count: 0,
  command_available_count: 0,
  action_total_count: 0,
  top_action_id: null,
  pipeline_steps: [],
  limitations: [
    HONESTY_LIMITATION,
    COMPLIANCE_LIMITATION,
    LIVE_LIMITATION,
    REPORT_LIMITATION,
  ],
};

export interface BuildAssessmentPreflightSnapshotInputs {
  readonly summary: WorkbenchContextSummary;
  readonly readiness: AssessmentReadiness;
  readonly triage: DiagnoseTriage;
  readonly ledger: OperatorActivityLedger;
  readonly router: WorkbenchActionRouter;
  readonly registry: CortexCommandRegistry;
  /** Optional clock; defaults to Date.now() ISO string. */
  readonly now?: () => string;
  /** Optional id factory; defaults to a deterministic content-hash-ish id. */
  readonly idFactory?: (
    summary: WorkbenchContextSummary,
    readiness: AssessmentReadiness,
  ) => string;
  /**
   * Optional flag: when true, the report_draft pipeline step resolves to
   * `ready` (V1CA integration). Defaults to false (deferred).
   */
  readonly reportDraftAvailable?: boolean;
}

function defaultIdFactory(
  summary: WorkbenchContextSummary,
  readiness: AssessmentReadiness,
): string {
  // Deterministic id from stable counts/states — same context → same id.
  const parts = [
    "preflight",
    readiness.overall_state,
    String(summary.discovery.seed_count),
    String(summary.crawl_preview.frontier_count),
    String(summary.topology.node_count),
    String(summary.topology.edge_count),
    String(summary.evidence_import.accepted_evidence_total),
    String(summary.intake.parsed_device_count),
  ];
  return parts.join("-");
}

function defaultNow(): string {
  return new Date().toISOString();
}

function buildPipelineSteps(
  summary: WorkbenchContextSummary,
  readiness: AssessmentReadiness,
  triage: DiagnoseTriage,
  reportDraftAvailable: boolean,
): readonly AssessmentPreflightPipelineStep[] {
  const discoveryReady =
    summary.discovery.seed_count > 0 ||
    summary.crawl_preview.frontier_count > 0;
  const topologyReady =
    summary.topology.node_count > 0 || summary.topology.edge_count > 0;
  const evidenceReady = summary.evidence_import.accepted_evidence_total > 0;
  const intakeReady = summary.intake.parsed_device_count > 0;

  const readinessStep: AssessmentPreflightPipelineStep =
    readiness.overall_state === "blocked"
      ? {
          id: "readiness_review",
          label: "Readiness Review",
          status: "blocked",
          reason_code: readiness.blocker_reason_codes[0] ?? "readiness_blocked",
        }
      : readiness.overall_state === "ready" ||
          readiness.overall_state === "partial"
        ? {
            id: "readiness_review",
            label: "Readiness Review",
            status: "ready",
            reason_code: null,
          }
        : {
            id: "readiness_review",
            label: "Readiness Review",
            status: "missing",
            reason_code: "no_assessment_context",
          };

  const triageStep: AssessmentPreflightPipelineStep =
    triage.critical_count > 0
      ? {
          id: "diagnose_triage",
          label: "Diagnose Triage",
          status: "blocked",
          reason_code: "critical_triage_finding",
        }
      : triage.total_count > 0
        ? {
            id: "diagnose_triage",
            label: "Diagnose Triage",
            status: "ready",
            reason_code: null,
          }
        : {
            id: "diagnose_triage",
            label: "Diagnose Triage",
            status: "missing",
            reason_code: "no_triage_input",
          };

  return [
    {
      id: "discovery_context",
      label: "Discovery Context",
      status: discoveryReady ? "ready" : "missing",
      reason_code: discoveryReady ? null : "no_discovery_signal",
    },
    {
      id: "topology_context",
      label: "Topology Context",
      status: topologyReady ? "ready" : "missing",
      reason_code: topologyReady ? null : "no_topology_signal",
    },
    {
      id: "evidence_context",
      label: "Evidence Context",
      status: evidenceReady ? "ready" : "missing",
      reason_code: evidenceReady ? null : "no_evidence_signal",
    },
    {
      id: "intake_context",
      label: "Intake Context",
      status: intakeReady ? "ready" : "missing",
      reason_code: intakeReady ? null : "no_intake_signal",
    },
    triageStep,
    readinessStep,
    {
      id: "report_draft",
      label: "Report Draft",
      status: reportDraftAvailable ? "ready" : "deferred",
      reason_code: reportDraftAvailable ? null : "report_draft_deferred",
    },
  ];
}

export function buildAssessmentPreflightSnapshot(
  inputs: BuildAssessmentPreflightSnapshotInputs,
): AssessmentPreflightSnapshot {
  const {
    summary,
    readiness,
    triage,
    ledger,
    router,
    registry,
    now = defaultNow,
    idFactory = defaultIdFactory,
    reportDraftAvailable = false,
  } = inputs;

  const blocked_reason_codes: readonly string[] = [
    ...readiness.blocker_reason_codes,
  ];

  const limitations: string[] = [
    HONESTY_LIMITATION,
    COMPLIANCE_LIMITATION,
    LIVE_LIMITATION,
  ];
  if (!reportDraftAvailable) {
    limitations.push(REPORT_LIMITATION);
  }
  if (triage.critical_count > 0) {
    limitations.push(
      "Critical triage findings present — resolve before treating preflight as authoritative.",
    );
  }

  const pipeline_steps = buildPipelineSteps(
    summary,
    readiness,
    triage,
    reportDraftAvailable,
  );

  return {
    snapshot_id: idFactory(summary, readiness),
    created_at: now(),
    overall_state: readiness.overall_state,
    can_start: readiness.overall_state === "ready",
    assess_state: readiness.assess_state,
    available_inputs: readiness.available_inputs,
    missing_inputs: readiness.missing_inputs,
    blocked_reason_codes,
    topology_node_count: summary.topology.node_count,
    topology_edge_count: summary.topology.edge_count,
    accepted_evidence_total: summary.evidence_import.accepted_evidence_total,
    rejected_evidence_total: summary.evidence_import.rejected_evidence_total,
    parsed_device_count: summary.intake.parsed_device_count,
    finding_count: summary.intake.finding_count,
    triage_total_count: triage.total_count,
    triage_critical_count: triage.critical_count,
    triage_warning_count: triage.warning_count,
    ledger_event_count: ledger.total_count,
    command_available_count: registry.available_count,
    action_total_count: router.total_count,
    top_action_id: router.top_action_id,
    pipeline_steps,
    limitations,
  };
}
