/**
 * V1BU — Opus sanity check for the AssessmentReadiness model contract.
 * Comprehensive cases live in assessmentReadiness.test.ts (Lane C).
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_ASSESSMENT_READINESS,
  buildAssessmentReadiness,
} from "../assessmentReadiness";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";

describe("buildAssessmentReadiness — sanity", () => {
  it("EMPTY context summary produces empty overall state", () => {
    const r = buildAssessmentReadiness(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
    expect(r.overall_state).toBe("empty");
    expect(r.next_actions).toContain("stage_seeds");
    expect(r.blocker_reason_codes).toContain("no_signals");
  });

  it("EMPTY constant matches builder output for empty summary on core fields", () => {
    const r = buildAssessmentReadiness(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
    expect(r.overall_state).toBe(EMPTY_ASSESSMENT_READINESS.overall_state);
    expect(r.discovery_state).toBe(EMPTY_ASSESSMENT_READINESS.discovery_state);
    expect(r.assess_state).toBe(EMPTY_ASSESSMENT_READINESS.assess_state);
  });

  it("ready when topology AND evidence both present", () => {
    const r = buildAssessmentReadiness({
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 3,
        edge_count: 2,
        has_view: true,
      },
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        attempted_import_count: 1,
        accepted_import_count: 1,
        accepted_evidence_total: 2,
      },
    });
    expect(r.overall_state).toBe("ready");
    expect(r.assess_state).toBe("context_ready");
    expect(r.next_actions).toContain("ready_for_assess_preflight");
  });
});
