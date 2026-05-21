/**
 * V1CA — Opus sanity check for AssessmentReportDraft contract.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_ASSESSMENT_REPORT_DRAFT,
  HONESTY_LINES,
  buildAssessmentReportDraft,
} from "../assessmentReportDraft";
import { buildAssessmentPreflightSnapshot } from "../assessmentPreflightSnapshot";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import { EMPTY_DIAGNOSE_TRIAGE } from "../../diagnose/diagnoseTriage";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../../../state/operatorActivityLedger";
import { EMPTY_WORKBENCH_ACTION_ROUTER } from "../../../state/workbenchActionRouter";
import { EMPTY_CORTEX_COMMAND_REGISTRY } from "../../../state/cortexCommandRegistry";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function emptyPreflight() {
  return buildAssessmentPreflightSnapshot({
    summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: EMPTY_ASSESSMENT_READINESS,
    triage: EMPTY_DIAGNOSE_TRIAGE,
    ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    router: EMPTY_WORKBENCH_ACTION_ROUTER,
    registry: EMPTY_CORTEX_COMMAND_REGISTRY,
    now: () => FIXED_NOW,
    reportDraftAvailable: true,
  });
}

describe("AssessmentReportDraft — sanity", () => {
  it("EMPTY constant carries honesty lines", () => {
    expect(EMPTY_ASSESSMENT_REPORT_DRAFT.limitations).toEqual(HONESTY_LINES);
  });

  it("empty inputs produce a draft with sections and limitations", () => {
    const d = buildAssessmentReportDraft({
      preflight: emptyPreflight(),
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      router: EMPTY_WORKBENCH_ACTION_ROUTER,
      registry: EMPTY_CORTEX_COMMAND_REGISTRY,
      now: () => FIXED_NOW,
    });
    expect(d.sections.length).toBe(10);
    for (const honesty of HONESTY_LINES) {
      expect(d.limitations).toContain(honesty);
    }
    expect(d.markdown.startsWith("# Assessment Report Draft")).toBe(true);
  });

  it("draft_id derives from preflight by default", () => {
    const p = emptyPreflight();
    const d = buildAssessmentReportDraft({
      preflight: p,
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      router: EMPTY_WORKBENCH_ACTION_ROUTER,
      registry: EMPTY_CORTEX_COMMAND_REGISTRY,
      now: () => FIXED_NOW,
    });
    expect(d.draft_id).toBe(`draft-${p.snapshot_id}`);
    expect(d.created_at).toBe(FIXED_NOW);
  });
});
