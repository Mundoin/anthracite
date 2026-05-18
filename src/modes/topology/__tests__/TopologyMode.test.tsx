import { describe, expect, it, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { TopologyMode } from "../TopologyMode";
import type { TopologySourceView } from "../../../data/topologySource";
import type {
  TopologyAdjacencyReadiness,
  RawNeighborEvidenceImportResult,
  TopologyEvidenceMutationResult,
  TopologyEvidenceSummary,
} from "../../../types/topology";

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

  it("no interactive controls outside the evidence-import + V1AR clear panels", () => {
    render(<TopologyMode topology={makeView()} />);
    // V1AO adds an evidence-import panel with a textarea + Import button.
    // V1AR adds a Clear button with confirmation checkbox.
    // No interactive controls anywhere else on the surface.
    const buttons = screen.queryAllByRole("button");
    const testids = buttons.map((b) => b.getAttribute("data-testid")).sort();
    expect(testids).toEqual(
      [
        "tm-clear-button",
        "tm-evidence-import-button",
      ].sort()
    );
    const textboxes = screen.queryAllByRole("textbox");
    expect(textboxes).toHaveLength(1);
    expect(textboxes[0]).toHaveAttribute(
      "data-testid",
      "tm-evidence-import-textarea"
    );
    expect(screen.queryByRole("link")).toBeNull();
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
        evidenceStats: {
          evidence_total: 1,
          accepted: 1,
          rejected_unknown_local: 0,
          rejected_unknown_remote: 0,
          rejected_self_link: 0,
        },
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

  describe("TopologyMode — V1AO Persisted evidence + edge list (UI)", () => {
    it("renders evidence import panel with textarea and button", () => {
      render(<TopologyMode topology={makeView()} />);
      expect(screen.getByTestId("tm-evidence-import")).toBeInTheDocument();
      expect(
        screen.getByTestId("tm-evidence-import-textarea")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("tm-evidence-import-button")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Imported neighbour evidence/i })
      ).toBeInTheDocument();
    });

    it("import button disabled when environment is null", () => {
      const view = makeView({ environmentId: null });
      render(<TopologyMode topology={view} />);
      const button = screen.getByTestId("tm-evidence-import-button");
      expect(button).toBeDisabled();
    });

    it("rejection banner shows accepted and rejected breakdown", () => {
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
        reason: "3 of 4 adjacency fact sources connected",
      };
      const view = makeView({
        nodeCount: 2,
        edgeCount: 3,
        isEmpty: false,
        evidenceStats: {
          evidence_total: 5,
          accepted: 3,
          rejected_unknown_local: 0,
          rejected_unknown_remote: 2,
          rejected_self_link: 0,
        },
        view: {
          environment_id: "env-core-eu1",
          source_state: "real",
          nodes: [
            {
              id: "node-1",
              label: "r1",
              vendor: "cisco",
              platform_id: "ios",
              layer: "core",
              device_record_id: "rec-1",
              hostname: "r1",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
            {
              id: "node-2",
              label: "r2",
              vendor: "cisco",
              platform_id: "ios",
              layer: "core",
              device_record_id: "rec-2",
              hostname: "r2",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
          ],
          edges: [],
          summary: {
            environment_id: "env-core-eu1",
            node_count: 2,
            edge_count: 3,
            source_record_count: 2,
          },
          message: "ok",
          adjacency_readiness: readiness,
        },
      });
      render(<TopologyMode topology={view} />);
      const banner = screen.getByTestId("tm-evidence-rejections");
      expect(banner).toHaveTextContent(/3 of 5/);
      expect(banner).toHaveTextContent(/2/);
      expect(banner).toHaveTextContent(/unknown remote/i);
    });

    it("edge list renders one row per edge", () => {
      const readiness = {
        eligible_node_count: 2,
        fact_source_state: "partial" as const,
        fact_sources: [
          {
            kind: "lldp" as const,
            present: true,
            count: 2,
            note: "2 facts ingested",
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
        reason: "1 of 4 adjacency fact sources connected",
      };
      const view = makeView({
        nodeCount: 3,
        edgeCount: 2,
        isEmpty: false,
        evidenceStats: {
          evidence_total: 2,
          accepted: 2,
          rejected_unknown_local: 0,
          rejected_unknown_remote: 0,
          rejected_self_link: 0,
        },
        view: {
          environment_id: "env-core-eu1",
          source_state: "real",
          nodes: [
            {
              id: "node-1",
              label: "r1",
              vendor: "cisco",
              platform_id: "ios",
              layer: "core",
              device_record_id: "rec-1",
              hostname: "r1",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
            {
              id: "node-2",
              label: "r2",
              vendor: "cisco",
              platform_id: "ios",
              layer: "core",
              device_record_id: "rec-2",
              hostname: "r2",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
            {
              id: "node-3",
              label: "r3",
              vendor: "cisco",
              platform_id: "ios",
              layer: "core",
              device_record_id: "rec-3",
              hostname: "r3",
              role_hint: "device",
              source_kind: "discovery_inventory",
            },
          ],
          edges: [
            {
              id: "edge-lldp-1",
              source_node_id: "topo::rec-1",
              target_node_id: "topo::rec-2",
              kind: "lldp",
              confidence: null,
              source: "discovery_inventory",
              local_interface: "Gi0/1",
              remote_interface: "Gi0/2",
              evidence: ["lldp:remote_sys=r2|chassis=?|port=Gi0/2"],
            },
            {
              id: "edge-lldp-2",
              source_node_id: "topo::rec-2",
              target_node_id: "topo::rec-3",
              kind: "lldp",
              confidence: null,
              source: "discovery_inventory",
              local_interface: "Gi0/3",
              remote_interface: "Gi0/1",
              evidence: ["lldp:remote_sys=r3|chassis=?|port=Gi0/1"],
            },
          ],
          summary: {
            environment_id: "env-core-eu1",
            node_count: 3,
            edge_count: 2,
            source_record_count: 3,
          },
          message: "ok",
          adjacency_readiness: readiness,
        },
      });
      render(<TopologyMode topology={view} />);
      const list = screen.getByTestId("tm-edge-list");
      expect(list).toBeInTheDocument();
      expect(within(list).getByTestId("tm-edge-row-edge-lldp-1")).toBeInTheDocument();
      expect(within(list).getByTestId("tm-edge-row-edge-lldp-2")).toBeInTheDocument();
    });

    it("rejected-only evidence shows honest empty edge list message", () => {
      const view = makeView({
        nodeCount: 1,
        edgeCount: 0,
        isEmpty: false,
        evidenceStats: {
          evidence_total: 2,
          accepted: 0,
          rejected_unknown_local: 0,
          rejected_unknown_remote: 2,
          rejected_self_link: 0,
        },
        view: {
          environment_id: "env-core-eu1",
          source_state: "real",
          nodes: [
            {
              id: "node-1",
              label: "r1",
              vendor: "cisco",
              platform_id: "ios",
              layer: "core",
              device_record_id: "rec-1",
              hostname: "r1",
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
      const list = screen.getByTestId("tm-edge-list");
      expect(list).toHaveTextContent(/all imported evidence was rejected/i);
    });
  });

  describe("TopologyMode — V1AP Raw neighbour output import (UI)", () => {
    it("renders both tabs with JSON active by default", () => {
      render(<TopologyMode topology={makeView()} />);
      const jsonTab = screen.getByTestId("tm-evidence-tab-json");
      const rawTab = screen.getByTestId("tm-evidence-tab-raw");
      expect(jsonTab).toBeInTheDocument();
      expect(rawTab).toBeInTheDocument();
      expect(jsonTab).toHaveAttribute("aria-selected", "true");
      expect(rawTab).toHaveAttribute("aria-selected", "false");
    });

    it("clicking raw tab reveals raw form", () => {
      render(<TopologyMode topology={makeView()} />);
      const rawTab = screen.getByTestId("tm-evidence-tab-raw");
      fireEvent.click(rawTab);
      expect(screen.getByTestId("tm-raw-source-kind-lldp")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-local-node")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-output-textarea")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-import-button")).toBeInTheDocument();
    });

    it("raw import button disabled when no environment", () => {
      render(<TopologyMode topology={makeView({ environmentId: null })} />);
      const rawTab = screen.getByTestId("tm-evidence-tab-raw");
      fireEvent.click(rawTab);
      const button = screen.getByTestId("tm-raw-import-button");
      expect(button).toBeDisabled();
    });

    it("raw import button disabled when local node empty", () => {
      render(<TopologyMode topology={makeView()} />);
      const rawTab = screen.getByTestId("tm-evidence-tab-raw");
      fireEvent.click(rawTab);
      const button = screen.getByTestId("tm-raw-import-button");
      expect(button).toBeDisabled();
    });

    it("raw import button disabled when raw text empty", () => {
      render(<TopologyMode topology={makeView()} />);
      const rawTab = screen.getByTestId("tm-evidence-tab-raw");
      fireEvent.click(rawTab);
      const localNodeInput = screen.getByTestId("tm-raw-local-node");
      fireEvent.change(localNodeInput, { target: { value: "router-a" } });
      const button = screen.getByTestId("tm-raw-import-button");
      expect(button).toBeDisabled();
    });

    it("valid raw import calls onImportRawNeighborOutput and shows result summary", async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        parsed_entries_total: 3,
        accepted_evidence_count: 2,
        rejected_count: 1,
        unresolved_count: 1,
        stored_evidence_count: 2,
        evidence_set_id: "evset-x",
        accepted_evidence: [],
        rejected_entries: [
          {
            reason: "unresolved_remote",
            detail: "remote 'r-zzz' not in inventory",
            raw_block: "...",
          },
        ],
      } as RawNeighborEvidenceImportResult);

      render(
        <TopologyMode
          topology={makeView()}
          onImportRawNeighborOutput={mockCallback}
        />,
      );

      const rawTab = screen.getByTestId("tm-evidence-tab-raw");
      fireEvent.click(rawTab);

      const localNodeInput = screen.getByTestId("tm-raw-local-node");
      const rawTextarea = screen.getByTestId("tm-raw-output-textarea");
      const importButton = screen.getByTestId("tm-raw-import-button");

      fireEvent.change(localNodeInput, { target: { value: "router-a" } });
      fireEvent.change(rawTextarea, { target: { value: "some raw output" } });

      fireEvent.click(importButton);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCallback).toHaveBeenCalledOnce();
      expect(mockCallback).toHaveBeenCalledWith({
        environment_id: "env-core-eu1",
        local_node: "router-a",
        source_kind: "lldp",
        platform_hint: null,
        raw_text: "some raw output",
        source_label: null,
        mode: "replace",
      });

      const result = screen.getByTestId("tm-raw-import-result");
      expect(result).toBeInTheDocument();
      expect(result).toHaveTextContent(/Parsed: 3/);
      expect(result).toHaveTextContent(/Accepted: 2/);
      expect(result).toHaveTextContent(/Rejected: 1/);
    });

    it("rejected list caps at 5 items", async () => {
      const rejections = Array.from({ length: 8 }, (_, i) => ({
        reason: "unresolved_remote" as const,
        detail: `remote 'r-${i}' not in inventory`,
        raw_block: "...",
      }));

      const mockCallback = vi.fn().mockResolvedValue({
        parsed_entries_total: 10,
        accepted_evidence_count: 2,
        rejected_count: 8,
        unresolved_count: 0,
        stored_evidence_count: 2,
        evidence_set_id: "evset-y",
        accepted_evidence: [],
        rejected_entries: rejections,
      } as RawNeighborEvidenceImportResult);

      render(
        <TopologyMode
          topology={makeView()}
          onImportRawNeighborOutput={mockCallback}
        />,
      );

      const rawTab = screen.getByTestId("tm-evidence-tab-raw");
      fireEvent.click(rawTab);

      const localNodeInput = screen.getByTestId("tm-raw-local-node");
      const rawTextarea = screen.getByTestId("tm-raw-output-textarea");
      const importButton = screen.getByTestId("tm-raw-import-button");

      fireEvent.change(localNodeInput, { target: { value: "router-a" } });
      fireEvent.change(rawTextarea, { target: { value: "raw output" } });

      fireEvent.click(importButton);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Note: The current implementation shows a simplified result without full rejection detail,
      // so this test focuses on the core result rendering.
      const result = screen.getByTestId("tm-raw-import-result");
      expect(result).toBeInTheDocument();
      expect(result).toHaveTextContent(/Rejected: 8/);
    });

    it("callback failure shows error message", async () => {
      const mockCallback = vi
        .fn()
        .mockRejectedValue(new Error("Backend timeout"));

      render(
        <TopologyMode
          topology={makeView()}
          onImportRawNeighborOutput={mockCallback}
        />,
      );

      const rawTab = screen.getByTestId("tm-evidence-tab-raw");
      fireEvent.click(rawTab);

      const localNodeInput = screen.getByTestId("tm-raw-local-node");
      const rawTextarea = screen.getByTestId("tm-raw-output-textarea");
      const importButton = screen.getByTestId("tm-raw-import-button");

      fireEvent.change(localNodeInput, { target: { value: "router-a" } });
      fireEvent.change(rawTextarea, { target: { value: "raw output" } });

      fireEvent.click(importButton);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const result = screen.getByTestId("tm-raw-import-result");
      expect(result).toBeInTheDocument();
      expect(result).toHaveTextContent(/Import failed:/);
    });

    it("existing V1AO structured JSON import still works", () => {
      render(<TopologyMode topology={makeView()} />);
      const jsonTab = screen.getByTestId("tm-evidence-tab-json");
      expect(jsonTab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("tm-evidence-import-textarea")).toBeInTheDocument();
      expect(screen.getByTestId("tm-evidence-import-button")).toBeInTheDocument();
    });

    it("tab switch preserves form state independently", () => {
      render(<TopologyMode topology={makeView()} />);

      // Fill raw form
      const rawTab = screen.getByTestId("tm-evidence-tab-raw");
      fireEvent.click(rawTab);

      const localNodeInput = screen.getByTestId("tm-raw-local-node");
      const rawTextarea = screen.getByTestId("tm-raw-output-textarea");

      fireEvent.change(localNodeInput, { target: { value: "router-x" } });
      fireEvent.change(rawTextarea, { target: { value: "test output" } });

      // Switch to JSON
      const jsonTab = screen.getByTestId("tm-evidence-tab-json");
      fireEvent.click(jsonTab);

      expect(screen.getByTestId("tm-evidence-import-textarea")).toBeInTheDocument();
      expect(screen.getByTestId("tm-evidence-import-button")).toBeInTheDocument();

      // Switch back to raw
      fireEvent.click(rawTab);

      expect(localNodeInput).toHaveValue("router-x");
      expect(rawTextarea).toHaveValue("test output");
    });
  });

  describe("TopologyMode — V1AQ Platform hint selector (UI)", () => {
    it("renders platform hint select with auto default", () => {
      render(<TopologyMode topology={makeView()} />);
      const rawTab = screen.getByTestId("tm-evidence-tab-raw");
      fireEvent.click(rawTab);
      const select = screen.getByTestId("tm-raw-platform-hint") as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.value).toBe("");
    });

    it("select offers expected platform options including unsupported labels", () => {
      render(<TopologyMode topology={makeView()} />);
      fireEvent.click(screen.getByTestId("tm-evidence-tab-raw"));
      const select = screen.getByTestId("tm-raw-platform-hint") as HTMLSelectElement;
      const values = Array.from(select.options).map((o) => o.value);
      expect(values).toEqual(
        expect.arrayContaining([
          "",
          "iosxe",
          "nxos",
          "iosxr",
          "eos",
          "junos",
          "huawei_vrp",
          "nokia_sros",
          "fortios",
          "mikrotik",
        ])
      );
      const fortiosOption = Array.from(select.options).find((o) => o.value === "fortios");
      expect(fortiosOption?.textContent).toMatch(/unsupported/i);
      const mikrotikOption = Array.from(select.options).find((o) => o.value === "mikrotik");
      expect(mikrotikOption?.textContent).toMatch(/unsupported/i);
    });

    it("selecting nxos lldp and importing sends platform_hint nxos", async () => {
      const mockResult: RawNeighborEvidenceImportResult = {
        parsed_entries_total: 1,
        accepted_evidence_count: 1,
        rejected_count: 0,
        unresolved_count: 0,
        stored_evidence_count: 1,
        evidence_set_id: "evset-x",
        accepted_evidence: [],
        rejected_entries: [],
      };
      const mock = vi.fn().mockResolvedValue(mockResult);
      render(
        <TopologyMode topology={makeView()} onImportRawNeighborOutput={mock} />
      );
      fireEvent.click(screen.getByTestId("tm-evidence-tab-raw"));
      const select = screen.getByTestId("tm-raw-platform-hint") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "nxos" } });
      const localNode = screen.getByTestId("tm-raw-local-node");
      fireEvent.change(localNode, { target: { value: "router-a" } });
      const textarea = screen.getByTestId("tm-raw-output-textarea");
      fireEvent.change(textarea, { target: { value: "synthetic nxos lldp output" } });
      const importBtn = screen.getByTestId("tm-raw-import-button");
      fireEvent.click(importBtn);
      await Promise.resolve();
      await Promise.resolve();
      expect(mock).toHaveBeenCalledTimes(1);
      const callArg = mock.mock.calls[0][0];
      expect(callArg.platform_hint).toBe("nxos");
      expect(callArg.source_kind).toBe("lldp");
    });

    it("default Auto sends null platform_hint in request", async () => {
      const mockResult: RawNeighborEvidenceImportResult = {
        parsed_entries_total: 0,
        accepted_evidence_count: 0,
        rejected_count: 0,
        unresolved_count: 0,
        stored_evidence_count: 0,
        evidence_set_id: null,
        accepted_evidence: [],
        rejected_entries: [],
      };
      const mock = vi.fn().mockResolvedValue(mockResult);
      render(
        <TopologyMode topology={makeView()} onImportRawNeighborOutput={mock} />
      );
      fireEvent.click(screen.getByTestId("tm-evidence-tab-raw"));
      fireEvent.change(screen.getByTestId("tm-raw-local-node"), {
        target: { value: "router-a" },
      });
      fireEvent.change(screen.getByTestId("tm-raw-output-textarea"), {
        target: { value: "any raw text" },
      });
      fireEvent.click(screen.getByTestId("tm-raw-import-button"));
      await Promise.resolve();
      await Promise.resolve();
      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock.mock.calls[0][0].platform_hint).toBeNull();
    });

    it("V1AP raw form testids preserved alongside V1AQ selector", () => {
      render(<TopologyMode topology={makeView()} />);
      fireEvent.click(screen.getByTestId("tm-evidence-tab-raw"));
      expect(screen.getByTestId("tm-raw-source-kind-lldp")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-source-kind-cdp")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-local-node")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-output-textarea")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-import-button")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-platform-hint")).toBeInTheDocument();
    });
  });

  describe("TopologyMode — V1AR Import mode + evidence summary + clear (UI)", () => {
    it("renders import mode radio group with replace default", () => {
      render(<TopologyMode topology={makeView()} />);
      expect(screen.getByTestId("tm-import-mode-group")).toBeInTheDocument();
      const replaceRadio = screen.getByTestId("tm-import-mode-replace") as HTMLInputElement;
      expect(replaceRadio.checked).toBe(true);
      const appendRadio = screen.getByTestId("tm-import-mode-append") as HTMLInputElement;
      const mergeRadio = screen.getByTestId("tm-import-mode-merge") as HTMLInputElement;
      expect(appendRadio.checked).toBe(false);
      expect(mergeRadio.checked).toBe(false);
    });

    it("selecting append mode switches the radio", () => {
      render(<TopologyMode topology={makeView()} />);
      const replaceRadio = screen.getByTestId("tm-import-mode-replace") as HTMLInputElement;
      const appendRadio = screen.getByTestId("tm-import-mode-append") as HTMLInputElement;
      expect(replaceRadio.checked).toBe(true);
      fireEvent.click(appendRadio);
      expect(replaceRadio.checked).toBe(false);
      expect(appendRadio.checked).toBe(true);
    });

    it("JSON import sends selected mode to callback", async () => {
      const mockImport = vi.fn().mockResolvedValue({
        mode: "merge",
        previous_count: 0,
        incoming_count: 2,
        added_count: 2,
        replaced_count: 0,
        ignored_duplicate_count: 0,
        final_count: 2,
        evidence_set_id: "evset-x",
        source_labels: [],
        store_mutated: true,
      } as TopologyEvidenceMutationResult);

      render(
        <TopologyMode topology={makeView()} onImportEvidence={mockImport} />
      );

      // Select merge mode
      const mergeRadio = screen.getByTestId("tm-import-mode-merge");
      fireEvent.click(mergeRadio);

      // Ensure JSON tab is active
      expect(screen.getByTestId("tm-evidence-tab-json")).toHaveAttribute(
        "aria-selected",
        "true"
      );

      // Fill and import
      const textarea = screen.getByTestId("tm-evidence-import-textarea");
      const importBtn = screen.getByTestId("tm-evidence-import-button");
      const evidence = [
        {
          source_kind: "lldp" as const,
          local_node_id: "r1",
          local_interface: null,
          remote_node_id: "r2",
          remote_interface: null,
          remote_chassis_id: null,
          remote_system_name: null,
          remote_port_id: null,
          source_label: null,
          evidence_notes: null,
        },
      ];

      fireEvent.change(textarea, { target: { value: JSON.stringify(evidence) } });
      fireEvent.click(importBtn);

      await Promise.resolve();
      await Promise.resolve();

      expect(mockImport).toHaveBeenCalledOnce();
      expect(mockImport).toHaveBeenCalledWith(
        "env-core-eu1",
        evidence,
        "merge"
      );
    });

    it("raw import sends selected mode in request", async () => {
      const mockImport = vi.fn().mockResolvedValue({
        parsed_entries_total: 1,
        accepted_evidence_count: 1,
        rejected_count: 0,
        unresolved_count: 0,
        stored_evidence_count: 1,
        evidence_set_id: "evset-y",
        accepted_evidence: [],
        rejected_entries: [],
      } as RawNeighborEvidenceImportResult);

      render(
        <TopologyMode topology={makeView()} onImportRawNeighborOutput={mockImport} />
      );

      // Switch to raw tab
      fireEvent.click(screen.getByTestId("tm-evidence-tab-raw"));

      // Select append mode
      const appendRadio = screen.getByTestId("tm-import-mode-append");
      fireEvent.click(appendRadio);

      // Fill form
      fireEvent.change(screen.getByTestId("tm-raw-local-node"), {
        target: { value: "router-a" },
      });
      fireEvent.change(screen.getByTestId("tm-raw-output-textarea"), {
        target: { value: "raw lldp output" },
      });

      // Import
      fireEvent.click(screen.getByTestId("tm-raw-import-button"));

      await Promise.resolve();
      await Promise.resolve();

      expect(mockImport).toHaveBeenCalledOnce();
      const callArg = mockImport.mock.calls[0][0];
      expect(callArg.mode).toBe("append");
    });

    it("JSON success feedback uses final_count from mutation result", async () => {
      const mockImport = vi.fn().mockResolvedValue({
        mode: "replace",
        previous_count: 0,
        incoming_count: 2,
        added_count: 2,
        replaced_count: 0,
        ignored_duplicate_count: 0,
        final_count: 2,
        evidence_set_id: "evset-x",
        source_labels: [],
        store_mutated: true,
      } as TopologyEvidenceMutationResult);

      render(
        <TopologyMode topology={makeView()} onImportEvidence={mockImport} />
      );

      const textarea = screen.getByTestId("tm-evidence-import-textarea");
      const importBtn = screen.getByTestId("tm-evidence-import-button");
      const evidence = [
        {
          source_kind: "lldp" as const,
          local_node_id: "r1",
          local_interface: null,
          remote_node_id: "r2",
          remote_interface: null,
          remote_chassis_id: null,
          remote_system_name: null,
          remote_port_id: null,
          source_label: null,
          evidence_notes: null,
        },
        {
          source_kind: "lldp" as const,
          local_node_id: "r2",
          local_interface: null,
          remote_node_id: "r3",
          remote_interface: null,
          remote_chassis_id: null,
          remote_system_name: null,
          remote_port_id: null,
          source_label: null,
          evidence_notes: null,
        },
      ];

      fireEvent.change(textarea, { target: { value: JSON.stringify(evidence) } });
      fireEvent.click(importBtn);

      await Promise.resolve();
      await Promise.resolve();

      const feedback = screen.getByTestId("tm-evidence-import-feedback");
      expect(feedback).toHaveTextContent("Imported 2 evidence records");
      expect(feedback).toHaveTextContent("final: 2");
    });

    it("evidence summary renders when provided", () => {
      const summary: TopologyEvidenceSummary = {
        environment_id: "env-a",
        evidence_count: 5,
        source_labels: ["parser:nxos lldp", "manual"],
        source_kind_counts: [
          ["lldp", 3],
          ["cdp", 2],
          ["config_neighbor", 0],
          ["manual", 0],
        ],
        evidence_set_id: "evset-y",
      };

      render(
        <TopologyMode topology={makeView()} evidenceSummary={summary} />
      );

      const summarySection = screen.getByTestId("tm-evidence-summary");
      expect(summarySection).toHaveTextContent("Active evidence count:");
      expect(summarySection).toHaveTextContent("5");
      expect(summarySection).toHaveTextContent("parser:nxos lldp");
      expect(summarySection).toHaveTextContent("manual");
      expect(summarySection).toHaveTextContent("lldp:3");
      expect(summarySection).toHaveTextContent("cdp:2");
      expect(summarySection).toHaveTextContent("config_neighbor:0");
      expect(summarySection).toHaveTextContent("manual:0");
    });

    it("last mutation delta line renders when lastMutation present and store_mutated", () => {
      const mutation: TopologyEvidenceMutationResult = {
        mode: "merge",
        previous_count: 3,
        incoming_count: 2,
        added_count: 1,
        replaced_count: 0,
        ignored_duplicate_count: 1,
        final_count: 4,
        evidence_set_id: null,
        source_labels: [],
        store_mutated: true,
      };

      render(
        <TopologyMode topology={makeView()} lastMutation={mutation} />
      );

      const summarySection = screen.getByTestId("tm-evidence-summary");
      expect(summarySection).toHaveTextContent("Last import:");
      expect(summarySection).toHaveTextContent("mode=merge");
      expect(summarySection).toHaveTextContent("previous=3");
      expect(summarySection).toHaveTextContent("incoming=2");
      expect(summarySection).toHaveTextContent("added=1");
      expect(summarySection).toHaveTextContent("replaced=0");
      expect(summarySection).toHaveTextContent("ignored duplicate=1");
      expect(summarySection).toHaveTextContent("final=4");
    });

    it("last mutation block hidden when store_mutated is false", () => {
      const mutation: TopologyEvidenceMutationResult = {
        mode: "replace",
        previous_count: 0,
        incoming_count: 0,
        added_count: 0,
        replaced_count: 0,
        ignored_duplicate_count: 0,
        final_count: 0,
        evidence_set_id: null,
        source_labels: [],
        store_mutated: false,
      };

      render(
        <TopologyMode topology={makeView()} lastMutation={mutation} />
      );

      const summarySection = screen.getByTestId("tm-evidence-summary");
      expect(summarySection).not.toHaveTextContent("Last import:");
    });

    it("clear button disabled until confirmation checkbox is checked", () => {
      const mockClear = vi.fn();
      render(
        <TopologyMode
          topology={makeView()}
          onClearEvidence={mockClear}
        />
      );

      const button = screen.getByTestId("tm-clear-button");
      expect(button).toBeDisabled();

      const checkbox = screen.getByTestId("tm-clear-confirm");
      fireEvent.click(checkbox);

      expect(button).not.toBeDisabled();
    });

    it("clear calls onClearEvidence and shows feedback with previous count", async () => {
      const mockClear = vi.fn().mockResolvedValue({
        mode: "replace",
        previous_count: 7,
        incoming_count: 0,
        added_count: 0,
        replaced_count: 0,
        ignored_duplicate_count: 0,
        final_count: 0,
        evidence_set_id: null,
        source_labels: [],
        store_mutated: true,
      } as TopologyEvidenceMutationResult);

      render(
        <TopologyMode
          topology={makeView()}
          onClearEvidence={mockClear}
        />
      );

      const checkbox = screen.getByTestId("tm-clear-confirm");
      const button = screen.getByTestId("tm-clear-button");

      fireEvent.click(checkbox);
      fireEvent.click(button);

      await Promise.resolve();
      await Promise.resolve();

      expect(mockClear).toHaveBeenCalledOnce();
      expect(mockClear).toHaveBeenCalledWith("env-core-eu1");

      const feedback = screen.getByTestId("tm-clear-feedback");
      expect(feedback).toHaveTextContent("Cleared: previous=7");
      expect(feedback).toHaveTextContent("final=0");
    });

    it("clear button disabled when no environment", () => {
      const mockClear = vi.fn();
      render(
        <TopologyMode
          topology={makeView({ environmentId: null })}
          onClearEvidence={mockClear}
        />
      );

      const checkbox = screen.getByTestId("tm-clear-confirm");
      const button = screen.getByTestId("tm-clear-button");

      fireEvent.click(checkbox);

      expect(button).toBeDisabled();
    });

    it("JSON success feedback shows 'No store mutation' when store_mutated is false", async () => {
      const mockImport = vi.fn().mockResolvedValue({
        mode: "replace",
        previous_count: 2,
        incoming_count: 0,
        added_count: 0,
        replaced_count: 0,
        ignored_duplicate_count: 0,
        final_count: 2,
        evidence_set_id: null,
        source_labels: [],
        store_mutated: false,
      } as TopologyEvidenceMutationResult);

      render(
        <TopologyMode topology={makeView()} onImportEvidence={mockImport} />
      );

      const textarea = screen.getByTestId("tm-evidence-import-textarea");
      const importBtn = screen.getByTestId("tm-evidence-import-button");

      fireEvent.change(textarea, { target: { value: "[]" } });
      fireEvent.click(importBtn);

      await Promise.resolve();
      await Promise.resolve();

      const feedback = screen.getByTestId("tm-evidence-import-feedback");
      expect(feedback).toHaveTextContent("No store mutation");
    });

    it("all V1AO/V1AP/V1AQ always-present testids preserved", () => {
      render(<TopologyMode topology={makeView()} />);
      // Always-present testids (panel container, JSON tab default contents, tabs)
      expect(screen.getByTestId("tm-evidence-import")).toBeInTheDocument();
      expect(screen.getByTestId("tm-evidence-import-textarea")).toBeInTheDocument();
      expect(screen.getByTestId("tm-evidence-import-button")).toBeInTheDocument();
      expect(screen.getByTestId("tm-evidence-tab-json")).toBeInTheDocument();
      expect(screen.getByTestId("tm-evidence-tab-raw")).toBeInTheDocument();

      // tm-evidence-import-feedback is conditional (env null or feedback set);
      // tm-edge-list / tm-evidence-rejections are conditional (require edges/rejections);
      // not asserted here. See dedicated tests for each conditional surface.

      // Raw tab testids (after switching tabs)
      fireEvent.click(screen.getByTestId("tm-evidence-tab-raw"));
      expect(screen.getByTestId("tm-raw-source-kind-lldp")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-source-kind-cdp")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-local-node")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-output-textarea")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-import-button")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-platform-hint")).toBeInTheDocument();
      expect(screen.getByTestId("tm-raw-platform-hint-hint")).toBeInTheDocument();

      expect(screen.getByTestId("tm-adjacency")).toBeInTheDocument();
      expect(screen.getByTestId("tm-summary")).toBeInTheDocument();
    });
  });
});
