/**
 * V1AY Topology Graph Panel Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopologyGraphPanel } from "../TopologyGraphPanel";
import type { GraphReadyTopologyView } from "../topologyReview";

describe("TopologyGraphPanel", () => {
  it("mounts with no selection → inspector shows empty state", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "a", label: "A", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    render(<TopologyGraphPanel view={view} data_source="demo" />);

    expect(screen.getByTestId("tg-panel")).toBeInTheDocument();
    expect(screen.getByTestId("tgi-empty")).toBeInTheDocument();
  });

  it("clicking a rendered node updates inspector", async () => {
    const user = userEvent.setup();
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        {
          id: "router-x",
          label: "Router X",
          vendor: "Juniper",
          platform_id: "junos",
          role_hint: "core",
          layer: "l3",
        },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    render(<TopologyGraphPanel view={view} data_source="imported" />);

    // Initially empty
    expect(screen.getByTestId("tgi-empty")).toBeInTheDocument();

    // Click the node
    await user.click(screen.getByTestId("tg-node-router-x"));

    // Inspector should now show node details
    expect(screen.getByTestId("tgi-node")).toBeInTheDocument();
    expect(screen.getByText("router-x")).toBeInTheDocument();
  });

  it("clicking a rendered edge updates inspector", async () => {
    const user = userEvent.setup();
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "n1", label: "N1", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
        { id: "n2", label: "N2", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [
        {
          id: "e-test",
          source_node_id: "n1",
          target_node_id: "n2",
          kind: "lldp",
          local_interface: "eth0",
          remote_interface: "eth1",
          evidence_count: 1,
        },
      ],
      renderer_attached: false,
      note: "test",
    };

    render(<TopologyGraphPanel view={view} data_source="fixture" />);

    // Initially empty
    expect(screen.getByTestId("tgi-empty")).toBeInTheDocument();

    // Click the edge
    await user.click(screen.getByTestId("tg-edge-e-test"));

    // Inspector should now show edge details
    expect(screen.getByTestId("tgi-edge")).toBeInTheDocument();
    expect(screen.getByText("e-test")).toBeInTheDocument();
  });

  it("data source badge renders the provided data_source value", () => {
    const view: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    render(<TopologyGraphPanel view={view} data_source="simulated" />);

    expect(screen.getByTestId("tg-source-badge")).toBeInTheDocument();
    expect(screen.getByText("Simulated")).toBeInTheDocument();
  });

  it("resets selection when model changes", async () => {
    const user = userEvent.setup();
    const view1: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "a", label: "A", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    const { rerender } = render(
      <TopologyGraphPanel view={view1} data_source="demo" />,
    );

    // Select the node
    await user.click(screen.getByTestId("tg-node-a"));
    expect(screen.getByTestId("tgi-node")).toBeInTheDocument();

    // Change the view (new model)
    const view2: GraphReadyTopologyView = {
      environment_id: "env-1",
      nodes: [
        { id: "b", label: "B", vendor: null, platform_id: null, role_hint: "core", layer: "l3" },
      ],
      edges: [],
      renderer_attached: false,
      note: "test",
    };

    rerender(<TopologyGraphPanel view={view2} data_source="demo" />);

    // Selection should be reset to empty
    expect(screen.getByTestId("tgi-empty")).toBeInTheDocument();
  });
});
