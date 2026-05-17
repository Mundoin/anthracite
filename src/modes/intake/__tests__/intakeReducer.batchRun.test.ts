/**
 * V1Q reducer — Batch Run actions.
 *
 * Locks the §6.4 invariants:
 *   - devices always sorted by slice_id ASC
 *   - summary always equals deriveBatchRunSummary(devices)
 *   - one device update never mutates others
 *   - re-run preserves operator truth (selected_platform +
 *     is_manual_override); clears parse/receipt/validation
 *   - drill-down with stored results populates parsed state
 */

import { describe, expect, it } from "vitest";

import type {
  ArchiveEntryRef,
} from "../../../types/archiveIntake";
import type {
  BatchRunDevice,
  DeviceStageError,
} from "../../../types/batchRun";
import type { ConfigBatchSplitResult } from "../../../types/configBatch";
import type { ConfigDetectionResult } from "../../../types/configDetection";
import type { DeviceModel, PlatformRef } from "../../../types/networkModel";
import type { ReceiptView } from "../../../types/receipt";
import type {
  Finding,
  Severity,
  ValidationReport,
} from "../../../types/validator";
import { intakeReducer } from "../intakeReducer";
import { initialIntakeState, type IntakeState } from "../intakeTypes";
import { deriveBatchRunSummary } from "../orchestration/batchRunSummary";

const CISCO_REF: PlatformRef = {
  platform_id: "cisco-iosxe",
  vendor: "cisco",
  os_family: "iosxe",
  os_version_raw: null,
  os_version_normalized: null,
  detection_confidence: 0.95,
};

const JUNOS_REF: PlatformRef = {
  platform_id: "juniper-junos",
  vendor: "juniper",
  os_family: "junos",
  os_version_raw: null,
  os_version_normalized: null,
  detection_confidence: 0.9,
};

const CISCO_DETECTION: ConfigDetectionResult = {
  best_match: CISCO_REF,
  candidates: [],
  evidence: [],
  confidence: 0.95,
  warnings: [],
  scanned_line_count: 1,
  total_line_count: 1,
};

const SPLIT: ConfigBatchSplitResult = {
  slices: [
    {
      slice_id: "slice-0",
      line_start: 1,
      line_end: 1,
      raw_text: "hostname r1\n",
      confidence: 1.0,
      hint: { kind: "hostname_present", hostname: "r1" },
    },
    {
      slice_id: "slice-1",
      line_start: 3,
      line_end: 3,
      raw_text: "hostname r2\n",
      confidence: 1.0,
      hint: { kind: "hostname_present", hostname: "r2" },
    },
    {
      slice_id: "slice-2",
      line_start: 5,
      line_end: 5,
      raw_text: "hostname r3\n",
      confidence: 0.9,
      hint: { kind: "hostname_present", hostname: "r3" },
    },
  ],
  method: { kind: "heuristic" },
  warnings: [],
  total_line_count: 5,
  scanned_line_count: 5,
  splitter_version: "1",
};

const DEVICE = { identity: { hostname: "r1" } } as unknown as DeviceModel;
const RECEIPT = {
  hostname: "r1",
  platform_id: "cisco-iosxe",
} as unknown as ReceiptView;

function reportWith(severities: ReadonlyArray<Severity>): ValidationReport {
  const findings: ReadonlyArray<Finding> = severities.map((sev, i) => ({
    finding_key: `R-${i}:a:b=${i}`,
    rule_id: `R-${i}`,
    rule_version: 1,
    severity: sev,
    signal: "hard",
    title: `t${i}`,
    evidence: [],
    affected_area: "services_snmp",
    recommendation: null,
  }));
  return {
    validator_version: 1,
    rule_pack_version: 1,
    context: {
      platform_id: "cisco-iosxe",
      parser_id: "cisco-iosxe",
      parser_version: "v3",
      selection_mode: "from_detection",
      detection_confidence: 0.95,
      detection_source: "best_match",
      source_context: null,
    },
    findings,
    clean_rules: [],
    skipped_rules: [],
  };
}

/** Drive the reducer to a split_complete batch state with per-slice
 *  detection resolved for slice-0 and slice-1 only (slice-2 stays
 *  pending) so we can also test the no-detection fallback. */
