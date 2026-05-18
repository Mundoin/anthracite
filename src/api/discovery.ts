/**
 * Typed Tauri command wrappers for the Discovery Engine.
 *
 * Keep names aligned with `src-tauri/src/engines/discovery.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type { DiscoveryInventoryView } from "../types/discovery";

export async function getDiscoveryInventory(
  environmentId?: string | null
): Promise<DiscoveryInventoryView> {
  return invoke<DiscoveryInventoryView>("get_discovery_inventory", {
    environmentId: environmentId ?? null,
  });
}
