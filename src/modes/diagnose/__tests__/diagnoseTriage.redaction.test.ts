/**
 * V1BW — DiagnoseTriage redaction proof.
 *
 * Asserts that even with rich, populated inputs, JSON.stringify(triage)
 * contains zero forbidden tokens (raw configs, evidence payloads,
 * markdown bodies, command output, credentials, secrets, evidence_set_id,
 * raw error messages).
 */

import { describe, expect, it } from "vitest";
import {
  buildDiagnoseTriage,
  type DiagnoseTriageFinding,
} from "../diagnoseTriage";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../../../state/operatorActivityLedger";

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

describe("DiagnoseTriage — redaction", () => {
  it("serialized triage contains zero forbidden tokens for populated inputs", () => {
    const t = buildDiagnoseTriage({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: { seed_count: 4, total_seed_count: 4, history_entry_count: 2 },
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 6,
          edge_count: 0,
        },
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          attempted_import_count: 5,
          accepted_import_count: 1,
          rejected_import_count: 4,
          accepted_evidence_total: 2,
          rejected_evidence_total: 9,
        },
        crawl_preview: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
          frontier_count: 3,
        },
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parsed_device_count: 8,
          finding_count: 2,
        },
      },
      readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "blocked" },
      ledger: { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 6 },
    });
    const json = JSON.stringify(t);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
    expect(t.findings.length).toBeGreaterThan(0);
  });

  it("each finding exposes only documented fields", () => {
    const t = buildDiagnoseTriage({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 4,
          edge_count: 0,
        },
      },
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    const allowed: ReadonlyArray<keyof DiagnoseTriageFinding> = [
      "id",
      "severity",
      "category",
      "title",
      "reason_code",
      "supporting_counts",
      "recommended_action",
    ];
    for (const f of t.findings) {
      expect(Object.keys(f).sort()).toEqual([...allowed].sort());
    }
  });

  it("supporting_counts values are all numeric", () => {
    const t = buildDiagnoseTriage({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          accepted_evidence_total: 3,
        },
      },
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    for (const f of t.findings) {
      for (const v of Object.values(f.supporting_counts)) {
        expect(typeof v).toBe("number");
      }
    }
  });
});
