/**
 * V1CE — ModeCapabilityMatrix comprehensive cases.
 */

import { describe, expect, it } from "vitest";
import {
  buildModeCapabilityMatrix,
  type BuildModeCapabilityMatrixInputs,
  type ModeCapabilityMode,
  type ToolCapability,
} from "../modeCapabilityMatrix";
import {
  EMPTY_WORKBENCH_CONTEXT_SUMMARY,
  type WorkbenchContextSummary,
} from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import { buildDiagnoseTriage } from "../../modes/diagnose/diagnoseTriage";
import {
  buildWorkbenchActionRouter,
} from "../workbenchActionRouter";
import { buildCortexCommandRegistry } from "../cortexCommandRegistry";
import {
  buildAssessmentPreflightSnapshot,
} from "../../modes/assess/assessmentPreflightSnapshot";
import {
  buildAssessmentReportDraft,
} from "../../modes/assess/assessmentReportDraft";
import {
  buildBuildIntentWorkspace,
} from "../../modes/build/buildIntentWorkspace";
import { EMPTY_TOPOLOGY_CONSTRUCT } from "../../modes/topology/topologyConstructModel";
import { EMPTY_ENVIRONMENT_PROFILE } from "../environmentProfile";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function inputsFromSummary(summary: WorkbenchContextSummary): BuildModeCapabilityMatrixInputs {
  const readiness = EMPTY_ASSESSMENT_READINESS;
  const ledger = EMPTY_OPERATOR_ACTIVITY_LEDGER;
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
  const draft = buildAssessmentReportDraft({
    preflight,
    summary,
    readiness,
    triage,
    ledger,
    router,
    registry,
    now: () => FIXED_NOW,
  });
  const build = buildBuildIntentWorkspace({
    summary,
    readiness,
    router,
    registry,
    preflight,
    now: () => FIXED_NOW,
  });
  return {
    profile: EMPTY_ENVIRONMENT_PROFILE,
    summary,
    readiness,
    registry,
    router,
    triage,
    preflight,
    draft,
    build,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
  };
}

function tools(
  m: ReturnType<typeof buildModeCapabilityMatrix>,
  mode: ModeCapabilityMode,
): readonly ToolCapability[] {
  return m.modes.find((x) => x.mode === mode)?.tools ?? [];
}

describe("ModeCapabilityMatrix — behavior", () => {
  it("matrix includes all 8 modes", () => {
    const m = buildModeCapabilityMatrix(inputsFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY));
    expect(m.total_modes).toBe(8);
  });

  it("discovery crawl_preview blocks without seeds and unlocks with seed signal", () => {
    const empty = buildModeCapabilityMatrix(
      inputsFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY),
    );
    const emptyCrawl = tools(empty, "discovery").find(
      (t) => t.tool_id === "crawl_preview",
    );
    expect(emptyCrawl?.state).toBe("blocked");
    expect(emptyCrawl?.reason_code).toBe("no_discovery_seeds");

    const seeded = buildModeCapabilityMatrix(
      inputsFromSummary({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: { seed_count: 2, total_seed_count: 2, history_entry_count: 0 },
      }),
    );
    const seededCrawl = tools(seeded, "discovery").find(
      (t) => t.tool_id === "crawl_preview",
    );
    expect(seededCrawl?.state).toBe("available");
  });

  it("topology evidence_import follows registry/environment state", () => {
    const empty = buildModeCapabilityMatrix(
      inputsFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY),
    );
    const emptyImp = tools(empty, "topology").find(
      (t) => t.tool_id === "evidence_import",
    );
    expect(emptyImp?.state).toBe("blocked");
    expect(emptyImp?.reason_code).toBe("no_topology_environment");

    const withEnv = buildModeCapabilityMatrix(
      inputsFromSummary({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          environment_id: "prod",
        },
      }),
    );
    expect(
      tools(withEnv, "topology").find((t) => t.tool_id === "evidence_import")
        ?.state,
    ).toBe("available");
  });

  it("assess report_draft is available after V1CA bundles a draft", () => {
    const m = buildModeCapabilityMatrix(
      inputsFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY),
    );
    const t = tools(m, "assess").find((x) => x.tool_id === "report_draft");
    expect(t?.state).toBe("available");
  });

  it("deferred tools remain deferred", () => {
    const m = buildModeCapabilityMatrix(
      inputsFromSummary({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: { seed_count: 5, total_seed_count: 5, history_entry_count: 0 },
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          environment_id: "prod",
          has_view: true,
          node_count: 3,
          edge_count: 2,
        },
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parsed_device_count: 2,
        },
      }),
    );
    // Build deploy + rollback + config_generation: deferred regardless of context
    const buildTools = tools(m, "build");
    expect(buildTools.find((t) => t.tool_id === "deploy")?.state).toBe("deferred");
    expect(buildTools.find((t) => t.tool_id === "rollback")?.state).toBe(
      "deferred",
    );
    expect(buildTools.find((t) => t.tool_id === "config_generation")?.state).toBe(
      "deferred",
    );
    // Topology 3D renderer: deferred
    expect(
      tools(m, "topology").find((t) => t.tool_id === "topology_3d_renderer")?.state,
    ).toBe("deferred");
    // Assess execution + PDF: deferred
    expect(
      tools(m, "assess").find((t) => t.tool_id === "assessment_execution")?.state,
    ).toBe("deferred");
    expect(
      tools(m, "assess").find((t) => t.tool_id === "pdf_report")?.state,
    ).toBe("deferred");
    // Diagnose deferred tools
    expect(
      tools(m, "diagnose").find((t) => t.tool_id === "terminal")?.state,
    ).toBe("deferred");
    // Hierarchy inventory_diff
    expect(
      tools(m, "hierarchy").find((t) => t.tool_id === "inventory_diff")?.state,
    ).toBe("deferred");
  });

  it("mode state aggregates honestly: available tool with deferreds → partial", () => {
    const m = buildModeCapabilityMatrix(
      inputsFromSummary({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: { seed_count: 1, total_seed_count: 1, history_entry_count: 0 },
      }),
    );
    // Discovery has target_capture/seed_planner/crawl_preview available +
    // recursive_crawler deferred → partial.
    expect(m.modes.find((x) => x.mode === "discovery")?.state).toBe("partial");
  });

  it("primary_next_action_id derives from router action targeting that mode", () => {
    const m = buildModeCapabilityMatrix(
      inputsFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY),
    );
    expect(
      m.modes.find((x) => x.mode === "discovery")?.primary_next_action_id,
    ).toBe("stage_discovery_seeds");
  });

  it("modes order is fixed and deterministic", () => {
    const a = buildModeCapabilityMatrix(
      inputsFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY),
    );
    const b = buildModeCapabilityMatrix(
      inputsFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY),
    );
    expect(a.modes.map((x) => x.mode)).toEqual(b.modes.map((x) => x.mode));
    expect(a).toEqual(b);
  });

  it("counts agree with mode states", () => {
    const m = buildModeCapabilityMatrix(
      inputsFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY),
    );
    let a = 0;
    let d = 0;
    let b = 0;
    for (const mode of m.modes) {
      if (mode.state === "available") a += 1;
      else if (mode.state === "deferred") d += 1;
      else if (mode.state === "blocked") b += 1;
    }
    expect(m.available_count).toBe(a);
    expect(m.deferred_count).toBe(d);
    expect(m.blocked_count).toBe(b);
    expect(m.primary_blocker_count).toBe(b);
  });
});
