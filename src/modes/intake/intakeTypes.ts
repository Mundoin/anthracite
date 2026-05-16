/**
 * Intake mode — state types (V1O).
 *
 * V1O is stateless: no persistence, no history, no inventory. The reducer
 * here owns a single in-memory session for one config at a time.
 */

import type { ConfigDetectionResult } from "../../types/configDetection";
import type { DeviceModel, PlatformRef } from "../../types/networkModel";
import type { ReceiptView } from "../../types/receipt";
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
  | "vendor_list";

export type IntakeSourceKind = "paste" | "file";

export interface IntakeSource {
  readonly kind: IntakeSourceKind;
  readonly filename: string | null;
  readonly byte_size: number | null;
}

export interface IntakeState {
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
  | { readonly type: "DismissError" };

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
