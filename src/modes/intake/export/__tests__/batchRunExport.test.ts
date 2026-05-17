import { describe, expect, it } from "vitest";

import type { BatchRun, BatchRunDevice } from "../../../../types/batchRun";
import type { PlatformRef } from "../../../../types/networkModel";
import type { Finding, ValidationReport } from "../../../../types/validator";
import { buildBatchRunExport, stringifyBatchRunExport } from "../batchRunExport";

const PLATFORM: PlatformRef = {
  platform_id: "cisco-iosxe",
  vendor: "cisco",
  os_family: "iosxe",
  os_version_raw: null,
  os_version_normalized: null,
  detection_confidence: 0.97,
};

function finding(ruleId: string, title: string): Finding {
  return {
    finding_key: `${ruleId}:services.snmp`,
    rule_id: ruleId,
    rule_version: 1,
    severity: "high",
    signal: "hard",
    title,
    evidence: [
      {
        kind: "model_path",
        model_path: "services[0]",
        line_start: 12,
        line_end: 12,
        raw_excerpt: "RAW SECRET CONFIG SHOULD NOT EXPORT",
        note: "community found",
      },
    ],
    affected_area: "services_snmp",
    recommendation: "Remove default community.",
  };
}

function report(findings: ReadonlyArray<Finding>): ValidationReport {
  return {
    validator_version: 1,
    rule_pack_version: 1,
    context: {
      platform_id: "cisco-iosxe",
      parser_id: "cisco-iosxe",
      parser_version: "v3",
      selection_mode: "from_detection",
      detection_confidence: 0.97,
      detection_source: "best_match",
      source_context: {
        kind: "archive_entry",
        label: "r1.cfg",
        archive_name: "archive.zip",
        slice_id: "entry-0/slice-0",
      },
    },
    findings,
    clean_rules: ["MGMT-HYG-009"],
    skipped_rules: [
      {
        rule_id: "MGMT-HYG-777",
        reason: "area_absent",
        area: "services_ssh",
      },
    ],
  };
}

function device(
  sliceId: string,
  overrides: Partial<BatchRunDevice> = {},
): BatchRunDevice {
  return {
    slice_id: sliceId,
    hostname_hint: "r1",
    source_provenance: {
      entry_id: "entry-0",
      entry_path: "r1.cfg",
      archive_name: "archive.zip",
    },
    stage_status: "complete",
    detection_result: {
      best_match: PLATFORM,
      candidates: [
        {
          platform_id: "cisco-iosxe",
          score: 10,
          normalized_score: 1,
          match_count: 2,
          distinct_signature_count: 1,
        },
      ],
      evidence: [
        {
          platform_id: "cisco-iosxe",
          signature_id: "sig-hostname",
          category: "generic",
          weight: 1,
          line_number: 1,
          preview: "RAW HOSTNAME LINE SHOULD NOT EXPORT",
          reason: "hostname",
        },
      ],
      confidence: 0.97,
      warnings: [],
      scanned_line_count: 20,
      total_line_count: 20,
    },
    selected_platform: PLATFORM,
    is_manual_override: false,
    device_model: null,
    receipt: {
      hostname: "r1",
      platform_id: "cisco-iosxe",
      os_version: null,
      source: "r1.cfg",
      source_kind: "archive",
      byte_size: 900,
      line_count: 20,
      parser_version: "v3",
      registry_version: "2026.05",
      score: 0.91,
      coverage_ratio: 0.8,
      parsed_line_count: 16,
      unknown_line_count: 4,
      observed_maturity: "l1inventory",
      areas: [
        { name: "services", status: "populated", populated_count: 2 },
      ],
      warnings: [],
      unknowns: [],
      unknowns_truncated: false,
    },
    validation_report: report([
      finding("MGMT-HYG-001", "Default SNMP community present"),
    ]),
    stage_error: null,
    ...overrides,
  };
}

function run(): BatchRun {
  const devices: ReadonlyArray<BatchRunDevice> = [
    device("entry-0/slice-0"),
    device("entry-1/slice-0", {
      hostname_hint: "r2",
      source_provenance: {
        entry_id: "entry-1",
        entry_path: "r2.cfg",
        archive_name: "archive.zip",
      },
      stage_status: "failed",
      validation_report: null,
      receipt: null,
      stage_error: { stage: "parse", message: "unsupported block" },
    }),
    device("entry-2/slice-0", {
      hostname_hint: null,
      source_provenance: {
        entry_id: "entry-2",
        entry_path: "empty.cfg",
        archive_name: "archive.zip",
      },
      stage_status: "skipped",
      detection_result: null,
      selected_platform: null,
      validation_report: null,
      receipt: null,
      stage_error: { stage: "detect", message: "no_platform_resolved" },
    }),
  ];
  return {
    source: { kind: "archive", archive_name: "archive.zip" },
    devices,
    summary: {
      total_count: 3,
      parsed_count: 1,
      failed_count: 1,
      skipped_count: 1,
      pending_count: 0,
      with_findings_count: 1,
      clean_count: 0,
      severity_counts: {
        critical: 0,
        high: 1,
        medium: 0,
        low: 0,
        info: 0,
      },
    },
    status: "complete_with_failures",
    epoch: 7,
  };
}

describe("BatchRun JSON export", () => {
  it("is deterministic byte-for-byte and has stable top-level key order", () => {
    const first = stringifyBatchRunExport(buildBatchRunExport(run()));
    const second = stringifyBatchRunExport(buildBatchRunExport(run()));

    expect(first).toBe(second);
    expect(first.endsWith("\n")).toBe(true);
    expect(Object.keys(JSON.parse(first))).toEqual([
      "export_version",
      "kind",
      "batch_run_status",
      "source",
      "summary",
      "generated_by",
      "versions",
      "devices",
      "omitted",
    ]);
  });

  it("excludes raw config text while preserving findings, receipts, provenance, failures, and skips", () => {
    const text = stringifyBatchRunExport(buildBatchRunExport(run()));

    expect(text).not.toContain("RAW SECRET CONFIG SHOULD NOT EXPORT");
    expect(text).not.toContain("RAW HOSTNAME LINE SHOULD NOT EXPORT");
    expect(text).toContain("\"raw_config_text\"");
    expect(text).toContain("\"MGMT-HYG-001\"");
    expect(text).toContain("\"receipt_summary\"");
    expect(text).toContain("\"source_provenance\"");
    expect(text).toContain("\"stage_status\": \"failed\"");
    expect(text).toContain("\"stage_status\": \"skipped\"");
    expect(text).toContain("\"message\": \"unsupported block\"");
  });
});
