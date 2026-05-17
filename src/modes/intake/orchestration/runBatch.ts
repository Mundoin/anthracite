/**
 * V1Q — Batch run pipeline orchestrator.
 *
 * For each pending device (in slice_id order from the
 * supplied devices array), runs parse → receipt → validate
 * and dispatches the corresponding BatchRunDevice* actions.
 *
 * Concurrency: bounded via `concurrencyPool`. Default
 * maxInFlight in caller is BATCH_RUN_MAX_IN_FLIGHT (4).
 * maxInFlight = 1 collapses to deterministic sequential.
 *
 * Cancellation discipline (mirrors the V1P validator-
 * useEffect bugfix):
 *   - Caller owns an isCancelled() closure (typically backed
 *     by a ref that flips on effect cleanup OR on
 *     BatchRunCancelled observation).
 *   - The orchestrator checks isCancelled between every
 *     async boundary AND before each dispatch.
 *   - Cancellation does not throw; the pool resolves
 *     cleanly. Errors thrown by api calls propagate to a
 *     per-device BatchRunDeviceFailed dispatch and never
 *     escape the worker.
 *
 * The orchestrator is composition-only over the existing
 * five typed commands. It does NOT touch the reducer
 * directly — it only dispatches well-typed IntakeActions.
 */

import type {
  BatchRunDevice,
  DeviceStageError,
  DeviceStageErrorStage,
} from "../../../types/batchRun";
import type { ConfigSlice } from "../../../types/configBatch";
import type { PlatformRef } from "../../../types/networkModel";
import type {
  DetectionSource,
  SelectionMode,
  SourceContext,
  ValidatorContext,
} from "../../../types/validator";
import type { IntakeAction } from "../intakeTypes";
import type { IntakeApi } from "../IntakePanel";
import { runWithBoundedConcurrency } from "./concurrencyPool";

export interface RunBatchInput {
  readonly api: IntakeApi;
  readonly devices: ReadonlyArray<BatchRunDevice>;
  readonly slicesByID: ReadonlyMap<string, ConfigSlice>;
  readonly dispatch: (action: IntakeAction) => void;
  readonly maxInFlight: number;
  readonly isCancelled: () => boolean;
  /**
   * V1Q — archive name for ValidatorContext.source_context.
   * `null` for paste/file batches.
   */
  readonly archiveName: string | null;
}

export async function runBatch(input: RunBatchInput): Promise<void> {
  const {
    api,
    devices,
    slicesByID,
    dispatch,
    maxInFlight,
    isCancelled,
    archiveName,
  } = input;
  const pending = devices.filter((d) => d.stage_status === "pending");
  await runWithBoundedConcurrency<BatchRunDevice>({
    tasks: pending,
    maxInFlight,
    isCancelled,
    run: async (device, cancel) => {
      if (cancel()) return;
      await runOneDevice({
        api,
        device,
        slicesByID,
        dispatch,
        isCancelled: cancel,
        archiveName,
      });
    },
  });
}

interface RunOneDeviceInput {
  readonly api: IntakeApi;
  readonly device: BatchRunDevice;
  readonly slicesByID: ReadonlyMap<string, ConfigSlice>;
  readonly dispatch: (action: IntakeAction) => void;
  readonly isCancelled: () => boolean;
  readonly archiveName: string | null;
}

async function runOneDevice(input: RunOneDeviceInput): Promise<void> {
  const { api, device, slicesByID, dispatch, isCancelled, archiveName } = input;
  const slice = slicesByID.get(device.slice_id);
  if (!slice) {
    if (isCancelled()) return;
    dispatch({
      type: "BatchRunDeviceSkipped",
      sliceId: device.slice_id,
      reason: "slice_not_found",
    });
    return;
  }

  const platform = device.selected_platform;
  if (!platform) {
    if (isCancelled()) return;
    dispatch({
      type: "BatchRunDeviceSkipped",
      sliceId: device.slice_id,
      reason: "no_platform_resolved",
    });
    return;
  }

  if (isCancelled()) return;
  dispatch({ type: "BatchRunDeviceQueued", sliceId: device.slice_id });

  if (isCancelled()) return;
  dispatch({ type: "BatchRunDeviceParsing", sliceId: device.slice_id });

  let deviceModel;
  try {
    deviceModel = await api.parseDeviceConfig(platform, slice.raw_text);
  } catch (err) {
    if (isCancelled()) return;
    dispatch({
      type: "BatchRunDeviceFailed",
      sliceId: device.slice_id,
      error: makeStageError("parse", err),
    });
    return;
  }
  if (isCancelled()) return;

  let receipt;
  try {
    receipt = await api.projectDeviceReceipt(deviceModel);
  } catch (err) {
    if (isCancelled()) return;
    dispatch({
      type: "BatchRunDeviceFailed",
      sliceId: device.slice_id,
      error: makeStageError("receipt", err),
    });
    return;
  }
  if (isCancelled()) return;

  dispatch({
    type: "BatchRunDeviceValidating",
    sliceId: device.slice_id,
    deviceModel,
    receipt,
  });

  const validate = api.validateDeviceModel;
  if (!validate) {
    // No validator wrapper supplied (legacy api). Treat as complete
    // with empty findings is dishonest; mark as failed/validate.
    if (isCancelled()) return;
    dispatch({
      type: "BatchRunDeviceFailed",
      sliceId: device.slice_id,
      error: { stage: "validate", message: "validator not available" },
    });
    return;
  }

  const ctx = buildValidatorContext(device, deviceModel, archiveName);

  let report;
  try {
    report = await validate(deviceModel, ctx);
  } catch (err) {
    if (isCancelled()) return;
    dispatch({
      type: "BatchRunDeviceFailed",
      sliceId: device.slice_id,
      error: makeStageError("validate", err),
    });
    return;
  }
  if (isCancelled()) return;

  dispatch({
    type: "BatchRunDeviceCompleted",
    sliceId: device.slice_id,
    report,
  });
}

function makeStageError(
  stage: DeviceStageErrorStage,
  err: unknown,
): DeviceStageError {
  return { stage, message: describeError(err) };
}

function describeError(err: unknown): string {
  if (err == null) return "(unknown error)";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function buildValidatorContext(
  device: BatchRunDevice,
  deviceModel: { evidence?: { parser_version?: string | null } } | unknown,
  archiveName: string | null,
): ValidatorContext {
  const platform = device.selected_platform as PlatformRef;
  const selection_mode: SelectionMode = device.is_manual_override
    ? "manual_override"
    : "from_detection";
  const detection_source: DetectionSource = device.is_manual_override
    ? "manual_override"
    : device.detection_result?.best_match
      ? "best_match"
      : "not_applicable";
  const kind: SourceContext["kind"] = archiveName ? "archive_entry" : "slice";
  const source_context: SourceContext = {
    kind,
    label: device.source_provenance?.entry_path ?? null,
    archive_name: archiveName,
    slice_id: device.slice_id,
  };
  const parser_version = readParserVersion(deviceModel);
  return {
    platform_id: platform.platform_id,
    parser_id: platform.platform_id,
    parser_version,
    selection_mode,
    detection_confidence: device.detection_result?.confidence ?? null,
    detection_source,
    source_context,
  };
}

function readParserVersion(model: unknown): string | null {
  if (model && typeof model === "object" && "evidence" in model) {
    const ev = (model as { evidence?: unknown }).evidence;
    if (ev && typeof ev === "object" && "parser_version" in ev) {
      const v = (ev as { parser_version?: unknown }).parser_version;
      if (typeof v === "string") return v;
    }
  }
  return null;
}
