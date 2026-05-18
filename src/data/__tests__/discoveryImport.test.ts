import { describe, expect, it } from "vitest";
import {
  buildDiscoveryImportCandidates,
  type BuildImportCandidatesResult,
} from "../discoveryImport";
import type {
  BatchRun,
  BatchRunDevice,
  BatchRunSource,
} from "../../types/batchRun";
import type { DeviceModel, DeviceIdentity, PlatformRef } from "../../types/networkModel";
import type { ConfigDetectionResult } from "../../types/configDetection";
import type { ArchiveEntryRef } from "../../types/archiveIntake";

// Mock factories

function makeDeviceIdentity(over: Partial<DeviceIdentity> = {}): DeviceIdentity {
  return {
    hostname: "router-1",
    chassis: null,
    serial: null,
    software_version: null,
    os_family: null,
    config_date: null,
    vendor_notes: null,
    ...over,
  };
}

function makePlatformRef(over: Partial<PlatformRef> = {}): PlatformRef {
  return {
    platform_id: "cisco-ios-xe",
    vendor_id: "cisco",
    family_id: "ios-xe",
    maturity: "mature",
    feature_level: 5,
    ...over,
  };
}

function makeEvidenceMetadata(over: Partial<typeof evidence> = {}): typeof evidence {
  const evidence = {
    extract_source: "config" as const,
    extract_timestamp: "2025-01-01T00:00:00Z",
    line_count: 100,
    ...over,
  };
  return evidence;
}

function makeDeviceModel(over: Partial<DeviceModel> = {}): DeviceModel {
  return {
    identity: makeDeviceIdentity(),
    platform: makePlatformRef(),
    evidence: makeEvidenceMetadata(),
    interfaces: [],
    vlans: [],
    vrfs: [],
    static_routes: [],
    routing_protocols: {
      bgp: null,
      ospf: null,
      eigrp: null,
      rip: null,
      isis: null,
    },
    acls: [],
    firewall_zones: [],
    nat_rules: [],
    tunnels: [],
    qos_policies: [],
    lag_groups: [],
    services: [],
    topology_hints: [],
    findings: [],
    unknown_lines: [],
    parse_confidence: {
      maturity_observed: "l0identify",
      complete_feature_percent: 0,
    },
    ...over,
  };
}

function makeDetectionResult(
  over: Partial<ConfigDetectionResult> = {}
): ConfigDetectionResult {
  return {
    best_match: makePlatformRef(),
    candidates: [],
    evidence: [],
    confidence: 0.85,
    warnings: [],
    scanned_line_count: 100,
    total_line_count: 100,
    ...over,
  };
}

function makeArchiveEntryRef(
  over: Partial<ArchiveEntryRef> = {}
): ArchiveEntryRef {
  return {
    entry_id: "entry-1",
    entry_path: "configs/site-a/router1.cfg",
    archive_name: "archive.zip",
    ...over,
  };
}

function makeDevice(over: Partial<BatchRunDevice> = {}): BatchRunDevice {
  return {
    slice_id: "slice-1",
    hostname_hint: null,
    source_provenance: null,
    stage_status: "complete",
    detection_result: null,
    selected_platform: null,
    is_manual_override: false,
    device_model: makeDeviceModel(),
    receipt: null,
    validation_report: null,
    stage_error: null,
    ...over,
  };
}

function makeBatchRun(
  devices: readonly BatchRunDevice[],
  source: BatchRunSource = { kind: "paste" }
): BatchRun {
  return {
    source,
    devices,
    summary: {
      total_devices: devices.length,
      total_config_lines: 0,
      completed_count: 0,
      failed_count: 0,
      pending_count: 0,
      critical_findings: 0,
      high_findings: 0,
      medium_findings: 0,
      low_findings: 0,
      info_findings: 0,
    },
    status: "complete",
    epoch: 0,
  };
}

