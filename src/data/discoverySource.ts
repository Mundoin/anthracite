import type { DataSourceState } from "../types/dataSource";
import type { DiscoveryInventoryView } from "../types/discovery";

export interface DiscoverySourceView {
  readonly sourceState: DataSourceState;
  readonly environmentId: string | null;
  readonly totalRecords: number;
  readonly message: string;
  readonly isEmpty: boolean;
}

/**
 * Adapter from the Rust-mirrored DiscoveryInventoryView to a UI-safe
 * DiscoverySourceView. Pure function — no side effects, no I/O, no clock.
 *
 * Mapping (per docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md):
 *   view === null && error  -> sourceState "unavailable"
 *   view === null && !error -> sourceState "not_connected"  (initial placeholder)
 *   view.source_state "empty"        -> "empty"
 *   view.source_state "real"         -> "real"
 *   view.source_state "unavailable"  -> "unavailable"
 *
 * Discovery never returns "demo" from this adapter — Discovery is a real
 * boundary, never a seeded scaffold.
 *
 * isEmpty is true only when sourceState === "empty" AND totalRecords === 0.
 */
export function toDiscoverySourceView(
  view: DiscoveryInventoryView | null,
  error?: unknown,
): DiscoverySourceView {
  if (view === null) {
    return {
      sourceState: error ? "unavailable" : "not_connected",
      environmentId: null,
      totalRecords: 0,
      message: error ? "Discovery source unavailable" : "Discovery engine not connected",
      isEmpty: false,
    };
  }

  return {
    sourceState: view.source_state,
    environmentId: view.environment_id,
    totalRecords: view.total_records,
    message: view.message,
    isEmpty: view.source_state === "empty" && view.total_records === 0,
  };
}
