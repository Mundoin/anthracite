/**
 * Intake mode — state types (V1O + V1O-A).
 *
 * V1O ships single-config intake (stateless). V1O-A wraps that flow
 * with a deterministic Rust config splitter and a multi-device batch
 * view. The single-config user experience is byte-identical to V1O
 * (R4 regression lock); batch mode is a new render path that drills
 * into per-slice receipts via the same V1O sub-state machine.
 */

import type {
  ArchiveEntryRef,
  ArchiveIntakeResult,
} from "../../types/archiveIntake";
import type {
  BatchRun,
  DeviceStageError,
} from "../../types/batchRun";
import type { ConfigBatchSplitResult, ConfigSlice } from "../../types/configBatch";
import type { ConfigDetectionResult } from "../../types/configDetection";
import type { DeviceModel, PlatformRef } from "../../types/networkModel";
import type { ReceiptView } from "../../types/receipt";
import type { ValidationReport } from "../../types/validator";
import type { VendorPlatform } from "../../types/vendor";

export type IntakeStatus =
  | "idle"
  | "input_ready"
  | "detecting"
  | "detected"
  | "parsing"
  | "parsed"
  | "error";

export type IntakeErrorStage =
  | "file_open"
  | "detect"
  | "parse"
  | "receipt"
  | "vendor_list"
  | "split"
  | "archive";

export type IntakeSourceKind = "paste" | "file" | "archive";

export interface IntakeSource {
  readonly kind: IntakeSourceKind;
  readonly filename: string | null;
  readonly byte_size: number | null;
}

// V1O-A — batch wrapper.
export type BatchStatus =
  | "none"
  | "splitting"
  | "split_complete"
  | "split_error"
  // V1O-B — archive intake states. `archive_loading` covers the file
  // read + archive_intake invoke; `archive_splitting` covers the
  // per-entry splitter fan-out.
  | "archive_loading"
  | "archive_splitting"
  | "archive_error";

export type PerSliceDetection =
  | { readonly status: "pending" }
  | { readonly status: "detected"; readonly result: ConfigDetectionResult }
  | { readonly status: "failed"; readonly message: string };

export interface BatchData {
  readonly originalText: string;
  readonly originalSource: IntakeSource | null;
  readonly splitResult: ConfigBatchSplitResult;
  readonly perSliceDetection: Readonly<Record<string, PerSliceDetection>>;
  readonly drilledSliceId: string | null;
  // V1O-B — archive provenance, present only when the batch came from
  // an archive. `null` when the batch came from a paste/file split.
  readonly archiveInventory: ArchiveIntakeResult | null;
  readonly archiveProvenance: Readonly<Record<string, ArchiveEntryRef>>;
  readonly archiveName: string | null;
  // V1Q — frontend-only Batch Run aggregation artifact. `null` until
  // the operator clicks "Analyse batch". See `types/batchRun.ts`.
  readonly batchRun: BatchRun | null;
}

// V1P — validator overlay.
export type ValidationStatus = "idle" | "loading" | "ready" | "failed";

export interface IntakeState {
  // V1O — per-config sub-state. When in batch mode and drilled into a
  // slice, these fields drive the per-slice view via the existing
  // sub-state machine.
  readonly status: IntakeStatus;
  readonly text: string;
  readonly source: IntakeSource | null;
  readonly detection: ConfigDetectionResult | null;
  readonly selectedPlatform: PlatformRef | null;
  readonly isManualOverride: boolean;
  readonly device: DeviceModel | null;
  readonly receipt: ReceiptView | null;
  readonly errorStage: IntakeErrorStage | null;
  readonly errorMessage: string | null;
  readonly vendorPlatforms: ReadonlyArray<VendorPlatform>;
  readonly vendorListError: string | null;
  // V1O-A — batch wrapper.
  readonly batchStatus: BatchStatus;
  readonly batch: BatchData | null;
  // V1P — validator overlay. Drives the FindingsPanel above
  // ReceiptDisplay in the single-device and drilled-in branches.
  readonly validationStatus: ValidationStatus;
  readonly validationReport: ValidationReport | null;
  readonly validationError: string | null;
}

export const initialIntakeState: IntakeState = {
  status: "idle",
  text: "",
  source: null,
  detection: null,
  selectedPlatform: null,
  isManualOverride: false,
  device: null,
  receipt: null,
  errorStage: null,
  errorMessage: null,
  vendorPlatforms: [],
  vendorListError: null,
  batchStatus: "none",
  batch: null,
  validationStatus: "idle",
  validationReport: null,
  validationError: null,
};

