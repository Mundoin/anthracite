/**
 * V1CG — DesignHandoffContract integrity.
 *
 * Proves cross-references are non-dangling:
 *   - every ToolSurfaceContract.backing_command_id resolves in
 *     contract.command_ids (or is null)
 *   - every action_id exists in router.actions
 *   - every mode_surface.mode is one of the 8 known modes
 *   - every dashboard.target_mode exists in mode_surfaces
 *   - every dashboard.target_tool_id resolves to a tool of that mode
 *     when non-null
 */

import { describe, expect, it } from "vitest";
import {
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
const KNOWN_MODES = new Set([
  "discovery",
  "topology",
  "intake",
  "operate",
  "assess",
  "diagnose",
  "build",
  "hierarchy",
]);

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
  const contract = buildDesignHandoffContract({
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
  return { contract, router };
}

describe("DesignHandoffContract — integrity", () => {
  it("every ToolSurfaceContract.backing_command_id resolves in command_ids or null", () => {
    const { contract } = buildAll();
    const cmdSet = new Set(contract.command_ids);
    for (const t of contract.tool_surfaces) {
      if (t.backing_command_id !== null) {
        expect(
          cmdSet.has(t.backing_command_id),
          `dangling command id ${t.backing_command_id} for tool ${t.tool_id}`,
        ).toBe(true);
      }
    }
  });

  it("every contract action_id exists in router.actions", () => {
    const { contract, router } = buildAll();
    const routerIds = new Set(router.actions.map((a) => a.id));
    for (const id of contract.action_ids) {
      expect(routerIds.has(id)).toBe(true);
    }
  });

  it("every mode_surface.mode is one of the 8 known modes", () => {
    const { contract } = buildAll();
    for (const m of contract.mode_surfaces) {
      expect(KNOWN_MODES.has(m.mode)).toBe(true);
    }
  });

  it("every dashboard.target_mode exists in mode_surfaces", () => {
    const { contract } = buildAll();
    const modeSet = new Set(contract.mode_surfaces.map((m) => m.mode));
    for (const card of contract.dashboard_cards) {
      expect(modeSet.has(card.target_mode)).toBe(true);
    }
  });

  it("dashboard.target_tool_id resolves to a tool of that mode when non-null", () => {
    const { contract } = buildAll();
    for (const card of contract.dashboard_cards) {
      if (card.target_tool_id === null) continue;
      const surface = contract.mode_surfaces.find(
        (m) => m.mode === card.target_mode,
      );
      expect(
        surface?.tool_ids.includes(card.target_tool_id),
        `dashboard ${card.id} target_tool_id ${card.target_tool_id} not in ${card.target_mode}`,
      ).toBe(true);
    }
  });

  it("primary_next_action_id in mode_surfaces resolves in action_ids or is null", () => {
    const { contract } = buildAll();
    const actionSet = new Set(contract.action_ids);
    for (const m of contract.mode_surfaces) {
      if (m.primary_next_action_id !== null) {
        expect(actionSet.has(m.primary_next_action_id)).toBe(true);
      }
    }
  });
});
