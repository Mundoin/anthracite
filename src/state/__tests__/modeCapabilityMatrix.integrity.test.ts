/**
 * V1CE — ModeCapabilityMatrix integrity.
 *
 * Every tool with a non-null backing_command_id MUST resolve in the
 * CortexCommandRegistry. Guards against dangling refs.
 */

import { describe, expect, it } from "vitest";
import { buildModeCapabilityMatrix } from "../modeCapabilityMatrix";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import { buildDiagnoseTriage } from "../../modes/diagnose/diagnoseTriage";
import { buildWorkbenchActionRouter } from "../workbenchActionRouter";
import {
  buildCortexCommandRegistry,
  findCortexCommand,
} from "../cortexCommandRegistry";
import { buildAssessmentPreflightSnapshot } from "../../modes/assess/assessmentPreflightSnapshot";
import { buildAssessmentReportDraft } from "../../modes/assess/assessmentReportDraft";
import { buildBuildIntentWorkspace } from "../../modes/build/buildIntentWorkspace";
import { EMPTY_TOPOLOGY_CONSTRUCT } from "../../modes/topology/topologyConstructModel";
import { EMPTY_ENVIRONMENT_PROFILE } from "../environmentProfile";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function buildAll(summaryOverride = EMPTY_WORKBENCH_CONTEXT_SUMMARY) {
  const summary = summaryOverride;
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

describe("ModeCapabilityMatrix — integrity", () => {
  it("every backing_command_id resolves in the registry (empty context)", () => {
    const inputs = buildAll();
    const m = buildModeCapabilityMatrix(inputs);
    for (const mode of m.modes) {
      for (const t of mode.tools) {
        if (t.backing_command_id !== null) {
          expect(
            findCortexCommand(inputs.registry, t.backing_command_id),
            `dangling command id ${t.backing_command_id} (tool ${t.tool_id})`,
          ).not.toBeNull();
        }
      }
    }
  });

  it("every backing_command_id resolves in the registry (populated context)", () => {
    const inputs = buildAll({
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      discovery: { seed_count: 2, total_seed_count: 2, history_entry_count: 0 },
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        environment_id: "prod",
        has_view: true,
        node_count: 3,
        edge_count: 2,
      },
    });
    const m = buildModeCapabilityMatrix(inputs);
    for (const mode of m.modes) {
      for (const t of mode.tools) {
        if (t.backing_command_id !== null) {
          expect(
            findCortexCommand(inputs.registry, t.backing_command_id),
          ).not.toBeNull();
        }
      }
    }
  });

  it("tool.state inherits command status (blocked command → blocked tool)", () => {
    // Empty context → open_crawl_preview is blocked in registry → crawl_preview tool blocked.
    const inputs = buildAll();
    const m = buildModeCapabilityMatrix(inputs);
    const discovery = m.modes.find((x) => x.mode === "discovery");
    const crawl = discovery?.tools.find((t) => t.tool_id === "crawl_preview");
    expect(crawl?.state).toBe("blocked");
    const cmd = findCortexCommand(inputs.registry, "open_crawl_preview");
    expect(cmd?.status).toBe("blocked");
  });
});
