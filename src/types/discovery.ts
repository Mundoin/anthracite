/**
 * Discovery Engine — TypeScript surface.
 *
 * Mirrors `src-tauri/src/engines/discovery.rs`. Keep in sync.
 * The Rust side is authoritative; TS types describe what the typed
 * Tauri command boundary returns.
 *
 * Doctrine: `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md`
 * Stage: V1AF (initial) · V1AH (import-preview wire shapes)
 */

import type { DeviceModel } from "./networkModel";

export type DiscoverySourceState = "empty" | "real" | "unavailable";

export type DiscoveryRecordSourceKind =
  | "intake_import"
  | "live_collection"
  | "manual";

export interface DiscoveryDeviceRecord {
  readonly id: string;
  readonly environment_id: string;
  readonly source_kind: DiscoveryRecordSourceKind;
  readonly confidence: number | null;
  readonly last_seen: string | null;
  // V1AI — canonical device shape carried by Discovery's persisted record.
  // Topology consumes DeviceModel from here. No fork.
  readonly device_model: DeviceModel;
  readonly source_label: string | null;
  readonly slice_id: string | null;
}

export interface DiscoveryInventoryView {
  readonly environment_id: string | null;
  readonly source_state: DiscoverySourceState;
  readonly records: readonly DiscoveryDeviceRecord[];
  readonly total_records: number;
  readonly message: string;
}

// ---------------------------------------------------------------------
// V1AH — INTAKE → Discovery import-preview wire shapes.
// Mirrors `DiscoveryImport*` types in src-tauri/src/engines/discovery.rs.
// Preview-only — non-mutating; Discovery storage unchanged.
// ---------------------------------------------------------------------

export interface DiscoveryImportCandidate {
  readonly candidate_id: string;
  readonly environment_id: string;
  readonly source_kind: DiscoveryRecordSourceKind;
  readonly device_model: DeviceModel;
  readonly confidence: number | null;
  readonly source_label: string | null;
  readonly slice_id: string | null;
}

export type DiscoveryImportRejectionReason =
  | "missing_identity"
  | "environment_mismatch"
  | "duplicate_record_id";

export interface DiscoveryImportRejection {
  readonly candidate_id: string;
  readonly reason: DiscoveryImportRejectionReason;
  readonly message: string;
}

export interface DiscoveryImportPreviewRecord {
  readonly candidate_id: string;
  readonly record: DiscoveryDeviceRecord;
}

export interface DiscoveryImportSummary {
  readonly total_candidates: number;
  readonly accepted_count: number;
  readonly rejected_count: number;
}

export interface DiscoveryImportPreview {
  readonly environment_id: string;
  readonly accepted: readonly DiscoveryImportPreviewRecord[];
  readonly rejected: readonly DiscoveryImportRejection[];
  readonly summary: DiscoveryImportSummary;
}

// ---------------------------------------------------------------------
// V1AI — authoritative import commit wire shapes.
// Mirrors `DiscoveryImportCommit*` types in src-tauri/src/engines/discovery.rs.
// Import recomputes acceptance server-side; preview result is advisory.
// ---------------------------------------------------------------------

export interface DiscoveryImportCommitSummary {
  readonly total_candidates: number;
  readonly imported_count: number;
  readonly rejected_count: number;
  readonly inventory_total_after: number;
}

export interface DiscoveryImportCommitResult {
  readonly environment_id: string;
  readonly imported_records: readonly DiscoveryDeviceRecord[];
  readonly rejected: readonly DiscoveryImportRejection[];
  readonly summary: DiscoveryImportCommitSummary;
}
