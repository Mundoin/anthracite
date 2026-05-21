/**
 * V1BW — Diagnose Evidence Triage.
 *
 * Pure deterministic projection from
 *   - WorkbenchContextSummary
 *   - AssessmentReadiness
 *   - OperatorActivityLedger
 * into a sorted list of safe triage findings.
 *
 * Hard discipline:
 *   - Inputs are the three documented projections only.
 *   - Output is counts/labels/reason-codes only — no raw configs, no raw
 *     evidence, no markdown bodies, no command output, no credentials,
 *     no secrets, no evidence_set_id, no raw error messages.
 *   - Deterministic: same inputs → same output (including order).
 *   - No I/O, no fetch, no mutation.
 *   - Does NOT diagnose products, does NOT perform any device contact;
 *     only describes what looks inconsistent or worth inspecting next
 *     from the data the operator has already gathered.
 */

import type { WorkbenchContextSummary } from "../../state/workbenchContextSummary";
import type { AssessmentReadiness } from "../../state/assessmentReadiness";
import type { OperatorActivityLedger } from "../../state/operatorActivityLedger";

export type TriageSeverity = "info" | "warning" | "critical";

export type TriageCategory =
  | "discovery"
  | "topology"
  | "evidence"
  | "intake"
  | "assess"
  | "activity";

export type TriageReasonCode =
  | "evidence_exists_but_no_topology"
  | "topology_without_edges"
  | "crawl_preview_not_imported"
  | "discovery_seeded_no_preview"
  | "intake_findings_present"
  | "intake_parsed_no_topology"
  | "evidence_rejected_majority"
  | "readiness_blocked"
  | "activity_present_no_ready_state";

export interface TriageSupportingCounts {
  readonly seed_count?: number;
  readonly frontier_count?: number;
  readonly node_count?: number;
  readonly edge_count?: number;
  readonly accepted_evidence_total?: number;
  readonly rejected_evidence_total?: number;
  readonly accepted_import_count?: number;
  readonly rejected_import_count?: number;
  readonly attempted_import_count?: number;
  readonly parsed_device_count?: number;
  readonly finding_count?: number;
  readonly ledger_event_count?: number;
}

export interface DiagnoseTriageFinding {
  readonly id: string;
  readonly severity: TriageSeverity;
  readonly category: TriageCategory;
  readonly title: string;
  readonly reason_code: TriageReasonCode;
  readonly supporting_counts: TriageSupportingCounts;
  readonly recommended_action: string;
}

export interface DiagnoseTriage {
  readonly findings: readonly DiagnoseTriageFinding[];
  readonly total_count: number;
  readonly critical_count: number;
  readonly warning_count: number;
  readonly info_count: number;
}

export const EMPTY_DIAGNOSE_TRIAGE: DiagnoseTriage = {
  findings: [],
  total_count: 0,
  critical_count: 0,
  warning_count: 0,
  info_count: 0,
};

const SEVERITY_ORDER: Record<TriageSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const CATEGORY_ORDER: Record<TriageCategory, number> = {
  discovery: 0,
  topology: 1,
  evidence: 2,
  intake: 3,
  assess: 4,
  activity: 5,
};

export interface BuildDiagnoseTriageInputs {
  readonly summary: WorkbenchContextSummary;
  readonly readiness: AssessmentReadiness;
  readonly ledger: OperatorActivityLedger;
}

