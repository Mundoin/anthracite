/**
 * V1BX — Pure affected-focus derivation.
 *
 * Given a selected node + the full topology, returns the local affected
 * neighbourhood:
 *   - selected node's state
 *   - directly connected edges
 *   - immediate neighbour nodes
 *   - subset of edges/neighbours that are non-healthy ("affected")
 *   - worst state in the neighbourhood (selected + edges + neighbours)
 *   - state counts across the neighbourhood
 *
 * No DOM, no React, deterministic. Returns sane empty value when
 * selectedNodeId is null/missing.
 */
import type {
  GraphReadyTopologyNode,
  GraphReadyTopologyEdge,
} from "../topologyReview";
import type { LabOperationalState } from "../../../types/labEnvironment";
import type { TopologySourceKind } from "../topologySource";

export const FOCUS_SEVERITY: Record<LabOperationalState, number> = {
  healthy: 0,
  unknown: 1,
  maintenance: 2,
  warning: 3,
  degraded: 4,
  down: 5,
};

export function isAffectedState(s: LabOperationalState): boolean {
  return s !== "healthy";
}

export interface AffectedFocusInput {
  readonly selectedNodeId: string | null;
  readonly nodes: readonly GraphReadyTopologyNode[];
  readonly edges: readonly GraphReadyTopologyEdge[];
  readonly sourceKind?: TopologySourceKind;   // V1BY
}

export interface AffectedFocus {
  readonly hasSelection: boolean;
  readonly selectedState: LabOperationalState;
  readonly connectedEdgeIds: ReadonlySet<string>;
  readonly neighborNodeIds: ReadonlySet<string>;
  readonly affectedEdgeIds: ReadonlySet<string>;
  readonly affectedNeighborIds: ReadonlySet<string>;
  readonly worstState: LabOperationalState;
  readonly countsByState: Record<LabOperationalState, number>;
  readonly neighborLabels: readonly string[];   // human-friendly, capped at 3 for passport
  readonly sourceKind?: TopologySourceKind;   // V1BY
}

const EMPTY_FOCUS: AffectedFocus = {
  hasSelection: false,
  selectedState: "healthy",
  connectedEdgeIds: new Set(),
  neighborNodeIds: new Set(),
  affectedEdgeIds: new Set(),
  affectedNeighborIds: new Set(),
  worstState: "healthy",
  countsByState: { healthy: 0, warning: 0, degraded: 0, down: 0, maintenance: 0, unknown: 0 },
  neighborLabels: [],
  sourceKind: undefined,   // V1BY
};

export function computeAffectedFocus(input: AffectedFocusInput): AffectedFocus {
  const { selectedNodeId, nodes, edges, sourceKind } = input;
  if (!selectedNodeId) return { ...EMPTY_FOCUS, sourceKind };

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const selected = nodeById.get(selectedNodeId);
  if (!selected) return EMPTY_FOCUS;

  const connectedEdgeIds = new Set<string>();
  const neighborNodeIds = new Set<string>();

  for (const e of edges) {
    if (e.source_node_id === selectedNodeId) {
      connectedEdgeIds.add(e.id);
      neighborNodeIds.add(e.target_node_id);
    } else if (e.target_node_id === selectedNodeId) {
      connectedEdgeIds.add(e.id);
      neighborNodeIds.add(e.source_node_id);
    }
  }

  const affectedEdgeIds = new Set<string>();
  for (const e of edges) {
    if (!connectedEdgeIds.has(e.id)) continue;
    if (isAffectedState(e.operational_state ?? "healthy")) {
      affectedEdgeIds.add(e.id);
    }
  }

  const affectedNeighborIds = new Set<string>();
  const countsByState: Record<LabOperationalState, number> = {
    healthy: 0, warning: 0, degraded: 0, down: 0, maintenance: 0, unknown: 0,
  };
  const neighborLabels: string[] = [];

  for (const nid of neighborNodeIds) {
    const n = nodeById.get(nid);
    if (!n) continue;
    const s = n.operational_state ?? "healthy";
    countsByState[s] += 1;
    if (isAffectedState(s)) {
      affectedNeighborIds.add(nid);
      if (neighborLabels.length < 3) {
        neighborLabels.push(n.label || n.id);
      }
    }
  }

  // Worst state across selected + affected edges + affected neighbors.
  let worstState: LabOperationalState = selected.operational_state ?? "healthy";
  const consider = (s: LabOperationalState) => {
    if (FOCUS_SEVERITY[s] > FOCUS_SEVERITY[worstState]) worstState = s;
  };
  for (const eid of affectedEdgeIds) {
    const e = edges.find((x) => x.id === eid);
    if (e) consider(e.operational_state ?? "healthy");
  }
  for (const nid of affectedNeighborIds) {
    const n = nodeById.get(nid);
    if (n) consider(n.operational_state ?? "healthy");
  }

  return {
    hasSelection: true,
    selectedState: selected.operational_state ?? "healthy",
    connectedEdgeIds,
    neighborNodeIds,
    affectedEdgeIds,
    affectedNeighborIds,
    worstState,
    countsByState,
    neighborLabels,
    sourceKind,   // V1BY
  };
}
