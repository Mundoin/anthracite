/**
 * Topology Engine — TypeScript surface (V1AJ).
 *
 * Mirrors `src-tauri/src/engines/topology.rs`. Rust is authoritative.
 * Topology consumes persisted Discovery records and projects a
 * deterministic read model. No live discovery, no polling, no fake
 * edges. Edges are absent in V1AJ until reliable link facts land.
 *
 * Doctrine: `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`
 * Stage: V1AJ (initial) · V1AL (adjacency readiness)
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
  readonly local_interface: string | null;
  readonly remote_interface: string | null;
  readonly evidence: readonly string[];
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
  // V1AL — adjacency readiness contract. Explains why edges are or are not
  // available and which fact sources would be accepted. See
  // `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` V1AL section.
  readonly adjacency_readiness: TopologyAdjacencyReadiness;
}

// ---------------------------------------------------------------------
// V1AL — Adjacency readiness wire shapes.
// Mirrors `TopologyAdjacency*` types in src-tauri/src/engines/topology.rs.
// Engine ships V1AL with all sources `present: false` — no fact ingestion
// path exists yet. Honest "0 reliable links" stays in place.
// ---------------------------------------------------------------------

/** Top-level state for the adjacency layer specifically. Distinct from
 *  `TopologySourceState` which describes nodes. */
export type TopologyAdjacencyFactSourceState =
  | "none_available"
  | "partial"
  | "ready";

/** Closed set of link-fact source categories. V1AL ships all four with
 *  `present: false` — no source ingestion path exists yet. */
export type TopologyAdjacencyFactSourceKind =
  | "lldp"
  | "cdp"
  | "config_neighbor"
  | "manual";

export interface TopologyAdjacencyFactSource {
  readonly kind: TopologyAdjacencyFactSourceKind;
  readonly present: boolean;
  readonly count: number;
  readonly note: string;
}

export interface TopologyAdjacencyReadiness {
  readonly eligible_node_count: number;
  readonly fact_source_state: TopologyAdjacencyFactSourceState;
  readonly fact_sources: readonly TopologyAdjacencyFactSource[];
  readonly accepted_kinds: readonly TopologyAdjacencyFactSourceKind[];
  readonly reason: string;
}

// -----------------------------------------------------------------------
// V1AM — Link Fact Pipeline projection wire shapes.
// Mirrors `TopologyLinkFact` and `ProjectionStats` in
// src-tauri/src/engines/topology.rs. Introduces fact-source schema and
// projection statistics as basis for edge reliability scoring.
// -----------------------------------------------------------------------

/** A single adjacency fact contributed by a source. Represents one observed
 *  link between two nodes, traced to discovery data with optional interface
 *  mapping and evidence (LLDP neighbor entry, config line, CDP packet, etc). */
export interface TopologyLinkFact {
  readonly source_kind: TopologyAdjacencyFactSourceKind;
  readonly local_node_id: string;
  readonly remote_node_id: string;
  readonly local_interface: string | null;
  readonly remote_interface: string | null;
  readonly evidence: string;
  readonly source_label: string | null;
}

/** Projection statistics from the link fact pipeline. Counts facts at each
 *  stage (ingested, accepted, rejected) and per-source breakdowns. */
export interface ProjectionStats {
  readonly facts_total: number;
  readonly facts_accepted: number;
  readonly facts_rejected_unknown_node: number;
  readonly facts_rejected_self_link: number;
  readonly facts_collapsed_duplicate: number;
  readonly per_kind_counts: readonly (readonly [
    TopologyAdjacencyFactSourceKind,
    number,
  ])[];
}

// -----------------------------------------------------------------------
// V1AN — Parser-Derived Neighbour Evidence Intake wire shapes.
// Mirrors `TopologyNeighborEvidence` and `NeighborEvidenceMappingStats`
// in src-tauri/src/engines/topology.rs. Evidence is constructed by
// future parser stages (LLDP/CDP/config-neighbour) and mapped to
// TopologyLinkFact records via the engine's deterministic intake layer.
// Live command path does not expose evidence yet — these types are
// mirrored for future TS-side test fixtures and command surfaces.
// -----------------------------------------------------------------------

/** Parsed evidence of a neighbour relationship from a source (LLDP, CDP,
 *  config, manual). Contains identifiers and optional metadata to be mapped
 *  to TopologyLinkFact records and validated against known nodes. */
export interface TopologyNeighborEvidence {
  readonly source_kind: TopologyAdjacencyFactSourceKind;
  readonly local_node_id: string;
  readonly local_interface: string | null;
  readonly remote_node_id: string;
  readonly remote_interface: string | null;
  readonly remote_chassis_id: string | null;
  readonly remote_system_name: string | null;
  readonly remote_port_id: string | null;
  readonly source_label: string | null;
  readonly evidence_notes: string | null;
}

/** Statistics from neighbour evidence mapping phase. Tracks total evidence
 *  records ingested and rejection reasons (unknown local/remote, self-link). */
export interface NeighborEvidenceMappingStats {
  readonly evidence_total: number;
  readonly accepted: number;
  readonly rejected_unknown_local: number;
  readonly rejected_unknown_remote: number;
  readonly rejected_self_link: number;
}
