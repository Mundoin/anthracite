import { describe, expect, it } from "vitest";

import type { BatchRun, BatchRunDevice } from "../../../../types/batchRun";
import type { PlatformRef } from "../../../../types/networkModel";
import type { Finding, ValidationReport } from "../../../../types/validator";
import { buildBatchRunExport, stringifyBatchRunExport } from "../batchRunExport";
import { renderBatchRunMarkdown } from "../batchRunMarkdown";

// V1T density proof — 24-device mixed corpus
// Mirrors the v1t-mixed-24 archive fixture (Rust side tests archive intake;
// this side tests the export/summary loop at batch scale).

const CISCO_PLATFORM: PlatformRef = {
  platform_id: "cisco-iosxe",
  vendor: "cisco",
  os_family: "iosxe",
  os_version_raw: null,
  os_version_normalized: null,
  detection_confidence: 0.95,
};

const JUNOS_PLATFORM: PlatformRef = {
  platform_id: "juniper-junos",
  vendor: "juniper",
  os_family: "junos",
  os_version_raw: null,
  os_version_normalized: null,
  detection_confidence: 0.95,
};

const ARISTA_PLATFORM: PlatformRef = {
  platform_id: "arista-eos",
  vendor: "arista",
  os_family: "eos",
  os_version_raw: null,
  os_version_normalized: null,
  detection_confidence: 0.95,
};

function mediumFinding(ruleId: string, title: string): Finding {
  return {
    finding_key: `${ruleId}:services.snmp`,
    rule_id: ruleId,
    rule_version: 1,
    severity: "medium",
    signal: "hard",
    title,
    evidence: [
      {
        kind: "model_path",
        model_path: "services[0]",
        line_start: 10,
        line_end: 10,
        raw_excerpt: "RAW CONFIG SHOULD NOT APPEAR IN EXPORT",
        note: "community found",
      },
    ],
    affected_area: "services_snmp",
    recommendation: "Replace default community string.",
  };
}

function highFinding(ruleId: string, title: string): Finding {
  return {
    finding_key: `${ruleId}:services.telnet`,
    rule_id: ruleId,
    rule_version: 1,
    severity: "high",
    signal: "hard",
    title,
    evidence: [
      {
        kind: "model_path",
        model_path: "services[1]",
        line_start: 5,
        line_end: 5,
        raw_excerpt: "RAW TELNET LINE SHOULD NOT APPEAR IN EXPORT",
        note: "telnet enabled",
      },
    ],
    affected_area: "services_ssh",
    recommendation: "Disable telnet, enforce SSH only.",
  };
}

function validationReport(
  platform: PlatformRef,
  entryPath: string,
  archiveName: string,
  sliceId: string,
  findings: ReadonlyArray<Finding>,
): ValidationReport {
  return {
    validator_version: 1,
    rule_pack_version: 1,
    context: {
      platform_id: platform.platform_id,
      parser_id: platform.platform_id,
      parser_version: "v3",
      selection_mode: "from_detection",
      detection_confidence: platform.detection_confidence,
      detection_source: "best_match",
      source_context: {
        kind: "archive_entry",
        label: entryPath,
        archive_name: archiveName,
        slice_id: sliceId,
      },
    },
    findings,
    clean_rules: ["MGMT-HYG-009"],
    skipped_rules: [],
  };
}

