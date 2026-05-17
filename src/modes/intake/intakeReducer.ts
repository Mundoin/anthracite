/**
 * Intake mode — pure reducer (V1O + V1O-A).
 *
 * Legal transitions only. Illegal actions return the prior state
 * unchanged. Vendor-list and error-dismiss actions are accepted in
 * any non-terminal status because they do not advance the primary
 * flow.
 *
 * V1O-A overlay: a `batchStatus` + `batch` pair wraps the V1O state.
 * When `batchStatus === "split_complete"` and `batch.drilledSliceId`
 * is non-null, the V1O sub-state machine drives the per-slice
 * detect / parse / receipt view for that one slice.
 */

import {
  findSlice,
  initialIntakeState,
  type BatchData,
  type IntakeAction,
  type IntakeState,
  type PerSliceDetection,
} from "./intakeTypes";
import {
  deriveBatchRunStatus,
  deriveBatchRunSummary,
} from "./orchestration/batchRunSummary";
import type {
  BatchRun,
  BatchRunDevice,
  BatchRunSource,
} from "../../types/batchRun";

export function intakeReducer(
  state: IntakeState,
  action: IntakeAction,
): IntakeState {
  switch (action.type) {
    case "VendorPlatformsLoaded":
      return {
        ...state,
        vendorPlatforms: action.platforms,
        vendorListError: null,
      };

    case "VendorPlatformsFailed":
      return {
        ...state,
        vendorListError: action.message,
      };

    case "SetConfigText": {
      if (state.status === "detecting" || state.status === "parsing") return state;
      if (state.batchStatus === "splitting") return state;
      // Editing text invalidates any prior batch.
      const text = action.text;
      if (text.length === 0) {
        return {
          ...initialIntakeState,
          vendorPlatforms: state.vendorPlatforms,
          vendorListError: state.vendorListError,
        };
      }
      const sourcePreserved =
        state.source &&
        state.source.kind === "file" &&
        state.text === text &&
        state.batchStatus === "none"
          ? state.source
          : { kind: "paste" as const, filename: null, byte_size: null };
      return {
        status: "input_ready",
        text,
        source: sourcePreserved,
        detection: null,
        selectedPlatform: null,
        isManualOverride: false,
        device: null,
        receipt: null,
        errorStage: null,
        errorMessage: null,
        vendorPlatforms: state.vendorPlatforms,
        vendorListError: state.vendorListError,
        batchStatus: "none",
        batch: null,
        validationStatus: "idle",
        validationReport: null,
        validationError: null,
      };
    }

    case "FileLoaded": {
      if (state.status === "detecting" || state.status === "parsing") return state;
      if (state.batchStatus === "splitting") return state;
      return {
        status: "input_ready",
        text: action.text,
        source: {
          kind: "file",
          filename: action.filename,
          byte_size: action.byte_size,
        },
        detection: null,
        selectedPlatform: null,
        isManualOverride: false,
        device: null,
        receipt: null,
        errorStage: null,
        errorMessage: null,
        vendorPlatforms: state.vendorPlatforms,
        vendorListError: state.vendorListError,
        batchStatus: "none",
        batch: null,
        validationStatus: "idle",
        validationReport: null,
        validationError: null,
      };
    }

    case "FileLoadFailed":
      if (state.status === "detecting" || state.status === "parsing") return state;
      if (state.batchStatus === "splitting") return state;
      return {
        ...state,
        status: "error",
        errorStage: "file_open",
        errorMessage: action.message,
      };

    case "ClearAll":
      return {
        ...initialIntakeState,
        vendorPlatforms: state.vendorPlatforms,
        vendorListError: state.vendorListError,
      };

    // ---- V1O sub-state (also drives per-slice drill-down) -----------

    case "DetectStart":
      if (state.status !== "input_ready" && state.status !== "error") return state;
      if (state.text.length === 0) return state;
      return {
        ...state,
        status: "detecting",
        detection: null,
        selectedPlatform: null,
        isManualOverride: false,
        device: null,
        receipt: null,
        errorStage: null,
        errorMessage: null,
      };

    case "DetectSucceeded":
      if (state.status !== "detecting") return state;
      return {
        ...state,
        status: "detected",
        detection: action.result,
        selectedPlatform: action.result.best_match,
        isManualOverride: false,
      };

    case "DetectFailed":
      if (state.status !== "detecting") return state;
      return {
        ...state,
        status: "error",
        errorStage: "detect",
        errorMessage: action.message,
      };

    case "SelectPlatform":
      if (
        state.status !== "detected" &&
        state.status !== "parsed" &&
        state.status !== "error"
      ) {
        return state;
      }
      return {
        ...state,
        status: "detected",
        selectedPlatform: action.platform,
        isManualOverride: action.isManualOverride,
        device: null,
        receipt: null,
        errorStage: null,
        errorMessage: null,
      };

    case "ParseStart":
      if (state.status !== "detected") return state;
      if (!state.selectedPlatform) return state;
      return {
        ...state,
        status: "parsing",
        device: null,
        receipt: null,
        errorStage: null,
        errorMessage: null,
      };

    case "ParseSucceeded":
      if (state.status !== "parsing") return state;
      return {
        ...state,
        status: "parsed",
        device: action.device,
        receipt: action.receipt,
      };

    case "ParseFailed":
      if (state.status !== "parsing") return state;
      return {
        ...state,
        status: "error",
        errorStage: "parse",
        errorMessage: action.message,
      };

    case "ReceiptFailed":
      if (state.status !== "parsing") return state;
      return {
        ...state,
        status: "error",
        errorStage: "receipt",
        errorMessage: action.message,
        device: action.device,
      };

    case "DismissError":
      if (state.status !== "error") return state;
      if (state.text.length === 0) {
        return {
          ...initialIntakeState,
          vendorPlatforms: state.vendorPlatforms,
          vendorListError: state.vendorListError,
        };
      }
      return {
        ...state,
        status: "input_ready",
        errorStage: null,
        errorMessage: null,
      };

    // ---- V1O-A batch wrapper ----------------------------------------

    case "SplitStart":
      if (state.batchStatus === "splitting") return state;
      if (state.status === "detecting" || state.status === "parsing") return state;
      if (state.text.length === 0) return state;
      return {
        ...state,
        batchStatus: "splitting",
        batch: null,
        // Reset V1O sub-state so the split result drives the next view.
        status: "input_ready",
        detection: null,
        selectedPlatform: null,
        isManualOverride: false,
        device: null,
        receipt: null,
        errorStage: null,
        errorMessage: null,
      };

    case "SplitToSingle":
      if (state.batchStatus !== "splitting") return state;
      // Single-config regression lock (R4): clear the batch wrapper
      // completely and fall straight through to V1O detect.
      return {
        ...state,
        batchStatus: "none",
        batch: null,
        status: "detecting",
      };

    case "SplitToBatch": {
      if (state.batchStatus !== "splitting") return state;
      const perSlice: Record<string, PerSliceDetection> = {};
      for (const s of action.result.slices) {
        perSlice[s.slice_id] = { status: "pending" };
      }
      const batch: BatchData = {
        originalText: state.text,
        originalSource: state.source,
        splitResult: action.result,
        perSliceDetection: perSlice,
        drilledSliceId: null,
        archiveInventory: null,
        archiveProvenance: {},
        archiveName: null,
        batchRun: null,
      };
      return {
        ...state,
        batchStatus: "split_complete",
        batch,
        // V1O sub-state is parked while at the batch summary view.
        status: "input_ready",
        detection: null,
        selectedPlatform: null,
        isManualOverride: false,
        device: null,
        receipt: null,
        errorStage: null,
        errorMessage: null,
      };
    }

    case "SplitFailed":
      if (state.batchStatus !== "splitting") return state;
      return {
        ...state,
        batchStatus: "split_error",
        batch: null,
        status: "error",
        errorStage: "split",
        errorMessage: action.message,
      };

    case "PerSliceDetectionSucceeded": {
      if (!state.batch) return state;
      const perSlice = {
        ...state.batch.perSliceDetection,
        [action.sliceId]: {
          status: "detected" as const,
          result: action.result,
        },
      };
      return {
        ...state,
        batch: { ...state.batch, perSliceDetection: perSlice },
      };
    }

    case "PerSliceDetectionFailed": {
      if (!state.batch) return state;
      const perSlice = {
        ...state.batch.perSliceDetection,
        [action.sliceId]: {
          status: "failed" as const,
          message: action.message,
        },
      };
      return {
        ...state,
        batch: { ...state.batch, perSliceDetection: perSlice },
      };
    }

    case "DrillIntoSlice": {
      if (!state.batch) return state;
      if (state.batchStatus !== "split_complete") return state;
      const slice = findSlice(state.batch, action.sliceId);
      if (!slice) return state;
      const cached = state.batch.perSliceDetection[action.sliceId];
      const detection =
        cached && cached.status === "detected" ? cached.result : null;
      // V1Q — if a BatchRun stored a completed result for this slice,
      // populate the V1O + V1P sub-state from the stored device.
      // Drill-down then reads stored results instead of re-running
      // parse / receipt / validate.
      const storedDevice =
        state.batch.batchRun?.devices.find(
          (d) => d.slice_id === action.sliceId,
        ) ?? null;
      if (storedDevice && storedDevice.stage_status === "complete") {
        return {
          ...state,
          batch: { ...state.batch, drilledSliceId: action.sliceId },
          text: slice.raw_text,
          source: state.batch.originalSource,
          status: "parsed",
          detection: storedDevice.detection_result ?? detection,
          selectedPlatform: storedDevice.selected_platform,
          isManualOverride: storedDevice.is_manual_override,
          device: storedDevice.device_model,
          receipt: storedDevice.receipt,
          errorStage: null,
          errorMessage: null,
          validationStatus: storedDevice.validation_report ? "ready" : "idle",
          validationReport: storedDevice.validation_report,
          validationError: null,
        };
      }
      return {
        ...state,
        batch: { ...state.batch, drilledSliceId: action.sliceId },
        // Hand the V1O sub-state to this slice.
        text: slice.raw_text,
        source: state.batch.originalSource,
        status: detection ? "detected" : "input_ready",
        detection,
        selectedPlatform: detection?.best_match ?? null,
        isManualOverride: false,
        device: null,
        receipt: null,
        errorStage: null,
        errorMessage: null,
      };
    }

    case "BackToBatch": {
      if (!state.batch) return state;
      if (state.batchStatus !== "split_complete") return state;
      return {
        ...state,
        batch: { ...state.batch, drilledSliceId: null },
        // Park V1O sub-state; restore the original text for context.
        text: state.batch.originalText,
        source: state.batch.originalSource,
        status: "input_ready",
        detection: null,
        selectedPlatform: null,
        isManualOverride: false,
        device: null,
        receipt: null,
        errorStage: null,
        errorMessage: null,
      };
    }

    case "TreatAsSingleConfig": {
      if (!state.batch) return state;
      const originalText = state.batch.originalText;
      const originalSource = state.batch.originalSource;
      return {
        ...state,
        batchStatus: "none",
        batch: null,
        text: originalText,
        source: originalSource,
        status: "input_ready",
        detection: null,
        selectedPlatform: null,
        isManualOverride: false,
        device: null,
        receipt: null,
        errorStage: null,
        errorMessage: null,
      };
    }

    // ---- V1O-B archive wrapper --------------------------------------

    case "ArchiveOpenStart": {
      if (state.status === "detecting" || state.status === "parsing") return state;
      if (state.batchStatus === "splitting" || state.batchStatus === "archive_loading")
        return state;
      return {
        ...initialIntakeState,
        vendorPlatforms: state.vendorPlatforms,
        vendorListError: state.vendorListError,
        source: {
          kind: "archive",
          filename: action.filename,
          byte_size: action.byte_size,
        },
        batchStatus: "archive_loading",
      };
    }

    case "ArchiveOpenFailed": {
      // Accept from any state — the async archive load can fail from
      // any predecessor (loading, splitting, or an already-resolved
      // intake mid-batch-assembly) and the error must always surface.
      return {
        ...state,
        batchStatus: "archive_error",
        batch: null,
        status: "error",
        errorStage: "archive",
        errorMessage: action.message,
      };
    }

    case "ArchiveIntakeSplittingStart": {
      if (state.batchStatus !== "archive_loading") return state;
      return { ...state, batchStatus: "archive_splitting" };
    }

    case "ArchiveSingleConfigPassthrough": {
      if (
        state.batchStatus !== "archive_loading" &&
        state.batchStatus !== "archive_splitting"
      ) {
        return state;
      }
      // R11 regression lock: single archive → single entry → single
      // config flows through the V1O single-config UX unchanged. The
      // archive metadata is dropped to keep the render path
      // byte-identical to V1O paste. The entry path travels as the
      // source filename so the operator still sees provenance.
      return {
        ...initialIntakeState,
        vendorPlatforms: state.vendorPlatforms,
        vendorListError: state.vendorListError,
        text: action.text,
        source: {
          kind: "archive",
          filename: `${action.archive_name} / ${action.entry_path}`,
          byte_size: action.text.length,
        },
        status: "detecting",
        batchStatus: "none",
        batch: null,
      };
    }

    // ---- V1P validator overlay ---------------------------------------

    case "ValidatorStarted": {
      return {
        ...state,
        validationStatus: "loading",
        validationReport: null,
        validationError: null,
      };
    }

    case "ValidatorSucceeded": {
      // Guard against late dispatches whose validation run was
      // superseded by another (e.g. operator changed text mid-IPC).
      // Only the current "loading" run is allowed to land its report.
      if (state.validationStatus !== "loading") return state;
      return {
        ...state,
        validationStatus: "ready",
        validationReport: action.report,
        validationError: null,
      };
    }

    case "ValidatorFailed": {
      if (state.validationStatus !== "loading") return state;
      return {
        ...state,
        validationStatus: "failed",
        validationReport: null,
        validationError: action.error,
      };
    }

    // ---- V1Q Batch Run Workspace ------------------------------------

    case "BatchRunRequested": {
      if (!state.batch) return state;
      if (state.batchStatus !== "split_complete") return state;
      if (state.batch.splitResult.slices.length === 0) return state;
      const devices = buildInitialBatchRunDevices(state.batch);
      const summary = deriveBatchRunSummary(devices);
      const source = batchRunSourceFromState(state);
      const epoch = (state.batch.batchRun?.epoch ?? 0) + 1;
      const batchRun: BatchRun = {
        source,
        devices,
        summary,
        status: deriveBatchRunStatus(devices, true),
        epoch,
      };
      return {
        ...state,
        batch: { ...state.batch, batchRun },
      };
    }

    case "BatchRunReRunRequested": {
      if (!state.batch || !state.batch.batchRun) return state;
      const reset = state.batch.batchRun.devices.map((d) =>
        resetDeviceForRerun(d),
      );
      const sorted = sortDevices(reset);
      const summary = deriveBatchRunSummary(sorted);
      const epoch = state.batch.batchRun.epoch + 1;
      const batchRun: BatchRun = {
        ...state.batch.batchRun,
        devices: sorted,
        summary,
        status: deriveBatchRunStatus(sorted, true),
        epoch,
      };
      return {
        ...state,
        batch: { ...state.batch, batchRun },
      };
    }

    case "BatchRunCancelled": {
      if (!state.batch || !state.batch.batchRun) return state;
      return {
        ...state,
        batch: { ...state.batch, batchRun: null },
      };
    }

    case "BatchRunDeviceQueued":
      return applyDeviceUpdate(state, action.sliceId, (d) => ({
        ...d,
        stage_status: "queued",
        stage_error: null,
      }));

    case "BatchRunDeviceParsing":
      return applyDeviceUpdate(state, action.sliceId, (d) => ({
        ...d,
        stage_status: "parsing",
        stage_error: null,
      }));

    case "BatchRunDeviceValidating": {
      const sliceId = action.sliceId;
      const deviceModel = action.deviceModel;
      const receipt = action.receipt;
      return applyDeviceUpdate(state, sliceId, (d) => ({
        ...d,
        stage_status: "validating",
        device_model: deviceModel,
        receipt,
        stage_error: null,
      }));
    }

    case "BatchRunDeviceCompleted": {
      const report = action.report;
      return applyDeviceUpdate(state, action.sliceId, (d) => ({
        ...d,
        stage_status: "complete",
        validation_report: report,
        stage_error: null,
      }));
    }

    case "BatchRunDeviceFailed": {
      const err = action.error;
      return applyDeviceUpdate(state, action.sliceId, (d) => ({
        ...d,
        stage_status: "failed",
        stage_error: err,
      }));
    }

    case "BatchRunDeviceSkipped": {
      const reason = action.reason;
      return applyDeviceUpdate(state, action.sliceId, (d) => ({
        ...d,
        stage_status: "skipped",
        stage_error: { stage: "detect", message: reason },
      }));
    }

    case "BatchRunOverrideSelected": {
      const platform = action.platform;
      const isManual = action.isManualOverride;
      return applyDeviceUpdate(state, action.sliceId, (d) => ({
        ...d,
        selected_platform: platform,
        is_manual_override: isManual,
        stage_status: "pending",
        device_model: null,
        receipt: null,
        validation_report: null,
        stage_error: null,
      }));
    }

    case "ArchiveBatchAssembled": {
      if (
        state.batchStatus !== "archive_loading" &&
        state.batchStatus !== "archive_splitting"
      ) {
        return state;
      }
      const perSlice: Record<string, PerSliceDetection> = {};
      for (const s of action.result.slices) {
        perSlice[s.slice_id] = { status: "pending" };
      }
      const batch: BatchData = {
        originalText: "",
        originalSource: state.source,
        splitResult: action.result,
        perSliceDetection: perSlice,
        drilledSliceId: null,
        archiveInventory: action.inventory,
        archiveProvenance: action.provenance,
        archiveName: action.archive_name,
        batchRun: null,
      };
      return {
        ...state,
        batchStatus: "split_complete",
        batch,
        status: "input_ready",
        detection: null,
        selectedPlatform: null,
        isManualOverride: false,
        device: null,
        receipt: null,
        errorStage: null,
        errorMessage: null,
      };
    }
  }
}

