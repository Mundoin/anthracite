import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TopologyMode } from "../TopologyMode";
import type { TopologySourceView } from "../../../data/topologySource";
import type { TopologyAdjacencyReadiness } from "../../../types/topology";

function defaultReadiness(
  eligibleNodeCount = 0
): TopologyAdjacencyReadiness {
  return {
    eligible_node_count: eligibleNodeCount,
    fact_source_state: "none_available",
    fact_sources: [
      {
        kind: "lldp",
        present: false,
        count: 0,
        note: "LLDP fact ingestion not implemented",
      },
      {
        kind: "cdp",
        present: false,
        count: 0,
        note: "CDP fact ingestion not implemented",
      },
      {
        kind: "config_neighbor",
        present: false,
        count: 0,
        note: "Parser-derived neighbor facts not implemented",
      },
      {
        kind: "manual",
        present: false,
        count: 0,
        note: "Manual adjacency entry surface not built",
      },
    ],
    accepted_kinds: ["lldp", "cdp", "config_neighbor", "manual"],
    reason: "no adjacency fact sources connected — edges remain empty",
  };
}

function makeView(
  over: Partial<TopologySourceView> = {}
): TopologySourceView {
  return {
    sourceState: "empty",
    environmentId: "env-core-eu1",
    nodeCount: 0,
    edgeCount: 0,
    sourceRecordCount: 0,
    message: "topology empty — no discovery records in scope",
    isEmpty: true,
    view: {
      environment_id: "env-core-eu1",
      source_state: "empty",
      nodes: [],
      edges: [],
      summary: {
        environment_id: "env-core-eu1",
        node_count: 0,
        edge_count: 0,
        source_record_count: 0,
      },
      message: "topology empty — no discovery records in scope",
      adjacency_readiness: defaultReadiness(),
    },
    ...over,
  };
}

