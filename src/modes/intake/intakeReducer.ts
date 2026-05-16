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
  }
}
