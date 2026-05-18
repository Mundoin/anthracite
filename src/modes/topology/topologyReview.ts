/**
 * Topology Edge Review + Graph-Ready Display Contract (V1AS).
 *
 * Pure, deterministic adapter layer that turns a `TopologyView` (engine
 * truth) into a UI-friendly review model and a renderer-agnostic
 * graph-ready projection. No I/O. No mutation of engine state. No
 * topology inference. No fuzzy matching.
 *
 * Boundary law:
 *   - The Rust topology engine owns truth (nodes, edges, projection
 *     stats, evidence stats).
 *   - This module reshapes that truth for the operator review surface
 *     and for a future graph renderer.
 *   - Nothing here invents edges, accepts rejected evidence, or
 *     promotes hints to facts. Empty stays empty; unknown stays
 *     unknown.
 *
 * Stage: V1AS — Topology Edge Review + Graph-Ready Surface.
 * Doctrine: `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`.
 */

import type {
  NeighborEvidenceMappingStats,
  ProjectionStats,
  TopologyAdjacencyFactSourceKind,
  TopologyEdge,
  TopologyEdgeKind,
  TopologyNode,
  TopologyView,
} from "../../types/topology";

// ---------------------------------------------------------------------
// Review model — operator-grade reshape of TopologyView.edges.
// Display-only. No coordinates. No layout. No physics.
// ---------------------------------------------------------------------

export interface TopologyReviewEndpoint {
  readonly node_id: string;
  /** Resolved node label when the engine carries the node, else null. */
  readonly node_label: string | null;
  /** Vendor + platform_id when known. Never invented. */
  readonly node_vendor: string | null;
  readonly node_platform_id: string | null;
  readonly interface: string | null;
}

export interface TopologyReviewEvidenceItem {
  readonly index: number;
  readonly text: string;
}

export interface TopologyReviewRow {
  readonly edge_id: string;
  readonly kind: TopologyEdgeKind;
  readonly local: TopologyReviewEndpoint;
  readonly remote: TopologyReviewEndpoint;
  readonly evidence: readonly TopologyReviewEvidenceItem[];
  /** Concise honest note: "evidence-backed", "no evidence string retained", etc. */
  readonly status_note: string;
  /** Stable lowercase haystack for substring filters. */
  readonly search_haystack: string;
}

export interface TopologyReviewSourceKindCount {
  readonly kind: TopologyAdjacencyFactSourceKind;
  readonly count: number;
}

export interface TopologyReviewStats {
  readonly projected_edge_count: number;
  readonly evidence_total: number;
  readonly evidence_accepted: number;
  readonly evidence_rejected: number;
  readonly facts_total: number;
  readonly facts_accepted: number;
  readonly facts_rejected_unknown_node: number;
  readonly facts_rejected_self_link: number;
  readonly facts_collapsed_duplicate: number;
  readonly per_kind_counts: readonly TopologyReviewSourceKindCount[];
}

export interface TopologyReviewRejectionSummary {
  readonly evidence_rejected_total: number;
  readonly evidence_rejected_unknown_local: number;
  readonly evidence_rejected_unknown_remote: number;
  readonly evidence_rejected_self_link: number;
  readonly facts_rejected_unknown_node: number;
  readonly facts_rejected_self_link: number;
  readonly facts_collapsed_duplicate: number;
  /** True when any rejection category is non-zero. */
  readonly has_rejections: boolean;
  /** True when engine retains aggregate counts only (no per-entry detail). */
  readonly aggregate_only: boolean;
}

export type TopologyReviewKindFilter =
  | "all"
  | TopologyAdjacencyFactSourceKind;

export interface TopologyReviewFilterState {
  readonly kind: TopologyReviewKindFilter;
  readonly text: string;
}

export interface TopologyReviewModel {
  readonly rows: readonly TopologyReviewRow[];
  readonly stats: TopologyReviewStats;
  readonly rejection_summary: TopologyReviewRejectionSummary;
  readonly graph_ready: GraphReadyTopologyView;
  /** True when the engine view itself is null/unavailable. */
  readonly is_unavailable: boolean;
}

