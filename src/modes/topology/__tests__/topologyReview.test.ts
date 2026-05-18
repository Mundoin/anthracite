import { describe, expect, it } from "vitest";
import {
  DEFAULT_REVIEW_FILTERS,
  GRAPH_READY_DISPLAY_NOTE,
  TOPOLOGY_REVIEW_KIND_OPTIONS,
  buildGraphReadyTopologyView,
  buildTopologyReviewModel,
  deriveRejectionSummary,
  deriveTopologyReviewStats,
  filterTopologyReviewRows,
  findSelectedTopologyEdge,
  formatTopologyEdgeKind,
} from "../topologyReview";
import type {
  NeighborEvidenceMappingStats,
  ProjectionStats,
  TopologyAdjacencyReadiness,
  TopologyEdge,
  TopologyNode,
  TopologyView,
} from "../../../types/topology";

function readiness(): TopologyAdjacencyReadiness {
  return {
    eligible_node_count: 0,
    fact_source_state: "none_available",
    fact_sources: [],
    accepted_kinds: ["lldp", "cdp", "config_neighbor", "manual"],
    reason: "no adjacency fact sources connected",
  };
}

function emptyProjection(): ProjectionStats {
  return {
    facts_total: 0,
    facts_accepted: 0,
    facts_rejected_unknown_node: 0,
    facts_rejected_self_link: 0,
    facts_collapsed_duplicate: 0,
    per_kind_counts: [],
  };
}

function emptyEvidenceStats(): NeighborEvidenceMappingStats {
  return {
    evidence_total: 0,
    accepted: 0,
    rejected_unknown_local: 0,
    rejected_unknown_remote: 0,
    rejected_self_link: 0,
  };
}

