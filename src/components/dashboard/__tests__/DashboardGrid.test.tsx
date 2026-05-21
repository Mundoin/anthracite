/**
 * D2 — DashboardGrid renders the V1CG card contract end-to-end.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardGrid } from "../DashboardGrid";
import type { DashboardSpineBundle } from "../cardMetricResolver";
import { buildDesignHandoffContract } from "../../../state/designHandoffContract";
import { EMPTY_ENVIRONMENT_PROFILE } from "../../../state/environmentProfile";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import { EMPTY_WORKBENCH_ACTION_ROUTER } from "../../../state/workbenchActionRouter";
import { EMPTY_DIAGNOSE_TRIAGE } from "../../../modes/diagnose/diagnoseTriage";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../../../state/operatorActivityLedger";
import { EMPTY_TOPOLOGY_CONSTRUCT } from "../../../modes/topology/topologyConstructModel";
import { EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT } from "../../../modes/assess/assessmentPreflightSnapshot";
import { EMPTY_ASSESSMENT_REPORT_DRAFT } from "../../../modes/assess/assessmentReportDraft";
import { EMPTY_BUILD_INTENT_WORKSPACE } from "../../../modes/build/buildIntentWorkspace";
import { EMPTY_MODE_CAPABILITY_MATRIX } from "../../../state/modeCapabilityMatrix";
import { EMPTY_CORTEX_COMMAND_REGISTRY } from "../../../state/cortexCommandRegistry";
import { buildOperatorSessionExport } from "../../../state/operatorSessionExport";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function buildContract() {
  const sessionExport = buildOperatorSessionExport({
    profile: EMPTY_ENVIRONMENT_PROFILE,
    summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: EMPTY_ASSESSMENT_READINESS,
    ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    triage: EMPTY_DIAGNOSE_TRIAGE,
    registry: EMPTY_CORTEX_COMMAND_REGISTRY,
    router: EMPTY_WORKBENCH_ACTION_ROUTER,
    preflight: EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT,
    draft: EMPTY_ASSESSMENT_REPORT_DRAFT,
    build: EMPTY_BUILD_INTENT_WORKSPACE,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
    matrix: EMPTY_MODE_CAPABILITY_MATRIX,
    now: () => FIXED_NOW,
  });
  return buildDesignHandoffContract({
    matrix: EMPTY_MODE_CAPABILITY_MATRIX,
    registry: EMPTY_CORTEX_COMMAND_REGISTRY,
    router: EMPTY_WORKBENCH_ACTION_ROUTER,
    profile: EMPTY_ENVIRONMENT_PROFILE,
    preflight: EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT,
    draft: EMPTY_ASSESSMENT_REPORT_DRAFT,
    build: EMPTY_BUILD_INTENT_WORKSPACE,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
    triage: EMPTY_DIAGNOSE_TRIAGE,
    sessionExport,
    now: () => FIXED_NOW,
  });
}

const SPINES: DashboardSpineBundle = {
  profile: EMPTY_ENVIRONMENT_PROFILE,
  readiness: EMPTY_ASSESSMENT_READINESS,
  router: EMPTY_WORKBENCH_ACTION_ROUTER,
  triage: EMPTY_DIAGNOSE_TRIAGE,
  ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
  construct: EMPTY_TOPOLOGY_CONSTRUCT,
  preflight: EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT,
  draft: EMPTY_ASSESSMENT_REPORT_DRAFT,
  build: EMPTY_BUILD_INTENT_WORKSPACE,
  matrix: EMPTY_MODE_CAPABILITY_MATRIX,
};

const REQUIRED_CARD_IDS = [
  "environment_profile",
  "readiness",
  "top_action",
  "diagnose_triage",
  "operator_activity",
  "topology_construct",
  "assess_preflight",
  "report_draft",
  "build_intent",
  "capability_matrix",
] as const;

describe("DashboardGrid — D2", () => {
  it("renders all 10 V1CG card ids", () => {
    const contract = buildContract();
    render(
      <div className="anth">
        <DashboardGrid cards={contract.dashboard_cards} spines={SPINES} />
      </div>,
    );
    expect(screen.getByTestId("dashboard-grid")).toBeInTheDocument();
    expect(
      screen.getByTestId("dashboard-grid").getAttribute("data-card-count"),
    ).toBe("10");
    for (const id of REQUIRED_CARD_IDS) {
      expect(screen.getByTestId(`dashboard-card-${id}`)).toBeInTheDocument();
    }
  });

  it("each card carries its target_mode metadata from the contract", () => {
    const contract = buildContract();
    render(
      <div className="anth">
        <DashboardGrid cards={contract.dashboard_cards} spines={SPINES} />
      </div>,
    );
    for (const card of contract.dashboard_cards) {
      const el = screen.getByTestId(`dashboard-card-${card.id}`);
      expect(el.getAttribute("data-target-mode")).toBe(card.target_mode);
    }
  });

  it("zero cards renders an empty grid", () => {
    render(
      <div className="anth">
        <DashboardGrid cards={[]} spines={SPINES} />
      </div>,
    );
    expect(
      screen.getByTestId("dashboard-grid").getAttribute("data-card-count"),
    ).toBe("0");
  });
});