function makeDevice(
  entryIndex: number,
  entryPath: string,
  hostnameHint: string | null,
  platform: PlatformRef,
  findings: ReadonlyArray<Finding>,
): BatchRunDevice {
  const archiveName = "v1t-mixed-24.zip";
  const entryId = `entry-${entryIndex}`;
  const sliceId = `${entryId}/slice-0`;

  return {
    slice_id: sliceId,
    hostname_hint: hostnameHint,
    source_provenance: {
      entry_id: entryId,
      entry_path: entryPath,
      archive_name: archiveName,
    },
    stage_status: "complete",
    detection_result: {
      best_match: platform,
      candidates: [
        {
          platform_id: platform.platform_id,
          score: 10,
          normalized_score: 1,
          match_count: 2,
          distinct_signature_count: 1,
        },
      ],
      evidence: [
        {
          platform_id: platform.platform_id,
          signature_id: "sig-hostname",
          category: "generic",
          weight: 1,
          line_number: 1,
          preview: "RAW SIGNATURE PREVIEW SHOULD NOT EXPORT",
          reason: "hostname",
        },
      ],
      confidence: platform.detection_confidence,
      warnings: [],
      scanned_line_count: 25,
      total_line_count: 25,
    },
    selected_platform: platform,
    is_manual_override: false,
    device_model: null,
    receipt: {
      hostname: hostnameHint,
      platform_id: platform.platform_id,
      os_version: null,
      source: entryPath,
      source_kind: "archive",
      byte_size: 600,
      line_count: 25,
      parser_version: "v3",
      registry_version: "2026.05",
      score: 0.88,
      coverage_ratio: 0.8,
      parsed_line_count: 20,
      unknown_line_count: 5,
      observed_maturity: "l1inventory",
      areas: [{ name: "services", status: "populated", populated_count: 1 }],
      warnings: [],
      unknowns: [],
      unknowns_truncated: false,
    },
    validation_report: validationReport(
      platform,
      entryPath,
      archiveName,
      sliceId,
      findings,
    ),
    stage_error: null,
  };
}

// Corpus definition — mirrors v1t-mixed-24 manifest.json
// 10 clean, 7 one-finding, 5 two-finding, 2 partial-finding = 24 total
// with_findings: 14, clean: 10
// severity: high=2, medium=19

const SNMP_FINDING = mediumFinding("MGMT-HYG-001", "Default SNMP community present");
const TELNET_FINDING = highFinding("MGMT-HYG-002", "Telnet transport enabled on vty");

const V1T_DEVICES: ReadonlyArray<BatchRunDevice> = [
  // Cisco flat entries (8)
  makeDevice(0, "cisco-r01.cfg", "cisco-r01", CISCO_PLATFORM, []),
  makeDevice(1, "cisco-r02.cfg", "cisco-r02", CISCO_PLATFORM, [SNMP_FINDING]),
  makeDevice(2, "cisco-r03.cfg", "cisco-r03", CISCO_PLATFORM, [SNMP_FINDING, TELNET_FINDING]),
  makeDevice(3, "cisco-r04.cfg", "cisco-r04", CISCO_PLATFORM, [SNMP_FINDING, SNMP_FINDING]),
  makeDevice(4, "cisco-r05.cfg", "cisco-r05", CISCO_PLATFORM, [SNMP_FINDING]),
  makeDevice(5, "cisco-sw06.cfg", "cisco-sw06", CISCO_PLATFORM, [SNMP_FINDING]),
  makeDevice(6, "cisco-r07.cfg", null, CISCO_PLATFORM, [TELNET_FINDING]),
  makeDevice(7, "cisco-r08.cfg", "cisco-r08", CISCO_PLATFORM, []),

  // Juniper nested junos/ (8)
  makeDevice(8, "junos/junos-core01.conf", "junos-core01", JUNOS_PLATFORM, []),
  makeDevice(9, "junos/junos-core02.conf", "junos-core02", JUNOS_PLATFORM, [SNMP_FINDING]),
  makeDevice(10, "junos/junos-edge01.conf", "junos-edge01", JUNOS_PLATFORM, [SNMP_FINDING, SNMP_FINDING]),
  makeDevice(11, "junos/junos-access01.conf", "junos-access01", JUNOS_PLATFORM, []),
  makeDevice(12, "junos/junos-leaf01.conf", "junos-leaf01", JUNOS_PLATFORM, [SNMP_FINDING]),
  makeDevice(13, "junos/junos-border01.conf", "junos-border01", JUNOS_PLATFORM, []),
  makeDevice(14, "junos/junos-dist01.conf", "junos-dist01", JUNOS_PLATFORM, [SNMP_FINDING]),
  makeDevice(15, "junos/junos-fw01.conf", "junos-fw01", JUNOS_PLATFORM, []),

  // Arista nested arista/ (8)
  makeDevice(16, "arista/arista-leaf01.cfg", "arista-leaf01", ARISTA_PLATFORM, []),
  makeDevice(17, "arista/arista-leaf02.cfg", "arista-leaf02", ARISTA_PLATFORM, [SNMP_FINDING]),
  makeDevice(18, "arista/arista-leaf03.cfg", "arista-leaf03", ARISTA_PLATFORM, [SNMP_FINDING, SNMP_FINDING]),
  makeDevice(19, "arista/arista-spine01.cfg", "arista-spine01", ARISTA_PLATFORM, []),
  makeDevice(20, "arista/arista-spine02.cfg", "arista-spine02", ARISTA_PLATFORM, [SNMP_FINDING]),
  makeDevice(21, "arista/arista-border01.cfg", "arista-border01", ARISTA_PLATFORM, []),
  makeDevice(22, "arista/arista-mgmt01.cfg", "arista-mgmt01", ARISTA_PLATFORM, []),
  makeDevice(23, "arista/arista-edge01.cfg", "arista-edge01", ARISTA_PLATFORM, [SNMP_FINDING, SNMP_FINDING]),
];

