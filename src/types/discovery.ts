/**
 * Discovery Engine — TypeScript surface.
 *
 * Mirrors `src-tauri/src/engines/discovery.rs`. Keep in sync.
 * The Rust side is authoritative; TS types describe what the typed
 * Tauri command boundary returns.
 *
 * Doctrine: `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md`
 * Stage: V1AF
 */

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
}

export interface DiscoveryInventoryView {
  readonly environment_id: string | null;
  readonly source_state: DiscoverySourceState;
  readonly records: readonly DiscoveryDeviceRecord[];
  readonly total_records: number;
  readonly message: string;
}
