import { describe, expect, it } from "vitest";

import type {
  BatchRunExport,
  BatchRunExportFinding,
  BatchRunExportValidationReport,
} from "../../../types/batchRunExport";
import {
  exportAsDisplaySummary,
  exportReportAsValidationReport,
} from "../displayAdapter";

function makeArtifact(): BatchRunExport {
  return {
    export_version: 1,
    kind: "batch_run_export",
    batch_run_status: "complete",
    source: { kind: "paste" },
    summary: {
      total_count: 2,
      parsed_count: 2,
      failed_count: 0,
      skipped_count: 0,
      pending_count: 0,
      with_findings_count: 1,
      clean_count: 1,
      severity_counts: { critical: 1, high: 2, medium: 3, low: 4, info: 5 },
    },
    generated_by: { app_name: "Anthracite", stage: "V1R" },
    versions: {
      validator_versions: [1],
      rule_pack_versions: [2],
      parser_versions: ["1.0.0"],
      registry_versions: ["1"],
    },
    devices: [],
    omitted: {
      raw_config_text: "omitted_by_default",
      detection_evidence_preview: "omitted_to_avoid_raw_config_excerpt",
      finding_raw_excerpt: "omitted_to_avoid_raw_config_excerpt",
      device_model: "omitted_use_receipt_summary",
      timestamps: "omitted_for_determinism",
      batch_run_epoch: "omitted_frontend_control_only",
    },
  };
}

function makeReport(
  overrides: Partial<BatchRunExportValidationReport> = {},
): BatchRunExportValidationReport {
  return {
    validator_version: 1,
    rule_pack_version: 2,
    context: {
      platform_id: "cisco-iosxe",
      parser_id: "cisco-iosxe",
      parser_version: null,
      selection_mode: "from_detection",
      detection_confidence: null,
      detection_source: null,
      source_context: null,
    },
    findings: [],
    clean_rules: ["rule-a", "rule-b"],
    skipped_rules: [
      { rule_id: "rule-c", reason: "area_absent", area: "ntp" },
    ],
    ...overrides,
  };
}

function makeFinding(
  rule_id: string,
  severity: BatchRunExportFinding["severity"],
): BatchRunExportFinding {
  return {
    finding_key: `${rule_id}-${severity}`,
    rule_id,
    rule_version: 1,
    severity,
    signal: "hard",
    title: `title ${rule_id}`,
    evidence: [
      {
        kind: "model_path",
        model_path: "system.hostname",
        line_start: 4,
        line_end: 4,
        note: "n",
      },
    ],
    affected_area: "system",
    recommendation: "do x",
  };
}

describe("exportAsDisplaySummary", () => {
  it("returns { status, summary } from artifact", () => {
    const a = makeArtifact();
    const d = exportAsDisplaySummary(a);
    expect(d.status).toBe("complete");
    expect(d.summary).toBe(a.summary);
  });

  it("does not mutate the input artifact", () => {
    const a = makeArtifact();
    const snap = JSON.parse(JSON.stringify(a));
    exportAsDisplaySummary(a);
    expect(JSON.parse(JSON.stringify(a))).toEqual(snap);
  });

  it("status string is preserved verbatim", () => {
    const a = { ...makeArtifact(), batch_run_status: "complete_with_failures" as const };
    expect(exportAsDisplaySummary(a).status).toBe("complete_with_failures");
  });
});

describe("exportReportAsValidationReport", () => {
  it("empty visibleFindings → empty findings array; preserves clean_rules and skipped_rules", () => {
    const r = makeReport();
    const out = exportReportAsValidationReport(r, []);
    expect(out.findings).toEqual([]);
    expect(out.clean_rules).toEqual(["rule-a", "rule-b"]);
    expect(out.skipped_rules).toEqual([
      { rule_id: "rule-c", reason: "area_absent", area: "ntp" },
    ]);
  });

  it("three visibleFindings → three findings; every evidence has raw_excerpt null", () => {
    const r = makeReport();
    const v = [
      makeFinding("R-1", "high"),
      makeFinding("R-2", "low"),
      makeFinding("R-3", "info"),
    ];
    const out = exportReportAsValidationReport(r, v);
    expect(out.findings).toHaveLength(3);
    for (const f of out.findings) {
      expect(f.evidence.length).toBeGreaterThan(0);
      for (const e of f.evidence) {
        expect(e.raw_excerpt).toBeNull();
      }
    }
  });

  it("preserves validator/pack versions and context verbatim", () => {
    const r = makeReport();
    const out = exportReportAsValidationReport(r, []);
    expect(out.validator_version).toBe(1);
    expect(out.rule_pack_version).toBe(2);
    expect(out.context).toBe(r.context);
  });

  it("does not mutate the input report or visibleFindings", () => {
    const r = makeReport();
    const v = [makeFinding("R-1", "high")];
    const rSnap = JSON.parse(JSON.stringify(r));
    const vSnap = JSON.parse(JSON.stringify(v));
    exportReportAsValidationReport(r, v);
    expect(JSON.parse(JSON.stringify(r))).toEqual(rSnap);
    expect(JSON.parse(JSON.stringify(v))).toEqual(vSnap);
  });

  it("evidence.kind is passed through as-is", () => {
    const r = makeReport();
    const v = [makeFinding("R-1", "high")];
    const out = exportReportAsValidationReport(r, v);
    expect(out.findings[0].evidence[0].kind).toBe("model_path");
  });

  it("evidence model_path / line_start / line_end / note preserved", () => {
    const r = makeReport();
    const v = [makeFinding("R-1", "high")];
    const out = exportReportAsValidationReport(r, v);
    const e = out.findings[0].evidence[0];
    expect(e.model_path).toBe("system.hostname");
    expect(e.line_start).toBe(4);
    expect(e.line_end).toBe(4);
    expect(e.note).toBe("n");
  });

  it("finding-level fields (rule_id, severity, title, signal, area, recommendation) preserved", () => {
    const r = makeReport();
    const v = [makeFinding("R-1", "high")];
    const out = exportReportAsValidationReport(r, v);
    const f = out.findings[0];
    expect(f.rule_id).toBe("R-1");
    expect(f.severity).toBe("high");
    expect(f.title).toBe("title R-1");
    expect(f.signal).toBe("hard");
    expect(f.affected_area).toBe("system");
    expect(f.recommendation).toBe("do x");
    expect(f.finding_key).toBe("R-1-high");
    expect(f.rule_version).toBe(1);
  });

  it("returns a new array for findings (not the input)", () => {
    const r = makeReport();
    const v = [makeFinding("R-1", "high")];
    const out = exportReportAsValidationReport(r, v);
    expect(out.findings).not.toBe(v);
  });
});
