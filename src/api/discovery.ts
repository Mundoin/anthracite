/**
 * Typed Tauri command wrappers for the Discovery Engine.
 *
 * Keep names aligned with `src-tauri/src/engines/discovery.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  DiscoveryImportCandidate,
  DiscoveryImportPreview,
  DiscoveryInventoryView,
} from "../types/discovery";

export async function getDiscoveryInventory(
  environmentId?: string | null
): Promise<DiscoveryInventoryView> {
  return invoke<DiscoveryInventoryView>("get_discovery_inventory", {
    environmentId: environmentId ?? null,
  });
}

/**
 * V1AH — request a non-mutating preview of the proposed Discovery import.
 * Does not change Discovery inventory state. Same input → same output.
 */
export async function previewDiscoveryImport(
  environmentId: string,
  candidates: readonly DiscoveryImportCandidate[],
): Promise<DiscoveryImportPreview> {
  return invoke<DiscoveryImportPreview>("preview_discovery_import", {
    environmentId,
    candidates,
  });
}
