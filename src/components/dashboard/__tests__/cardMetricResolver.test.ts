/**
 * D2 — cardMetricResolver sanity.
 */

import { describe, expect, it } from "vitest";
import {
  resolveDashboardCard,
  type DashboardSpineBundle,
} from "../cardMetricResolver";
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

const EMPTY: DashboardSpineBundle = {
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

describe("cardMetricResolver", () => {
  it("resolves every required card id without throwing", () => {
    for (const id of REQUIRED_CARD_IDS) {
      const p = resolveDashboardCard(id, EMPTY);
      expect(p).toBeDefined();
      expect(typeof p.metric).toBe("string");
      expect(typeof p.summary).toBe("string");
      expect(p.iconId.length).toBeGreaterThan(0);
    }
  });

  it("environment_profile chip follows profile_state", () => {
    const p = resolveDashboardCard("environment_profile", EMPTY);
    expect(p.chip.tone).toBe("idle");
  });

  it("readiness chip ready when overall_state ready", () => {
    const p = resolveDashboardCard("readiness", {
      ...EMPTY,
      readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "ready" },
    });
    expect(p.chip.variant).toBe("readiness");
    expect(p.chip.tone).toBe("ready");
  });

  it("diagnose_triage chip = critical when critical_count > 0", () => {
    const p = resolveDashboardCard("diagnose_triage", {
      ...EMPTY,
      triage: {
        ...EMPTY_DIAGNOSE_TRIAGE,
        total_count: 2,
        critical_count: 1,
        warning_count: 1,
      },
    });
    expect(p.chip.variant).toBe("risk");
    expect(p.chip.tone).toBe("critical");
  });

  it("top_action disabled + chip deferred when no top_action_id", () => {
    const p = resolveDashboardCard("top_action", EMPTY);
    expect(p.disabled).toBe(true);
    expect(p.chip.tone).toBe("deferred");
  });

  it("topology_construct disabled when no nodes", () => {
    const p = resolveDashboardCard("topology_construct", EMPTY);
    expect(p.disabled).toBe(true);
  });

  it("unknown card id returns safe fallback projection", () => {
    const p = resolveDashboardCard("not-a-card", EMPTY);
    expect(p.metric).toBe("—");
    expect(p.disabled).toBe(true);
  });
});
