import type { DataSourceState } from "../types/dataSource";
import type {
  TopologyView,
  ProjectionStats,
  NeighborEvidenceMappingStats,
} from "../types/topology";

export interface TopologySourceView {
  readonly sourceState: DataSourceState;
  readonly environmentId: string | null;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly sourceRecordCount: number;
  readonly message: string;
  readonly isEmpty: boolean;
  readonly projectionStats: ProjectionStats | null;
  readonly evidenceStats: NeighborEvidenceMappingStats | null;
  readonly view: TopologyView | null;
}

/**
 * Adapter from the Rust-mirrored TopologyView to a UI-safe TopologySourceView.
 * Pure function — no side effects, no I/O.
 *
 * Mapping (per docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md):
 *   view === null && error  -> sourceState "unavailable"
 *   view === null && !error -> sourceState "not_connected" (initial placeholder)
 *   view.source_state value-for-value into the DataSourceState union.
 *
 * Topology never returns "demo" from this adapter — Topology is a real
 * boundary derived from persisted Discovery records.
 *
 * isEmpty is true only when sourceState === "empty" AND nodeCount === 0.
 *
 * The original `view` is preserved so the mode body can render node cards.
 * V1AO: projection_stats and evidence_stats are forwarded from the view.
 */
export function toTopologySourceView(
  view: TopologyView | null,
  error?: unknown,
): TopologySourceView {
  if (view === null) {
    return {
      sourceState: error ? "unavailable" : "not_connected",
      environmentId: null,
      nodeCount: 0,
      edgeCount: 0,
      sourceRecordCount: 0,
      message: error
        ? "Topology source unavailable"
        : "Topology engine not connected",
      isEmpty: false,
      projectionStats: null,
      evidenceStats: null,
      view: null,
    };
  }

  return {
    sourceState: view.source_state,
    environmentId: view.environment_id,
    nodeCount: view.summary.node_count,
    edgeCount: view.summary.edge_count,
    sourceRecordCount: view.summary.source_record_count,
    message: view.message,
    isEmpty: view.source_state === "empty" && view.summary.node_count === 0,
    projectionStats: view.projection_stats,
    evidenceStats: view.evidence_stats,
    view,
  };
}
