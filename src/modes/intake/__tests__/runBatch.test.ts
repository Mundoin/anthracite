/**
 * V1Q runBatch + concurrency pool tests.
 *
 * Concurrency-correctness focus: ensure the pool never
 * exceeds maxInFlight, cancellation bails between awaits,
 * maxInFlight=1 collapses cleanly, and per-device errors
 * surface as BatchRunDeviceFailed without escaping the
 * worker.
 */

import { describe, expect, it, vi } from "vitest";

import type {
  BatchRunDevice,
} from "../../../types/batchRun";
import type {
  ConfigBatchSplitResult,
  ConfigSlice,
} from "../../../types/configBatch";
import type { DeviceModel, PlatformRef } from "../../../types/networkModel";
import type { ReceiptView } from "../../../types/receipt";
import type { ValidationReport } from "../../../types/validator";
import type { IntakeAction } from "../intakeTypes";
import type { IntakeApi } from "../IntakePanel";
import { runWithBoundedConcurrency } from "../orchestration/concurrencyPool";
import { runBatch } from "../orchestration/runBatch";

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

const DEVICE = { identity: { hostname: "r1" } } as unknown as DeviceModel;
const RECEIPT = { hostname: "r1" } as unknown as ReceiptView;
const REPORT: ValidationReport = {
  validator_version: 1,
  rule_pack_version: 1,
  context: {
    platform_id: "cisco-iosxe",
    parser_id: "cisco-iosxe",
    parser_version: null,
    selection_mode: "from_detection",
    detection_confidence: 0.95,
    detection_source: "best_match",
    source_context: null,
  },
  findings: [],
  clean_rules: [],
  skipped_rules: [],
};

function device(
  sliceId: string,
  platform: PlatformRef | null = CISCO_REF,
  isManualOverride = false,
): BatchRunDevice {
  return {
    slice_id: sliceId,
    hostname_hint: null,
    source_provenance: null,
    stage_status: "pending",
    detection_result: platform
      ? {
          best_match: platform,
          candidates: [],
          evidence: [],
          confidence: 0.95,
          warnings: [],
          scanned_line_count: 1,
          total_line_count: 1,
        }
      : null,
    selected_platform: platform,
    is_manual_override: isManualOverride,
    device_model: null,
    receipt: null,
    validation_report: null,
    stage_error: null,
  };
}

function slicesByID(ids: ReadonlyArray<string>): ReadonlyMap<string, ConfigSlice> {
  const m = new Map<string, ConfigSlice>();
  for (const id of ids) {
    m.set(id, {
      slice_id: id,
      line_start: 1,
      line_end: 1,
      raw_text: `hostname ${id}\n`,
      confidence: 1.0,
      hint: { kind: "none" },
    });
  }
  return m;
}

