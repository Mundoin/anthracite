/**
 * V1AY Topology Graph Inspector Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopologyGraphInspector } from "../TopologyGraphInspector";
import { buildRenderGraph } from "../renderGraph";
import type { GraphReadyTopologyView } from "../topologyReview";

describe("TopologyGraphInspector", () => {
  it("null selection renders tgi-empty", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [],
      edges: [],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(<TopologyGraphInspector model={model} selection={null} />);

    expect(screen.getByTestId("tgi-empty")).toBeInTheDocument();
  });

  it("node selection renders all node fields", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        {
          id: "router-1",
          label: "Router 1",
          vendor: "Cisco",
          platform_id: "ios-xe",
          role_hint: "core",
          layer: "layer3",
        },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(
      <TopologyGraphInspector
        model={model}
        selection={{ kind: "node", id: "router-1" }}
      />,
    );

    expect(screen.getByTestId("tgi-node")).toBeInTheDocument();
    expect(screen.getByText("router-1")).toBeInTheDocument();
    expect(screen.getByText("Router 1")).toBeInTheDocument();
    expect(screen.getByText("Cisco")).toBeInTheDocument();
    expect(screen.getByText("ios-xe")).toBeInTheDocument();
    expect(screen.getByText("core")).toBeInTheDocument();
    expect(screen.getByText("layer3")).toBeInTheDocument();
  });

  it("node selection with null vendor/platform shows —", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        {
          id: "unknown-node",
          label: "Unknown",
          vendor: null,
          platform_id: null,
          role_hint: "leaf",
          layer: "layer2",
        },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(
      <TopologyGraphInspector
        model={model}
        selection={{ kind: "node", id: "unknown-node" }}
      />,
    );

    const vendorElements = screen.getAllByText("—");
    expect(vendorElements.length).toBeGreaterThanOrEqual(2); // vendor and platform_id
  });

  it("edge selection renders all edge fields", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "a", label: "A", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
        { id: "b", label: "B", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [
        {
          id: "edge-lldp-1",
          source_node_id: "a",
          target_node_id: "b",
          kind: "lldp",
          local_interface: "eth0",
          remote_interface: "eth1",
          evidence_count: 5,
        },
      ],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(
      <TopologyGraphInspector
        model={model}
        selection={{ kind: "edge", id: "edge-lldp-1" }}
      />,
    );

    expect(screen.getByTestId("tgi-edge")).toBeInTheDocument();
    expect(screen.getByText("edge-lldp-1")).toBeInTheDocument();
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
    expect(screen.getByText("lldp")).toBeInTheDocument();
    expect(screen.getByText("eth0")).toBeInTheDocument();
    expect(screen.getByText("eth1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("edge selection with evidence_count > 0 shows no 'no evidence' message", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "a", label: "A", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
        { id: "b", label: "B", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [
        {
          id: "edge-1",
          source_node_id: "a",
          target_node_id: "b",
          kind: "cdp",
          local_interface: null,
          remote_interface: null,
          evidence_count: 2,
        },
      ],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(
      <TopologyGraphInspector
        model={model}
        selection={{ kind: "edge", id: "edge-1" }}
      />,
    );

    expect(screen.queryByTestId("tgi-no-evidence")).not.toBeInTheDocument();
  });

  it("edge selection with evidence_count === 0 shows tgi-no-evidence honest message", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "a", label: "A", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
        { id: "b", label: "B", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [
        {
          id: "edge-manual",
          source_node_id: "a",
          target_node_id: "b",
          kind: "manual",
          local_interface: null,
          remote_interface: null,
          evidence_count: 0,
        },
      ],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(
      <TopologyGraphInspector
        model={model}
        selection={{ kind: "edge", id: "edge-manual" }}
      />,
    );

    expect(screen.getByTestId("tgi-no-evidence")).toBeInTheDocument();
    expect(
      screen.getByText("No evidence attached to this edge yet."),
    ).toBeInTheDocument();
  });

  it("edge selection with null interfaces shows —", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "a", label: "A", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
        { id: "b", label: "B", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [
        {
          id: "edge-2",
          source_node_id: "a",
          target_node_id: "b",
          kind: "config_neighbor",
          local_interface: null,
          remote_interface: null,
          evidence_count: 1,
        },
      ],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(
      <TopologyGraphInspector
        model={model}
        selection={{ kind: "edge", id: "edge-2" }}
      />,
    );

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2); // local_interface and remote_interface
  });
});