export function buildDiagnoseTriage(
  inputs: BuildDiagnoseTriageInputs,
): DiagnoseTriage {
  const { summary, readiness, ledger } = inputs;
  const out: DiagnoseTriageFinding[] = [];

  const evidence_total = summary.evidence_import.accepted_evidence_total;
  const node_count = summary.topology.node_count;
  const edge_count = summary.topology.edge_count;
  const frontier_count = summary.crawl_preview.frontier_count;
  const seed_count = summary.discovery.seed_count;
  const accepted_imports = summary.evidence_import.accepted_import_count;
  const rejected_imports = summary.evidence_import.rejected_import_count;
  const attempted_imports = summary.evidence_import.attempted_import_count;
  const parsed_devices = summary.intake.parsed_device_count;
  const findings_present = summary.intake.finding_count;

  if (evidence_total > 0 && node_count === 0) {
    out.push({
      id: "triage-evidence-no-topology",
      severity: "critical",
      category: "evidence",
      title: "Evidence imported but topology is empty",
      reason_code: "evidence_exists_but_no_topology",
      supporting_counts: {
        accepted_evidence_total: evidence_total,
        node_count,
      },
      recommended_action:
        "Inspect Topology — evidence is present but no nodes were materialized. Re-check the evidence pipeline or topology projection.",
    });
  }

  if (node_count > 1 && edge_count === 0) {
    out.push({
      id: "triage-topology-no-edges",
      severity: "warning",
      category: "topology",
      title: "Topology has nodes but no edges",
      reason_code: "topology_without_edges",
      supporting_counts: { node_count, edge_count },
      recommended_action:
        "Import LLDP/CDP neighbor evidence so adjacencies can be projected, or verify the existing evidence is accepted.",
    });
  }

  if (frontier_count > 0 && evidence_total === 0) {
    out.push({
      id: "triage-crawl-not-imported",
      severity: "warning",
      category: "evidence",
      title: "Crawl preview exists but evidence was not imported",
      reason_code: "crawl_preview_not_imported",
      supporting_counts: { frontier_count, accepted_evidence_total: evidence_total },
      recommended_action:
        "Hand crawl preview output into the Topology evidence import panel to advance to the next stage.",
    });
  }

  if (seed_count > 0 && frontier_count === 0) {
    out.push({
      id: "triage-seeds-no-preview",
      severity: "info",
      category: "discovery",
      title: "Seeds are staged but no crawl preview yet",
      reason_code: "discovery_seeded_no_preview",
      supporting_counts: { seed_count, frontier_count },
      recommended_action:
        "Generate a crawl preview from the staged seeds in Discovery.",
    });
  }

  if (findings_present > 0) {
    out.push({
      id: "triage-intake-findings",
      severity: "warning",
      category: "intake",
      title: "Intake parse produced findings",
      reason_code: "intake_findings_present",
      supporting_counts: {
        finding_count: findings_present,
        parsed_device_count: parsed_devices,
      },
      recommended_action:
        "Review intake findings before treating parsed devices as authoritative.",
    });
  }

  if (parsed_devices > 0 && node_count === 0) {
    out.push({
      id: "triage-intake-no-topology",
      severity: "info",
      category: "intake",
      title: "Devices parsed from intake but no topology yet",
      reason_code: "intake_parsed_no_topology",
      supporting_counts: { parsed_device_count: parsed_devices, node_count },
      recommended_action:
        "Use parsed intake devices to seed Discovery or import neighbor evidence into Topology.",
    });
  }

  if (
    attempted_imports > 0 &&
    rejected_imports > accepted_imports
  ) {
    out.push({
      id: "triage-evidence-rejected-majority",
      severity: "critical",
      category: "evidence",
      title: "Majority of evidence imports rejected",
      reason_code: "evidence_rejected_majority",
      supporting_counts: {
        accepted_import_count: accepted_imports,
        rejected_import_count: rejected_imports,
        attempted_import_count: attempted_imports,
      },
      recommended_action:
        "Inspect Topology evidence import panel — rejected payloads outnumber accepted. Verify source format and re-import.",
    });
  }

  if (readiness.overall_state === "blocked") {
    out.push({
      id: "triage-readiness-blocked",
      severity: "critical",
      category: "assess",
      title: "Assess readiness is blocked",
      reason_code: "readiness_blocked",
      supporting_counts: {},
      recommended_action:
        "Resolve blocker reason codes in Assess preflight before generating an assessment.",
    });
  }

  if (ledger.total_count > 0 && readiness.overall_state !== "ready") {
    out.push({
      id: "triage-activity-no-ready",
      severity: "info",
      category: "activity",
      title: "Activity recorded but readiness is not ready",
      reason_code: "activity_present_no_ready_state",
      supporting_counts: { ledger_event_count: ledger.total_count },
      recommended_action:
        "Review the Operator Activity Ledger and complete the next missing input shown in Assess preflight.",
    });
  }

  // Deterministic sort: severity → category → id.
  const findings = [...out].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    const c = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  });

  let critical_count = 0;
  let warning_count = 0;
  let info_count = 0;
  for (const f of findings) {
    if (f.severity === "critical") critical_count += 1;
    else if (f.severity === "warning") warning_count += 1;
    else info_count += 1;
  }

  return {
    findings,
    total_count: findings.length,
    critical_count,
    warning_count,
    info_count,
  };
}
