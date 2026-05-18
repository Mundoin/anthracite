/**
 * Typed Tauri command wrappers for the Discovery Engine.
 *
 * Keep names aligned with `src-tauri/src/engines/discovery.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  DiscoveryImportCandidate,
  DiscoveryImportCommitResult,
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

/**
 * V1AI — authoritative import commit. Rust recomputes acceptance against the
 * current persisted store and writes accepted records. Returns the records
 * actually imported plus rejections; preview result is advisory only.
 */
export async function importDiscoveryRecords(
  environmentId: string,
  candidates: readonly DiscoveryImportCandidate[],
): Promise<DiscoveryImportCommitResult> {
  return invoke<DiscoveryImportCommitResult>("import_discovery_records", {
    environmentId,
    candidates,
  });
}