describe("buildDiscoveryImportCandidates", () => {
  it("returns empty candidates when environmentId is null", () => {
    const devices = [makeDevice(), makeDevice()];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, null);

    expect(result.candidates).toHaveLength(0);
    expect(result.skippedCount).toBe(0);
    expect(result.totalDevices).toBe(2);
  });

  it("builds candidates only from completed devices with DeviceModel", () => {
    const devices = [
      makeDevice({ stage_status: "complete", device_model: makeDeviceModel() }),
      makeDevice({ stage_status: "pending", device_model: makeDeviceModel() }),
      makeDevice({ stage_status: "complete", device_model: null }),
      makeDevice({ stage_status: "complete", device_model: makeDeviceModel() }),
    ];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates).toHaveLength(2);
    expect(result.skippedCount).toBe(2);
    expect(result.totalDevices).toBe(4);
  });

  it("skips failed device", () => {
    const devices = [
      makeDevice({ slice_id: "slice-a", stage_status: "failed" }),
    ];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it("skips pending device", () => {
    const devices = [
      makeDevice({ slice_id: "slice-a", stage_status: "pending" }),
    ];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it("skips device with null device_model even when stage_status complete", () => {
    const devices = [
      makeDevice({
        slice_id: "slice-a",
        stage_status: "complete",
        device_model: null,
      }),
    ];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it("preserves slice_id as candidate_id", () => {
    const devices = [makeDevice({ slice_id: "slice-xyz" })];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates[0].candidate_id).toBe("slice-xyz");
  });

  it("sets source_kind to intake_import", () => {
    const devices = [makeDevice()];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates[0].source_kind).toBe("intake_import");
  });

  it("carries environment_id", () => {
    const devices = [makeDevice()];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(
      batchRun,
      "env-core-eu1"
    );

    expect(result.candidates[0].environment_id).toBe("env-core-eu1");
  });

  it("carries confidence from detection_result", () => {
    const devices = [
      makeDevice({
        detection_result: makeDetectionResult({ confidence: 0.87 }),
      }),
    ];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates[0].confidence).toBe(0.87);
  });

  it("confidence is null when detection_result is null", () => {
    const devices = [makeDevice({ detection_result: null })];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates[0].confidence).toBeNull();
  });

  it("source_label uses file filename when source is file", () => {
    const devices = [makeDevice()];
    const batchRun = makeBatchRun(devices, {
      kind: "file",
      filename: "router1.cfg",
    });

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates[0].source_label).toBe("router1.cfg");
  });

  it("source_label uses archive_name when source is archive and no provenance", () => {
    const devices = [makeDevice({ source_provenance: null })];
    const batchRun = makeBatchRun(devices, {
      kind: "archive",
      archive_name: "configs.zip",
    });

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates[0].source_label).toBe("configs.zip");
  });

  it("source_label is null for paste source without provenance", () => {
    const devices = [makeDevice({ source_provenance: null })];
    const batchRun = makeBatchRun(devices, { kind: "paste" });

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates[0].source_label).toBeNull();
  });

  it("source_label uses provenance path leaf when provenance present", () => {
    const devices = [
      makeDevice({
        source_provenance: makeArchiveEntryRef({
          entry_path: "configs/site-a/router1.cfg",
        }),
      }),
    ];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates[0].source_label).toBe("router1.cfg");
  });

  it("output order matches input devices order", () => {
    const devices = [
      makeDevice({ slice_id: "slice-a", stage_status: "pending" }), // skipped
      makeDevice({ slice_id: "slice-b", stage_status: "complete" }),
      makeDevice({ slice_id: "slice-c", stage_status: "complete" }),
      makeDevice({ slice_id: "slice-d", stage_status: "failed" }), // skipped
    ];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0].candidate_id).toBe("slice-b");
    expect(result.candidates[1].candidate_id).toBe("slice-c");
  });

  it("output is deterministic across calls", () => {
    const devices = [
      makeDevice({ slice_id: "slice-1" }),
      makeDevice({ slice_id: "slice-2" }),
    ];
    const batchRun = makeBatchRun(devices);

    const result1 = buildDiscoveryImportCandidates(batchRun, "env-1");
    const result2 = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result1.candidates).toEqual(result2.candidates);
    expect(result1.skippedCount).toBe(result2.skippedCount);
    expect(result1.totalDevices).toBe(result2.totalDevices);
  });

  it("totalDevices equals batchRun.devices.length regardless of filtering", () => {
    const devices = [
      makeDevice({ stage_status: "complete" }),
      makeDevice({ stage_status: "failed" }),
      makeDevice({ stage_status: "pending", device_model: null }),
      makeDevice({ stage_status: "complete" }),
    ];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.totalDevices).toBe(4);
  });

  it("skippedCount equals number of devices excluded", () => {
    const devices = [
      makeDevice({ stage_status: "complete" }),
      makeDevice({ stage_status: "failed" }),
      makeDevice({ stage_status: "pending", device_model: null }),
      makeDevice({ stage_status: "complete" }),
      makeDevice({ stage_status: "detecting" }),
    ];
    const batchRun = makeBatchRun(devices);

    const result = buildDiscoveryImportCandidates(batchRun, "env-1");

    expect(result.skippedCount).toBe(3);
    expect(result.candidates).toHaveLength(2);
  });
});