// ---------------------------------------------------------------------
// Graph-ready contract — renderer-agnostic shape future stages can
// consume. No coordinates, no layout, no physics. A future renderer
// produces those itself.
// ---------------------------------------------------------------------

export interface GraphReadyTopologyNode {
  readonly id: string;
  readonly label: string;
  readonly vendor: string | null;
  readonly platform_id: string | null;
  readonly role_hint: string;
  readonly layer: string;
}

export interface GraphReadyTopologyEdge {
  readonly id: string;
  readonly source_node_id: string;
  readonly target_node_id: string;
  readonly kind: TopologyEdgeKind;
  readonly local_interface: string | null;
  readonly remote_interface: string | null;
  readonly evidence_count: number;
}

export interface GraphReadyTopologyView {
  readonly environment_id: string | null;
  readonly nodes: readonly GraphReadyTopologyNode[];
  readonly edges: readonly GraphReadyTopologyEdge[];
  readonly renderer_attached: false;
  readonly note: string;
}

// ---------------------------------------------------------------------
// Empty-state singletons. Returned for null/empty views so callers
// never need null checks on the shape.
// ---------------------------------------------------------------------

const EMPTY_STATS: TopologyReviewStats = Object.freeze({
  projected_edge_count: 0,
  evidence_total: 0,
  evidence_accepted: 0,
  evidence_rejected: 0,
  facts_total: 0,
  facts_accepted: 0,
  facts_rejected_unknown_node: 0,
  facts_rejected_self_link: 0,
  facts_collapsed_duplicate: 0,
  per_kind_counts: Object.freeze([]) as readonly TopologyReviewSourceKindCount[],
}) as TopologyReviewStats;

const EMPTY_REJECTIONS: TopologyReviewRejectionSummary = Object.freeze({
  evidence_rejected_total: 0,
  evidence_rejected_unknown_local: 0,
  evidence_rejected_unknown_remote: 0,
  evidence_rejected_self_link: 0,
  facts_rejected_unknown_node: 0,
  facts_rejected_self_link: 0,
  facts_collapsed_duplicate: 0,
  has_rejections: false,
  aggregate_only: true,
}) as TopologyReviewRejectionSummary;

const GRAPH_READY_NOTE =
  "Graph-ready display contract active — renderer not attached.";

const EMPTY_GRAPH_READY: GraphReadyTopologyView = Object.freeze({
  environment_id: null,
  nodes: Object.freeze([]) as readonly GraphReadyTopologyNode[],
  edges: Object.freeze([]) as readonly GraphReadyTopologyEdge[],
  renderer_attached: false,
  note: GRAPH_READY_NOTE,
}) as GraphReadyTopologyView;

// ---------------------------------------------------------------------
// Builders.
// ---------------------------------------------------------------------

function indexNodes(
  nodes: readonly TopologyNode[],
): ReadonlyMap<string, TopologyNode> {
  const map = new Map<string, TopologyNode>();
  for (const node of nodes) {
    map.set(node.id, node);
  }
  return map;
}

function buildEndpoint(
  nodeId: string,
  iface: string | null,
  nodeIndex: ReadonlyMap<string, TopologyNode>,
): TopologyReviewEndpoint {
  const node = nodeIndex.get(nodeId);
  if (node === undefined) {
    return {
      node_id: nodeId,
      node_label: null,
      node_vendor: null,
      node_platform_id: null,
      interface: iface,
    };
  }
  return {
    node_id: nodeId,
    node_label: node.label,
    node_vendor: node.vendor,
    node_platform_id: node.platform_id,
    interface: iface,
  };
}

function buildEvidence(
  raw: readonly string[],
): readonly TopologyReviewEvidenceItem[] {
  if (raw.length === 0) {
    return Object.freeze([]) as readonly TopologyReviewEvidenceItem[];
  }
  return raw.map((text, index) => ({ index, text }));
}

