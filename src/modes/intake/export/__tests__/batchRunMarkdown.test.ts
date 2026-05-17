import { describe, expect, it } from "vitest";

import type { BatchRun, BatchRunDevice } from "../../../../types/batchRun";
import type { Finding, ValidationReport } from "../../../../types/validator";
import { buildBatchRunExport } from "../batchRunExport";
import { renderBatchRunMarkdown } from "../batchRunMarkdown";

function report(): ValidationReport {
  const finding: Finding = {
    finding_key: "MGMT-HYG-001:services.snmp",
    rule_id: "MGMT-HYG-001",
    rule_version: 1,
    severity: "high",
    signal: "hard",
    title: "Default SNMP community present",
    evidence: [
      {
        kind: "model_path",
        model_path: "services[0]",
        line_start: 12,
        line_end: 12,
        raw_excerpt: "RAW COMMUNITY public SHOULD NOT EXPORT",
        note: "community found",
      },
    ],
    affected_area: "services_snmp",
    recommendation: "Remove default community.",
  };
  return {
    validator_version: 1,
    rule_pack_version: 1,
    context: {
      platform_id: "cisco-iosxe",
      parser_id: "cisco-iosxe",
      parser_version: "v3",
      selection_mode: "manual_override",
      detection_confidence: 0.88,
      detection_source: "manual_override",
      source_context: {
        kind: "archive_entry",
        label: "r1.cfg",
        archive_name: "archive.zip",
        slice_id: "entry-0/slice-0",
      },
    },
    findings: [finding],
    clean_rules: [],
    skipped_rules: [],
  };
}

function device(overrides: Partial<BatchRunDevice> = {}): BatchRunDevice {
  return {
    slice_id: "entry-0/slice-0",
    hostname_hint: "r1",
    source_provenance: {
      entry_id: "entry-0",
      entry_path: "r1.cfg",
      archive_name: "archive.zip",
    },
    stage_status: "complete",
    detection_result: null,
    selected_platform: {
      platform_id: "cisco-iosxe",
      vendor: "cisco",
      os_family: "iosxe",
      os_version_raw: null,
      os_version_normalized: null,
      detection_confidence: null,
    },
    is_manual_override: true,
    device_model: null,
    receipt: {
      hostname: "r1",
      platform_id: "cisco-iosxe",
      os_version: null,
      source: "r1.cfg",
      source_kind: "archive",
      byte_size: 300,
      line_count: 25,
      parser_version: "v3",
      registry_version: "2026.05",
      score: 0.92,
      coverage_ratio: 0.84,
      parsed_line_count: 21,
      unknown_line_count: 4,
      observed_maturity: "l1inventory",
      areas: [],
      warnings: [],
      unknowns: [],
      unknowns_truncated: false,
    },
    validation_report: report(),
    stage_error: null,
    ...overrides,
  };
}

function run(): BatchRun {
  return {
    source: { kind: "archive", archive_name: "archive.zip" },
    devices: [
      device(),
      device({
        slice_id: "entry-1/slice-0",
        hostname_hint: "r2",
        source_provenance: {
          entry_id: "entry-1",
          entry_path: "r2.cfg",
          archive_name: "archive.zip",
        },
        stage_status: "failed",
        receipt: null,
        validation_report: null,
        stage_error: { stage: "validate", message: "validator offline" },
      }),
    ],
    summary: {
      total_count: 2,
      parsed_count: 1,
      failed_count: 1,
      skipped_count: 0,
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
    epoch: 3,
  };
}

describe("BatchRun Markdown export", () => {
  it("is deterministic and contains summary, devices, findings, receipts, and errors", () => {
    const first = renderBatchRunMarkdown(buildBatchRunExport(run()));
    const second = renderBatchRunMarkdown(buildBatchRunExport(run()));

    expect(first).toBe(second);
    expect(first).toContain("# Anthracite Batch Run");
    expect(first).toContain("- Devices: 2");
    expect(first).toContain("## Source");
    expect(first).toContain("### entry-0/slice-0 — r1");
    expect(first).toContain("HIGH MGMT-HYG-001 — Default SNMP community present");
    expect(first).toContain("- Recommendation: Remove default community.");
    expect(first).toContain("- Receipt summary:");
    expect(first).toContain("- Coverage: 0.84");
    expect(first).toContain("### entry-1/slice-0 — r2");
    expect(first).toContain("- Stage: failed");
    expect(first).toContain("- Error: validate — validator offline");
  });

  it("excludes raw config text", () => {
    const markdown = renderBatchRunMarkdown(buildBatchRunExport(run()));

    expect(markdown).not.toContain("RAW COMMUNITY public SHOULD NOT EXPORT");
    expect(markdown).toContain("- Raw config text: omitted by default");
  });
});
