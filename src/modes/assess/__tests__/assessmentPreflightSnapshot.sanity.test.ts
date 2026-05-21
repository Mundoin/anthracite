/**
 * V1BZ — Opus sanity check for AssessmentPreflightSnapshot contract.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT,
  buildAssessmentPreflightSnapshot,
} from "../assessmentPreflightSnapshot";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import { EMPTY_DIAGNOSE_TRIAGE } from "../../diagnose/diagnoseTriage";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../../../state/operatorActivityLedger";
import { EMPTY_WORKBENCH_ACTION_ROUTER } from "../../../state/workbenchActionRouter";
import { EMPTY_CORTEX_COMMAND_REGISTRY } from "../../../state/cortexCommandRegistry";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

describe("AssessmentPreflightSnapshot — sanity", () => {
  it("EMPTY constant matches shape with honesty limitations", () => {
    expect(EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT.can_start).toBe(false);
    expect(EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT.limitations).toContain(
      "No assessment execution has run yet.",
    );
  });

  it("empty inputs produce can_start=false and missing inputs", () => {
    const s = buildAssessmentPreflightSnapshot({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      router: EMPTY_WORKBENCH_ACTION_ROUTER,
      registry: EMPTY_CORTEX_COMMAND_REGISTRY,
      now: () => FIXED_NOW,
    });
    expect(s.can_start).toBe(false);
    expect(s.missing_inputs.length).toBeGreaterThan(0);
    expect(s.created_at).toBe(FIXED_NOW);
    expect(s.limitations).toContain("No assessment execution has run yet.");
  });

  it("ready readiness produces can_start=true", () => {
    const s = buildAssessmentPreflightSnapshot({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: {
        ...EMPTY_ASSESSMENT_READINESS,
        overall_state: "ready",
        assess_state: "context_ready",
      },
      triage: EMPTY_DIAGNOSE_TRIAGE,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      router: EMPTY_WORKBENCH_ACTION_ROUTER,
      registry: EMPTY_CORTEX_COMMAND_REGISTRY,
      now: () => FIXED_NOW,
    });
    expect(s.can_start).toBe(true);
  });
});