function buildStatusNote(
  edge: TopologyEdge,
  evidence: readonly TopologyReviewEvidenceItem[],
  local: TopologyReviewEndpoint,
  remote: TopologyReviewEndpoint,
): string {
  const evidenceNote =
    evidence.length === 0
      ? "no evidence string retained"
      : `${evidence.length} evidence ${evidence.length === 1 ? "entry" : "entries"}`;
  const unresolved: string[] = [];
  if (local.node_label === null) {
    unresolved.push("local node unresolved");
  }
  if (remote.node_label === null) {
    unresolved.push("remote node unresolved");
  }
  const ifaceMissing: string[] = [];
  if (edge.local_interface === null) {
    ifaceMissing.push("local interface unknown");
  }
  if (edge.remote_interface === null) {
    ifaceMissing.push("remote interface unknown");
  }
  const parts = [evidenceNote, ...unresolved, ...ifaceMissing];
  return parts.join(" · ");
}

function buildSearchHaystack(
  edge: TopologyEdge,
  local: TopologyReviewEndpoint,
  remote: TopologyReviewEndpoint,
  evidence: readonly TopologyReviewEvidenceItem[],
): string {
  const tokens = [
    edge.id,
    edge.kind,
    local.node_id,
    local.node_label ?? "",
    local.interface ?? "",
    remote.node_id,
    remote.node_label ?? "",
    remote.interface ?? "",
    ...evidence.map((e) => e.text),
  ];
  return tokens.join("  ").toLowerCase();
}

function buildRow(
  edge: TopologyEdge,
  nodeIndex: ReadonlyMap<string, TopologyNode>,
): TopologyReviewRow {
  const local = buildEndpoint(edge.source_node_id, edge.local_interface, nodeIndex);
  const remote = buildEndpoint(edge.target_node_id, edge.remote_interface, nodeIndex);
  const evidence = buildEvidence(edge.evidence);
  return {
    edge_id: edge.id,
    kind: edge.kind,
    local,
    remote,
    evidence,
    status_note: buildStatusNote(edge, evidence, local, remote),
    search_haystack: buildSearchHaystack(edge, local, remote, evidence),
  };
}

/**
 * Derive review stats from an engine view. Always-defined shape — callers
 * never need null checks. Empty/null view returns zeroed stats.
 */
export function deriveTopologyReviewStats(
  view: TopologyView | null,
): TopologyReviewStats {
  if (view === null) {
    return EMPTY_STATS;
  }
  const projection: ProjectionStats = view.projection_stats;
  const evidence: NeighborEvidenceMappingStats = view.evidence_stats;
  return {
    projected_edge_count: view.edges.length,
    evidence_total: evidence.evidence_total,
    evidence_accepted: evidence.accepted,
    evidence_rejected:
      evidence.rejected_unknown_local +
      evidence.rejected_unknown_remote +
      evidence.rejected_self_link,
    facts_total: projection.facts_total,
    facts_accepted: projection.facts_accepted,
    facts_rejected_unknown_node: projection.facts_rejected_unknown_node,
    facts_rejected_self_link: projection.facts_rejected_self_link,
    facts_collapsed_duplicate: projection.facts_collapsed_duplicate,
    per_kind_counts: projection.per_kind_counts.map(([kind, count]) => ({
      kind,
      count,
    })),
  };
}

/**
 * Derive an honest rejection summary. Aggregate-only because the engine
 * does not retain per-entry rejected evidence in the current view.
 */
export function deriveRejectionSummary(
  view: TopologyView | null,
): TopologyReviewRejectionSummary {
  if (view === null) {
    return EMPTY_REJECTIONS;
  }
  const evidence: NeighborEvidenceMappingStats = view.evidence_stats;
  const projection: ProjectionStats = view.projection_stats;
  const evidenceRejectedTotal =
    evidence.rejected_unknown_local +
    evidence.rejected_unknown_remote +
    evidence.rejected_self_link;
  const has =
    evidenceRejectedTotal > 0 ||
    projection.facts_rejected_unknown_node > 0 ||
    projection.facts_rejected_self_link > 0 ||
    projection.facts_collapsed_duplicate > 0;
  return {
    evidence_rejected_total: evidenceRejectedTotal,
    evidence_rejected_unknown_local: evidence.rejected_unknown_local,
    evidence_rejected_unknown_remote: evidence.rejected_unknown_remote,
    evidence_rejected_self_link: evidence.rejected_self_link,
    facts_rejected_unknown_node: projection.facts_rejected_unknown_node,
    facts_rejected_self_link: projection.facts_rejected_self_link,
    facts_collapsed_duplicate: projection.facts_collapsed_duplicate,
    has_rejections: has,
    aggregate_only: true,
  };
}

