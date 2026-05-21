/**
 * V1CE — Opus sanity check for ModeCapabilityMatrix contract.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_MODE_CAPABILITY_MATRIX,
  MATRIX_LIMITATIONS,
  buildModeCapabilityMatrix,
} from "../modeCapabilityMatrix";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
} from "../../modes/diagnose/diagnoseTriage";
import {
  EMPTY_WORKBENCH_ACTION_ROUTER,
  buildWorkbenchActionRouter,
} from "../workbenchActionRouter";
import {
  buildCortexCommandRegistry,
  EMPTY_CORTEX_COMMAND_REGISTRY,
} from "../cortexCommandRegistry";
import { EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT } from "../../modes/assess/assessmentPreflightSnapshot";
import { EMPTY_ASSESSMENT_REPORT_DRAFT } from "../../modes/assess/assessmentReportDraft";
import { EMPTY_BUILD_INTENT_WORKSPACE } from "../../modes/build/buildIntentWorkspace";
import { EMPTY_TOPOLOGY_CONSTRUCT } from "../../modes/topology/topologyConstructModel";
import { EMPTY_ENVIRONMENT_PROFILE } from "../environmentProfile";

function emptyInputs() {
  const triage = buildDiagnoseTriage({
    summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: EMPTY_ASSESSMENT_READINESS,
    ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
  });
  const registry = buildCortexCommandRegistry({
    summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: EMPTY_ASSESSMENT_READINESS,
    ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    triage,
  });
  const router = buildWorkbenchActionRouter({
    summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: EMPTY_ASSESSMENT_READINESS,
    ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    triage,
    registry,
  });
  return {
    profile: EMPTY_ENVIRONMENT_PROFILE,
    summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: EMPTY_ASSESSMENT_READINESS,
    registry,
    router,
    triage,
    preflight: EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT,
    draft: EMPTY_ASSESSMENT_REPORT_DRAFT,
    build: EMPTY_BUILD_INTENT_WORKSPACE,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
  };
}

describe("ModeCapabilityMatrix — sanity", () => {
  it("EMPTY constant carries limitations", () => {
    expect(EMPTY_MODE_CAPABILITY_MATRIX.limitations).toEqual(MATRIX_LIMITATIONS);
    expect(EMPTY_MODE_CAPABILITY_MATRIX.total_modes).toBe(0);
  });

  it("EMPTY-equivalent inputs produce a matrix with 8 modes", () => {
    const m = buildModeCapabilityMatrix(emptyInputs());
    expect(m.total_modes).toBe(8);
    const modeIds = m.modes.map((x) => x.mode);
    expect(modeIds).toEqual([
      "discovery",
      "topology",
      "intake",
      "operate",
      "assess",
      "diagnose",
      "build",
      "hierarchy",
    ]);
    expect(m.limitations).toEqual(MATRIX_LIMITATIONS);
  });

  it("registry override propagates command-status — empty registry deferrs commanded tools", () => {
    const i = emptyInputs();
    const m = buildModeCapabilityMatrix({
      ...i,
      registry: EMPTY_CORTEX_COMMAND_REGISTRY,
    });
    // open_discovery_seed_planner not in empty registry → seed_planner falls
    // through stateFromCommand to deferred per missing-command rule.
    const discovery = m.modes.find((x) => x.mode === "discovery");
    expect(
      discovery?.tools.find((t) => t.tool_id === "seed_planner")?.state,
    ).toBe("deferred");
  });
});