describe("TopologyMode", () => {
  it("renders Topology heading", () => {
    render(<TopologyMode topology={makeView()} />);
    expect(
      screen.getByRole("heading", { name: /Topology/i })
    ).toBeInTheDocument();
  });

  it("renders honest empty body when isEmpty", () => {
    render(<TopologyMode topology={makeView()} />);
    expect(
      screen.getByText("No topology to render — discovery inventory is empty for this scope.")
    ).toBeInTheDocument();
  });

  it("renders node cards when view has nodes", () => {
    const view = makeView({
      nodeCount: 3,
      isEmpty: false,
      view: {
        environment_id: "env-core-eu1",
        source_state: "real",
        nodes: [
          {
            id: "node-1",
            label: "router-01",
            vendor: "arista",
            platform_id: "DCS-7050SX",
            layer: "core",
          },
          {
            id: "node-2",
            label: "router-02",
            vendor: "juniper",
            platform_id: "MX960",
            layer: "core",
          },
          {
            id: "node-3",
            label: "switch-01",
            vendor: "cisco",
            platform_id: "Catalyst 9300",
            layer: "aggregation",
          },
        ],
        edges: [],
        summary: {
          environment_id: "env-core-eu1",
          node_count: 3,
          edge_count: 0,
          source_record_count: 3,
        },
        message: "ok",
        adjacency_readiness: defaultReadiness(3),
      },
    });
    render(<TopologyMode topology={view} />);
    const cards = screen.getAllByTestId(/tm-node-/);
    expect(cards).toHaveLength(3);
  });

  it('renders edges note "0 reliable links" when edge_count is 0', () => {
    const view = makeView({
      nodeCount: 1,
      edgeCount: 0,
      isEmpty: false,
      view: {
        environment_id: "env-core-eu1",
        source_state: "real",
        nodes: [
          {
            id: "node-1",
            label: "router-01",
            vendor: "arista",
            platform_id: "DCS-7050SX",
            layer: "core",
          },
        ],
        edges: [],
        summary: {
          environment_id: "env-core-eu1",
          node_count: 1,
          edge_count: 0,
          source_record_count: 1,
        },
        message: "ok",
        adjacency_readiness: defaultReadiness(1),
      },
    });
    render(<TopologyMode topology={view} />);
    expect(screen.getByText(/0 reliable link/)).toBeInTheDocument();
  });

  it('shows scope label "All environments" when environmentId is null', () => {
    const view = makeView({ environmentId: null });
    render(<TopologyMode topology={view} />);
    expect(screen.getByText(/All environments/)).toBeInTheDocument();
  });

  it("shows scope label with env id when present", () => {
    const view = makeView({ environmentId: "env-core-eu1" });
    render(<TopologyMode topology={view} />);
    expect(screen.getByText(/env-core-eu1/)).toBeInTheDocument();
  });

  it("shows summary node count", () => {
    const view = makeView({
      nodeCount: 5,
      isEmpty: false,
      view: {
        environment_id: "env-core-eu1",
        source_state: "real",
        nodes: Array.from({ length: 5 }, (_, i) => ({
          id: `node-${i}`,
          label: `device-${i}`,
          vendor: "vendor",
          platform_id: "platform",
          layer: "layer",
        })),
        edges: [],
        summary: {
          environment_id: "env-core-eu1",
          node_count: 5,
          edge_count: 0,
          source_record_count: 5,
        },
        message: "ok",
        adjacency_readiness: defaultReadiness(5),
      },
    });
    render(<TopologyMode topology={view} />);
    const summary = screen.getByTestId("tm-summary");
    expect(within(summary).getByText("5")).toBeInTheDocument();
  });

  it("shows summary edge count", () => {
    const view = makeView({ edgeCount: 0 });
    render(<TopologyMode topology={view} />);
    const summary = screen.getByTestId("tm-summary");
    const values = within(summary).getAllByText("0");
    expect(values.length).toBeGreaterThan(0);
  });

  it("shows summary source record count", () => {
    const view = makeView({ sourceRecordCount: 7 });
    render(<TopologyMode topology={view} />);
    const summary = screen.getByTestId("tm-summary");
    expect(within(summary).getByText("7")).toBeInTheDocument();
  });

  it("shows DataSourceTag for empty state", () => {
    const { container } = render(<TopologyMode topology={makeView()} />);
    const tag = container.querySelector('[data-state="empty"]');
    expect(tag).toBeInTheDocument();
  });

  it("does not render DataSourceTag for real state", () => {
    const view = makeView({
      sourceState: "real",
      isEmpty: false,
      nodeCount: 1,
      view: {
        environment_id: "env-core-eu1",
        source_state: "real",
        nodes: [
          {
            id: "node-1",
            label: "router-01",
            vendor: "arista",
            platform_id: "DCS-7050SX",
            layer: "core",
          },
        ],
        edges: [],
        summary: {
          environment_id: "env-core-eu1",
          node_count: 1,
          edge_count: 0,
          source_record_count: 1,
        },
        message: "ok",
        adjacency_readiness: defaultReadiness(1),
      },
    });
    const { container } = render(<TopologyMode topology={view} />);
    const tag = container.querySelector('[data-state="real"]');
    expect(tag).not.toBeInTheDocument();
  });

  it("shows DataSourceTag for unavailable state", () => {
    const view = makeView({ sourceState: "unavailable" });
    const { container } = render(<TopologyMode topology={view} />);
    const tag = container.querySelector('[data-state="unavailable"]');
    expect(tag).toBeInTheDocument();
  });

  it("renders unavailable body when view is null and sourceState is unavailable", () => {
    const view: TopologySourceView = {
      sourceState: "unavailable",
      environmentId: "env-core-eu1",
      nodeCount: 0,
      edgeCount: 0,
      sourceRecordCount: 0,
      message: "Topology source unavailable",
      isEmpty: false,
      view: null,
    };
    render(<TopologyMode topology={view} />);
    expect(
      screen.getByText("Topology source is not available right now.")
    ).toBeInTheDocument();
  });

  it("renders unavailable body when view is null and sourceState is not_connected", () => {
    const view: TopologySourceView = {
      sourceState: "not_connected",
      environmentId: "env-core-eu1",
      nodeCount: 0,
      edgeCount: 0,
      sourceRecordCount: 0,
      message: "Topology engine not connected",
      isEmpty: false,
      view: null,
    };
    render(<TopologyMode topology={view} />);
    expect(
      screen.getByText("Topology source is not available right now.")
    ).toBeInTheDocument();
  });

  it("no interactive controls", () => {
    render(<TopologyMode topology={makeView()} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  describe("TopologyMode — Adjacency readiness (V1AL)", () => {
    it("renders adjacency readiness section in empty body", () => {
      render(<TopologyMode topology={makeView()} />);
      expect(screen.getByTestId("tm-adjacency")).toBeInTheDocument();
    });

    it("renders adjacency readiness section in records body", () => {
      const view = makeView({
        nodeCount: 3,
        isEmpty: false,
        view: {
          environment_id: "env-core-eu1",
          source_state: "real",
          nodes: [
            {
              id: "node-1",
              label: "router-01",
              vendor: "arista",
              platform_id: "DCS-7050SX",
              layer: "core",
            },
            {
              id: "node-2",
              label: "router-02",
              vendor: "juniper",
              platform_id: "MX960",
              layer: "core",
            },
            {
              id: "node-3",
              label: "switch-01",
              vendor: "cisco",
              platform_id: "Catalyst 9300",
              layer: "aggregation",
            },
          ],
          edges: [],
          summary: {
            environment_id: "env-core-eu1",
            node_count: 3,
            edge_count: 0,
            source_record_count: 3,
          },
          message: "ok",
          adjacency_readiness: defaultReadiness(3),
        },
      });
      render(<TopologyMode topology={view} />);
      expect(screen.getByTestId("tm-adjacency")).toBeInTheDocument();
    });

    it("does not render adjacency readiness section when view is null", () => {
      const view: TopologySourceView = {
        sourceState: "unavailable",
        environmentId: "env-core-eu1",
        nodeCount: 0,
        edgeCount: 0,
        sourceRecordCount: 0,
        message: "Topology source unavailable",
        isEmpty: false,
        view: null,
      };
      render(<TopologyMode topology={view} />);
      expect(screen.queryByTestId("tm-adjacency")).toBeNull();
    });

    it("shows reason string", () => {
      render(<TopologyMode topology={makeView()} />);
      expect(
        within(screen.getByTestId("tm-adjacency")).getByText(
          /no adjacency fact sources connected/
        )
      ).toBeInTheDocument();
    });

    it("lists all four fact sources", () => {
      render(<TopologyMode topology={makeView()} />);
      expect(
        screen.getByTestId("tm-adjacency-source-lldp")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("tm-adjacency-source-cdp")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("tm-adjacency-source-config_neighbor")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("tm-adjacency-source-manual")
      ).toBeInTheDocument();
    });

    it("each fact source row shows 'not connected' and em-dash count in V1AL", () => {
      render(<TopologyMode topology={makeView()} />);
      const lldpRow = screen.getByTestId("tm-adjacency-source-lldp");
      expect(within(lldpRow).getByText("not connected")).toBeInTheDocument();
      expect(within(lldpRow).getByText("—")).toBeInTheDocument();
    });

    it("shows eligible node count", () => {
      const view = makeView({
        nodeCount: 5,
        isEmpty: false,
        view: {
          environment_id: "env-core-eu1",
          source_state: "real",
          nodes: Array.from({ length: 5 }, (_, i) => ({
            id: `node-${i}`,
            label: `device-${i}`,
            vendor: "vendor",
            platform_id: "platform",
            layer: "layer",
          })),
          edges: [],
          summary: {
            environment_id: "env-core-eu1",
            node_count: 5,
            edge_count: 0,
            source_record_count: 5,
          },
          message: "ok",
          adjacency_readiness: defaultReadiness(5),
        },
      });
      render(<TopologyMode topology={view} />);
      expect(
        within(screen.getByTestId("tm-adjacency")).getByText("5")
      ).toBeInTheDocument();
    });

    it("shows accepted kinds list", () => {
      render(<TopologyMode topology={makeView()} />);
      const adjacencySection = screen.getByTestId("tm-adjacency");
      expect(
        within(adjacencySection).getByText(/lldp.*cdp.*config_neighbor.*manual/)
      ).toBeInTheDocument();
    });
  });
});