export type IntakeAction =
  | { readonly type: "VendorPlatformsLoaded"; readonly platforms: ReadonlyArray<VendorPlatform> }
  | { readonly type: "VendorPlatformsFailed"; readonly message: string }
  | { readonly type: "SetConfigText"; readonly text: string }
  | { readonly type: "FileLoaded"; readonly text: string; readonly filename: string; readonly byte_size: number }
  | { readonly type: "FileLoadFailed"; readonly message: string }
  | { readonly type: "ClearAll" }
  | { readonly type: "DetectStart" }
  | { readonly type: "DetectSucceeded"; readonly result: ConfigDetectionResult }
  | { readonly type: "DetectFailed"; readonly message: string }
  | { readonly type: "SelectPlatform"; readonly platform: PlatformRef; readonly isManualOverride: boolean }
  | { readonly type: "ParseStart" }
  | { readonly type: "ParseSucceeded"; readonly device: DeviceModel; readonly receipt: ReceiptView }
  | { readonly type: "ParseFailed"; readonly message: string }
  | { readonly type: "ReceiptFailed"; readonly message: string; readonly device: DeviceModel }
  | { readonly type: "DismissError" }
  // V1O-A — batch actions.
  | { readonly type: "SplitStart" }
  | { readonly type: "SplitToSingle"; readonly result: ConfigBatchSplitResult }
  | { readonly type: "SplitToBatch"; readonly result: ConfigBatchSplitResult }
  | { readonly type: "SplitFailed"; readonly message: string }
  | { readonly type: "PerSliceDetectionSucceeded"; readonly sliceId: string; readonly result: ConfigDetectionResult }
  | { readonly type: "PerSliceDetectionFailed"; readonly sliceId: string; readonly message: string }
  | { readonly type: "DrillIntoSlice"; readonly sliceId: string }
  | { readonly type: "BackToBatch" }
  | { readonly type: "TreatAsSingleConfig" }
  // V1O-B — archive actions.
  | {
      readonly type: "ArchiveOpenStart";
      readonly filename: string;
      readonly byte_size: number;
    }
  | { readonly type: "ArchiveOpenFailed"; readonly message: string }
  | { readonly type: "ArchiveIntakeSplittingStart" }
  | {
      readonly type: "ArchiveSingleConfigPassthrough";
      readonly text: string;
      readonly entry_path: string;
      readonly archive_name: string;
      readonly inventory: ArchiveIntakeResult;
    }
  | {
      readonly type: "ArchiveBatchAssembled";
      readonly result: ConfigBatchSplitResult;
      readonly inventory: ArchiveIntakeResult;
      readonly provenance: Readonly<Record<string, ArchiveEntryRef>>;
      readonly archive_name: string;
    }
  // V1P — validator actions.
  | { readonly type: "ValidatorStarted" }
  | { readonly type: "ValidatorSucceeded"; readonly report: ValidationReport }
  | { readonly type: "ValidatorFailed"; readonly error: string }
  // V1Q — Batch Run Workspace actions. All operate on
  // `state.batch.batchRun`; ignored when no batch is present.
  | { readonly type: "BatchRunRequested" }
  | { readonly type: "BatchRunReRunRequested" }
  | { readonly type: "BatchRunCancelled" }
  | { readonly type: "BatchRunDeviceQueued"; readonly sliceId: string }
  | { readonly type: "BatchRunDeviceParsing"; readonly sliceId: string }
  | {
      readonly type: "BatchRunDeviceValidating";
      readonly sliceId: string;
      readonly deviceModel: DeviceModel;
      readonly receipt: ReceiptView;
    }
  | {
      readonly type: "BatchRunDeviceCompleted";
      readonly sliceId: string;
      readonly report: ValidationReport;
    }
  | {
      readonly type: "BatchRunDeviceFailed";
      readonly sliceId: string;
      readonly error: DeviceStageError;
    }
  | {
      readonly type: "BatchRunDeviceSkipped";
      readonly sliceId: string;
      readonly reason: string;
    }
  | {
      readonly type: "BatchRunOverrideSelected";
      readonly sliceId: string;
      readonly platform: PlatformRef;
      readonly isManualOverride: boolean;
    };

/** Build a PlatformRef from a registry VendorPlatform for manual override. */
export function platformRefFromVendor(vp: VendorPlatform): PlatformRef {
  return {
    platform_id: vp.id,
    vendor: vp.vendor,
    os_family: vp.os_family,
    os_version_raw: null,
    os_version_normalized: null,
    detection_confidence: null,
  };
}

/** True when split returned a single SingleConfig slice — regression lock R4. */
export function isSingleConfigResult(result: ConfigBatchSplitResult): boolean {
  return result.method.kind === "single_config" && result.slices.length === 1;
}

/** Pull a slice from the batch by id. Returns undefined when absent. */
export function findSlice(
  batch: BatchData | null,
  sliceId: string | null,
): ConfigSlice | undefined {
  if (!batch || !sliceId) return undefined;
  return batch.splitResult.slices.find((s) => s.slice_id === sliceId);
}
