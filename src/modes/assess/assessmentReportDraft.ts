/**
 * V1CA — Assessment Report Draft Builder.
 *
 * Pure deterministic draft artifact derived from V1BZ preflight snapshot
 * + safe cross-workbench projections. Produces:
 *   - structured sections
 *   - deterministic Markdown
 *   - JSON-safe summary
 *
 * Hard discipline:
 *   - Inputs are safe projections + V1BZ preflight only.
 *   - Output is labels/short-tokens/counts only — no raw configs, no raw
 *     evidence, no markdown bodies from external sources, no command
 *     output, no credentials, no secrets, no evidence_set_id, no raw
 *     error messages.
 *   - Deterministic: same inputs + same clock/id factory → same draft.
 *   - No I/O, no fetch, no mutation, no execution.
 *   - This is a draft. NOT a completed assessment. NOT a compliance
 *     scan. NOT a PDF. NOT live data. The limitations always say so.
 */

import type { WorkbenchContextSummary } from "../../state/workbenchContextSummary";
import type { AssessmentReadiness } from "../../state/assessmentReadiness";
import type { DiagnoseTriage } from "../diagnose/diagnoseTriage";
import type { OperatorActivityLedger } from "../../state/operatorActivityLedger";
import type { WorkbenchActionRouter } from "../../state/workbenchActionRouter";
import type { CortexCommandRegistry } from "../../state/cortexCommandRegistry";
import type { AssessmentPreflightSnapshot } from "./assessmentPreflightSnapshot";

export type AssessmentReportDraftSectionStatus =
  | "included"
  | "empty"
  | "deferred";

export type AssessmentReportDraftSectionId =
  | "executive_summary"
  | "input_coverage"
  | "topology_summary"
  | "evidence_summary"
  | "intake_summary"
  | "readiness"
  | "diagnose_triage"
  | "operator_activity"
  | "recommended_next_actions"
  | "limitations";

export interface AssessmentReportDraftSection {
  readonly id: AssessmentReportDraftSectionId;
  readonly title: string;
  readonly status: AssessmentReportDraftSectionStatus;
  readonly lines: readonly string[];
}

export interface AssessmentReportDraftJsonSummary {
  readonly overall_state: AssessmentReadiness["overall_state"];
  readonly can_start: boolean;
  readonly topology_node_count: number;
  readonly topology_edge_count: number;
  readonly accepted_evidence_total: number;
  readonly rejected_evidence_total: number;
  readonly parsed_device_count: number;
  readonly finding_count: number;
  readonly triage_total_count: number;
  readonly triage_critical_count: number;
  readonly ledger_event_count: number;
  readonly available_inputs: readonly string[];
  readonly missing_inputs: readonly string[];
  readonly top_action_id: string | null;
}

export interface AssessmentReportDraft {
  readonly draft_id: string;
  readonly created_at: string;
  readonly title: string;
  readonly sections: readonly AssessmentReportDraftSection[];
  readonly markdown: string;
  readonly json_summary: AssessmentReportDraftJsonSummary;
  readonly limitations: readonly string[];
}

export const HONESTY_LINES: readonly string[] = [
  "This is a draft generated from local workbench context.",
  "No full assessment execution has run yet.",
  "No compliance scan has run in this draft stage.",
  "No live polling or SNMP assessment has run in this draft stage.",
];

export const EMPTY_ASSESSMENT_REPORT_DRAFT: AssessmentReportDraft = {
  draft_id: "draft-empty",
  created_at: "1970-01-01T00:00:00.000Z",
  title: "Assessment Report Draft",
  sections: [],
  markdown: "",
  json_summary: {
    overall_state: "empty",
    can_start: false,
    topology_node_count: 0,
    topology_edge_count: 0,
    accepted_evidence_total: 0,
    rejected_evidence_total: 0,
    parsed_device_count: 0,
    finding_count: 0,
    triage_total_count: 0,
    triage_critical_count: 0,
    ledger_event_count: 0,
    available_inputs: [],
    missing_inputs: [],
    top_action_id: null,
  },
  limitations: HONESTY_LINES,
};

