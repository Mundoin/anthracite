/**
 * V1BZ — Diagnose Handoff Contract (stub v0).
 *
 * Pure, serialisable payload produced by Topology when the operator
 * triggers the "Open in Diagnose" action from the affected-focus
 * passport. Diagnose consumes the same shape via a receiving stub.
 *
 * No troubleshooting engine, no live collection, no command execution.
 * This module only declares + builds the payload; downstream wiring
 * lives in App.tsx (mode switch + state hand-off) and DiagnoseMode
 * (stub rendering).
 *
 * Doctrine alignment:
 *   - V1BU device operational_state stays canonical.
 *   - V1BV link operational_state stays canonical.
 *   - V1BX affectedFocus is the source of affected neighbour/edge ids.
 *   - V1BY source contract (kind + freshness) flows through unchanged.
 */

import type {
  GraphReadyTopologyNode,
  GraphReadyTopologyView,
} from "./topologyReview";
import type { LabOperationalState } from "../../types/labEnvironment";
import type {
  TopologyFreshness,
  TopologySourceKind,
} from "./topologySource";
import type { AffectedFocus } from "./blueprint/affectedFocus";

/**
 * Payload Topology hands to Diagnose. Narrow by design — Diagnose may
 * later read more from `view`, but the handoff only carries the
 * operator-visible context of the picked node + its affected scope.
 */
export interface DiagnoseHandoffPayload {
  readonly source: "topology";
  readonly environment_id?: string;
  readonly topology_source_kind?: TopologySourceKind;
  readonly topology_freshness?: TopologyFreshness;
  readonly selected_node_id: string;
  readonly selected_label: string;
  readonly selected_state: LabOperationalState;
  readonly selected_role?: string;
  readonly affected_neighbor_ids: readonly string[];
  readonly affected_neighbor_labels: readonly string[];
  readonly affected_edge_ids: readonly string[];
  readonly worst_state?: LabOperationalState;
  readonly counts_by_state?: Readonly<Record<LabOperationalState, number>>;
  readonly generated_at?: string;
  readonly observed_at?: string;
}

export interface BuildDiagnoseHandoffInput {
  readonly view: GraphReadyTopologyView;
  readonly selectedNode: GraphReadyTopologyNode;
  readonly affectedFocus: AffectedFocus;
  readonly environmentId?: string;
}

/**
 * Build a Diagnose handoff payload from the Topology affected-focus
 * context. Deterministic — no Date.now() reads, no I/O.
 *
 * Healthy / no-affected selection: the payload still resolves, but
 * `affected_*` arrays come back empty and `worst_state` is omitted
 * (the V1BX affectedFocus contract returns no `worstState` in that
 * case via the hasSelection / size-zero guard at the call site).
 */
export function buildDiagnoseHandoffFromAffectedFocus(
  input: BuildDiagnoseHandoffInput,
): DiagnoseHandoffPayload {
  const { view, selectedNode, affectedFocus, environmentId } = input;

  const neighborIds = [...affectedFocus.affectedNeighborIds].sort();
  const labelById = new Map<string, string>();
  for (const n of view.nodes) labelById.set(n.id, n.label);
  const neighborLabels = neighborIds.map((id) => labelById.get(id) ?? id);
  const edgeIds = [...affectedFocus.affectedEdgeIds].sort();

  const hasAffected =
    affectedFocus.hasSelection &&
    (affectedFocus.affectedEdgeIds.size > 0 ||
      affectedFocus.affectedNeighborIds.size > 0);

  const counts = countNodesByState(view.nodes);

  const payload: DiagnoseHandoffPayload = {
    source: "topology",
    environment_id: environmentId ?? view.environment_id ?? undefined,
    topology_source_kind: view.source?.kind,
    topology_freshness: view.source?.freshness,
    selected_node_id: selectedNode.id,
    selected_label: selectedNode.label,
    selected_state: selectedNode.operational_state ?? "healthy",
    selected_role: selectedNode.role_hint ?? undefined,
    affected_neighbor_ids: neighborIds,
    affected_neighbor_labels: neighborLabels,
    affected_edge_ids: edgeIds,
    worst_state: hasAffected ? affectedFocus.worstState : undefined,
    counts_by_state: counts,
    generated_at: view.source?.generated_at,
    observed_at: view.source?.observed_at,
  };

  return payload;
}

const STATE_KEYS: readonly LabOperationalState[] = [
  "healthy",
  "warning",
  "degraded",
  "down",
  "maintenance",
  "unknown",
];

function countNodesByState(
  nodes: readonly GraphReadyTopologyNode[],
): Readonly<Record<LabOperationalState, number>> {
  const counts: Record<LabOperationalState, number> = {
    healthy: 0,
    warning: 0,
    degraded: 0,
    down: 0,
    maintenance: 0,
    unknown: 0,
  };
  for (const n of nodes) {
    const s = (n.operational_state ?? "healthy") as LabOperationalState;
    if (STATE_KEYS.includes(s)) counts[s] += 1;
    else counts.unknown += 1;
  }
  return counts;
}

/**
 * V1BZ — short operator-facing summary line for the Diagnose stub
 * card. One sentence, deterministic. Pure helper for the receiving
 * surface.
 */
export function formatHandoffSummary(p: DiagnoseHandoffPayload): string {
  const stateLabel = capitalise(p.selected_state);
  const affectedNeighbours = p.affected_neighbor_ids.length;
  const affectedLinks = p.affected_edge_ids.length;
  if (affectedNeighbours === 0 && affectedLinks === 0) {
    return `${p.selected_label} · ${stateLabel} · no affected neighbourhood`;
  }
  return `${p.selected_label} · ${stateLabel} · ${affectedLinks} link${affectedLinks === 1 ? "" : "s"} · ${affectedNeighbours} neighbour${affectedNeighbours === 1 ? "" : "s"}`;
}

function capitalise(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
