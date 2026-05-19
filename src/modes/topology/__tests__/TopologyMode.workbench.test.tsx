/**
 * V1BI — TopologyMode workbench adoption tests.
 *
 * Covers:
 *   - TopologyMode renders ModeWorkbenchShell
 *   - Default tool is Graph / Map
 *   - Rail exposes Graph/Map, Evidence Import, Collection Plan, Readiness, 3D / Canvas
 *   - Switching tools shows only the relevant slice
 *   - 3D / Canvas renders honest deferred state (no fake graph)
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopologyMode } from "../TopologyMode";
import type { TopologySourceView } from "../../../data/topologySource";
import type {
  NeighborEvidenceMappingStats,
  ProjectionStats,
  TopologyAdjacencyReadiness,
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

function defaultReadiness(eligible = 0): TopologyAdjacencyReadiness {
  return {
    eligible_node_count: eligible,
    fact_source_state: "none_available",
    fact_sources: [
      { kind: "lldp", present: false, count: 0, note: "n/a" },
      { kind: "cdp", present: false, count: 0, note: "n/a" },
      { kind: "config_neighbor", present: false, count: 0, note: "n/a" },
      { kind: "manual", present: false, count: 0, note: "n/a" },
    ],
    accepted_kinds: ["lldp", "cdp", "config_neighbor", "manual"],
    reason: "no adjacency fact sources connected — edges remain empty",
  };
}

function makeView(over: Partial<TopologySourceView> = {}): TopologySourceView {
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
    message: "topology empty",
    adjacency_readiness: defaultReadiness(),
    projection_stats: DEFAULT_PROJECTION_STATS,
    evidence_stats: DEFAULT_EVIDENCE_STATS,
  };
  return {
    sourceState: "empty",
    environmentId: "env-core-eu1",
    nodeCount: 0,
    edgeCount: 0,
    sourceRecordCount: 0,
    message: "topology empty",
    isEmpty: true,
    projectionStats: null,
    evidenceStats: null,
    view: baseView,
    ...over,
  };
}

describe("TopologyMode — workbench (V1BI)", () => {
  it("renders ModeWorkbenchShell", () => {
    render(<TopologyMode topology={makeView()} />);
    expect(screen.getByTestId("mode-workbench")).toBeInTheDocument();
  });

  it("defaults to Graph / Map", () => {
    render(<TopologyMode topology={makeView()} />);
    expect(
      screen
        .getByTestId("mode-workbench-active")
        .getAttribute("data-active-tool"),
    ).toBe("graph_map");
  });

  it("rail exposes all five Topology tools", () => {
    render(<TopologyMode topology={makeView()} />);
    expect(screen.getByTestId("mwb-tool-graph_map")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-evidence_import")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-collection_plan")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-readiness")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-canvas_3d")).toBeInTheDocument();
  });

  it("Graph / Map default shows tm-summary", () => {
    render(<TopologyMode topology={makeView()} />);
    expect(screen.getByTestId("tm-summary")).toBeInTheDocument();
  });

  it("switching to Evidence Import shows the import controls and hides tm-summary", async () => {
    const user = userEvent.setup();
    render(<TopologyMode topology={makeView()} />);
    await user.click(screen.getByTestId("mwb-tool-evidence_import"));
    expect(screen.getByTestId("tm-evidence-import-textarea")).toBeInTheDocument();
    expect(screen.queryByTestId("tm-summary")).toBeNull();
  });

  it("switching to Collection Plan shows dry-run controls", async () => {
    const user = userEvent.setup();
    render(<TopologyMode topology={makeView()} />);
    await user.click(screen.getByTestId("mwb-tool-collection_plan"));
    expect(
      screen.getByTestId("tm-live-collection-plan-button"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("tm-summary")).toBeNull();
  });

  it("switching to Readiness shows the adjacency readiness section", async () => {
    const user = userEvent.setup();
    render(<TopologyMode topology={makeView()} />);
    await user.click(screen.getByTestId("mwb-tool-readiness"));
    expect(screen.getByTestId("tm-adjacency")).toBeInTheDocument();
    expect(screen.queryByTestId("tm-summary")).toBeNull();
  });

  it("Readiness falls back to honest unavailable state when view is null", async () => {
    const user = userEvent.setup();
    render(<TopologyMode topology={makeView({ view: null })} />);
    await user.click(screen.getByTestId("mwb-tool-readiness"));
    expect(screen.getByTestId("tm-readiness-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("tm-adjacency")).toBeNull();
  });

  it("3D / Canvas renders deferred state with planned controls and no fake graph", async () => {
    const user = userEvent.setup();
    render(<TopologyMode topology={makeView()} />);
    await user.click(screen.getByTestId("mwb-tool-canvas_3d"));
    expect(screen.getByTestId("mwb-deferred-canvas_3d")).toBeInTheDocument();
    expect(screen.getByText(/No 3D scene is implemented/i)).toBeInTheDocument();
    expect(screen.getByText("Layout mode")).toBeInTheDocument();
    expect(screen.getByText("Evidence overlay")).toBeInTheDocument();
    expect(screen.queryByTestId("tm-summary")).toBeNull();
    expect(screen.queryByTestId("tm-adjacency")).toBeNull();
  });

  it("3D / Canvas tool has deferred status data attribute", () => {
    render(<TopologyMode topology={makeView()} />);
    expect(
      screen.getByTestId("mwb-tool-canvas_3d").getAttribute("data-tool-status"),
    ).toBe("deferred");
  });
});