function node(id: string, label: string, over: Partial<TopologyNode> = {}): TopologyNode {
  return {
    id,
    label,
    device_record_id: `rec-${id}`,
    hostname: label,
    platform_id: "ios-xe",
    vendor: "cisco",
    role_hint: "device",
    layer: "inventory",
    source_kind: "discovery_inventory",
    ...over,
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  over: Partial<TopologyEdge> = {},
): TopologyEdge {
  return {
    id,
    source_node_id: source,
    target_node_id: target,
    kind: "lldp",
    confidence: null,
    source: "discovery_inventory",
    local_interface: "Gi0/0",
    remote_interface: "Gi0/1",
    evidence: ["lldp:router-a Gi0/0 -> router-b Gi0/1"],
    ...over,
  };
}

function view(over: Partial<TopologyView> = {}): TopologyView {
  return {
    environment_id: "env-core-eu1",
    source_state: "real",
    nodes: [],
    edges: [],
    summary: {
      environment_id: "env-core-eu1",
      node_count: 0,
      edge_count: 0,
      source_record_count: 0,
    },
    message: "ok",
    adjacency_readiness: readiness(),
    projection_stats: emptyProjection(),
    evidence_stats: emptyEvidenceStats(),
    ...over,
  };
}

describe("topologyReview — buildTopologyReviewModel", () => {
  it("returns empty model with is_unavailable=true for null view", () => {
    const model = buildTopologyReviewModel(null);
    expect(model.is_unavailable).toBe(true);
    expect(model.rows).toHaveLength(0);
    expect(model.stats.projected_edge_count).toBe(0);
    expect(model.rejection_summary.has_rejections).toBe(false);
    expect(model.graph_ready.renderer_attached).toBe(false);
    expect(model.graph_ready.note).toBe(GRAPH_READY_DISPLAY_NOTE);
  });

  it("returns empty rows for view with no edges", () => {
    const model = buildTopologyReviewModel(view());
    expect(model.is_unavailable).toBe(false);
    expect(model.rows).toHaveLength(0);
    expect(model.stats.projected_edge_count).toBe(0);
  });

  it("projects rows from view edges and resolves endpoint labels via node index", () => {
    const a = node("topo::a", "router-a");
    const b = node("topo::b", "router-b");
    const e = edge("e1", "topo::a", "topo::b");
    const model = buildTopologyReviewModel(
      view({ nodes: [a, b], edges: [e] }),
    );
    expect(model.rows).toHaveLength(1);
    const row = model.rows[0];
    expect(row.edge_id).toBe("e1");
    expect(row.kind).toBe("lldp");
    expect(row.local.node_id).toBe("topo::a");
    expect(row.local.node_label).toBe("router-a");
    expect(row.local.node_vendor).toBe("cisco");
    expect(row.local.interface).toBe("Gi0/0");
    expect(row.remote.node_label).toBe("router-b");
    expect(row.evidence).toHaveLength(1);
    expect(row.evidence[0].text).toContain("lldp:router-a");
  });

  it("leaves node_label=null when endpoint not in nodes (no invention)", () => {
    const a = node("topo::a", "router-a");
    const e = edge("e1", "topo::a", "topo::ghost");
    const model = buildTopologyReviewModel(
      view({ nodes: [a], edges: [e] }),
    );
    const row = model.rows[0];
    expect(row.local.node_label).toBe("router-a");
    expect(row.remote.node_label).toBeNull();
    expect(row.remote.node_vendor).toBeNull();
    expect(row.status_note).toContain("remote node unresolved");
  });

  it("status_note flags missing evidence honestly", () => {
    const a = node("topo::a", "router-a");
    const b = node("topo::b", "router-b");
    const e = edge("e1", "topo::a", "topo::b", { evidence: [] });
    const model = buildTopologyReviewModel(
      view({ nodes: [a, b], edges: [e] }),
    );
    expect(model.rows[0].status_note).toContain("no evidence string retained");
  });

  it("status_note flags missing interfaces honestly", () => {
    const a = node("topo::a", "router-a");
    const b = node("topo::b", "router-b");
    const e = edge("e1", "topo::a", "topo::b", {
      local_interface: null,
      remote_interface: null,
    });
    const model = buildTopologyReviewModel(
      view({ nodes: [a, b], edges: [e] }),
    );
    const note = model.rows[0].status_note;
    expect(note).toContain("local interface unknown");
    expect(note).toContain("remote interface unknown");
  });

  it("graph-ready projection contains all nodes and edges with no coordinates", () => {
    const a = node("topo::a", "router-a");
    const b = node("topo::b", "router-b");
    const e = edge("e1", "topo::a", "topo::b");
    const model = buildTopologyReviewModel(
      view({ nodes: [a, b], edges: [e] }),
    );
    expect(model.graph_ready.nodes).toHaveLength(2);
    expect(model.graph_ready.edges).toHaveLength(1);
    expect(model.graph_ready.renderer_attached).toBe(false);
    const firstNode = model.graph_ready.nodes[0] as unknown as Record<string, unknown>;
    expect(firstNode.x).toBeUndefined();
    expect(firstNode.y).toBeUndefined();
    expect(firstNode.position).toBeUndefined();
    const firstEdge = model.graph_ready.edges[0];
    expect(firstEdge.evidence_count).toBe(1);
  });
});

describe("topologyReview — deriveTopologyReviewStats", () => {
  it("returns zero stats for null view", () => {
    const stats = deriveTopologyReviewStats(null);
    expect(stats.projected_edge_count).toBe(0);
    expect(stats.evidence_total).toBe(0);
    expect(stats.facts_total).toBe(0);
    expect(stats.per_kind_counts).toHaveLength(0);
  });

  it("derives stats from projection_stats and evidence_stats", () => {
    const v = view({
      edges: [edge("e1", "topo::a", "topo::b"), edge("e2", "topo::b", "topo::c")],
      projection_stats: {
        facts_total: 10,
        facts_accepted: 8,
        facts_rejected_unknown_node: 1,
        facts_rejected_self_link: 1,
        facts_collapsed_duplicate: 2,
        per_kind_counts: [
          ["lldp", 6],
          ["cdp", 2],
        ],
      },
      evidence_stats: {
        evidence_total: 12,
        accepted: 9,
        rejected_unknown_local: 1,
        rejected_unknown_remote: 1,
        rejected_self_link: 1,
      },
    });
    const stats = deriveTopologyReviewStats(v);
    expect(stats.projected_edge_count).toBe(2);
    expect(stats.evidence_total).toBe(12);
    expect(stats.evidence_accepted).toBe(9);
    expect(stats.evidence_rejected).toBe(3);
    expect(stats.facts_total).toBe(10);
    expect(stats.facts_accepted).toBe(8);
    expect(stats.facts_collapsed_duplicate).toBe(2);
    expect(stats.per_kind_counts).toEqual([
      { kind: "lldp", count: 6 },
      { kind: "cdp", count: 2 },
    ]);
  });
});

describe("topologyReview — deriveRejectionSummary", () => {
  it("returns zeroed summary with has_rejections=false for null view", () => {
    const summary = deriveRejectionSummary(null);
    expect(summary.has_rejections).toBe(false);
    expect(summary.evidence_rejected_total).toBe(0);
    expect(summary.aggregate_only).toBe(true);
  });

  it("marks has_rejections=true when any category is non-zero", () => {
    const v = view({
      evidence_stats: {
        evidence_total: 3,
        accepted: 2,
        rejected_unknown_local: 1,
        rejected_unknown_remote: 0,
        rejected_self_link: 0,
      },
    });
    const summary = deriveRejectionSummary(v);
    expect(summary.has_rejections).toBe(true);
    expect(summary.evidence_rejected_total).toBe(1);
    expect(summary.evidence_rejected_unknown_local).toBe(1);
  });

  it("counts fact-side rejections too", () => {
    const v = view({
      projection_stats: {
        facts_total: 5,
        facts_accepted: 3,
        facts_rejected_unknown_node: 1,
        facts_rejected_self_link: 1,
        facts_collapsed_duplicate: 0,
        per_kind_counts: [],
      },
    });
    const summary = deriveRejectionSummary(v);
    expect(summary.has_rejections).toBe(true);
    expect(summary.facts_rejected_unknown_node).toBe(1);
    expect(summary.facts_rejected_self_link).toBe(1);
  });

  it("always reports aggregate_only=true (engine does not retain per-entry rejected evidence yet)", () => {
    expect(deriveRejectionSummary(view()).aggregate_only).toBe(true);
  });
});

describe("topologyReview — buildGraphReadyTopologyView", () => {
  it("returns empty graph-ready view for null", () => {
    const g = buildGraphReadyTopologyView(null);
    expect(g.nodes).toHaveLength(0);
    expect(g.edges).toHaveLength(0);
    expect(g.environment_id).toBeNull();
    expect(g.renderer_attached).toBe(false);
  });

  it("mirrors nodes and edges into renderer-agnostic shape", () => {
    const a = node("topo::a", "router-a");
    const b = node("topo::b", "router-b");
    const e = edge("e1", "topo::a", "topo::b", {
      evidence: ["x", "y", "z"],
    });
    const g = buildGraphReadyTopologyView(view({ nodes: [a, b], edges: [e] }));
    expect(g.nodes.map((n) => n.id)).toEqual(["topo::a", "topo::b"]);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].evidence_count).toBe(3);
    expect(g.note).toContain("renderer not attached");
  });
});