/**
 * Build a renderer-agnostic graph-ready projection of the topology view.
 * Future renderer stages consume this without touching engine types.
 */
export function buildGraphReadyTopologyView(
  view: TopologyView | null,
): GraphReadyTopologyView {
  if (view === null) {
    return EMPTY_GRAPH_READY;
  }
  return {
    environment_id: view.environment_id,
    nodes: view.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      vendor: node.vendor,
      platform_id: node.platform_id,
      role_hint: node.role_hint,
      layer: node.layer,
    })),
    edges: view.edges.map((edge) => ({
      id: edge.id,
      source_node_id: edge.source_node_id,
      target_node_id: edge.target_node_id,
      kind: edge.kind,
      local_interface: edge.local_interface,
      remote_interface: edge.remote_interface,
      evidence_count: edge.evidence.length,
    })),
    renderer_attached: false,
    note: GRAPH_READY_NOTE,
  };
}

/**
 * Build the full review model from an engine view. Always returns a
 * stable, fully-formed object. Null view yields empty rows + zero stats
 * + the constant graph-ready note.
 */
export function buildTopologyReviewModel(
  view: TopologyView | null,
): TopologyReviewModel {
  if (view === null) {
    return {
      rows: Object.freeze([]) as readonly TopologyReviewRow[],
      stats: EMPTY_STATS,
      rejection_summary: EMPTY_REJECTIONS,
      graph_ready: EMPTY_GRAPH_READY,
      is_unavailable: true,
    };
  }
  const nodeIndex = indexNodes(view.nodes);
  const rows = view.edges.map((edge) => buildRow(edge, nodeIndex));
  return {
    rows,
    stats: deriveTopologyReviewStats(view),
    rejection_summary: deriveRejectionSummary(view),
    graph_ready: buildGraphReadyTopologyView(view),
    is_unavailable: false,
  };
}

/**
 * Filter review rows by source kind and substring text. Pure, stable
 * ordering preserved from input.
 */
export function filterTopologyReviewRows(
  rows: readonly TopologyReviewRow[],
  filters: TopologyReviewFilterState,
): readonly TopologyReviewRow[] {
  const kindFilter = filters.kind;
  const text = filters.text.trim().toLowerCase();
  if (kindFilter === "all" && text.length === 0) {
    return rows;
  }
  return rows.filter((row) => {
    if (kindFilter !== "all" && row.kind !== kindFilter) {
      return false;
    }
    if (text.length > 0 && !row.search_haystack.includes(text)) {
      return false;
    }
    return true;
  });
}

/**
 * Look up a row by edge id. Returns null when not present so the caller
 * can honestly render "no selection".
 */
export function findSelectedTopologyEdge(
  model: TopologyReviewModel,
  edgeId: string | null,
): TopologyReviewRow | null {
  if (edgeId === null) {
    return null;
  }
  return model.rows.find((row) => row.edge_id === edgeId) ?? null;
}

export const DEFAULT_REVIEW_FILTERS: TopologyReviewFilterState = Object.freeze({
  kind: "all",
  text: "",
}) as TopologyReviewFilterState;

export const TOPOLOGY_REVIEW_KIND_OPTIONS: readonly TopologyReviewKindFilter[] =
  Object.freeze(["all", "lldp", "cdp", "config_neighbor", "manual"]) as readonly TopologyReviewKindFilter[];

export function formatTopologyEdgeKind(kind: TopologyEdgeKind): string {
  switch (kind) {
    case "lldp":
      return "LLDP";
    case "cdp":
      return "CDP";
    case "config_neighbor":
      return "Config neighbor";
    case "manual":
      return "Manual";
  }
}

export const GRAPH_READY_DISPLAY_NOTE = GRAPH_READY_NOTE;
