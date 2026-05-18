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
            device_record_id: "rec-1",
            hostname: "router-01.local",
            role_hint: "device",
            source_kind: "discovery_inventory",
          },
          {
            id: "node-2",
            label: "router-02",
            vendor: "juniper",
            platform_id: "MX960",
            layer: "core",
            device_record_id: "rec-2",
            hostname: "router-02.local",
            role_hint: "device",
            source_kind: "discovery_inventory",
          },
          {
            id: "node-3",
            label: "switch-01",
            vendor: "cisco",
            platform_id: "Catalyst 9300",
            layer: "aggregation",
            device_record_id: "rec-3",
            hostname: "switch-01.local",
            role_hint: "device",
            source_kind: "discovery_inventory",
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
            device_record_id: "rec-1",
            hostname: "router-01.local",
            role_hint: "device",
            source_kind: "discovery_inventory",
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
    expect(screen.getByTestId("tm-projected-edges")).toBeInTheDocument();
    expect(
      screen.getByTestId("tm-projected-edges")
    ).toHaveTextContent(/0 adjacency facts/);
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
          device_record_id: `rec-${i}`,
          hostname: `device-${i}.local`,
          role_hint: "device" as const,
          source_kind: "discovery_inventory" as const,
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

  describe("TopologyMode — V1AM Link Fact Pipeline projection (UI)", () => {
    it("renders projected edges line when nodes exist with zero facts", () => {
      const view = makeView({
        nodeCount: 3,
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
              device_record_id: "rec-1",
              hostname: "router-01.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
            {
              id: "node-2",
              label: "router-02",
              vendor: "juniper",
              platform_id: "MX960",
              layer: "core",
              device_record_id: "rec-2",
              hostname: "router-02.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
            {
              id: "node-3",
              label: "switch-01",
              vendor: "cisco",
              platform_id: "Catalyst 9300",
              layer: "aggregation",
              device_record_id: "rec-3",
              hostname: "switch-01.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
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
      const projectedEdgesElement = screen.getByTestId("tm-projected-edges");
      expect(projectedEdgesElement).toBeInTheDocument();
      expect(projectedEdgesElement).toHaveTextContent("0 adjacency facts");
    });

    it("renders projected edges count when facts present", () => {
      const readiness = {
        eligible_node_count: 2,
        fact_source_state: "partial" as const,
        fact_sources: [
          {
            kind: "lldp" as const,
            present: true,
            count: 1,
            note: "1 fact ingested",
          },
          {
            kind: "cdp" as const,
            present: false,
            count: 0,
            note: "CDP fact ingestion not implemented",
          },
          {
            kind: "config_neighbor" as const,
            present: false,
            count: 0,
            note: "Parser-derived neighbor facts not implemented",
          },
          {
            kind: "manual" as const,
            present: false,
            count: 0,
            note: "Manual adjacency entry surface not built",
          },
        ],
        accepted_kinds: ["lldp", "cdp", "config_neighbor", "manual"],
        reason: "1 adjacency fact source connected — edges available",
      };
      const view = makeView({
        nodeCount: 2,
        edgeCount: 1,
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
              device_record_id: "rec-1",
              hostname: "router-01.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
            {
              id: "node-2",
              label: "router-02",
              vendor: "juniper",
              platform_id: "MX960",
              layer: "core",
              device_record_id: "rec-2",
              hostname: "router-02.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
          ],
          edges: [
            {
              id: "edge-1-2",
              source_node_id: "node-1",
              target_node_id: "node-2",
              kind: "lldp",
              confidence: null,
              source: "discovery_inventory",
              local_interface: "Gi0/1",
              remote_interface: "Gi0/2",
              evidence: ["lldp neighbor table row"],
            },
          ],
          summary: {
            environment_id: "env-core-eu1",
            node_count: 2,
            edge_count: 1,
            source_record_count: 2,
          },
          message: "ok",
          adjacency_readiness: readiness,
        },
      });
      render(<TopologyMode topology={view} />);
      const projectedEdgesElement = screen.getByTestId("tm-projected-edges");
      expect(projectedEdgesElement).toBeInTheDocument();
      expect(projectedEdgesElement).toHaveTextContent("1");
      expect(projectedEdgesElement).toHaveTextContent("1 adjacency fact");
    });

    it("lldp source row shows count when present", () => {
      const readiness = {
        eligible_node_count: 2,
        fact_source_state: "partial" as const,
        fact_sources: [
          {
            kind: "lldp" as const,
            present: true,
            count: 3,
            note: "3 facts ingested",
          },
          {
            kind: "cdp" as const,
            present: false,
            count: 0,
            note: "CDP fact ingestion not implemented",
          },
          {
            kind: "config_neighbor" as const,
            present: false,
            count: 0,
            note: "Parser-derived neighbor facts not implemented",
          },
          {
            kind: "manual" as const,
            present: false,
            count: 0,
            note: "Manual adjacency entry surface not built",
          },
        ],
        accepted_kinds: ["lldp", "cdp", "config_neighbor", "manual"],
        reason: "1 adjacency fact source connected — partial coverage",
      };
      const view = makeView({
        nodeCount: 2,
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
              device_record_id: "rec-1",
              hostname: "router-01.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
            {
              id: "node-2",
              label: "router-02",
              vendor: "juniper",
              platform_id: "MX960",
              layer: "core",
              device_record_id: "rec-2",
              hostname: "router-02.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
          ],
          edges: [],
          summary: {
            environment_id: "env-core-eu1",
            node_count: 2,
            edge_count: 0,
            source_record_count: 2,
          },
          message: "ok",
          adjacency_readiness: readiness,
        },
      });
      render(<TopologyMode topology={view} />);
      const lldpRow = screen.getByTestId("tm-adjacency-source-lldp");
      expect(within(lldpRow).getByText("3")).toBeInTheDocument();
      expect(within(lldpRow).getByText("connected")).toBeInTheDocument();
    });

    it("state label flips to partial when one source present", () => {
      const readiness = {
        eligible_node_count: 2,
        fact_source_state: "partial" as const,
        fact_sources: [
          {
            kind: "lldp" as const,
            present: true,
            count: 1,
            note: "1 fact ingested",
          },
          {
            kind: "cdp" as const,
            present: false,
            count: 0,
            note: "CDP fact ingestion not implemented",
          },
          {
            kind: "config_neighbor" as const,
            present: false,
            count: 0,
            note: "Parser-derived neighbor facts not implemented",
          },
          {
            kind: "manual" as const,
            present: false,
            count: 0,
            note: "Manual adjacency entry surface not built",
          },
        ],
        accepted_kinds: ["lldp", "cdp", "config_neighbor", "manual"],
        reason: "1 adjacency fact source connected — partial coverage",
      };
      const view = makeView({
        nodeCount: 2,
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
              device_record_id: "rec-1",
              hostname: "router-01.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
            {
              id: "node-2",
              label: "router-02",
              vendor: "juniper",
              platform_id: "MX960",
              layer: "core",
              device_record_id: "rec-2",
              hostname: "router-02.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
          ],
          edges: [],
          summary: {
            environment_id: "env-core-eu1",
            node_count: 2,
            edge_count: 0,
            source_record_count: 2,
          },
          message: "ok",
          adjacency_readiness: readiness,
        },
      });
      render(<TopologyMode topology={view} />);
      expect(
        screen.getByText(/Adjacency readiness · partial coverage/)
      ).toBeInTheDocument();
    });

    it("state label reads ready when all four sources present", () => {
      const readiness = {
        eligible_node_count: 2,
        fact_source_state: "ready" as const,
        fact_sources: [
          {
            kind: "lldp" as const,
            present: true,
            count: 2,
            note: "2 facts ingested",
          },
          {
            kind: "cdp" as const,
            present: true,
            count: 1,
            note: "1 fact ingested",
          },
          {
            kind: "config_neighbor" as const,
            present: true,
            count: 1,
            note: "1 fact ingested",
          },
          {
            kind: "manual" as const,
            present: true,
            count: 0,
            note: "ready to accept",
          },
        ],
        accepted_kinds: ["lldp", "cdp", "config_neighbor", "manual"],
        reason: "4 adjacency fact sources connected — ready",
      };
      const view = makeView({
        nodeCount: 2,
        edgeCount: 4,
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
              device_record_id: "rec-1",
              hostname: "router-01.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
            {
              id: "node-2",
              label: "router-02",
              vendor: "juniper",
              platform_id: "MX960",
              layer: "core",
              device_record_id: "rec-2",
              hostname: "router-02.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
          ],
          edges: [],
          summary: {
            environment_id: "env-core-eu1",
            node_count: 2,
            edge_count: 4,
            source_record_count: 2,
          },
          message: "ok",
          adjacency_readiness: readiness,
        },
      });
      render(<TopologyMode topology={view} />);
      expect(screen.getByText(/Adjacency readiness · ready/)).toBeInTheDocument();
    });

    it("edge metadata renders if exposed", () => {
      const readiness = {
        eligible_node_count: 2,
        fact_source_state: "partial" as const,
        fact_sources: [
          {
            kind: "lldp" as const,
            present: true,
            count: 1,
            note: "1 fact ingested",
          },
          {
            kind: "cdp" as const,
            present: false,
            count: 0,
            note: "CDP fact ingestion not implemented",
          },
          {
            kind: "config_neighbor" as const,
            present: false,
            count: 0,
            note: "Parser-derived neighbor facts not implemented",
          },
          {
            kind: "manual" as const,
            present: false,
            count: 0,
            note: "Manual adjacency entry surface not built",
          },
        ],
        accepted_kinds: ["lldp", "cdp", "config_neighbor", "manual"],
        reason: "1 adjacency fact source connected — edges available",
      };
      const view = makeView({
        nodeCount: 2,
        edgeCount: 1,
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
              device_record_id: "rec-1",
              hostname: "router-01.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
            {
              id: "node-2",
              label: "router-02",
              vendor: "juniper",
              platform_id: "MX960",
              layer: "core",
              device_record_id: "rec-2",
              hostname: "router-02.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
          ],
          edges: [
            {
              id: "edge-1-2",
              source_node_id: "node-1",
              target_node_id: "node-2",
              kind: "lldp",
              confidence: null,
              source: "discovery_inventory",
              local_interface: "Gi0/1",
              remote_interface: "Gi0/2",
              evidence: ["lldp neighbor table row"],
            },
          ],
          summary: {
            environment_id: "env-core-eu1",
            node_count: 2,
            edge_count: 1,
            source_record_count: 2,
          },
          message: "ok",
          adjacency_readiness: readiness,
        },
      });
      render(<TopologyMode topology={view} />);
      const projectedEdgesElement = screen.getByTestId("tm-projected-edges");
      expect(projectedEdgesElement).toBeInTheDocument();
      expect(projectedEdgesElement).toHaveTextContent("1");
    });

    it("does not invent facts when sources empty", () => {
      const readiness = {
        eligible_node_count: 2,
        fact_source_state: "none_available" as const,
        fact_sources: [
          {
            kind: "lldp" as const,
            present: false,
            count: 0,
            note: "LLDP fact ingestion not implemented",
          },
          {
            kind: "cdp" as const,
            present: false,
            count: 0,
            note: "CDP fact ingestion not implemented",
          },
          {
            kind: "config_neighbor" as const,
            present: false,
            count: 0,
            note: "Parser-derived neighbor facts not implemented",
          },
          {
            kind: "manual" as const,
            present: false,
            count: 0,
            note: "Manual adjacency entry surface not built",
          },
        ],
        accepted_kinds: ["lldp", "cdp", "config_neighbor", "manual"],
        reason: "no adjacency fact sources connected — edges remain empty",
      };
      const view = makeView({
        nodeCount: 2,
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
              device_record_id: "rec-1",
              hostname: "router-01.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
            {
              id: "node-2",
              label: "router-02",
              vendor: "juniper",
              platform_id: "MX960",
              layer: "core",
              device_record_id: "rec-2",
              hostname: "router-02.local",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
          ],
          edges: [],
          summary: {
            environment_id: "env-core-eu1",
            node_count: 2,
            edge_count: 0,
            source_record_count: 2,
          },
          message: "ok",
          adjacency_readiness: readiness,
        },
      });
      render(<TopologyMode topology={view} />);
      const adjacencyTable = screen.getByTestId("tm-adjacency-table");
      const counts = within(adjacencyTable).getAllByText("—");
      expect(counts.length).toBeGreaterThan(0);
    });
  });
});