describe("topologyReview — filterTopologyReviewRows", () => {
  function rows() {
    const a = node("topo::a", "router-a");
    const b = node("topo::b", "router-b");
    const c = node("topo::c", "router-c");
    const model = buildTopologyReviewModel(
      view({
        nodes: [a, b, c],
        edges: [
          edge("e1", "topo::a", "topo::b", { kind: "lldp", evidence: ["lldp evidence a-b"] }),
          edge("e2", "topo::b", "topo::c", { kind: "cdp", evidence: ["cdp evidence b-c"] }),
          edge("e3", "topo::a", "topo::c", {
            kind: "config_neighbor",
            evidence: ["config: neighbor a-c"],
          }),
        ],
      }),
    );
    return model.rows;
  }

  it("returns identical array when filters are default", () => {
    const r = rows();
    expect(filterTopologyReviewRows(r, DEFAULT_REVIEW_FILTERS)).toBe(r);
  });

  it("filters by kind", () => {
    const filtered = filterTopologyReviewRows(rows(), { kind: "cdp", text: "" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].edge_id).toBe("e2");
  });

  it("filters by text substring across node ids, labels, interfaces, evidence", () => {
    const filtered = filterTopologyReviewRows(rows(), {
      kind: "all",
      text: "router-c",
    });
    expect(filtered.map((r) => r.edge_id).sort()).toEqual(["e2", "e3"]);
  });

  it("filters by text on evidence content", () => {
    const filtered = filterTopologyReviewRows(rows(), {
      kind: "all",
      text: "config:",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].edge_id).toBe("e3");
  });

  it("combines kind + text filters", () => {
    const filtered = filterTopologyReviewRows(rows(), {
      kind: "lldp",
      text: "router-a",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].edge_id).toBe("e1");
  });

  it("text filter is case-insensitive and trimmed", () => {
    const filtered = filterTopologyReviewRows(rows(), {
      kind: "all",
      text: "  ROUTER-B  ",
    });
    expect(filtered.map((r) => r.edge_id).sort()).toEqual(["e1", "e2"]);
  });

  it("returns empty when nothing matches", () => {
    const filtered = filterTopologyReviewRows(rows(), {
      kind: "all",
      text: "nonexistent",
    });
    expect(filtered).toHaveLength(0);
  });
});

