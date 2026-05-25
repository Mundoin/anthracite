/**
 * V1BZ — Diagnose Handoff Contract tests.
 */

import { describe, it, expect } from "vitest";
import {
  buildDiagnoseHandoffFromAffectedFocus,
  formatHandoffSummary,
} from "../diagnoseHandoff";
import { computeAffectedFocus } from "../blueprint/affectedFocus";
import { createFabricatedTopologySourceInfo } from "../topologySource";
import type {
  GraphReadyTopologyEdge,
  GraphReadyTopologyNode,
  GraphReadyTopologyView,
} from "../topologyReview";

function node(
  id: string,
  state: GraphReadyTopologyNode["operational_state"] = "healthy",
  label?: string,
  role_hint = "switch",
): GraphReadyTopologyNode {
  return {
    id,
    label: label ?? id,
    vendor: null,
    platform_id: null,
    role_hint,
    layer: "physical",
    operational_state: state,
  };
}

function edge(
  id: string,
  a: string,
  b: string,
  state: GraphReadyTopologyEdge["operational_state"] = "healthy",
): GraphReadyTopologyEdge {
  return {
    id,
    source_node_id: a,
    target_node_id: b,
    kind: "lldp",
    local_interface: null,
    remote_interface: null,
    evidence_count: 1,
    operational_state: state,
  };
}

function view(
  nodes: GraphReadyTopologyNode[],
  edges: GraphReadyTopologyEdge[],
  source = createFabricatedTopologySourceInfo({
    environment_id: "env-fab",
    environment_name: "Lab",
  }),
): GraphReadyTopologyView {
  return {
    environment_id: "env-fab",
    nodes,
    edges,
    renderer_attached: false,
    note: "test",
    source,
  };
}