// ===== V1Q helpers ==========================================================

/**
 * Build the initial per-device BatchRunDevice[] from the existing
 * batch slices + per-slice detection results. Each device starts
 * at stage_status "pending"; detection_result is copied from the
 * already-resolved perSliceDetection map.
 *
 * The detection's best_match becomes the initial selected_platform.
 * is_manual_override is false until BatchRunOverrideSelected fires.
 */
function buildInitialBatchRunDevices(
  batch: BatchData,
): ReadonlyArray<BatchRunDevice> {
  const devices: BatchRunDevice[] = [];
  for (const slice of batch.splitResult.slices) {
    const det = batch.perSliceDetection[slice.slice_id];
    const detection =
      det && det.status === "detected" ? det.result : null;
    const hostname =
      slice.hint.kind === "hostname_present" ? slice.hint.hostname : null;
    const provenance = batch.archiveProvenance?.[slice.slice_id] ?? null;
    devices.push({
      slice_id: slice.slice_id,
      hostname_hint: hostname,
      source_provenance: provenance,
      stage_status: "pending",
      detection_result: detection,
      selected_platform: detection?.best_match ?? null,
      is_manual_override: false,
      device_model: null,
      receipt: null,
      validation_report: null,
      stage_error: null,
    });
  }
  return sortDevices(devices);
}

