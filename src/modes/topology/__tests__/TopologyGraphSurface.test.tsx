/**
 * V1AY Topology Graph Surface Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopologyGraphSurface } from "../TopologyGraphSurface";
import { buildRenderGraph } from "../renderGraph";
import type { GraphReadyTopologyView } from "../topologyReview";

describe("TopologyGraphSurface", () => {
  it("renders SVG with tg-svg data-testid", () => {
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

    render(
      <TopologyGraphSurface model={model} selection={null} onSelect={() => {}} />,
    );

    expect(screen.getByTestId("tg-svg")).toBeInTheDocument();
  });

  it("renders one tg-node-<id> per node", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "node-1", label: "N1", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
        { id: "node-2", label: "N2", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(
      <TopologyGraphSurface model={model} selection={null} onSelect={() => {}} />,
    );

    expect(screen.getByTestId("tg-node-node-1")).toBeInTheDocument();
    expect(screen.getByTestId("tg-node-node-2")).toBeInTheDocument();
  });

  it("renders one tg-edge-<id> per edge", () => {
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
          kind: "lldp",
          local_interface: "eth0",
          remote_interface: "eth1",
          evidence_count: 1,
        },
      ],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(
      <TopologyGraphSurface model={model} selection={null} onSelect={() => {}} />,
    );

    expect(screen.getByTestId("tg-edge-edge-1")).toBeInTheDocument();
  });

  it("clicking a node fires onSelect({kind:node, id})", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "node-a", label: "A", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(
      <TopologyGraphSurface model={model} selection={null} onSelect={onSelect} />,
    );

    await user.click(screen.getByTestId("tg-node-node-a"));
    expect(onSelect).toHaveBeenCalledWith({ kind: "node", id: "node-a" });
  });

  it("clicking an edge fires onSelect({kind:edge, id})", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "a", label: "A", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
        { id: "b", label: "B", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [
        {
          id: "e1",
          source_node_id: "a",
          target_node_id: "b",
          kind: "lldp",
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
      <TopologyGraphSurface model={model} selection={null} onSelect={onSelect} />,
    );

    await user.click(screen.getByTestId("tg-edge-e1"));
    expect(onSelect).toHaveBeenCalledWith({ kind: "edge", id: "e1" });
  });

  it("clicking SVG background fires onSelect(null)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
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

    const { container } = render(
      <TopologyGraphSurface model={model} selection={null} onSelect={onSelect} />,
    );

    const svg = screen.getByTestId("tg-svg");
    await user.click(svg);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("empty state renders tg-empty panel", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [],
      edges: [],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(
      <TopologyGraphSurface model={model} selection={null} onSelect={() => {}} />,
    );

    expect(screen.getByTestId("tg-empty")).toBeInTheDocument();
  });

  it("partial state renders tg-partial-note", () => {
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

    render(
      <TopologyGraphSurface model={model} selection={null} onSelect={() => {}} />,
    );

    expect(screen.getByTestId("tg-partial-note")).toBeInTheDocument();
  });

  it("selected node has data-selected=true", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "node-1", label: "N1", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };
    const model = buildRenderGraph({ view, data_source: "demo" });

    render(
      <TopologyGraphSurface
        model={model}
        selection={{ kind: "node", id: "node-1" }}
        onSelect={() => {}}
      />,
    );

    const circle = screen.getByTestId("tg-node-node-1");
    expect(circle).toHaveAttribute("data-selected", "true");
  });
});