describe("topologyReview — findSelectedTopologyEdge", () => {
  function model() {
    const a = node("topo::a", "router-a");
    const b = node("topo::b", "router-b");
    return buildTopologyReviewModel(
      view({
        nodes: [a, b],
        edges: [edge("e1", "topo::a", "topo::b")],
      }),
    );
  }

  it("returns null for null edgeId", () => {
    expect(findSelectedTopologyEdge(model(), null)).toBeNull();
  });

  it("returns null for unknown edgeId", () => {
    expect(findSelectedTopologyEdge(model(), "ghost")).toBeNull();
  });

  it("returns the matching row", () => {
    const row = findSelectedTopologyEdge(model(), "e1");
    expect(row).not.toBeNull();
    expect(row?.edge_id).toBe("e1");
  });
});

describe("topologyReview — formatters and constants", () => {
  it("formats edge kinds with human labels", () => {
    expect(formatTopologyEdgeKind("lldp")).toBe("LLDP");
    expect(formatTopologyEdgeKind("cdp")).toBe("CDP");
    expect(formatTopologyEdgeKind("config_neighbor")).toBe("Config neighbor");
    expect(formatTopologyEdgeKind("manual")).toBe("Manual");
  });

  it("kind options list starts with 'all' and includes all four engine kinds", () => {
    expect(TOPOLOGY_REVIEW_KIND_OPTIONS[0]).toBe("all");
    expect(TOPOLOGY_REVIEW_KIND_OPTIONS).toContain("lldp");
    expect(TOPOLOGY_REVIEW_KIND_OPTIONS).toContain("cdp");
    expect(TOPOLOGY_REVIEW_KIND_OPTIONS).toContain("config_neighbor");
    expect(TOPOLOGY_REVIEW_KIND_OPTIONS).toContain("manual");
  });

  it("DEFAULT_REVIEW_FILTERS is kind=all + empty text", () => {
    expect(DEFAULT_REVIEW_FILTERS).toEqual({ kind: "all", text: "" });
  });
});
