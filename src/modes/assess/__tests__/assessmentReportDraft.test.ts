/**
 * V1CA — AssessmentReportDraft comprehensive cases.
 */

import { describe, expect, it } from "vitest";
import {
  HONESTY_LINES,
  buildAssessmentReportDraft,
  type AssessmentReportDraftSection,
  type AssessmentReportDraftSectionId,
} from "../assessmentReportDraft";
import { buildAssessmentPreflightSnapshot } from "../assessmentPreflightSnapshot";
import {
  EMPTY_WORKBENCH_CONTEXT_SUMMARY,
  type WorkbenchContextSummary,
} from "../../../state/workbenchContextSummary";
import {
  EMPTY_ASSESSMENT_READINESS,
  type AssessmentReadiness,
} from "../../../state/assessmentReadiness";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
} from "../../diagnose/diagnoseTriage";
import {
  EMPTY_OPERATOR_ACTIVITY_LEDGER,
  type OperatorActivityLedger,
} from "../../../state/operatorActivityLedger";
import {
  EMPTY_WORKBENCH_ACTION_ROUTER,
  buildWorkbenchActionRouter,
} from "../../../state/workbenchActionRouter";
import {
  EMPTY_CORTEX_COMMAND_REGISTRY,
  buildCortexCommandRegistry,
} from "../../../state/cortexCommandRegistry";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function findSection(
  sections: readonly AssessmentReportDraftSection[],
  id: AssessmentReportDraftSectionId,
): AssessmentReportDraftSection | undefined {
  return sections.find((s) => s.id === id);
}

function buildFromInputs(args: {
  summary?: WorkbenchContextSummary;
  readiness?: AssessmentReadiness;
  ledger?: OperatorActivityLedger;
}) {
  const summary = args.summary ?? EMPTY_WORKBENCH_CONTEXT_SUMMARY;
  const readiness = args.readiness ?? EMPTY_ASSESSMENT_READINESS;
  const ledger = args.ledger ?? EMPTY_OPERATOR_ACTIVITY_LEDGER;
  const triage = buildDiagnoseTriage({ summary, readiness, ledger });
  const registry = buildCortexCommandRegistry({
    summary,
    readiness,
    ledger,
    triage,
  });
  const router = buildWorkbenchActionRouter({
    summary,
    readiness,
    ledger,
    triage,
    registry,
  });
  const preflight = buildAssessmentPreflightSnapshot({
    summary,
    readiness,
    triage,
    ledger,
    router,
    registry,
    now: () => FIXED_NOW,
    reportDraftAvailable: true,
  });
  return buildAssessmentReportDraft({
    preflight,
    summary,
    readiness,
    triage,
    ledger,
    router,
    registry,
    now: () => FIXED_NOW,
  });
}

describe("AssessmentReportDraft — behavior", () => {
  it("empty context: limitations + missing inputs surfaced", () => {
    const d = buildFromInputs({});
    expect(findSection(d.sections, "input_coverage")?.status).toBe("empty");
    expect(findSection(d.sections, "topology_summary")?.status).toBe("empty");
    expect(findSection(d.sections, "evidence_summary")?.status).toBe("empty");
    expect(findSection(d.sections, "intake_summary")?.status).toBe("empty");
    expect(findSection(d.sections, "limitations")?.status).toBe("included");
    for (const honesty of HONESTY_LINES) {
      expect(d.limitations).toContain(honesty);
    }
  });

  it("ready context: topology/evidence/readiness sections included", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 3,
        edge_count: 2,
        has_view: true,
      },
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 4,
        attempted_import_count: 1,
        accepted_import_count: 1,
      },
    };
    const readiness: AssessmentReadiness = {
      ...EMPTY_ASSESSMENT_READINESS,
      overall_state: "ready",
      assess_state: "context_ready",
    };
    const d = buildFromInputs({ summary, readiness });
    expect(findSection(d.sections, "topology_summary")?.status).toBe("included");
    expect(findSection(d.sections, "evidence_summary")?.status).toBe("included");
    expect(findSection(d.sections, "readiness")?.status).toBe("included");
    expect(d.json_summary.can_start).toBe(true);
  });

  it("critical triage: diagnose_triage section lists severity + reason_code", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 3,
      },
    };
    const d = buildFromInputs({ summary });
    const sec = findSection(d.sections, "diagnose_triage");
    expect(sec?.status).toBe("included");
    expect(sec?.lines.some((l) => l.includes("[critical]"))).toBe(true);
    expect(
      sec?.lines.some((l) => l.includes("evidence_exists_but_no_topology")),
    ).toBe(true);
  });

  it("ledger activity surfaces counts only (no event payloads)", () => {
    const ledger: OperatorActivityLedger = {
      ...EMPTY_OPERATOR_ACTIVITY_LEDGER,
      total_count: 5,
      accepted_count: 3,
      rejected_count: 1,
      blocked_count: 1,
      last_event_kind: "evidence_import_accepted",
      last_event_at: "2026-05-21T00:00:01Z",
    };
    const d = buildFromInputs({ ledger });
    const sec = findSection(d.sections, "operator_activity");
    expect(sec?.status).toBe("included");
    expect(sec?.lines.some((l) => l.includes("Total events: 5"))).toBe(true);
    expect(
      sec?.lines.some((l) => l.includes("evidence_import_accepted")),
    ).toBe(true);
  });

  it("recommended_next_actions derives from router actions", () => {
    const d = buildFromInputs({});
    const sec = findSection(d.sections, "recommended_next_actions");
    expect(sec?.status).toBe("included");
    expect(sec?.lines.some((l) => l.includes("stage_discovery_seeds"))).toBe(true);
  });

  it("markdown is deterministic for identical inputs", () => {
    const a = buildFromInputs({});
    const b = buildFromInputs({});
    expect(a.markdown).toBe(b.markdown);
    expect(a.json_summary).toEqual(b.json_summary);
  });

  it("markdown begins with title and contains all section titles in order", () => {
    const d = buildFromInputs({});
    expect(d.markdown.startsWith("# Assessment Report Draft")).toBe(true);
    const expectedOrder = [
      "## Executive Summary",
      "## Input Coverage",
      "## Topology Summary",
      "## Evidence Summary",
      "## Intake Summary",
      "## Readiness",
      "## Diagnose Triage",
      "## Operator Activity",
      "## Recommended Next Actions",
      "## Limitations / Work Not Executed",
    ];
    let lastIdx = -1;
    for (const heading of expectedOrder) {
      const idx = d.markdown.indexOf(heading);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  it("honesty language always present in markdown", () => {
    const d = buildFromInputs({});
    for (const honesty of HONESTY_LINES) {
      expect(d.markdown.includes(honesty)).toBe(true);
    }
  });

  it("json_summary fields mirror preflight counts", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 2,
        edge_count: 1,
      },
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 3,
        rejected_evidence_total: 1,
      },
    };
    const d = buildFromInputs({ summary });
    expect(d.json_summary.topology_node_count).toBe(2);
    expect(d.json_summary.topology_edge_count).toBe(1);
    expect(d.json_summary.accepted_evidence_total).toBe(3);
    expect(d.json_summary.rejected_evidence_total).toBe(1);
  });
});
