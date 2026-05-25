/**
 * V1BX — affectedFocus helper tests.
 *
 * Pure unit tests for neighbourhood detection, worst-state calculation,
 * and state count aggregation.
 */

import { describe, it, expect } from "vitest";
import {
  computeAffectedFocus,
  isAffectedState,
  FOCUS_SEVERITY,
  type AffectedFocusInput,
  type AffectedFocus,
} from "../affectedFocus";
import type {
  GraphReadyTopologyNode,
  GraphReadyTopologyEdge,
} from "../../topologyReview";

describe("affectedFocus", () => {
  describe("isAffectedState", () => {
    it("returns false for healthy", () => {
      expect(isAffectedState("healthy")).toBe(false);
    });

    it("returns true for non-healthy states", () => {
      expect(isAffectedState("warning")).toBe(true);
      expect(isAffectedState("degraded")).toBe(true);
      expect(isAffectedState("down")).toBe(true);
      expect(isAffectedState("maintenance")).toBe(true);
      expect(isAffectedState("unknown")).toBe(true);
    });
  });

  describe("FOCUS_SEVERITY", () => {
    it("has correct precedence order", () => {
      expect(FOCUS_SEVERITY.healthy).toBe(0);
      expect(FOCUS_SEVERITY.unknown).toBe(1);
      expect(FOCUS_SEVERITY.maintenance).toBe(2);
      expect(FOCUS_SEVERITY.warning).toBe(3);
      expect(FOCUS_SEVERITY.degraded).toBe(4);
      expect(FOCUS_SEVERITY.down).toBe(5);
    });
  });

  describe("computeAffectedFocus", () => {
    const mockNode = (id: string, state: string = "healthy"): GraphReadyTopologyNode => ({
      id,
      label: `node-${id}`,
      vendor: "cisco",
      platform_id: "cisco-iosxe",
      role_hint: "router",
      layer: "core",
      operational_state: state as any,
    });

    const mockEdge = (
      id: string,
      sourceId: string,
      targetId: string,
      state: string = "healthy",
    ): GraphReadyTopologyEdge => ({
      id,
      source_node_id: sourceId,
      target_node_id: targetId,
      kind: "inferred",
      local_interface: "eth0",
      remote_interface: "eth1",
      evidence_count: 1,
      operational_state: state as any,
    });

    it("returns empty focus when selectedNodeId is null", () => {
      const input: AffectedFocusInput = {
        selectedNodeId: null,
        nodes: [mockNode("a")],
        edges: [],
      };

      const result = computeAffectedFocus(input);

      expect(result.hasSelection).toBe(false);
      expect(result.selectedState).toBe("healthy");
      expect(result.connectedEdgeIds.size).toBe(0);
      expect(result.affectedEdgeIds.size).toBe(0);
      expect(result.affectedNeighborIds.size).toBe(0);
      expect(result.worstState).toBe("healthy");
    });

    it("returns empty focus when selected node not found", () => {
      const input: AffectedFocusInput = {
        selectedNodeId: "missing",
        nodes: [mockNode("a")],
        edges: [],
      };

      const result = computeAffectedFocus(input);

      expect(result.hasSelection).toBe(false);
    });

    it("finds connected edges and neighbours", () => {
      const nodes = [mockNode("a"), mockNode("b"), mockNode("c")];
      const edges = [
        mockEdge("e1", "a", "b"),
        mockEdge("e2", "a", "c"),
        mockEdge("e3", "b", "c"),
      ];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
      };

      const result = computeAffectedFocus(input);

      expect(result.connectedEdgeIds.size).toBe(2);
      expect(result.connectedEdgeIds.has("e1")).toBe(true);
      expect(result.connectedEdgeIds.has("e2")).toBe(true);
      expect(result.connectedEdgeIds.has("e3")).toBe(false);

      expect(result.neighborNodeIds.size).toBe(2);
      expect(result.neighborNodeIds.has("b")).toBe(true);
      expect(result.neighborNodeIds.has("c")).toBe(true);
    });

    it("identifies healthy selection with no affected neighbours", () => {
      const nodes = [mockNode("a", "healthy"), mockNode("b", "healthy")];
      const edges = [mockEdge("e1", "a", "b", "healthy")];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
      };

      const result = computeAffectedFocus(input);

      expect(result.hasSelection).toBe(true);
      expect(result.selectedState).toBe("healthy");
      expect(result.affectedEdgeIds.size).toBe(0);
      expect(result.affectedNeighborIds.size).toBe(0);
      expect(result.worstState).toBe("healthy");
    });

    it("identifies affected edge", () => {
      const nodes = [mockNode("a", "healthy"), mockNode("b", "healthy")];
      const edges = [mockEdge("e1", "a", "b", "warning")];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
      };

      const result = computeAffectedFocus(input);

      expect(result.affectedEdgeIds.has("e1")).toBe(true);
      expect(result.worstState).toBe("warning");
    });

    it("identifies affected neighbour", () => {
      const nodes = [mockNode("a", "healthy"), mockNode("b", "warning")];
      const edges = [mockEdge("e1", "a", "b", "healthy")];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
      };

      const result = computeAffectedFocus(input);

      expect(result.affectedNeighborIds.has("b")).toBe(true);
      expect(result.worstState).toBe("warning");
    });

    it("calculates worst state across selected + edges + neighbours", () => {
      const nodes = [
        mockNode("a", "warning"),
        mockNode("b", "healthy"),
        mockNode("c", "degraded"),
      ];
      const edges = [
        mockEdge("e1", "a", "b", "healthy"),
        mockEdge("e2", "a", "c", "healthy"),
      ];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
      };

      const result = computeAffectedFocus(input);

      // worst across selected (warning=3), affected edge (none), affected neighbour (c=degraded=4) => degraded
      expect(result.worstState).toBe("degraded");
    });

    it("worst state: edge precedence over selected", () => {
      const nodes = [mockNode("a", "warning"), mockNode("b", "healthy")];
      const edges = [mockEdge("e1", "a", "b", "down")];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
      };

      const result = computeAffectedFocus(input);

      // selected=warning, affected edge=down => down wins
      expect(result.worstState).toBe("down");
    });

    it("counts neighbour states", () => {
      const nodes = [
        mockNode("a", "healthy"),
        mockNode("b", "healthy"),
        mockNode("c", "warning"),
        mockNode("d", "down"),
      ];
      const edges = [
        mockEdge("e1", "a", "b", "healthy"),
        mockEdge("e2", "a", "c", "healthy"),
        mockEdge("e3", "a", "d", "healthy"),
      ];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
      };

      const result = computeAffectedFocus(input);

      expect(result.countsByState.healthy).toBe(1); // only b
      expect(result.countsByState.warning).toBe(1); // only c
      expect(result.countsByState.down).toBe(1);    // only d
      expect(result.countsByState.degraded).toBe(0);
    });

    it("caps neighborLabels at 3", () => {
      const nodes = [
        mockNode("a", "healthy"),
        mockNode("b", "warning"),
        mockNode("c", "warning"),
        mockNode("d", "warning"),
        mockNode("e", "warning"),
      ];
      const edges = [
        mockEdge("e1", "a", "b", "healthy"),
        mockEdge("e2", "a", "c", "healthy"),
        mockEdge("e3", "a", "d", "healthy"),
        mockEdge("e4", "a", "e", "healthy"),
      ];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
      };

      const result = computeAffectedFocus(input);

      expect(result.neighborLabels.length).toBe(3);
      expect(result.neighborLabels[0]).toBe("node-b");
      expect(result.neighborLabels[1]).toBe("node-c");
      expect(result.neighborLabels[2]).toBe("node-d");
    });

    it("handles edges with missing endpoints gracefully", () => {
      const nodes = [mockNode("a"), mockNode("b")];
      const edges = [
        mockEdge("e1", "a", "b", "healthy"),
        mockEdge("e2", "a", "missing", "healthy"), // missing target
      ];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
      };

      const result = computeAffectedFocus(input);

      // Both edges are connected; the missing endpoint is added to neighbours
      // but won't be found in the node map, so it won't contribute to counts
      expect(result.connectedEdgeIds.size).toBe(2);
      expect(result.connectedEdgeIds.has("e1")).toBe(true);
      expect(result.connectedEdgeIds.has("e2")).toBe(true);
      expect(result.neighborNodeIds.size).toBe(2);
      expect(result.neighborNodeIds.has("b")).toBe(true);
      expect(result.neighborNodeIds.has("missing")).toBe(true);
      // But when aggregating states, only "b" contributes
      expect(result.countsByState.healthy).toBe(1);
    });

    it("handles bidirectional edges", () => {
      const nodes = [mockNode("a"), mockNode("b")];
      const edges = [
        mockEdge("e1", "a", "b", "healthy"),
        mockEdge("e2", "b", "a", "healthy"), // reverse direction
      ];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
      };

      const result = computeAffectedFocus(input);

      expect(result.connectedEdgeIds.size).toBe(2);
      expect(result.connectedEdgeIds.has("e1")).toBe(true);
      expect(result.connectedEdgeIds.has("e2")).toBe(true);
      expect(result.neighborNodeIds.size).toBe(1);
      expect(result.neighborNodeIds.has("b")).toBe(true);
    });

    it("treats undefined states as healthy", () => {
      const nodes = [
        mockNode("a"),
        mockNode("b"),
      ];
      const edges = [mockEdge("e1", "a", "b")];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
      };

      const result = computeAffectedFocus(input);

      expect(result.selectedState).toBe("healthy");
      expect(result.worstState).toBe("healthy");
      expect(result.affectedNeighborIds.size).toBe(0);
    });

    // V1BY — sourceKind passthrough
    it("passes sourceKind through when provided", () => {
      const nodes = [
        mockNode("a"),
        mockNode("b"),
      ];
      const edges = [mockEdge("e1", "a", "b")];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
        sourceKind: "fabricated",   // V1BY
      };

      const result = computeAffectedFocus(input);

      expect(result.sourceKind).toBe("fabricated");
    });

    it("has sourceKind undefined when omitted", () => {
      const nodes = [
        mockNode("a"),
        mockNode("b"),
      ];
      const edges = [mockEdge("e1", "a", "b")];

      const input: AffectedFocusInput = {
        selectedNodeId: "a",
        nodes,
        edges,
        // sourceKind omitted
      };

      const result = computeAffectedFocus(input);

      expect(result.sourceKind).toBeUndefined();
    });

    it("preserves sourceKind even when no selection", () => {
      const nodes = [
        mockNode("a"),
        mockNode("b"),
      ];
      const edges = [mockEdge("e1", "a", "b")];

      const input: AffectedFocusInput = {
        selectedNodeId: null,   // no selection
        nodes,
        edges,
        sourceKind: "demo",
      };

      const result = computeAffectedFocus(input);

      expect(result.hasSelection).toBe(false);
      expect(result.sourceKind).toBe("demo");
    });
  });
});
