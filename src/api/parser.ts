/**
 * Typed Tauri command wrapper for the parser dispatch boundary.
 *
 * Keep names aligned with `src-tauri/src/commands/parser.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type { DeviceModel, PlatformRef } from "../types/networkModel";

export async function parseDeviceConfig(
  platformRef: PlatformRef,
  configText: string,
): Promise<DeviceModel> {
  return invoke<DeviceModel>("parse_device_config", {
    platformRef,
    configText,
  });
}
