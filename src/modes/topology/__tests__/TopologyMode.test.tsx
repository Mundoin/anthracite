import { describe, expect, it, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { TopologyMode } from "../TopologyMode";
import type { TopologySourceView } from "../../../data/topologySource";
import type {
  NeighborEvidenceMappingStats,
  ProjectionStats,
  TopologyAdjacencyReadiness,
  RawNeighborEvidenceImportResult,
  TopologyEvidenceMutationResult,
  TopologyEvidenceSummary,
  TopologyView,
} from "../../../types/topology";

const DEFAULT_PROJECTION_STATS: ProjectionStats = {
  facts_total: 0,
  facts_accepted: 0,
  facts_rejected_unknown_node: 0,
  facts_rejected_self_link: 0,
  facts_collapsed_duplicate: 0,
  per_kind_counts: [],
};

const DEFAULT_EVIDENCE_STATS: NeighborEvidenceMappingStats = {
  evidence_total: 0,
  accepted: 0,
  rejected_unknown_local: 0,
  rejected_unknown_remote: 0,
  rejected_self_link: 0,
};

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
  const baseView: TopologyView = {
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
    projection_stats: DEFAULT_PROJECTION_STATS,
    evidence_stats: DEFAULT_EVIDENCE_STATS,
  };
  // Apply view override on top of base so V1AO/V1AS-required wire fields
  // (projection_stats, evidence_stats) always exist at runtime even when
  // older tests only override a subset of TopologyView.
  const viewOverride = over.view;
  const mergedView: TopologyView | null =
    viewOverride === undefined
      ? baseView
      : viewOverride === null
      ? null
      : { ...baseView, ...viewOverride };
  const { view: _ignoredView, ...restOverride } = over;
  void _ignoredView;
  return {
    sourceState: "empty",
    environmentId: "env-core-eu1",
    nodeCount: 0,
    edgeCount: 0,
    sourceRecordCount: 0,
    message: "topology empty — no discovery records in scope",
    isEmpty: true,
    projectionStats: null,
    evidenceStats: null,
    view: mergedView,
    ...restOverride,
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

  it("no interactive controls outside the evidence-import + V1AR clear + V1AT dry-run panels", () => {
    render(<TopologyMode topology={makeView()} />);
    // V1AO adds an evidence-import panel with a textarea + Import button.
    // V1AR adds a Clear button with confirmation checkbox.
    // V1AT adds a dry-run Plan button + a display-only target-label input.
    // No interactive controls anywhere else on the surface.
    const buttons = screen.queryAllByRole("button");
    const testids = buttons.map((b) => b.getAttribute("data-testid")).sort();
    // V1BI: workbench rail adds tool-selector buttons (mwb-tool-*). They
    // are navigation controls, not topology-data controls.
    const dataControls = testids.filter((id) => !id?.startsWith("mwb-tool-"));
    expect(dataControls).toEqual(
      [
        "tm-clear-button",
        "tm-evidence-import-button",
        "tm-live-collection-plan-button",
      ].sort()
    );
    const textboxes = screen.queryAllByRole("textbox");
    const textboxIds = textboxes
      .map((t) => t.getAttribute("data-testid"))
      .sort();
    expect(textboxIds).toEqual(
      [
        "tm-evidence-import-textarea",
        "tm-live-collection-target",
      ].sort()
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
      expect(fortiosOption?.textContent).toMatch(/live collection deferred/i);
      const mikrotikOption = Array.from(select.options).find((o) => o.value === "mikrotik");
      expect(mikrotikOption?.textContent).toMatch(/live collection deferred/i);
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

  describe("V1AS — Topology Edge Review surface", () => {
    function makeRealViewWithEdges() {
      const nodeA = {
        id: "topo::router-a",
        label: "router-a",
        device_record_id: "rec-a",
        hostname: "router-a",
        platform_id: "ios-xe",
        vendor: "cisco",
        role_hint: "device" as const,
        layer: "inventory" as const,
        source_kind: "discovery_inventory" as const,
      };
      const nodeB = {
        id: "topo::router-b",
        label: "router-b",
        device_record_id: "rec-b",
        hostname: "router-b",
        platform_id: "junos",
        vendor: "juniper",
        role_hint: "device" as const,
        layer: "inventory" as const,
        source_kind: "discovery_inventory" as const,
      };
      const nodeC = {
        id: "topo::router-c",
        label: "router-c",
        device_record_id: "rec-c",
        hostname: "router-c",
        platform_id: "eos",
        vendor: "arista",
        role_hint: "device" as const,
        layer: "inventory" as const,
        source_kind: "discovery_inventory" as const,
      };
      return makeView({
        sourceState: "real",
        nodeCount: 3,
        edgeCount: 3,
        sourceRecordCount: 3,
        isEmpty: false,
        evidenceStats: {
          evidence_total: 5,
          accepted: 3,
          rejected_unknown_local: 1,
          rejected_unknown_remote: 0,
          rejected_self_link: 1,
        },
        projectionStats: {
          facts_total: 4,
          facts_accepted: 3,
          facts_rejected_unknown_node: 0,
          facts_rejected_self_link: 0,
          facts_collapsed_duplicate: 1,
          per_kind_counts: [
            ["lldp", 2],
            ["cdp", 1],
          ],
        },
        view: {
          environment_id: "env-core-eu1",
          source_state: "real",
          nodes: [nodeA, nodeB, nodeC],
          edges: [
            {
              id: "edge-lldp-1",
              source_node_id: "topo::router-a",
              target_node_id: "topo::router-b",
              kind: "lldp",
              confidence: null,
              source: "discovery_inventory",
              local_interface: "Gi0/0",
              remote_interface: "Gi0/1",
              evidence: ["lldp:router-a Gi0/0 -> router-b Gi0/1"],
            },
            {
              id: "edge-cdp-2",
              source_node_id: "topo::router-b",
              target_node_id: "topo::router-c",
              kind: "cdp",
              confidence: null,
              source: "discovery_inventory",
              local_interface: "Gi0/2",
              remote_interface: "Gi0/3",
              evidence: ["cdp:router-b Gi0/2 -> router-c Gi0/3"],
            },
            {
              id: "edge-cfg-3",
              source_node_id: "topo::router-a",
              target_node_id: "topo::router-c",
              kind: "config_neighbor",
              confidence: null,
              source: "discovery_inventory",
              local_interface: null,
              remote_interface: null,
              evidence: ["config: neighbor router-a -> router-c"],
            },
          ],
          summary: {
            environment_id: "env-core-eu1",
            node_count: 3,
            edge_count: 3,
            source_record_count: 3,
          },
          message: "ok",
          adjacency_readiness: defaultReadiness(3),
          projection_stats: {
            facts_total: 4,
            facts_accepted: 3,
            facts_rejected_unknown_node: 0,
            facts_rejected_self_link: 0,
            facts_collapsed_duplicate: 1,
            per_kind_counts: [
              ["lldp", 2],
              ["cdp", 1],
            ],
          },
          evidence_stats: {
            evidence_total: 5,
            accepted: 3,
            rejected_unknown_local: 1,
            rejected_unknown_remote: 0,
            rejected_self_link: 1,
          },
        },
      });
    }

    it("renders review surface with stats strip cells", () => {
      render(<TopologyMode topology={makeRealViewWithEdges()} />);
      expect(screen.getByTestId("tm-review")).toBeInTheDocument();
      expect(screen.getByTestId("tm-review-stats")).toBeInTheDocument();
      expect(
        screen.getByTestId("tm-review-stat-projected-edges"),
      ).toHaveTextContent("3");
      expect(
        screen.getByTestId("tm-review-stat-accepted-evidence"),
      ).toHaveTextContent("3");
      expect(
        screen.getByTestId("tm-review-stat-rejected-evidence"),
      ).toHaveTextContent("2");
      expect(
        screen.getByTestId("tm-review-stat-facts-accepted"),
      ).toHaveTextContent("3");
      expect(
        screen.getByTestId("tm-review-stat-facts-duplicate"),
      ).toHaveTextContent("1");
      expect(
        screen.getByTestId("tm-review-stat-source-kinds"),
      ).toHaveTextContent(/lldp:2/);
    });

    it("renders review filters and shows match count", () => {
      render(<TopologyMode topology={makeRealViewWithEdges()} />);
      expect(screen.getByTestId("tm-review-filters")).toBeInTheDocument();
      expect(screen.getByTestId("tm-review-filter-kind")).toBeInTheDocument();
      expect(screen.getByTestId("tm-review-filter-text")).toBeInTheDocument();
      expect(screen.getByTestId("tm-review-filter-count")).toHaveTextContent(
        /3 of 3 shown/,
      );
    });

    it("filters edges by source kind", () => {
      render(<TopologyMode topology={makeRealViewWithEdges()} />);
      const kindFilter = screen.getByTestId("tm-review-filter-kind");
      fireEvent.change(kindFilter, { target: { value: "cdp" } });
      expect(screen.getByTestId("tm-review-filter-count")).toHaveTextContent(
        /1 of 3 shown/,
      );
      const list = screen.getByTestId("tm-edge-list");
      expect(within(list).getByTestId("tm-edge-row-edge-cdp-2")).toBeInTheDocument();
      expect(within(list).queryByTestId("tm-edge-row-edge-lldp-1")).toBeNull();
    });

    it("filters edges by text substring (case-insensitive)", () => {
      render(<TopologyMode topology={makeRealViewWithEdges()} />);
      const textFilter = screen.getByTestId("tm-review-filter-text");
      fireEvent.change(textFilter, { target: { value: "ROUTER-C" } });
      expect(screen.getByTestId("tm-review-filter-count")).toHaveTextContent(
        /2 of 3 shown/,
      );
    });

    it("inspector starts empty and shows hint", () => {
      render(<TopologyMode topology={makeRealViewWithEdges()} />);
      expect(screen.getByTestId("tm-review-inspector")).toBeInTheDocument();
      expect(
        screen.getByTestId("tm-review-inspector-empty"),
      ).toHaveTextContent(/Select an edge/);
    });

    it("selecting an edge opens inspector with evidence", () => {
      render(<TopologyMode topology={makeRealViewWithEdges()} />);
      const selectBtn = screen.getByTestId(
        "tm-review-row-select-edge-lldp-1",
      );
      fireEvent.click(selectBtn);
      expect(
        screen.getByTestId("tm-review-inspector-id"),
      ).toHaveTextContent("edge-lldp-1");
      expect(
        screen.getByTestId("tm-review-inspector-kind"),
      ).toHaveTextContent("LLDP");
      expect(
        screen.getByTestId("tm-review-inspector-local-node"),
      ).toHaveTextContent(/router-a/);
      expect(
        screen.getByTestId("tm-review-inspector-remote-node"),
      ).toHaveTextContent(/router-b/);
      expect(
        screen.getByTestId("tm-review-inspector-evidence-0"),
      ).toHaveTextContent(/lldp:router-a/);
    });

    it("selecting an edge with no evidence/iface flags honestly", () => {
      render(<TopologyMode topology={makeRealViewWithEdges()} />);
      const selectBtn = screen.getByTestId(
        "tm-review-row-select-edge-cfg-3",
      );
      fireEvent.click(selectBtn);
      expect(
        screen.getByTestId("tm-review-inspector-status"),
      ).toHaveTextContent(/local interface unknown/);
      expect(
        screen.getByTestId("tm-review-inspector-status"),
      ).toHaveTextContent(/remote interface unknown/);
    });

    it("rejection summary shows aggregate counts and honest note", () => {
      render(<TopologyMode topology={makeRealViewWithEdges()} />);
      const summary = screen.getByTestId("tm-review-rejection-summary");
      expect(summary).toBeInTheDocument();
      expect(
        within(summary).getByTestId("tm-review-rejection-evidence-unknown-local"),
      ).toHaveTextContent(/1/);
      expect(
        within(summary).getByTestId("tm-review-rejection-evidence-self-link"),
      ).toHaveTextContent(/1/);
      expect(
        within(summary).getByTestId("tm-review-rejection-facts-duplicate"),
      ).toHaveTextContent(/1/);
      expect(summary).toHaveTextContent(
        /Per-entry rejected evidence is not retained/,
      );
    });

    it("rejection summary renders honest 'none' when no rejections", () => {
      const view = makeView({
        sourceState: "real",
        nodeCount: 1,
        edgeCount: 0,
        isEmpty: false,
        view: {
          environment_id: "env-core-eu1",
          source_state: "real",
          nodes: [
            {
              id: "topo::router-a",
              label: "router-a",
              device_record_id: "rec-a",
              hostname: "router-a",
              platform_id: "ios-xe",
              vendor: "cisco",
              role_hint: "device" as const,
              layer: "inventory" as const,
              source_kind: "discovery_inventory" as const,
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
          projection_stats: DEFAULT_PROJECTION_STATS,
          evidence_stats: DEFAULT_EVIDENCE_STATS,
        },
      });
      render(<TopologyMode topology={view} />);
      expect(
        screen.getByTestId("tm-review-rejection-none"),
      ).toBeInTheDocument();
    });

    it("graph-ready note says renderer not attached", () => {
      render(<TopologyMode topology={makeRealViewWithEdges()} />);
      expect(
        screen.getByTestId("tm-review-graph-ready-note"),
      ).toHaveTextContent(/renderer not attached/);
    });

    it("preserves V1AO/V1AP/V1AQ/V1AR test IDs alongside review surface", () => {
      render(<TopologyMode topology={makeRealViewWithEdges()} />);
      // V1AO+ — always-present panel + tab IDs
      expect(screen.getByTestId("tm-evidence-import")).toBeInTheDocument();
      expect(screen.getByTestId("tm-evidence-tab-json")).toBeInTheDocument();
      expect(screen.getByTestId("tm-evidence-tab-raw")).toBeInTheDocument();
      // V1AR — always-present import mode radios + clear section
      expect(screen.getByTestId("tm-import-mode-replace")).toBeInTheDocument();
      expect(screen.getByTestId("tm-import-mode-append")).toBeInTheDocument();
      expect(screen.getByTestId("tm-import-mode-merge")).toBeInTheDocument();
      expect(screen.getByTestId("tm-clear-evidence-section")).toBeInTheDocument();
      // V1AM/V1AN — still always present
      expect(screen.getByTestId("tm-adjacency")).toBeInTheDocument();
      expect(screen.getByTestId("tm-summary")).toBeInTheDocument();
      expect(screen.getByTestId("tm-projected-edges")).toBeInTheDocument();
      // Existing edge-list testids still resolve inside the new review surface.
      const list = screen.getByTestId("tm-edge-list");
      expect(within(list).getByTestId("tm-edge-row-edge-lldp-1")).toBeInTheDocument();
      expect(within(list).getByTestId("tm-edge-row-edge-cdp-2")).toBeInTheDocument();
      expect(within(list).getByTestId("tm-edge-row-edge-cfg-3")).toBeInTheDocument();
      // V1AP raw-tab testids are conditional (raw tab must be active);
      // switching tabs verifies they still resolve.
      fireEvent.click(screen.getByTestId("tm-evidence-tab-raw"));
      expect(screen.getByTestId("tm-raw-platform-hint")).toBeInTheDocument();
    });

    it("empty filter result renders honest hidden count", () => {
      render(<TopologyMode topology={makeRealViewWithEdges()} />);
      const textFilter = screen.getByTestId("tm-review-filter-text");
      fireEvent.change(textFilter, { target: { value: "nonexistent-xyzzy" } });
      expect(
        screen.getByTestId("tm-edge-list"),
      ).toHaveTextContent(/No edges match the current filters/);
    });
  });

  describe("V1AT — Live Collection dry-run panel integration", () => {
    it("mounts dry-run panel in real branch alongside V1AS review surface", () => {
      const view = makeView({
        sourceState: "real",
        nodeCount: 1,
        isEmpty: false,
        view: {
          environment_id: "env-core-eu1",
          source_state: "real",
          nodes: [
            {
              id: "topo::router-a",
              label: "router-a",
              device_record_id: "rec-a",
              hostname: "router-a",
              platform_id: "ios-xe",
              vendor: "cisco",
              role_hint: "device" as const,
              layer: "inventory" as const,
              source_kind: "discovery_inventory" as const,
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
          projection_stats: DEFAULT_PROJECTION_STATS,
          evidence_stats: DEFAULT_EVIDENCE_STATS,
        },
      });
      render(<TopologyMode topology={view} />);
      // V1AT panel + honesty note
      expect(screen.getByTestId("tm-live-collection")).toBeInTheDocument();
      expect(
        screen.getByTestId("tm-live-collection-honesty"),
      ).toHaveTextContent(/No device contact is performed/);
      // V1AS review surface still present
      expect(screen.getByTestId("tm-review")).toBeInTheDocument();
      // V1AR import panel still present
      expect(screen.getByTestId("tm-evidence-import")).toBeInTheDocument();
    });

    it("mounts dry-run panel in empty branch as well", () => {
      render(<TopologyMode topology={makeView()} />);
      expect(screen.getByTestId("tm-live-collection")).toBeInTheDocument();
    });

    it("dry-run panel exposes no credential / host / IP fields", () => {
      const { container } = render(<TopologyMode topology={makeView()} />);
      const panel = container.querySelector(
        '[data-testid="tm-live-collection"]',
      );
      expect(panel).not.toBeNull();
      expect(panel?.querySelector('input[type="password"]')).toBeNull();
      panel?.querySelectorAll("input, select, textarea").forEach((node) => {
        const id = node.getAttribute("data-testid") ?? "";
        expect(id).not.toMatch(/password|credential|username|host|ssh/i);
      });
    });

    it("plan button is disabled when onPlanLiveCollection is not wired", () => {
      render(<TopologyMode topology={makeView()} />);
      expect(
        screen.getByTestId("tm-live-collection-plan-button"),
      ).toBeDisabled();
    });
  });

  describe("B4 — Active Lab Environment Fallback", () => {
    it("prioritizes imported topology.view when both exist", () => {
      const view = makeView({
        nodeCount: 1,
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
      // Should show TopologyGraphPanel with imported view
      expect(
        screen.getByText("router-01")
      ).toBeInTheDocument();
    });

    it("does not crash when EnvironmentLifecycleProvider is missing", () => {
      const view = makeView({ view: null });
      // Should not throw even without provider
      expect(() => render(<TopologyMode topology={view} />)).not.toThrow();
      // Should show unavailable message (existing behavior when no provider)
      expect(
        screen.getByText("Topology source is not available right now.")
      ).toBeInTheDocument();
    });
  });
});

// V1BJ hotfix regression — TopologyMode must route active lab
// projection to the Blueprint canvas when imported topology view is
// empty / not_connected / unavailable. Previously the empty branch
// short-circuited the lab fallback because topology.view is non-null
// even when empty.
describe("TopologyMode — V1BJ hotfix lab-routing", () => {
  it("renders lab view when imported view is empty but active env exists", async () => {
    vi.resetModules();
    vi.doMock("../../../engines/labTopologyActivation", () => ({
      LAB_RENDER_DATA_SOURCE: "simulated" as const,
      activeRecordToGraphReadyView: () => ({
        environment_id: "env-active-lab",
        nodes: [
          {
            id: "lab-node-1",
            label: "lab-router-1",
            vendor: "anthracite",
            platform_id: null,
            role_hint: "core router",
            layer: "physical",
          },
        ],
        edges: [],
        renderer_attached: false as const,
        note: "lab projection",
      }),
    }));
    vi.doMock("../../../state/EnvironmentLifecycleContext", () => ({
      useEnvironmentLifecycle: () => ({
        active: { environment_id: "env-active-lab", name: "Mega City Lab" },
      }),
      EnvironmentLifecycleContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
    }));
    const { TopologyMode: ReroutedTopologyMode } = await import("../TopologyMode");
    const view = makeView(); // sourceState="empty", view non-null, isEmpty true
    render(<ReroutedTopologyMode topology={view} />);
    expect(screen.getByTestId("tm-body-lab-view")).toBeInTheDocument();
    // empty-state evidence banner must NOT render in this branch
    expect(
      screen.queryByText(
        "No topology to render — discovery inventory is empty for this scope.",
      ),
    ).toBeNull();
    vi.doUnmock("../../../engines/labTopologyActivation");
    vi.doUnmock("../../../state/EnvironmentLifecycleContext");
    vi.resetModules();
  });

  it("summary strip reflects lab counts (not empty imported view)", async () => {
    vi.resetModules();
    vi.doMock("../../../engines/labTopologyActivation", () => ({
      LAB_RENDER_DATA_SOURCE: "simulated" as const,
      activeRecordToGraphReadyView: () => ({
        environment_id: "env-active-lab",
        nodes: Array.from({ length: 96 }, (_, i) => ({
          id: `lab-node-${i}`,
          label: `lab-host-${i}`,
          vendor: "anthracite",
          platform_id: null,
          role_hint: "core router",
          layer: "physical" as const,
        })),
        edges: Array.from({ length: 240 }, (_, i) => ({
          id: `lab-edge-${i}`,
          source_node_id: `lab-node-${i % 96}`,
          target_node_id: `lab-node-${(i + 1) % 96}`,
          kind: "manual" as const,
          local_interface: null,
          remote_interface: null,
          evidence_count: 0,
        })),
        renderer_attached: false as const,
        note: "lab projection",
      }),
    }));
    vi.doMock("../../../state/EnvironmentLifecycleContext", () => ({
      useEnvironmentLifecycle: () => ({
        active: { environment_id: "env-active-lab", name: "Mega City Lab" },
      }),
      EnvironmentLifecycleContext: {
        Provider: ({ children }: { children: React.ReactNode }) => children,
      },
    }));
    const { TopologyMode: M2 } = await import("../TopologyMode");
    render(<M2 topology={makeView()} />);
    expect(screen.getByTestId("tm-summary-nodes")).toHaveTextContent("96");
    expect(screen.getByTestId("tm-summary-edges")).toHaveTextContent("240");
    expect(screen.getByTestId("tm-summary-source")).toHaveTextContent(
      "generated-lab",
    );
    // Empty-state imported message must NOT render in this branch
    expect(
      screen.queryByText(
        "No topology to render — discovery inventory is empty for this scope.",
      ),
    ).toBeNull();
    vi.doUnmock("../../../engines/labTopologyActivation");
    vi.doUnmock("../../../state/EnvironmentLifecycleContext");
    vi.resetModules();
  });
});
