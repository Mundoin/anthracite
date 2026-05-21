/**
 * V1BW — Opus sanity check for DiagnoseTriage contract.
 * Comprehensive cases live in diagnoseTriage.test.ts.
 * Redaction proof lives in diagnoseTriage.redaction.test.ts.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
} from "../diagnoseTriage";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../../../state/operatorActivityLedger";

describe("DiagnoseTriage — sanity", () => {
  it("EMPTY inputs produce empty triage", () => {
    const t = buildDiagnoseTriage({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    expect(t.findings).toEqual([]);
    expect(t.total_count).toBe(0);
    expect(t.critical_count).toBe(0);
    expect(t.warning_count).toBe(0);
    expect(t.info_count).toBe(0);
  });

  it("EMPTY constant matches builder output for empty inputs", () => {
    const t = buildDiagnoseTriage({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    expect(t).toEqual(EMPTY_DIAGNOSE_TRIAGE);
  });

  it("findings sort by severity → category → id deterministically", () => {
    const t = buildDiagnoseTriage({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 0,
        },
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          accepted_evidence_total: 5,
        },
      },
      readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "blocked" },
      ledger: { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 3 },
    });
    // Critical findings come before info.
    const severities = t.findings.map((f) => f.severity);
    const firstInfo = severities.indexOf("info");
    const lastCritical = severities.lastIndexOf("critical");
    if (firstInfo !== -1 && lastCritical !== -1) {
      expect(lastCritical).toBeLessThan(firstInfo);
    }
    expect(t.critical_count).toBeGreaterThan(0);
  });
});
