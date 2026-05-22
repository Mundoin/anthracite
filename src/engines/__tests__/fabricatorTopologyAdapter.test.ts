import { describe, expect, it } from "vitest";
import {
  toGraphReadyTopologyView,
  buildFabricatorRenderGraph,
} from "../fabricatorTopologyAdapter";
import { generateFabricatorEnvironment } from "../fabricator";

describe("toGraphReadyTopologyView", () => {
  it("produces exactly 3 nodes from env-fab-demo", () => {
    const env = generateFabricatorEnvironment();
    const view = toGraphReadyTopologyView(env);
    expect(view.nodes).toHaveLength(3);
  });

  it("produces exactly 2 edges from env-fab-demo", () => {
    const env = generateFabricatorEnvironment();
    const view = toGraphReadyTopologyView(env);
    expect(view.edges).toHaveLength(2);
  });

  it("node IDs are stable across calls", () => {
    const a = toGraphReadyTopologyView(generateFabricatorEnvironment());
    const b = toGraphReadyTopologyView(generateFabricatorEnvironment());
    expect(a.nodes.map((n) => n.id).sort()).toEqual(
      b.nodes.map((n) => n.id).sort(),
    );
  });

  it("edge IDs are stable across calls", () => {
    const a = toGraphReadyTopologyView(generateFabricatorEnvironment());
    const b = toGraphReadyTopologyView(generateFabricatorEnvironment());
    expect(a.edges.map((e) => e.id).sort()).toEqual(
      b.edges.map((e) => e.id).sort(),
    );
  });

  it("edge source_node_id references a valid node id", () => {
    const view = toGraphReadyTopologyView(generateFabricatorEnvironment());
    const nodeIds = new Set(view.nodes.map((n) => n.id));
    for (const edge of view.edges) {
      expect(nodeIds.has(edge.source_node_id)).toBe(true);
    }
  });

  it("edge target_node_id references a valid node id", () => {
    const view = toGraphReadyTopologyView(generateFabricatorEnvironment());
    const nodeIds = new Set(view.nodes.map((n) => n.id));
    for (const edge of view.edges) {
      expect(nodeIds.has(edge.target_node_id)).toBe(true);
    }
  });

  it("all edges have kind 'manual'", () => {
    const view = toGraphReadyTopologyView(generateFabricatorEnvironment());
    for (const edge of view.edges) {
      expect(edge.kind).toBe("manual");
    }
  });

  it("environment_id matches the fabricated env", () => {
    const env = generateFabricatorEnvironment();
    const view = toGraphReadyTopologyView(env);
    expect(view.environment_id).toBe(env.environment_id);
    expect(view.environment_id).toBe("env-fab-demo");
  });

  it("renderer_attached is always false", () => {
    const view = toGraphReadyTopologyView(generateFabricatorEnvironment());
    expect(view.renderer_attached).toBe(false);
  });

  it("note contains fabricated/synthetic signal", () => {
    const view = toGraphReadyTopologyView(generateFabricatorEnvironment());
    expect(view.note.toLowerCase()).toMatch(/fabricat|synthetic/);
  });

  it("node vendor and platform are preserved from fabricated devices", () => {
    const env = generateFabricatorEnvironment();
    const view = toGraphReadyTopologyView(env);
    for (let i = 0; i < env.devices.length; i++) {
      expect(view.nodes[i].vendor).toBe(env.devices[i].vendor);
      expect(view.nodes[i].platform_id).toBe(env.devices[i].platform);
    }
  });

  it("node label maps to device name", () => {
    const env = generateFabricatorEnvironment();
    const view = toGraphReadyTopologyView(env);
    const byId = new Map(env.devices.map((d) => [d.id, d]));
    for (const node of view.nodes) {
      expect(node.label).toBe(byId.get(node.id)?.name);
    }
  });

  it("node layer is 'inventory'", () => {
    const view = toGraphReadyTopologyView(generateFabricatorEnvironment());
    for (const node of view.nodes) {
      expect(node.layer).toBe("inventory");
    }
  });

  it("output is deterministic across calls", () => {
    const a = toGraphReadyTopologyView(generateFabricatorEnvironment());
    const b = toGraphReadyTopologyView(generateFabricatorEnvironment());
    expect(a).toEqual(b);
  });
});

describe("buildFabricatorRenderGraph", () => {
  it("returns a RenderGraphModel with 3 nodes", () => {
    const model = buildFabricatorRenderGraph();
    expect(model.node_count).toBe(3);
    expect(model.nodes).toHaveLength(3);
  });

  it("returns a RenderGraphModel with 2 edges", () => {
    const model = buildFabricatorRenderGraph();
    expect(model.edge_count).toBe(2);
    expect(model.edges).toHaveLength(2);
  });

  it("data_source is 'demo'", () => {
    const model = buildFabricatorRenderGraph();
    expect(model.data_source).toBe("demo");
  });

  it("environment_id is env-fab-demo", () => {
    const model = buildFabricatorRenderGraph();
    expect(model.environment_id).toBe("env-fab-demo");
  });

  it("state is 'rendered' (has both nodes and edges)", () => {
    const model = buildFabricatorRenderGraph();
    expect(model.state).toBe("rendered");
  });

  it("all nodes have finite x and y coordinates", () => {
    const model = buildFabricatorRenderGraph();
    for (const node of model.nodes) {
      expect(isFinite(node.x)).toBe(true);
      expect(isFinite(node.y)).toBe(true);
    }
  });

  it("is deterministic across calls", () => {
    const a = buildFabricatorRenderGraph();
    const b = buildFabricatorRenderGraph();
    expect(a).toEqual(b);
  });
});
