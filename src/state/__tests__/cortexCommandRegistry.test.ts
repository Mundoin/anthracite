/**
 * V1BX — CortexCommandRegistry comprehensive cases.
 */

import { describe, expect, it } from "vitest";
import {
  buildCortexCommandRegistry,
  findCortexCommand,
  type BuildCortexCommandRegistryInputs,
} from "../cortexCommandRegistry";
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
  type DiagnoseTriage,
} from "../../modes/diagnose/diagnoseTriage";

function ctx(
  override: Partial<{
    summary: WorkbenchContextSummary;
    readiness: AssessmentReadiness;
    ledger: OperatorActivityLedger;
    triage: DiagnoseTriage;
  }>,
): BuildCortexCommandRegistryInputs {
  return {
    summary: override.summary ?? EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: override.readiness ?? EMPTY_ASSESSMENT_READINESS,
    ledger: override.ledger ?? EMPTY_OPERATOR_ACTIVITY_LEDGER,
    triage: override.triage ?? EMPTY_DIAGNOSE_TRIAGE,
  };
}

describe("CortexCommandRegistry — behavior", () => {
  it("open_discovery_seed_planner is always available", () => {
    const r = buildCortexCommandRegistry(ctx({}));
    expect(findCortexCommand(r, "open_discovery_seed_planner")?.status).toBe(
      "available",
    );
  });

  it("open_crawl_preview blocks without seeds, unlocks with seeds", () => {
    const empty = buildCortexCommandRegistry(ctx({}));
    expect(findCortexCommand(empty, "open_crawl_preview")?.status).toBe(
      "blocked",
    );
    expect(findCortexCommand(empty, "open_crawl_preview")?.reason_code).toBe(
      "no_discovery_seeds",
    );

    const seeded = buildCortexCommandRegistry(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          discovery: { seed_count: 3, total_seed_count: 3, history_entry_count: 0 },
        },
      }),
    );
    expect(findCortexCommand(seeded, "open_crawl_preview")?.status).toBe(
      "available",
    );
    expect(findCortexCommand(seeded, "open_crawl_preview")?.reason_code).toBeNull();
  });

  it("open_topology_evidence_import blocks without environment_id", () => {
    const empty = buildCortexCommandRegistry(ctx({}));
    expect(findCortexCommand(empty, "open_topology_evidence_import")?.status).toBe(
      "blocked",
    );
    expect(
      findCortexCommand(empty, "open_topology_evidence_import")?.reason_code,
    ).toBe("no_topology_environment");

    const withEnv = buildCortexCommandRegistry(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          topology: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
            environment_id: "prod-env",
          },
        },
      }),
    );
    expect(
      findCortexCommand(withEnv, "open_topology_evidence_import")?.status,
    ).toBe("available");
  });

  it("open_topology_graph blocks without view, unlocks when has_view", () => {
    const empty = buildCortexCommandRegistry(ctx({}));
    expect(findCortexCommand(empty, "open_topology_graph")?.reason_code).toBe(
      "no_topology_view",
    );

    const withView = buildCortexCommandRegistry(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          topology: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
            has_view: true,
            node_count: 1,
          },
        },
      }),
    );
    expect(findCortexCommand(withView, "open_topology_graph")?.status).toBe(
      "available",
    );
  });

  it("open_assess_preflight follows AssessmentReadiness.overall_state", () => {
    const empty = buildCortexCommandRegistry(ctx({}));
    expect(findCortexCommand(empty, "open_assess_preflight")?.status).toBe(
      "blocked",
    );

    const partial = buildCortexCommandRegistry(
      ctx({
        readiness: {
          ...EMPTY_ASSESSMENT_READINESS,
          overall_state: "partial",
        },
      }),
    );
    expect(findCortexCommand(partial, "open_assess_preflight")?.status).toBe(
      "available",
    );

    const ready = buildCortexCommandRegistry(
      ctx({
        readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "ready" },
      }),
    );
    expect(findCortexCommand(ready, "open_assess_preflight")?.status).toBe(
      "available",
    );
  });

  it("open_diagnose_triage available when any signal exists", () => {
    const empty = buildCortexCommandRegistry(ctx({}));
    expect(findCortexCommand(empty, "open_diagnose_triage")?.status).toBe(
      "blocked",
    );

    const withLedger = buildCortexCommandRegistry(
      ctx({
        ledger: { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 1 },
      }),
    );
    expect(findCortexCommand(withLedger, "open_diagnose_triage")?.status).toBe(
      "available",
    );
  });

  it("deferred commands stay deferred with reason codes", () => {
    const r = buildCortexCommandRegistry(ctx({}));
    const c1 = findCortexCommand(r, "open_topology_3d_construct_deferred");
    expect(c1?.status).toBe("deferred");
    expect(c1?.reason_code).toBe("visual_construct_deferred");

    const c2 = findCortexCommand(r, "open_build_intent_workspace_deferred");
    expect(c2?.status).toBe("deferred");
    expect(c2?.reason_code).toBe("intent_workspace_deferred");
  });

  it("commands sort deterministically by priority then id", () => {
    const r = buildCortexCommandRegistry(ctx({}));
    for (let i = 1; i < r.commands.length; i++) {
      const a = r.commands[i - 1];
      const b = r.commands[i];
      const ok =
        a.priority < b.priority ||
        (a.priority === b.priority && a.id.localeCompare(b.id) <= 0);
      expect(ok).toBe(true);
    }
  });

  it("identical inputs produce identical registries (determinism)", () => {
    const inputs = ctx({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: { seed_count: 2, total_seed_count: 2, history_entry_count: 0 },
      },
    });
    const a = buildCortexCommandRegistry(inputs);
    const b = buildCortexCommandRegistry(inputs);
    expect(a).toEqual(b);
  });

  it("registry includes the documented 17 commands across 8 modes", () => {
    const r = buildCortexCommandRegistry(ctx({}));
    expect(r.total_count).toBe(17);
    const modes = new Set(r.commands.map((c) => c.mode));
    expect(modes.size).toBe(8);
  });

  it("counts agree with command statuses", () => {
    const r = buildCortexCommandRegistry(
      ctx({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          discovery: { seed_count: 1, total_seed_count: 1, history_entry_count: 0 },
          topology: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
            environment_id: "env",
            has_view: true,
            node_count: 1,
          },
        },
        readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "partial" },
        ledger: { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 1 },
      }),
    );
    let a = 0;
    let d = 0;
    let b = 0;
    for (const c of r.commands) {
      if (c.status === "available") a += 1;
      else if (c.status === "deferred") d += 1;
      else b += 1;
    }
    expect(r.available_count).toBe(a);
    expect(r.deferred_count).toBe(d);
    expect(r.blocked_count).toBe(b);
  });
});