function batchReadyState(): IntakeState {
  let s: IntakeState = initialIntakeState;
  s = intakeReducer(s, {
    type: "FileLoaded",
    text: "hostname r1\n\nhostname r2\n\nhostname r3\n",
    filename: "configs.txt",
    byte_size: 32,
  });
  s = intakeReducer(s, { type: "SplitStart" });
  s = intakeReducer(s, { type: "SplitToBatch", result: SPLIT });
  s = intakeReducer(s, {
    type: "PerSliceDetectionSucceeded",
    sliceId: "slice-0",
    result: CISCO_DETECTION,
  });
  s = intakeReducer(s, {
    type: "PerSliceDetectionSucceeded",
    sliceId: "slice-1",
    result: CISCO_DETECTION,
  });
  return s;
}

function summaryMatches(devices: ReadonlyArray<BatchRunDevice>, run: IntakeState): boolean {
  const expected = deriveBatchRunSummary(devices);
  return JSON.stringify(run.batch?.batchRun?.summary) === JSON.stringify(expected);
}

describe("intakeReducer V1Q — BatchRun actions", () => {
  it("BatchRunRequested from split_complete builds devices from per-slice detection", () => {
    const s = intakeReducer(batchReadyState(), { type: "BatchRunRequested" });
    const run = s.batch?.batchRun;
    expect(run).not.toBeNull();
    expect(run?.devices.length).toBe(3);
    expect(run?.devices.map((d) => d.slice_id)).toEqual([
      "slice-0",
      "slice-1",
      "slice-2",
    ]);
    expect(run?.devices[0].selected_platform).toEqual(CISCO_REF);
    expect(run?.devices[2].selected_platform).toBeNull();
    expect(run?.status).toBe("in_progress");
    expect(run?.epoch).toBe(1);
  });

  it("BatchRunRequested is ignored outside split_complete", () => {
    const s = intakeReducer(initialIntakeState, { type: "BatchRunRequested" });
    expect(s).toBe(initialIntakeState);
  });

  it("BatchRunReRunRequested preserves selected_platform + is_manual_override per device", () => {
    let s = intakeReducer(batchReadyState(), { type: "BatchRunRequested" });
    s = intakeReducer(s, {
      type: "BatchRunOverrideSelected",
      sliceId: "slice-2",
      platform: JUNOS_REF,
      isManualOverride: true,
    });
    s = intakeReducer(s, { type: "BatchRunDeviceQueued", sliceId: "slice-0" });
    s = intakeReducer(s, { type: "BatchRunDeviceParsing", sliceId: "slice-0" });
    s = intakeReducer(s, {
      type: "BatchRunDeviceValidating",
      sliceId: "slice-0",
      deviceModel: DEVICE,
      receipt: RECEIPT,
    });
    s = intakeReducer(s, {
      type: "BatchRunDeviceCompleted",
      sliceId: "slice-0",
      report: reportWith(["high"]),
    });

    const before = s.batch?.batchRun?.devices ?? [];
    const slice0Before = before.find((d) => d.slice_id === "slice-0");
    const slice2Before = before.find((d) => d.slice_id === "slice-2");
    expect(slice0Before?.stage_status).toBe("complete");
    expect(slice2Before?.is_manual_override).toBe(true);
    expect(slice2Before?.selected_platform).toEqual(JUNOS_REF);

    s = intakeReducer(s, { type: "BatchRunReRunRequested" });
    const after = s.batch?.batchRun?.devices ?? [];
    const slice0After = after.find((d) => d.slice_id === "slice-0");
    const slice2After = after.find((d) => d.slice_id === "slice-2");

    expect(slice0After?.stage_status).toBe("pending");
    expect(slice0After?.validation_report).toBeNull();
    expect(slice0After?.device_model).toBeNull();
    expect(slice0After?.selected_platform).toEqual(CISCO_REF);
    expect(slice0After?.is_manual_override).toBe(false);
    expect(slice2After?.is_manual_override).toBe(true);
    expect(slice2After?.selected_platform).toEqual(JUNOS_REF);
    expect(s.batch?.batchRun?.epoch).toBe(2);
  });

  it("BatchRunOverrideSelected sets override and clears that device's parse/receipt/validation", () => {
    let s = intakeReducer(batchReadyState(), { type: "BatchRunRequested" });
    s = intakeReducer(s, {
      type: "BatchRunDeviceValidating",
      sliceId: "slice-0",
      deviceModel: DEVICE,
      receipt: RECEIPT,
    });
    s = intakeReducer(s, {
      type: "BatchRunDeviceCompleted",
      sliceId: "slice-0",
      report: reportWith(["medium"]),
    });
    s = intakeReducer(s, {
      type: "BatchRunOverrideSelected",
      sliceId: "slice-0",
      platform: JUNOS_REF,
      isManualOverride: true,
    });
    const d = s.batch?.batchRun?.devices.find((x) => x.slice_id === "slice-0");
    expect(d?.selected_platform).toEqual(JUNOS_REF);
    expect(d?.is_manual_override).toBe(true);
    expect(d?.stage_status).toBe("pending");
    expect(d?.device_model).toBeNull();
    expect(d?.receipt).toBeNull();
    expect(d?.validation_report).toBeNull();
  });

  it("BatchRunDeviceCompleted updates one device only and recomputes summary", () => {
    let s = intakeReducer(batchReadyState(), { type: "BatchRunRequested" });
    s = intakeReducer(s, {
      type: "BatchRunDeviceCompleted",
      sliceId: "slice-1",
      report: reportWith(["low"]),
    });
    const devices = s.batch?.batchRun?.devices ?? [];
    const slice0 = devices.find((d) => d.slice_id === "slice-0");
    const slice1 = devices.find((d) => d.slice_id === "slice-1");
    expect(slice0?.stage_status).toBe("pending");
    expect(slice1?.stage_status).toBe("complete");
    expect(s.batch?.batchRun?.summary.parsed_count).toBe(1);
    expect(s.batch?.batchRun?.summary.severity_counts.low).toBe(1);
    expect(summaryMatches(devices, s)).toBe(true);
  });

  it("BatchRunDeviceFailed advances failed_count", () => {
    let s = intakeReducer(batchReadyState(), { type: "BatchRunRequested" });
    const err: DeviceStageError = { stage: "parse", message: "boom" };
    s = intakeReducer(s, {
      type: "BatchRunDeviceFailed",
      sliceId: "slice-0",
      error: err,
    });
    const d = s.batch?.batchRun?.devices.find((x) => x.slice_id === "slice-0");
    expect(d?.stage_status).toBe("failed");
    expect(d?.stage_error).toEqual(err);
    expect(s.batch?.batchRun?.summary.failed_count).toBe(1);
  });

  it("full per-device lifecycle: queued → parsing → validating → completed", () => {
    let s = intakeReducer(batchReadyState(), { type: "BatchRunRequested" });
    const seq: ReadonlyArray<
      | "queued"
      | "parsing"
      | "validating"
      | "complete"
    > = ["queued", "parsing", "validating", "complete"];
    s = intakeReducer(s, { type: "BatchRunDeviceQueued", sliceId: "slice-0" });
    expect(seq[0]).toBe(
      s.batch?.batchRun?.devices.find((d) => d.slice_id === "slice-0")
        ?.stage_status,
    );
    s = intakeReducer(s, { type: "BatchRunDeviceParsing", sliceId: "slice-0" });
    expect(seq[1]).toBe(
      s.batch?.batchRun?.devices.find((d) => d.slice_id === "slice-0")
        ?.stage_status,
    );
    s = intakeReducer(s, {
      type: "BatchRunDeviceValidating",
      sliceId: "slice-0",
      deviceModel: DEVICE,
      receipt: RECEIPT,
    });
    expect(seq[2]).toBe(
      s.batch?.batchRun?.devices.find((d) => d.slice_id === "slice-0")
        ?.stage_status,
    );
    s = intakeReducer(s, {
      type: "BatchRunDeviceCompleted",
      sliceId: "slice-0",
      report: reportWith([]),
    });
    expect(seq[3]).toBe(
      s.batch?.batchRun?.devices.find((d) => d.slice_id === "slice-0")
        ?.stage_status,
    );
  });

  it("BatchRunCancelled removes batchRun entirely", () => {
    let s = intakeReducer(batchReadyState(), { type: "BatchRunRequested" });
    expect(s.batch?.batchRun).not.toBeNull();
    s = intakeReducer(s, { type: "BatchRunCancelled" });
    expect(s.batch?.batchRun).toBeNull();
    expect(s.batch).not.toBeNull();
  });

  it("after every reducer transition, summary == deriveBatchRunSummary(devices)", () => {
    let s = intakeReducer(batchReadyState(), { type: "BatchRunRequested" });
    expect(summaryMatches(s.batch?.batchRun?.devices ?? [], s)).toBe(true);
    s = intakeReducer(s, { type: "BatchRunDeviceQueued", sliceId: "slice-0" });
    expect(summaryMatches(s.batch?.batchRun?.devices ?? [], s)).toBe(true);
    s = intakeReducer(s, {
      type: "BatchRunDeviceCompleted",
      sliceId: "slice-0",
      report: reportWith(["high", "medium"]),
    });
    expect(summaryMatches(s.batch?.batchRun?.devices ?? [], s)).toBe(true);
    s = intakeReducer(s, {
      type: "BatchRunDeviceFailed",
      sliceId: "slice-1",
      error: { stage: "parse", message: "x" },
    });
    expect(summaryMatches(s.batch?.batchRun?.devices ?? [], s)).toBe(true);
  });

  it("devices array always sorted by slice_id", () => {
    let s = intakeReducer(batchReadyState(), { type: "BatchRunRequested" });
    s = intakeReducer(s, {
      type: "BatchRunDeviceCompleted",
      sliceId: "slice-2",
      report: reportWith([]),
    });
    s = intakeReducer(s, {
      type: "BatchRunDeviceCompleted",
      sliceId: "slice-0",
      report: reportWith([]),
    });
    const ids = (s.batch?.batchRun?.devices ?? []).map((d) => d.slice_id);
    expect(ids).toEqual([...ids].sort());
  });

  it("DrillIntoSlice with stored complete device populates parsed sub-state", () => {
    let s = intakeReducer(batchReadyState(), { type: "BatchRunRequested" });
    s = intakeReducer(s, {
      type: "BatchRunDeviceValidating",
      sliceId: "slice-0",
      deviceModel: DEVICE,
      receipt: RECEIPT,
    });
    s = intakeReducer(s, {
      type: "BatchRunDeviceCompleted",
      sliceId: "slice-0",
      report: reportWith(["medium"]),
    });
    s = intakeReducer(s, { type: "DrillIntoSlice", sliceId: "slice-0" });
    expect(s.status).toBe("parsed");
    expect(s.device).toBe(DEVICE);
    expect(s.receipt).toBe(RECEIPT);
    expect(s.validationStatus).toBe("ready");
    expect(s.validationReport?.findings.length).toBe(1);
  });

  it("DrillIntoSlice without stored device falls back to existing detect-based flow", () => {
    let s = intakeReducer(batchReadyState(), { type: "DrillIntoSlice", sliceId: "slice-0" });
    expect(s.status).toBe("detected");
    expect(s.device).toBeNull();
    expect(s.receipt).toBeNull();
    expect(s.validationStatus).toBe("idle");
  });

  it("provenance flows into BatchRunDevice when archive batch is present", () => {
    // Drive an archive batch manually.
    const provenance: Readonly<Record<string, ArchiveEntryRef>> = {
      "slice-0": {
        entry_id: "e0",
        entry_path: "site/a.cfg",
        archive_name: "x.zip",
      },
    };
    let s: IntakeState = initialIntakeState;
    s = intakeReducer(s, {
      type: "ArchiveOpenStart",
      filename: "x.zip",
      byte_size: 100,
    });
    s = intakeReducer(s, {
      type: "ArchiveBatchAssembled",
      result: {
        slices: [
          {
            slice_id: "slice-0",
            line_start: 1,
            line_end: 1,
            raw_text: "hostname r1\n",
            confidence: 1.0,
            hint: { kind: "hostname_present", hostname: "r1" },
          },
        ],
        method: { kind: "heuristic" },
        warnings: [],
        total_line_count: 1,
        scanned_line_count: 1,
        splitter_version: "1",
      },
      inventory: {
        archive_kind_supplied: { kind: "zip" },
        archive_kind_detected: { kind: "zip" },
        entries: [],
        warnings: [],
        total_uncompressed_size: 0,
        total_compressed_size: 0,
        entry_count: 0,
        extracted_count: 0,
        skipped_count: 0,
        archive_intake_version: "1",
      },
      provenance,
      archive_name: "x.zip",
    });
    s = intakeReducer(s, { type: "BatchRunRequested" });
    const d = s.batch?.batchRun?.devices.find((x) => x.slice_id === "slice-0");
    expect(d?.source_provenance).toEqual(provenance["slice-0"]);
    expect(s.batch?.batchRun?.source).toEqual({
      kind: "archive",
      archive_name: "x.zip",
    });
  });
});