export interface BuildAssessmentReportDraftInputs {
  readonly preflight: AssessmentPreflightSnapshot;
  readonly summary: WorkbenchContextSummary;
  readonly readiness: AssessmentReadiness;
  readonly triage: DiagnoseTriage;
  readonly ledger: OperatorActivityLedger;
  readonly router: WorkbenchActionRouter;
  readonly registry: CortexCommandRegistry;
  readonly now?: () => string;
  readonly idFactory?: (preflight: AssessmentPreflightSnapshot) => string;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultIdFactory(preflight: AssessmentPreflightSnapshot): string {
  return `draft-${preflight.snapshot_id}`;
}

function buildExecutiveSummary(
  preflight: AssessmentPreflightSnapshot,
  triage: DiagnoseTriage,
): AssessmentReportDraftSection {
  const lines: string[] = [
    `Overall state: ${preflight.overall_state}`,
    `Can start assessment: ${preflight.can_start ? "yes" : "no"}`,
    `Top recommended action: ${preflight.top_action_id ?? "none"}`,
    `Triage findings: total=${triage.total_count}, critical=${triage.critical_count}, warning=${triage.warning_count}, info=${triage.info_count}`,
  ];
  return {
    id: "executive_summary",
    title: "Executive Summary",
    status: "included",
    lines,
  };
}

function buildInputCoverage(
  preflight: AssessmentPreflightSnapshot,
): AssessmentReportDraftSection {
  const lines: string[] = [
    `Available inputs: ${preflight.available_inputs.length === 0 ? "none" : preflight.available_inputs.join(", ")}`,
    `Missing inputs: ${preflight.missing_inputs.length === 0 ? "none" : preflight.missing_inputs.join(", ")}`,
  ];
  return {
    id: "input_coverage",
    title: "Input Coverage",
    status:
      preflight.available_inputs.length === 0 ? "empty" : "included",
    lines,
  };
}

function buildTopologySummary(
  summary: WorkbenchContextSummary,
): AssessmentReportDraftSection {
  const has = summary.topology.node_count > 0 || summary.topology.edge_count > 0;
  const lines: string[] = has
    ? [
        `Nodes: ${summary.topology.node_count}`,
        `Edges: ${summary.topology.edge_count}`,
        `Source records: ${summary.topology.source_record_count}`,
      ]
    : ["No topology view present."];
  return {
    id: "topology_summary",
    title: "Topology Summary",
    status: has ? "included" : "empty",
    lines,
  };
}

function buildEvidenceSummary(
  summary: WorkbenchContextSummary,
): AssessmentReportDraftSection {
  const has =
    summary.evidence_import.attempted_import_count > 0 ||
    summary.evidence_import.accepted_evidence_total > 0;
  const lines: string[] = has
    ? [
        `Attempted imports: ${summary.evidence_import.attempted_import_count}`,
        `Accepted imports: ${summary.evidence_import.accepted_import_count}`,
        `Rejected imports: ${summary.evidence_import.rejected_import_count}`,
        `Accepted evidence total: ${summary.evidence_import.accepted_evidence_total}`,
        `Rejected evidence total: ${summary.evidence_import.rejected_evidence_total}`,
      ]
    : ["No evidence has been imported."];
  return {
    id: "evidence_summary",
    title: "Evidence Summary",
    status: has ? "included" : "empty",
    lines,
  };
}

function buildIntakeSummary(
  summary: WorkbenchContextSummary,
): AssessmentReportDraftSection {
  const has = summary.intake.parsed_device_count > 0;
  const lines: string[] = has
    ? [
        `Parsed devices: ${summary.intake.parsed_device_count}`,
        `Findings: ${summary.intake.finding_count}`,
        `Current platform: ${summary.intake.current_platform_id ?? "unknown"}`,
      ]
    : ["No intake parses recorded."];
  return {
    id: "intake_summary",
    title: "Intake Summary",
    status: has ? "included" : "empty",
    lines,
  };
}

function buildReadiness(
  readiness: AssessmentReadiness,
): AssessmentReportDraftSection {
  const lines: string[] = [
    `Overall: ${readiness.overall_state}`,
    `Assess: ${readiness.assess_state}`,
    `Discovery: ${readiness.discovery_state}`,
    `Topology: ${readiness.topology_state}`,
    `Evidence: ${readiness.evidence_state}`,
    `Intake: ${readiness.intake_state}`,
    `Blocker reason codes: ${readiness.blocker_reason_codes.length === 0 ? "none" : readiness.blocker_reason_codes.join(", ")}`,
  ];
  return {
    id: "readiness",
    title: "Readiness",
    status: readiness.overall_state === "empty" ? "empty" : "included",
    lines,
  };
}

function buildDiagnoseTriageSection(
  triage: DiagnoseTriage,
): AssessmentReportDraftSection {
  if (triage.total_count === 0) {
    return {
      id: "diagnose_triage",
      title: "Diagnose Triage",
      status: "empty",
      lines: ["No triage findings."],
    };
  }
  const lines: string[] = [
    `Total: ${triage.total_count} (critical=${triage.critical_count}, warning=${triage.warning_count}, info=${triage.info_count})`,
    ...triage.findings.map(
      (f) => `- [${f.severity}] ${f.reason_code} — ${f.title}`,
    ),
  ];
  return {
    id: "diagnose_triage",
    title: "Diagnose Triage",
    status: "included",
    lines,
  };
}

function buildOperatorActivity(
  ledger: OperatorActivityLedger,
): AssessmentReportDraftSection {
  if (ledger.total_count === 0) {
    return {
      id: "operator_activity",
      title: "Operator Activity",
      status: "empty",
      lines: ["No operator activity recorded."],
    };
  }
  const lines: string[] = [
    `Total events: ${ledger.total_count}`,
    `Last event kind: ${ledger.last_event_kind ?? "none"}`,
    `Accepted: ${ledger.accepted_count}, Rejected: ${ledger.rejected_count}, Blocked: ${ledger.blocked_count}`,
  ];
  return {
    id: "operator_activity",
    title: "Operator Activity",
    status: "included",
    lines,
  };
}

function buildRecommendedNextActions(
  router: WorkbenchActionRouter,
): AssessmentReportDraftSection {
  if (router.total_count === 0) {
    return {
      id: "recommended_next_actions",
      title: "Recommended Next Actions",
      status: "empty",
      lines: ["No recommended next actions."],
    };
  }
  const lines: string[] = router.actions.map(
    (a) =>
      `- [${a.priority}] ${a.id} (${a.status}${a.reason_code ? `, ${a.reason_code}` : ""}) — ${a.label}`,
  );
  return {
    id: "recommended_next_actions",
    title: "Recommended Next Actions",
    status: "included",
    lines,
  };
}

function buildLimitationsSection(
  preflight: AssessmentPreflightSnapshot,
): AssessmentReportDraftSection {
  const lines = [...HONESTY_LINES, ...preflight.limitations].filter(
    (l, i, arr) => arr.indexOf(l) === i,
  );
  return {
    id: "limitations",
    title: "Limitations / Work Not Executed",
    status: "included",
    lines,
  };
}

function renderMarkdown(
  title: string,
  sections: readonly AssessmentReportDraftSection[],
): string {
  const out: string[] = [`# ${title}`, ""];
  for (const s of sections) {
    out.push(`## ${s.title}`);
    if (s.lines.length === 0) {
      out.push("(empty)");
    } else {
      for (const line of s.lines) {
        out.push(line);
      }
    }
    out.push("");
  }
  return out.join("\n");
}

export function buildAssessmentReportDraft(
  inputs: BuildAssessmentReportDraftInputs,
): AssessmentReportDraft {
  const {
    preflight,
    summary,
    readiness,
    triage,
    ledger,
    router,
    now = defaultNow,
    idFactory = defaultIdFactory,
  } = inputs;
  // registry is part of the inputs contract for completeness; future
  // sections may consume it directly. Marked here for non-removal.
  void inputs.registry;

  const sections: readonly AssessmentReportDraftSection[] = [
    buildExecutiveSummary(preflight, triage),
    buildInputCoverage(preflight),
    buildTopologySummary(summary),
    buildEvidenceSummary(summary),
    buildIntakeSummary(summary),
    buildReadiness(readiness),
    buildDiagnoseTriageSection(triage),
    buildOperatorActivity(ledger),
    buildRecommendedNextActions(router),
    buildLimitationsSection(preflight),
  ];

  const title = "Assessment Report Draft";
  const markdown = renderMarkdown(title, sections);

  const json_summary: AssessmentReportDraftJsonSummary = {
    overall_state: preflight.overall_state,
    can_start: preflight.can_start,
    topology_node_count: preflight.topology_node_count,
    topology_edge_count: preflight.topology_edge_count,
    accepted_evidence_total: preflight.accepted_evidence_total,
    rejected_evidence_total: preflight.rejected_evidence_total,
    parsed_device_count: preflight.parsed_device_count,
    finding_count: preflight.finding_count,
    triage_total_count: preflight.triage_total_count,
    triage_critical_count: preflight.triage_critical_count,
    ledger_event_count: preflight.ledger_event_count,
    available_inputs: preflight.available_inputs,
    missing_inputs: preflight.missing_inputs,
    top_action_id: preflight.top_action_id,
  };

  const limitations = [...HONESTY_LINES, ...preflight.limitations].filter(
    (l, i, arr) => arr.indexOf(l) === i,
  );

  return {
    draft_id: idFactory(preflight),
    created_at: now(),
    title,
    sections,
    markdown,
    json_summary,
    limitations,
  };
}
