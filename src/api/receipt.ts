/**
 * Typed Tauri command wrapper for the receipt projection (V1L).
 *
 * Keep names aligned with `src-tauri/src/commands/receipt.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type { DeviceModel } from "../types/networkModel";
import type { ReceiptView } from "../types/receipt";

export async function projectDeviceReceipt(
  deviceModel: DeviceModel,
): Promise<ReceiptView> {
  return invoke<ReceiptView>("project_device_receipt", {
    deviceModel,
  });
}
