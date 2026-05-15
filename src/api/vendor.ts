/**
 * Typed Tauri command wrappers for the Vendor Registry Engine.
 *
 * Keep names aligned with `src-tauri/src/commands/vendor_registry.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type { VendorPlatform } from "../types/vendor";

export async function listVendorPlatforms(): Promise<VendorPlatform[]> {
  return invoke<VendorPlatform[]>("list_vendor_platforms");
}

export async function getVendorPlatform(id: string): Promise<VendorPlatform> {
  return invoke<VendorPlatform>("get_vendor_platform", { id });
}
