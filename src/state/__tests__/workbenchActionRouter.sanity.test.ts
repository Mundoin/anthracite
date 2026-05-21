/**
 * V1BY — Opus sanity check for WorkbenchActionRouter contract.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_WORKBENCH_ACTION_ROUTER,
  buildWorkbenchActionRouter,
} from "../workbenchActionRouter";
import {
  EMPTY_WORKBENCH_CONTEXT_SUMMARY,
} from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import { EMPTY_DIAGNOSE_TRIAGE } from "../../modes/diagnose/diagnoseTriage";
import {
  buildCortexCommandRegistry,
} from "../cortexCommandRegistry";

describe("WorkbenchActionRouter — sanity", () => {
  it("EMPTY constant matches type shape", () => {
    expect(EMPTY_WORKBENCH_ACTION_ROUTER.actions).toEqual([]);
    expect(EMPTY_WORKBENCH_ACTION_ROUTER.total_count).toBe(0);
    expect(EMPTY_WORKBENCH_ACTION_ROUTER.available_count).toBe(0);
    expect(EMPTY_WORKBENCH_ACTION_ROUTER.blocked_count).toBe(0);
    expect(EMPTY_WORKBENCH_ACTION_ROUTER.top_action_id).toBeNull();
  });

  it("EMPTY context yields stage_discovery_seeds as top action", () => {
    const registry = buildCortexCommandRegistry({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
    });
    const r = buildWorkbenchActionRouter({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      registry,
    });
    expect(r.top_action_id).toBe("stage_discovery_seeds");
    expect(r.total_count).toBeGreaterThan(0);
  });
});