function v1tRun(): BatchRun {
  return {
    source: { kind: "archive", archive_name: "v1t-mixed-24.zip" },
    devices: V1T_DEVICES,
    summary: {
      total_count: 24,
      parsed_count: 24,
      failed_count: 0,
      skipped_count: 0,
      pending_count: 0,
      with_findings_count: 14,
      clean_count: 10,
      severity_counts: {
        critical: 0,
        high: 2,
        medium: 19,
        low: 0,
        info: 0,
      },
    },
    status: "complete",
    epoch: 1,
  };
}

describe("V1T BatchRun 24-device density — JSON export", () => {
  it("builds export with 24 devices", () => {
    const exported = buildBatchRunExport(v1tRun());
    expect(exported.devices).toHaveLength(24);
  });

  it("export_version is 1 and kind is batch_run_export", () => {
    const exported = buildBatchRunExport(v1tRun());
    expect(exported.export_version).toBe(1);
    expect(exported.kind).toBe("batch_run_export");
  });

  it("summary counts survive the export projection", () => {
    const exported = buildBatchRunExport(v1tRun());
    expect(exported.summary.total_count).toBe(24);
    expect(exported.summary.parsed_count).toBe(24);
    expect(exported.summary.failed_count).toBe(0);
    expect(exported.summary.with_findings_count).toBe(14);
    expect(exported.summary.clean_count).toBe(10);
  });

  it("is byte-for-byte deterministic across two runs", () => {
    const a = stringifyBatchRunExport(buildBatchRunExport(v1tRun()));
    const b = stringifyBatchRunExport(buildBatchRunExport(v1tRun()));
    expect(a).toBe(b);
  });

  it("does not contain raw config excerpts", () => {
    const json = stringifyBatchRunExport(buildBatchRunExport(v1tRun()));
    expect(json).not.toContain("RAW CONFIG SHOULD NOT APPEAR IN EXPORT");
    expect(json).not.toContain("RAW TELNET LINE SHOULD NOT APPEAR IN EXPORT");
    expect(json).not.toContain("RAW SIGNATURE PREVIEW SHOULD NOT EXPORT");
  });

  it("does not contain timestamp or run-id fields", () => {
    const json = stringifyBatchRunExport(buildBatchRunExport(v1tRun()));
    expect(json).not.toContain('"exported_at"');
    expect(json).not.toContain('"created_at"');
    expect(json).not.toContain('"timestamp"');
    expect(json).not.toContain('"run_id"');
    expect(json).not.toContain('"uuid"');
  });

  it("does not contain Assessment vocabulary", () => {
    const json = stringifyBatchRunExport(buildBatchRunExport(v1tRun()));
    expect(json).not.toContain("assessment_run");
    expect(json).not.toContain("AssessmentRun");
    expect(json).not.toContain("assessment_report");
  });

  it("does not emit full device_model in export", () => {
    const exported = buildBatchRunExport(v1tRun());
    for (const dev of exported.devices) {
      expect(dev).not.toHaveProperty("device_model");
    }
  });

  it("all 3 vendor archive names represented in device provenance", () => {
    const exported = buildBatchRunExport(v1tRun());
    const paths = exported.devices.map((d) => d.source_provenance.entry_path);
    expect(paths.some((p) => p.startsWith("cisco-"))).toBe(true);
    expect(paths.some((p) => p.startsWith("junos/"))).toBe(true);
    expect(paths.some((p) => p.startsWith("arista/"))).toBe(true);
  });

  it("mixed directory layout preserved in provenance paths", () => {
    const exported = buildBatchRunExport(v1tRun());
    const paths = exported.devices.map((d) => d.source_provenance.entry_path);
    const flat = paths.filter((p) => !p.includes("/")).length;
    const nested = paths.filter((p) => p.includes("/")).length;
    expect(flat).toBe(8);
    expect(nested).toBe(16);
  });

  it("all complete devices have validation_report with findings array", () => {
    const exported = buildBatchRunExport(v1tRun());
    const completeDevs = exported.devices.filter(
      (d) => d.stage_status === "complete",
    );
    for (const dev of completeDevs) {
      expect(dev.validation_report).not.toBeNull();
      expect(Array.isArray(dev.validation_report!.findings)).toBe(true);
    }
  });

  it("findings in validation_report omit raw_excerpt from evidence", () => {
    const exported = buildBatchRunExport(v1tRun());
    const json = JSON.stringify(exported);
    expect(json).not.toContain("RAW CONFIG SHOULD NOT APPEAR IN EXPORT");
  });
});

