/**
 * V1CG — Opus sanity check for DesignHandoffContract contract.
 */

import { describe, expect, it } from "vitest";
import {
  DESIGN_HANDOFF_LIMITATIONS,
  DESIGN_HANDOFF_VERSION,
  buildDesignHandoffContract,
} from "../designHandoffContract";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import { buildDiagnoseTriage } from "../../modes/diagnose/diagnoseTriage";
import { buildCortexCommandRegistry } from "../cortexCommandRegistry";
import { buildWorkbenchActionRouter } from "../workbenchActionRouter";
import { buildAssessmentPreflightSnapshot } from "../../modes/assess/assessmentPreflightSnapshot";
import { buildAssessmentReportDraft } from "../../modes/assess/assessmentReportDraft";
import { buildBuildIntentWorkspace } from "../../modes/build/buildIntentWorkspace";
import { EMPTY_TOPOLOGY_CONSTRUCT } from "../../modes/topology/topologyConstructModel";
import { buildEnvironmentProfile } from "../environmentProfile";
import { buildModeCapabilityMatrix } from "../modeCapabilityMatrix";
import { buildOperatorSessionExport } from "../operatorSessionExport";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function buildAll() {
  const summary = EMPTY_WORKBENCH_CONTEXT_SUMMARY;
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
  const profile = buildEnvironmentProfile({
    summary,
    readiness,
    ledger,
    triage,
    router,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
    build,
    preflight,
  });
  const matrix = buildModeCapabilityMatrix({
    profile,
    summary,
    readiness,
    registry,
    router,
    triage,
    preflight,
    draft,
    build,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
  });
  const sessionExport = buildOperatorSessionExport({
    profile,
    summary,
    readiness,
    ledger,
    triage,
    registry,
    router,
    preflight,
    draft,
    build,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
    matrix,
    now: () => FIXED_NOW,
  });
  return buildDesignHandoffContract({
    matrix,
    registry,
    router,
    profile,
    preflight,
    draft,
    build,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
    triage,
    sessionExport,
    now: () => FIXED_NOW,
  });
}

describe("DesignHandoffContract — sanity", () => {
  it("version is v1cg and limitations are present", () => {
    const c = buildAll();
    expect(c.version).toBe(DESIGN_HANDOFF_VERSION);
    expect(c.limitations).toEqual(DESIGN_HANDOFF_LIMITATIONS);
  });

  it("contract includes all 8 modes", () => {
    const c = buildAll();
    expect(c.mode_surfaces.length).toBe(8);
    const modes = c.mode_surfaces.map((m) => m.mode);
    expect(modes).toEqual([
      "discovery",
      "topology",
      "intake",
      "operate",
      "assess",
      "diagnose",
      "build",
      "hierarchy",
    ]);
  });

  it("contract_id derives from profile by default", () => {
    const c = buildAll();
    expect(c.contract_id.startsWith("handoff-")).toBe(true);
    expect(c.created_at).toBe(FIXED_NOW);
  });
});
