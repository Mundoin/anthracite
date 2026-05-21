/**
 * V1BW — DiagnoseTriage comprehensive cases. One assertion per rule.
 */

import { describe, expect, it } from "vitest";
import {
  buildDiagnoseTriage,
  type BuildDiagnoseTriageInputs,
  type DiagnoseTriageFinding,
} from "../diagnoseTriage";
import {
  EMPTY_WORKBENCH_CONTEXT_SUMMARY,
  type WorkbenchContextSummary,
} from "../../../state/workbenchContextSummary";
import {
  EMPTY_ASSESSMENT_READINESS,
  type AssessmentReadiness,
} from "../../../state/assessmentReadiness";
import {
  EMPTY_OPERATOR_ACTIVITY_LEDGER,
  type OperatorActivityLedger,
} from "../../../state/operatorActivityLedger";

function ctx(
  override: Partial<{
    summary: WorkbenchContextSummary;
    readiness: AssessmentReadiness;
    ledger: OperatorActivityLedger;
  }>,
): BuildDiagnoseTriageInputs {
  return {
    summary: override.summary ?? EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: override.readiness ?? EMPTY_ASSESSMENT_READINESS,
    ledger: override.ledger ?? EMPTY_OPERATOR_ACTIVITY_LEDGER,
  };
}

function findByReason(
  fs: readonly DiagnoseTriageFinding[],
  rc: DiagnoseTriageFinding["reason_code"],
): DiagnoseTriageFinding | undefined {
  return fs.find((f) => f.reason_code === rc);
}

describe("DiagnoseTriage — rules", () => {
  it("evidence_exists_but_no_topology fires when evidence present but no nodes", () => {
    const t = buildDiagnoseTriage(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          evidence_import: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
            accepted_evidence_total: 4,
          },
        },
      }),
    );
    const f = findByReason(t.findings, "evidence_exists_but_no_topology");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("critical");
    expect(f?.category).toBe("evidence");
    expect(f?.supporting_counts.accepted_evidence_total).toBe(4);
  });

  it("topology_without_edges fires when nodes>1 but edges===0", () => {
    const t = buildDiagnoseTriage(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          topology: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
            node_count: 3,
            edge_count: 0,
          },
        },
      }),
    );
    const f = findByReason(t.findings, "topology_without_edges");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("warning");
    expect(f?.supporting_counts.node_count).toBe(3);
    expect(f?.supporting_counts.edge_count).toBe(0);
  });

  it("topology_without_edges does NOT fire for single-node topology", () => {
    const t = buildDiagnoseTriage(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          topology: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
            node_count: 1,
            edge_count: 0,
          },
        },
      }),
    );
    expect(findByReason(t.findings, "topology_without_edges")).toBeUndefined();
  });

  it("crawl_preview_not_imported fires when frontier>0 and no evidence imported", () => {
    const t = buildDiagnoseTriage(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          crawl_preview: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
            frontier_count: 7,
          },
        },
      }),
    );
    const f = findByReason(t.findings, "crawl_preview_not_imported");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("warning");
  });

  it("discovery_seeded_no_preview fires when seeds>0 and frontier===0", () => {
    const t = buildDiagnoseTriage(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          discovery: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
            seed_count: 5,
            total_seed_count: 5,
          },
        },
      }),
    );
    const f = findByReason(t.findings, "discovery_seeded_no_preview");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("info");
    expect(f?.supporting_counts.seed_count).toBe(5);
  });

  it("intake_findings_present fires when finding_count>0", () => {
    const t = buildDiagnoseTriage(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          intake: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
            finding_count: 2,
            parsed_device_count: 3,
          },
        },
      }),
    );
    const f = findByReason(t.findings, "intake_findings_present");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("warning");
    expect(f?.supporting_counts.finding_count).toBe(2);
  });

  it("intake_parsed_no_topology fires when parsed devices>0 and node_count===0", () => {
    const t = buildDiagnoseTriage(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          intake: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
            parsed_device_count: 6,
          },
        },
      }),
    );
    const f = findByReason(t.findings, "intake_parsed_no_topology");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("info");
  });

  it("evidence_rejected_majority fires when rejected>accepted and attempted>0", () => {
    const t = buildDiagnoseTriage(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          evidence_import: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
            attempted_import_count: 5,
            accepted_import_count: 1,
            rejected_import_count: 4,
          },
        },
      }),
    );
    const f = findByReason(t.findings, "evidence_rejected_majority");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("critical");
  });

  it("readiness_blocked fires when overall_state==='blocked'", () => {
    const t = buildDiagnoseTriage(
      ctx({
        readiness: {
          ...EMPTY_ASSESSMENT_READINESS,
          overall_state: "blocked",
        },
      }),
    );
    const f = findByReason(t.findings, "readiness_blocked");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("critical");
    expect(f?.category).toBe("assess");
  });

  it("activity_present_no_ready_state fires when ledger has events but readiness !== ready", () => {
    const t = buildDiagnoseTriage(
      ctx({
        ledger: { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 3 },
      }),
    );
    const f = findByReason(t.findings, "activity_present_no_ready_state");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("info");
    expect(f?.supporting_counts.ledger_event_count).toBe(3);
  });

  it("activity_present_no_ready_state does NOT fire when readiness is ready", () => {
    const t = buildDiagnoseTriage(
      ctx({
        ledger: { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 3 },
        readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "ready" },
      }),
    );
    expect(findByReason(t.findings, "activity_present_no_ready_state")).toBeUndefined();
  });

  it("findings sort: critical < warning < info", () => {
    const t = buildDiagnoseTriage(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          discovery: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
            seed_count: 1,
          },
          evidence_import: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
            accepted_evidence_total: 2,
          },
          intake: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
            finding_count: 1,
          },
        },
        readiness: {
          ...EMPTY_ASSESSMENT_READINESS,
          overall_state: "blocked",
        },
      }),
    );
    const sevs = t.findings.map((f) => f.severity);
    const idxCritical = sevs.lastIndexOf("critical");
    const idxWarning = sevs.lastIndexOf("warning");
    const idxInfo = sevs.indexOf("info");
    if (idxCritical !== -1 && idxWarning !== -1) {
      expect(idxCritical).toBeLessThan(sevs.indexOf("warning"));
    }
    if (idxWarning !== -1 && idxInfo !== -1) {
      expect(idxWarning).toBeLessThan(idxInfo);
    }
    expect(t.critical_count).toBeGreaterThan(0);
    expect(t.total_count).toBe(t.findings.length);
  });

  it("identical inputs produce identical output (determinism)", () => {
    const inputs = ctx({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 4,
          edge_count: 0,
        },
      },
      ledger: { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 2 },
    });
    const a = buildDiagnoseTriage(inputs);
    const b = buildDiagnoseTriage(inputs);
    expect(a).toEqual(b);
  });
});
