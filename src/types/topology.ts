/**
 * Topology Engine — TypeScript surface (V1AJ).
 *
 * Mirrors `src-tauri/src/engines/topology.rs`. Rust is authoritative.
 * Topology consumes persisted Discovery records and projects a
 * deterministic read model. No live discovery, no polling, no fake
 * edges. Edges are absent in V1AJ until reliable link facts land.
 *
 * Doctrine: `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`
 * Stage: V1AJ
 */

export type TopologySourceState = "empty" | "real" | "unavailable";

/** Provenance of a node — currently always mirrors the Discovery record's
 *  source_kind, but kept as a Topology-local type so future ingestion paths
 *  (live, manual) can extend independently. */
export type TopologyNodeSource =
  | "discovery_inventory";

export type TopologyEdgeKind =
  | "lldp"
  | "cdp"
  | "config_neighbor"
  | "manual";

export type TopologyEdgeSource =
  | "discovery_inventory"
  | "live_collection"
  | "manual";

export type TopologyLayer =
  | "inventory"
  | "unknown";

export type TopologyRoleHint =
  | "device"
  | "unknown";

export interface TopologyNode {
  readonly id: string;
  readonly label: string;
  readonly device_record_id: string;
  readonly hostname: string | null;
  readonly platform_id: string | null;
  readonly vendor: string | null;
  readonly role_hint: TopologyRoleHint;
  readonly layer: TopologyLayer;
  readonly source_kind: TopologyNodeSource;
}

export interface TopologyEdge {
  readonly id: string;
  readonly source_node_id: string;
  readonly target_node_id: string;
  readonly kind: TopologyEdgeKind;
  readonly confidence: number | null;
  readonly source: TopologyEdgeSource;
}

export interface TopologySummary {
  readonly environment_id: string | null;
  readonly node_count: number;
  readonly edge_count: number;
  readonly source_record_count: number;
}

export interface TopologyView {
  readonly environment_id: string | null;
  readonly source_state: TopologySourceState;
  readonly nodes: readonly TopologyNode[];
  readonly edges: readonly TopologyEdge[];
  readonly summary: TopologySummary;
  readonly message: string;
}