describe("buildDiagnoseHandoffFromAffectedFocus", () => {
  it("produces payload with selected + affected neighbour/edge ids", () => {
    const nodes = [
      node("n1", "healthy", "edge-rt-01", "edge router"),
      node("n2", "warning"),
      node("n3", "degraded"),
      node("n4", "healthy"),
    ];
    const edges = [
      edge("e1", "n1", "n2", "warning"),
      edge("e2", "n1", "n3", "degraded"),
      edge("e3", "n1", "n4", "healthy"),
    ];
    const v = view(nodes, edges);
    const focus = computeAffectedFocus({
      selectedNodeId: "n1",
      nodes: v.nodes,
      edges: v.edges,
      sourceKind: v.source?.kind,
    });

    const payload = buildDiagnoseHandoffFromAffectedFocus({
      view: v,
      selectedNode: nodes[0],
      affectedFocus: focus,
      environmentId: "env-fab",
    });

    expect(payload.source).toBe("topology");
    expect(payload.environment_id).toBe("env-fab");
    expect(payload.selected_node_id).toBe("n1");
    expect(payload.selected_label).toBe("edge-rt-01");
    expect(payload.selected_state).toBe("healthy");
    expect(payload.selected_role).toBe("edge router");
    expect(payload.affected_neighbor_ids).toEqual(["n2", "n3"]);
    expect(payload.affected_edge_ids.sort()).toEqual(["e1", "e2"]);
  });

  it("carries V1BY source.kind and freshness from the view", () => {
    const v = view([node("n1", "healthy")], []);
    const focus = computeAffectedFocus({
      selectedNodeId: "n1",
      nodes: v.nodes,
      edges: v.edges,
      sourceKind: v.source?.kind,
    });
    const payload = buildDiagnoseHandoffFromAffectedFocus({
      view: v,
      selectedNode: v.nodes[0],
      affectedFocus: focus,
    });
    expect(payload.topology_source_kind).toBe("fabricated");
    expect(payload.topology_freshness).toBe("static");
    expect(payload.generated_at).toBe("lab-deterministic");
  });

  it("V1BX — neighbour labels resolve from the view by id, in sorted order", () => {
    const nodes = [
      node("n1", "healthy"),
      node("nb-x", "warning", "branch-x"),
      node("na-y", "degraded", "branch-y"),
    ];
    const edges = [
      edge("e1", "n1", "nb-x", "warning"),
      edge("e2", "n1", "na-y", "degraded"),
    ];
    const v = view(nodes, edges);
    const focus = computeAffectedFocus({
      selectedNodeId: "n1",
      nodes: v.nodes,
      edges: v.edges,
      sourceKind: v.source?.kind,
    });
    const payload = buildDiagnoseHandoffFromAffectedFocus({
      view: v,
      selectedNode: v.nodes[0],
      affectedFocus: focus,
    });
    expect(payload.affected_neighbor_ids).toEqual(["na-y", "nb-x"]);
    expect(payload.affected_neighbor_labels).toEqual(["branch-y", "branch-x"]);
  });

  it("healthy selection with no affected neighbourhood produces empty arrays and no worst_state", () => {
    const nodes = [node("n1", "healthy"), node("n2", "healthy")];
    const edges = [edge("e1", "n1", "n2", "healthy")];
    const v = view(nodes, edges);
    const focus = computeAffectedFocus({
      selectedNodeId: "n1",
      nodes: v.nodes,
      edges: v.edges,
      sourceKind: v.source?.kind,
    });
    const payload = buildDiagnoseHandoffFromAffectedFocus({
      view: v,
      selectedNode: v.nodes[0],
      affectedFocus: focus,
    });
    expect(payload.affected_edge_ids).toEqual([]);
    expect(payload.affected_neighbor_ids).toEqual([]);
    expect(payload.worst_state).toBeUndefined();
  });

  it("counts_by_state tallies every node by operational state", () => {
    const nodes = [
      node("n1", "healthy"),
      node("n2", "warning"),
      node("n3", "warning"),
      node("n4", "degraded"),
      node("n5", "down"),
      node("n6", "maintenance"),
      node("n7", "unknown"),
    ];
    const v = view(nodes, []);
    const focus = computeAffectedFocus({
      selectedNodeId: "n1",
      nodes: v.nodes,
      edges: v.edges,
      sourceKind: v.source?.kind,
    });
    const payload = buildDiagnoseHandoffFromAffectedFocus({
      view: v,
      selectedNode: v.nodes[0],
      affectedFocus: focus,
    });
    expect(payload.counts_by_state).toEqual({
      healthy: 1,
      warning: 2,
      degraded: 1,
      down: 1,
      maintenance: 1,
      unknown: 1,
    });
  });

  it("includes worst_state when affected neighbourhood is non-empty", () => {
    const nodes = [
      node("n1", "healthy"),
      node("n2", "warning"),
      node("n3", "down"),
    ];
    const edges = [
      edge("e1", "n1", "n2", "warning"),
      edge("e2", "n1", "n3", "down"),
    ];
    const v = view(nodes, edges);
    const focus = computeAffectedFocus({
      selectedNodeId: "n1",
      nodes: v.nodes,
      edges: v.edges,
      sourceKind: v.source?.kind,
    });
    const payload = buildDiagnoseHandoffFromAffectedFocus({
      view: v,
      selectedNode: v.nodes[0],
      affectedFocus: focus,
    });
    expect(payload.worst_state).toBe("down");
  });
});

describe("formatHandoffSummary", () => {
  it("summarises a handoff with affected scope", () => {
    const payload = buildDiagnoseHandoffFromAffectedFocus({
      view: view(
        [
          node("n1", "warning", "edge-01"),
          node("n2", "warning"),
        ],
        [edge("e1", "n1", "n2", "warning")],
      ),
      selectedNode: node("n1", "warning", "edge-01"),
      affectedFocus: computeAffectedFocus({
        selectedNodeId: "n1",
        nodes: [
          node("n1", "warning", "edge-01"),
          node("n2", "warning"),
        ],
        edges: [edge("e1", "n1", "n2", "warning")],
        sourceKind: "fabricated",
      }),
    });
    expect(formatHandoffSummary(payload)).toContain("edge-01");
    expect(formatHandoffSummary(payload)).toContain("Warning");
    expect(formatHandoffSummary(payload)).toContain("1 link");
    expect(formatHandoffSummary(payload)).toContain("1 neighbour");
  });

  it("summarises a handoff with no affected scope", () => {
    const v = view([node("n1", "healthy", "core-01")], []);
    const focus = computeAffectedFocus({
      selectedNodeId: "n1",
      nodes: v.nodes,
      edges: v.edges,
      sourceKind: v.source?.kind,
    });
    const payload = buildDiagnoseHandoffFromAffectedFocus({
      view: v,
      selectedNode: v.nodes[0],
      affectedFocus: focus,
    });
    expect(formatHandoffSummary(payload)).toBe(
      "core-01 · Healthy · no affected neighbourhood",
    );
  });
});