function makeApi(overrides: Partial<IntakeApi> = {}): IntakeApi {
  return {
    listVendorPlatforms: vi.fn().mockResolvedValue([]),
    detectConfigPlatform: vi.fn(),
    parseDeviceConfig: vi.fn().mockResolvedValue(DEVICE),
    projectDeviceReceipt: vi.fn().mockResolvedValue(RECEIPT),
    splitConfigBatch: vi.fn(),
    archiveIntake: vi.fn(),
    validateDeviceModel: vi.fn().mockResolvedValue(REPORT),
    ...overrides,
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (err: unknown) => void;
} {
  let resolve!: (v: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("concurrencyPool", () => {
  it("empty tasks resolves immediately", async () => {
    const run = vi.fn();
    await runWithBoundedConcurrency({
      tasks: [],
      maxInFlight: 4,
      run,
      isCancelled: () => false,
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("single task runs once", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    await runWithBoundedConcurrency({
      tasks: ["a"],
      maxInFlight: 4,
      run,
      isCancelled: () => false,
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("10 tasks with maxInFlight=4 never exceeds 4 concurrent", async () => {
    let inFlight = 0;
    let peak = 0;
    const tasks = Array.from({ length: 10 }, (_, i) => i);
    await runWithBoundedConcurrency({
      tasks,
      maxInFlight: 4,
      isCancelled: () => false,
      run: async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await Promise.resolve();
        await Promise.resolve();
        inFlight -= 1;
      },
    });
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThanOrEqual(1);
  });

  it("cancellation between tasks halts further dispatch", async () => {
    let cancelled = false;
    const seen: number[] = [];
    const tasks = [0, 1, 2, 3, 4];
    await runWithBoundedConcurrency({
      tasks,
      maxInFlight: 1,
      isCancelled: () => cancelled,
      run: async (i, cancel) => {
        if (cancel()) return;
        seen.push(i);
        if (i === 1) cancelled = true;
      },
    });
    // After i=1 sets cancelled, the loop bails before grabbing i=2.
    expect(seen).toEqual([0, 1]);
  });

  it("maxInFlight=1 behaves sequentially (no concurrent execution)", async () => {
    let inFlight = 0;
    let peak = 0;
    await runWithBoundedConcurrency({
      tasks: [0, 1, 2, 3, 4],
      maxInFlight: 1,
      isCancelled: () => false,
      run: async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await Promise.resolve();
        inFlight -= 1;
      },
    });
    expect(peak).toBe(1);
  });
});

describe("runBatch", () => {
  it("happy path: every device transitions queued → parsing → validating → completed", async () => {
    const dispatched: IntakeAction[] = [];
    const devices = [device("slice-0"), device("slice-1"), device("slice-2")];
    await runBatch({
      api: makeApi(),
      devices,
      slicesByID: slicesByID(["slice-0", "slice-1", "slice-2"]),
      dispatch: (a) => dispatched.push(a),
      maxInFlight: 4,
      isCancelled: () => false,
      archiveName: null,
    });
    for (const id of ["slice-0", "slice-1", "slice-2"]) {
      const types = dispatched
        .filter((a) => "sliceId" in a && a.sliceId === id)
        .map((a) => a.type);
      expect(types).toEqual([
        "BatchRunDeviceQueued",
        "BatchRunDeviceParsing",
        "BatchRunDeviceValidating",
        "BatchRunDeviceCompleted",
      ]);
    }
  });

  it("parse failure on one device dispatches BatchRunDeviceFailed; others complete", async () => {
    const dispatched: IntakeAction[] = [];
    const parseDeviceConfig = vi
      .fn()
      .mockImplementation((platform: PlatformRef, text: string) => {
        if (text.includes("slice-1")) {
          return Promise.reject(new Error("parse boom"));
        }
        return Promise.resolve(DEVICE);
      });
    await runBatch({
      api: makeApi({ parseDeviceConfig }),
      devices: [device("slice-0"), device("slice-1"), device("slice-2")],
      slicesByID: slicesByID(["slice-0", "slice-1", "slice-2"]),
      dispatch: (a) => dispatched.push(a),
      maxInFlight: 4,
      isCancelled: () => false,
      archiveName: null,
    });
    const failed = dispatched.find(
      (a) => a.type === "BatchRunDeviceFailed" && a.sliceId === "slice-1",
    );
    expect(failed).toBeTruthy();
    if (failed && "error" in failed) {
      expect(failed.error.stage).toBe("parse");
      expect(failed.error.message).toBe("parse boom");
    }
    const completed = dispatched.filter(
      (a) => a.type === "BatchRunDeviceCompleted",
    );
    expect(completed.length).toBe(2);
  });

  it("manual override device parses with overridden platform_ref (not detection's best_match)", async () => {
    const parseDeviceConfig = vi.fn().mockResolvedValue(DEVICE);
    const overridden = device("slice-0", JUNOS_REF, true);
    await runBatch({
      api: makeApi({ parseDeviceConfig }),
      devices: [overridden],
      slicesByID: slicesByID(["slice-0"]),
      dispatch: () => undefined,
      maxInFlight: 1,
      isCancelled: () => false,
      archiveName: null,
    });
    expect(parseDeviceConfig).toHaveBeenCalledTimes(1);
    const [calledPlatform] = parseDeviceConfig.mock.calls[0];
    expect(calledPlatform).toEqual(JUNOS_REF);
  });

  it("device with neither detection nor override dispatches BatchRunDeviceSkipped, no parse call", async () => {
    const dispatched: IntakeAction[] = [];
    const parseDeviceConfig = vi.fn();
    await runBatch({
      api: makeApi({ parseDeviceConfig }),
      devices: [device("slice-0", null)],
      slicesByID: slicesByID(["slice-0"]),
      dispatch: (a) => dispatched.push(a),
      maxInFlight: 1,
      isCancelled: () => false,
      archiveName: null,
    });
    expect(parseDeviceConfig).not.toHaveBeenCalled();
    const skipped = dispatched.find((a) => a.type === "BatchRunDeviceSkipped");
    expect(skipped).toBeTruthy();
    if (skipped && "reason" in skipped) {
      expect(skipped.reason).toBe("no_platform_resolved");
    }
  });

  it("cancellation mid-batch halts further dispatches", async () => {
    let cancelled = false;
    const dispatched: IntakeAction[] = [];
    const slowParse = vi.fn().mockImplementation(async () => {
      // Yield once so cancellation can flip between awaits.
      await Promise.resolve();
      return DEVICE;
    });
    const dispatch = (a: IntakeAction): void => {
      dispatched.push(a);
      // After the first device queues, simulate operator action.
      if (a.type === "BatchRunDeviceQueued" && a.sliceId === "slice-0") {
        cancelled = true;
      }
    };
    await runBatch({
      api: makeApi({ parseDeviceConfig: slowParse }),
      devices: [device("slice-0"), device("slice-1"), device("slice-2")],
      slicesByID: slicesByID(["slice-0", "slice-1", "slice-2"]),
      dispatch,
      maxInFlight: 1,
      isCancelled: () => cancelled,
      archiveName: null,
    });
    // slice-1 + slice-2 must never have been queued.
    const queuedIds = dispatched
      .filter((a) => a.type === "BatchRunDeviceQueued")
      .map((a) => ("sliceId" in a ? a.sliceId : ""));
    expect(queuedIds).toEqual(["slice-0"]);
  });

  it("validateDeviceModel called with ValidatorContext carrying the slice id", async () => {
    const validate = vi.fn().mockResolvedValue(REPORT);
    await runBatch({
      api: makeApi({ validateDeviceModel: validate }),
      devices: [device("slice-7")],
      slicesByID: slicesByID(["slice-7"]),
      dispatch: () => undefined,
      maxInFlight: 1,
      isCancelled: () => false,
      archiveName: "configs.zip",
    });
    expect(validate).toHaveBeenCalledTimes(1);
    const [, ctx] = validate.mock.calls[0];
    expect(ctx.source_context).toEqual({
      kind: "archive_entry",
      label: null,
      archive_name: "configs.zip",
      slice_id: "slice-7",
    });
  });

  it("absence of validateDeviceModel wrapper → device failed at validate stage", async () => {
    const dispatched: IntakeAction[] = [];
    const api = makeApi({ validateDeviceModel: undefined });
    await runBatch({
      api,
      devices: [device("slice-0")],
      slicesByID: slicesByID(["slice-0"]),
      dispatch: (a) => dispatched.push(a),
      maxInFlight: 1,
      isCancelled: () => false,
      archiveName: null,
    });
    const failed = dispatched.find((a) => a.type === "BatchRunDeviceFailed");
    expect(failed).toBeTruthy();
    if (failed && "error" in failed) {
      expect(failed.error.stage).toBe("validate");
    }
  });

  it("deterministic per-device action order — same input twice produces same dispatch sequence per device", async () => {
    const run = async (): Promise<IntakeAction[]> => {
      const out: IntakeAction[] = [];
      await runBatch({
        api: makeApi(),
        devices: [device("slice-0"), device("slice-1")],
        slicesByID: slicesByID(["slice-0", "slice-1"]),
        dispatch: (a) => out.push(a),
        maxInFlight: 1,
        isCancelled: () => false,
        archiveName: null,
      });
      return out;
    };
    const a = await run();
    const b = await run();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