describe("V1T BatchRun 24-device density — Markdown export", () => {
  it("renders all 24 devices", () => {
    const md = renderBatchRunMarkdown(buildBatchRunExport(v1tRun()));
    expect(md).toBeTruthy();
    const deviceHeadingCount = (md.match(/###/g) ?? []).length;
    expect(deviceHeadingCount).toBeGreaterThanOrEqual(24);
  });

  it("does not contain raw config excerpts", () => {
    const md = renderBatchRunMarkdown(buildBatchRunExport(v1tRun()));
    expect(md).not.toContain("RAW CONFIG SHOULD NOT APPEAR IN EXPORT");
    expect(md).not.toContain("RAW TELNET LINE SHOULD NOT APPEAR IN EXPORT");
    expect(md).not.toContain("RAW SIGNATURE PREVIEW SHOULD NOT EXPORT");
  });

  it("does not contain Assessment vocabulary", () => {
    const md = renderBatchRunMarkdown(buildBatchRunExport(v1tRun()));
    expect(md).not.toContain("assessment_run");
    expect(md).not.toContain("AssessmentRun");
    expect(md).not.toContain("assessment_report");
  });

  it("is deterministic across two runs", () => {
    const a = renderBatchRunMarkdown(buildBatchRunExport(v1tRun()));
    const b = renderBatchRunMarkdown(buildBatchRunExport(v1tRun()));
    expect(a).toBe(b);
  });

  it("includes all three vendor names in output", () => {
    const md = renderBatchRunMarkdown(buildBatchRunExport(v1tRun()));
    expect(md).toContain("cisco");
    expect(md).toContain("juniper");
    expect(md).toContain("arista");
  });
});
