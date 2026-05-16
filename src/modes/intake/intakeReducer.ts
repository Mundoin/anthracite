/**
 * Intake mode — pure reducer (V1O).
 *
 * Legal transitions only. Illegal actions return the prior state unchanged.
 * Vendor-list and error-dismiss actions are accepted in any non-terminal
 * status because they do not advance the primary flow.
 */

import {
  initialIntakeState,
  type IntakeAction,
  type IntakeState,
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
      const text = action.text;
      if (text.length === 0) {
        return {
          ...initialIntakeState,
          vendorPlatforms: state.vendorPlatforms,
          vendorListError: state.vendorListError,
        };
      }
      const sourcePreserved =
        state.source && state.source.kind === "file" && state.text === text
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
      };
    }

    case "FileLoaded": {
      if (state.status === "detecting" || state.status === "parsing") return state;
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
      };
    }

    case "FileLoadFailed":
      if (state.status === "detecting" || state.status === "parsing") return state;
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
      if (state.status !== "detected" && state.status !== "parsed" && state.status !== "error") {
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
  }
}