/**
 * Reset a device for re-run. Operator truth (selected_platform +
 * is_manual_override) and provenance are preserved; runtime
 * artefacts (device_model, receipt, validation_report, errors) are
 * cleared and stage_status returns to "pending".
 */
function resetDeviceForRerun(d: BatchRunDevice): BatchRunDevice {
  return {
    ...d,
    stage_status: "pending",
    device_model: null,
    receipt: null,
    validation_report: null,
    stage_error: null,
  };
}

/**
 * Devices are sorted by slice_id ASC always (determinism rule from
 * batchRun.ts). Sort is stable on the input ordering.
 */
function sortDevices(
  devices: ReadonlyArray<BatchRunDevice>,
): ReadonlyArray<BatchRunDevice> {
  const copy = [...devices];
  copy.sort((a, b) => (a.slice_id < b.slice_id ? -1 : a.slice_id > b.slice_id ? 1 : 0));
  return copy;
}

/**
 * Apply a per-device update by slice_id. Returns the prior state
 * unchanged when no batchRun is present or the slice id is unknown.
 * Recomputes summary + status after every update.
 */
function applyDeviceUpdate(
  state: IntakeState,
  sliceId: string,
  update: (d: BatchRunDevice) => BatchRunDevice,
): IntakeState {
  if (!state.batch || !state.batch.batchRun) return state;
  const idx = state.batch.batchRun.devices.findIndex(
    (d) => d.slice_id === sliceId,
  );
  if (idx === -1) return state;
  const nextDevice = update(state.batch.batchRun.devices[idx]);
  if (nextDevice === state.batch.batchRun.devices[idx]) return state;
  const nextDevices = sortDevices(
    state.batch.batchRun.devices.map((d, i) => (i === idx ? nextDevice : d)),
  );
  const summary = deriveBatchRunSummary(nextDevices);
  const status = deriveBatchRunStatus(nextDevices, true);
  const batchRun: BatchRun = {
    ...state.batch.batchRun,
    devices: nextDevices,
    summary,
    status,
  };
  return { ...state, batch: { ...state.batch, batchRun } };
}

function batchRunSourceFromState(state: IntakeState): BatchRunSource {
  const archiveName = state.batch?.archiveName ?? null;
  if (archiveName) return { kind: "archive", archive_name: archiveName };
  if (state.source?.kind === "file" && state.source.filename) {
    return { kind: "file", filename: state.source.filename };
  }
  return { kind: "paste" };
}

