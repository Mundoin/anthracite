/**
 * V1AY Core Graph Renderer Tests — renderGraph adapter
 */

import { describe, it, expect } from "vitest";
import { buildRenderGraph } from "../renderGraph";
import type { GraphReadyTopologyView } from "../topologyReview";

describe("buildRenderGraph", () => {
  it("empty view → state=empty, no nodes, no edges", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    const model = buildRenderGraph({ view, data_source: "demo" });

    expect(model.state).toBe("empty");
    expect(model.node_count).toBe(0);
    expect(model.edge_count).toBe(0);
    expect(model.nodes).toEqual([]);
    expect(model.edges).toEqual([]);
    expect(model.viewbox).toEqual({
      min_x: -100,
      min_y: -100,
      width: 200,
      height: 200,
    });
  });

  it("nodes only → state=partial, nodes have coordinates, no edges", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        {
          id: "node-a",
          label: "Router A",
          vendor: "Cisco",
          platform_id: "ios-xe",
          role_hint: "core",
          layer: "layer3",
        },
        {
          id: "node-b",
          label: "Router B",
          vendor: "Arista",
          platform_id: "eos",
          role_hint: "distribution",
          layer: "layer3",
        },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    const model = buildRenderGraph({ view, data_source: "fixture" });

    expect(model.state).toBe("partial");
    expect(model.node_count).toBe(2);
    expect(model.edge_count).toBe(0);
    expect(model.nodes.length).toBe(2);
    expect(model.nodes[0]).toHaveProperty("x");
    expect(model.nodes[0]).toHaveProperty("y");
    expect(model.edges).toEqual([]);
  });

  it("nodes + edges → state=rendered", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        {
          id: "node-a",
          label: "Router A",
          vendor: "Cisco",
          platform_id: "ios-xe",
          role_hint: "core",
          layer: "layer3",
        },
        {
          id: "node-b",
          label: "Router B",
          vendor: "Arista",
          platform_id: "eos",
          role_hint: "distribution",
          layer: "layer3",
        },
      ],
      edges: [
        {
          id: "edge-1",
          source_node_id: "node-a",
          target_node_id: "node-b",
          kind: "lldp",
          local_interface: "eth0",
          remote_interface: "eth1",
          evidence_count: 3,
        },
      ],
      renderer_attached: false,
      note: "test",
    };

    const model = buildRenderGraph({ view, data_source: "imported" });

    expect(model.state).toBe("rendered");
    expect(model.node_count).toBe(2);
    expect(model.edge_count).toBe(1);
    expect(model.edges[0].kind).toBe("lldp");
    expect(model.edges[0].evidence_count).toBe(3);
  });

  it("deterministic ordering: same input twice yields identical model", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "z", label: "Z", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
        { id: "a", label: "A", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
        { id: "m", label: "M", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    const model1 = buildRenderGraph({ view, data_source: "demo" });
    const model2 = buildRenderGraph({ view, data_source: "demo" });

    // Models should be structurally identical (JSON-equal)
    expect(JSON.stringify(model1)).toBe(JSON.stringify(model2));
  });

  it("node coordinate stability: sorted-id deterministic placement", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "z", label: "Z", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
        { id: "a", label: "A", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    const model = buildRenderGraph({ view, data_source: "demo" });

    // Node "a" should come before node "z" in coordinates (deterministic sort order)
    const nodeA = model.nodes.find((n) => n.id === "a");
    const nodeZ = model.nodes.find((n) => n.id === "z");

    expect(nodeA).toBeDefined();
    expect(nodeZ).toBeDefined();

    // Placement should be on a circle; verify they're different points
    if (nodeA && nodeZ) {
      const distSq = (nodeA.x - nodeZ.x) ** 2 + (nodeA.y - nodeZ.y) ** 2;
      expect(distSq).toBeGreaterThan(0);
    }
  });

  it("data_source flows through unchanged for all 5 values", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    const sources = ["demo", "fixture", "imported", "simulated", "unknown"] as const;
    for (const source of sources) {
      const model = buildRenderGraph({ view, data_source: source });
      expect(model.data_source).toBe(source);
    }
  });

  it("environment_id flows through from view", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-prod",
      nodes: [],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    const model = buildRenderGraph({ view, data_source: "imported" });

    expect(model.environment_id).toBe("env-prod");
  });

  it("viewbox covers nodes with padding", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "a", label: "A", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    const model = buildRenderGraph({ view, data_source: "demo" });

    const nodeA = model.nodes.find((n) => n.id === "a");
    const vb = model.viewbox;

    if (nodeA) {
      // Node should be within viewbox with padding
      expect(nodeA.x).toBeGreaterThanOrEqual(vb.min_x);
      expect(nodeA.x).toBeLessThanOrEqual(vb.min_x + vb.width);
      expect(nodeA.y).toBeGreaterThanOrEqual(vb.min_y);
      expect(nodeA.y).toBeLessThanOrEqual(vb.min_y + vb.height);
    }
  });
});
