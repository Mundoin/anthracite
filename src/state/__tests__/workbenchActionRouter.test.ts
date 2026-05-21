/**
 * V1BY — WorkbenchActionRouter comprehensive cases.
 */

import { describe, expect, it } from "vitest";
import {
  buildWorkbenchActionRouter,
  type BuildWorkbenchActionRouterInputs,
  type WorkbenchAction,
} from "../workbenchActionRouter";
import {
  EMPTY_WORKBENCH_CONTEXT_SUMMARY,
  type WorkbenchContextSummary,
} from "../workbenchContextSummary";
import {
  EMPTY_ASSESSMENT_READINESS,
  type AssessmentReadiness,
} from "../assessmentReadiness";
import {
  EMPTY_OPERATOR_ACTIVITY_LEDGER,
  type OperatorActivityLedger,
} from "../operatorActivityLedger";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
  type DiagnoseTriage,
} from "../../modes/diagnose/diagnoseTriage";
import {
  buildCortexCommandRegistry,
  type CortexCommandRegistry,
} from "../cortexCommandRegistry";

function inputs(
  override: Partial<{
    summary: WorkbenchContextSummary;
    readiness: AssessmentReadiness;
    ledger: OperatorActivityLedger;
    triage: DiagnoseTriage;
    registry: CortexCommandRegistry;
  }>,
): BuildWorkbenchActionRouterInputs {
  const summary = override.summary ?? EMPTY_WORKBENCH_CONTEXT_SUMMARY;
  const readiness = override.readiness ?? EMPTY_ASSESSMENT_READINESS;
  const ledger = override.ledger ?? EMPTY_OPERATOR_ACTIVITY_LEDGER;
  const triage = override.triage ?? EMPTY_DIAGNOSE_TRIAGE;
  const registry =
    override.registry ??
    buildCortexCommandRegistry({ summary, readiness, ledger, triage });
  return { summary, readiness, ledger, triage, registry };
}

function findById(
  actions: readonly WorkbenchAction[],
  id: string,
): WorkbenchAction | undefined {
  return actions.find((a) => a.id === id);
}

describe("WorkbenchActionRouter — rules", () => {
  it("empty context → stage_discovery_seeds top action", () => {
    const r = buildWorkbenchActionRouter(inputs({}));
    expect(r.top_action_id).toBe("stage_discovery_seeds");
    expect(findById(r.actions, "stage_discovery_seeds")?.reason_code).toBe(
      "no_discovery_seeds",
    );
  });

  it("seeds without crawl preview → build_crawl_preview", () => {
    const r = buildWorkbenchActionRouter(
      inputs({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          discovery: { seed_count: 3, total_seed_count: 3, history_entry_count: 0 },
        },
      }),
    );
    expect(findById(r.actions, "build_crawl_preview")).toBeDefined();
    expect(findById(r.actions, "stage_discovery_seeds")).toBeUndefined();
  });

  it("crawl preview without evidence → import_topology_evidence", () => {
    const r = buildWorkbenchActionRouter(
      inputs({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          discovery: { seed_count: 3, total_seed_count: 3, history_entry_count: 0 },
          crawl_preview: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
            frontier_count: 5,
          },
        },
      }),
    );
    expect(findById(r.actions, "import_topology_evidence")).toBeDefined();
    expect(findById(r.actions, "build_crawl_preview")).toBeUndefined();
  });

  it("topology nodes without edges → review_topology_evidence", () => {
    const r = buildWorkbenchActionRouter(
      inputs({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          topology: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
            node_count: 4,
            edge_count: 0,
          },
        },
      }),
    );
    expect(findById(r.actions, "review_topology_evidence")).toBeDefined();
  });

  it("ready readiness → open_assess_preflight emitted", () => {
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
        accepted_evidence_total: 5,
        attempted_import_count: 1,
        accepted_import_count: 1,
      },
      discovery: { seed_count: 1, total_seed_count: 1, history_entry_count: 0 },
      crawl_preview: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
        frontier_count: 2,
      },
      intake: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
        parsed_device_count: 2,
        parse_status: "parsed",
      },
    };
    const readiness: AssessmentReadiness = {
      ...EMPTY_ASSESSMENT_READINESS,
      overall_state: "ready",
      assess_state: "context_ready",
    };
    const r = buildWorkbenchActionRouter(inputs({ summary, readiness }));
    expect(findById(r.actions, "open_assess_preflight")).toBeDefined();
  });

  it("critical triage finding outranks normal actions", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 4,
      },
    };
    const triage = buildDiagnoseTriage({
      summary,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    expect(triage.critical_count).toBeGreaterThan(0);
    const r = buildWorkbenchActionRouter(inputs({ summary, triage }));
    expect(r.top_action_id).toBe("review_diagnose_triage_critical");
  });

  it("blocked readiness emits review_diagnose_triage_blocked", () => {
    const r = buildWorkbenchActionRouter(
      inputs({
        readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "blocked" },
      }),
    );
    expect(findById(r.actions, "review_diagnose_triage_blocked")).toBeDefined();
  });

  it("ledger with events emits review_activity_ledger", () => {
    const r = buildWorkbenchActionRouter(
      inputs({
        ledger: { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 4 },
      }),
    );
    const a = findById(r.actions, "review_activity_ledger");
    expect(a).toBeDefined();
    expect(a?.supporting_counts.ledger_event_count).toBe(4);
  });

  it("actions sort deterministically by priority then id", () => {
    const r = buildWorkbenchActionRouter(
      inputs({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          topology: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
            node_count: 4,
            edge_count: 0,
          },
        },
        readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "blocked" },
      }),
    );
    for (let i = 1; i < r.actions.length; i++) {
      const a = r.actions[i - 1];
      const b = r.actions[i];
      const ok =
        a.priority < b.priority ||
        (a.priority === b.priority && a.id.localeCompare(b.id) <= 0);
      expect(ok).toBe(true);
    }
  });

  it("identical inputs produce identical routers (determinism)", () => {
    const i = inputs({
      ledger: { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 2 },
    });
    const a = buildWorkbenchActionRouter(i);
    const b = buildWorkbenchActionRouter(i);
    expect(a).toEqual(b);
  });

  it("counts agree with action statuses", () => {
    const r = buildWorkbenchActionRouter(
      inputs({
        ledger: { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 1 },
      }),
    );
    let a = 0;
    let b = 0;
    for (const act of r.actions) {
      if (act.status === "available") a += 1;
      else if (act.status === "blocked") b += 1;
    }
    expect(r.available_count).toBe(a);
    expect(r.blocked_count).toBe(b);
  });
});
