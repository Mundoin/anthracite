/**
 * V1CA — AssessmentReportDraft redaction proof.
 *
 * Proves forbidden tokens never appear in JSON.stringify(draft) NOR in
 * draft.markdown for populated inputs.
 */

import { describe, expect, it } from "vitest";
import {
  buildAssessmentReportDraft,
  type AssessmentReportDraft,
} from "../assessmentReportDraft";
import { buildAssessmentPreflightSnapshot } from "../assessmentPreflightSnapshot";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import { buildDiagnoseTriage } from "../../diagnose/diagnoseTriage";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../../../state/operatorActivityLedger";
import { buildWorkbenchActionRouter } from "../../../state/workbenchActionRouter";
import { buildCortexCommandRegistry } from "../../../state/cortexCommandRegistry";

const FORBIDDEN_TOKENS: readonly string[] = [
  "BEGIN RSA PRIVATE KEY",
  "password=hunter2",
  "evidence_set_id",
  "raw_config:",
  "stderr:",
  "```",
  "AKIAIOSFODNN7EXAMPLE",
  "Bearer ey",
];

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function buildPopulatedDraft() {
  const summary = {
    ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    discovery: { seed_count: 4, total_seed_count: 4, history_entry_count: 1 },
    crawl_preview: {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
      frontier_count: 3,
    },
    topology: {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
      node_count: 6,
      edge_count: 0,
      environment_id: "prod",
      has_view: true,
    },
    evidence_import: {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
      attempted_import_count: 5,
      accepted_import_count: 1,
      rejected_import_count: 4,
      accepted_evidence_total: 2,
      rejected_evidence_total: 9,
    },
    intake: {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
      parsed_device_count: 8,
      finding_count: 2,
      parse_status: "parsed" as const,
    },
  };
  const readiness = {
    ...EMPTY_ASSESSMENT_READINESS,
    overall_state: "blocked" as const,
    assess_state: "blocked" as const,
  };
  const ledger = { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 6 };
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
  return buildAssessmentReportDraft({
    preflight,
    summary,
    readiness,
    triage,
    ledger,
    router,
    registry,
    now: () => FIXED_NOW,
  });
}

describe("AssessmentReportDraft — redaction", () => {
  it("serialized draft contains zero forbidden tokens", () => {
    const d = buildPopulatedDraft();
    const json = JSON.stringify(d);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
  });

  it("rendered markdown contains zero forbidden tokens", () => {
    const d = buildPopulatedDraft();
    for (const token of FORBIDDEN_TOKENS) {
      expect(d.markdown.includes(token)).toBe(false);
    }
  });

  it("draft exposes only documented fields", () => {
    const d = buildPopulatedDraft();
    const allowed: ReadonlyArray<keyof AssessmentReportDraft> = [
      "draft_id",
      "created_at",
      "title",
      "sections",
      "markdown",
      "json_summary",
      "limitations",
    ];
    expect(Object.keys(d).sort()).toEqual([...allowed].sort());
  });
});
