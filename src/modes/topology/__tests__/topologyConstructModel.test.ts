/**
 * V1CC — TopologyConstructModel comprehensive cases.
 */

import { describe, expect, it } from "vitest";
import {
  buildTopologyConstruct,
} from "../topologyConstructModel";
import type { TopologySourceView } from "../../../data/topologySource";
import type {
  NeighborEvidenceMappingStats,
  ProjectionStats,
  TopologyAdjacencyReadiness,
  TopologyEdge,
  TopologyNode,
  TopologyView,
} from "../../../types/topology";
import { toTopologySourceView } from "../../../data/topologySource";
import {
  EMPTY_WORKBENCH_CONTEXT_SUMMARY,
  type WorkbenchContextSummary,
} from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
} from "../../diagnose/diagnoseTriage";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../../../state/operatorActivityLedger";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

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

const DEFAULT_READINESS: TopologyAdjacencyReadiness = {
  eligible_node_count: 0,
  fact_source_state: "none_available",
  fact_sources: [
    { kind: "lldp", present: false, count: 0, note: "n/a" },
    { kind: "cdp", present: false, count: 0, note: "n/a" },
    { kind: "config_neighbor", present: false, count: 0, note: "n/a" },
    { kind: "manual", present: false, count: 0, note: "n/a" },
  ],
  accepted_kinds: [],
  reason: "n/a",
};

function makeNode(id: string, label: string, vendor: string | null = null): TopologyNode {
  return {
    id,
    label,
    device_record_id: `dev-${id}`,
    hostname: label,
    platform_id: null,
    vendor,
    role_hint: "device",
    layer: "inventory",
    source_kind: "discovery_inventory",
  };
}

function makeEdge(id: string, source: string, target: string): TopologyEdge {
  return {
    id,
    source_node_id: source,
    target_node_id: target,
    kind: "lldp",
    confidence: 0.9,
    source: "manual",
    local_interface: null,
    remote_interface: null,
    evidence: [],
  };
}

function makeView(nodes: TopologyNode[], edges: TopologyEdge[]): TopologySourceView {
  const view: TopologyView = {
    environment_id: "env-test",
    source_state: nodes.length > 0 ? "real" : "empty",
    nodes,
    edges,
    summary: {
      environment_id: "env-test",
      node_count: nodes.length,
      edge_count: edges.length,
      source_record_count: nodes.length,
    },
    message: "test",
    adjacency_readiness: DEFAULT_READINESS,
    projection_stats: DEFAULT_PROJECTION_STATS,
    evidence_stats: DEFAULT_EVIDENCE_STATS,
  };
  return toTopologySourceView(view);
}

function summaryWith(
  partial: Partial<WorkbenchContextSummary["topology"] & WorkbenchContextSummary["evidence_import"]>,
): WorkbenchContextSummary {
  return {
    ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    topology: {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
      node_count: partial.node_count ?? 0,
      edge_count: partial.edge_count ?? 0,
    },
    evidence_import: {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
      attempted_import_count: partial.attempted_import_count ?? 0,
      accepted_import_count: partial.accepted_import_count ?? 0,
      rejected_import_count: partial.rejected_import_count ?? 0,
      accepted_evidence_total: partial.accepted_evidence_total ?? 0,
      rejected_evidence_total: partial.rejected_evidence_total ?? 0,
    },
  };
}

describe("TopologyConstructModel — behavior", () => {
  it("topology nodes/edges map deterministically into construct nodes/links", () => {
    const topology = makeView(
      [makeNode("n1", "Router-1", "cisco"), makeNode("n2", "Switch-1", "arista")],
      [makeEdge("e1", "n1", "n2")],
    );
    const c = buildTopologyConstruct({
      topology,
      summary: summaryWith({ node_count: 2, edge_count: 1 }),
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(c.node_count).toBe(2);
    expect(c.link_count).toBe(1);
    expect(c.nodes[0].id).toBe("n1");
    expect(c.nodes[0].vendor).toBe("cisco");
    expect(c.links[0].id).toBe("e1");
    expect(c.links[0].source_node_id).toBe("n1");
    expect(c.links[0].target_node_id).toBe("n2");
  });

  it("link IDs derive deterministically from edge IDs", () => {
    const topology = makeView(
      [makeNode("n1", "n1"), makeNode("n2", "n2")],
      [makeEdge("edge-alpha", "n1", "n2"), makeEdge("edge-beta", "n2", "n1")],
    );
    const c = buildTopologyConstruct({
      topology,
      summary: summaryWith({ node_count: 2, edge_count: 2 }),
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(c.links.map((l) => l.id)).toEqual(["edge-alpha", "edge-beta"]);
  });

  it("no nodes/links beyond topology input (no invention)", () => {
    const topology = makeView([makeNode("only", "only")], []);
    const c = buildTopologyConstruct({
      topology,
      summary: summaryWith({ node_count: 1 }),
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(c.nodes.length).toBe(1);
    expect(c.links.length).toBe(0);
  });

  it("risk flags derive from triage reason codes", () => {
    const summary = summaryWith({
      node_count: 0,
      accepted_evidence_total: 4,
    });
    const triage = buildDiagnoseTriage({
      summary,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    expect(triage.critical_count).toBeGreaterThan(0);
    const c = buildTopologyConstruct({
      topology: toTopologySourceView(null),
      summary,
      triage,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(
      c.risk_flags.some(
        (f) => f.reason_code === "evidence_exists_but_no_topology",
      ),
    ).toBe(true);
  });

  it("topology_without_edges triage produces warning risk flag", () => {
    const summary = summaryWith({ node_count: 3, edge_count: 0 });
    const triage = buildDiagnoseTriage({
      summary,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    const topology = makeView(
      [makeNode("a", "a"), makeNode("b", "b"), makeNode("c", "c")],
      [],
    );
    const c = buildTopologyConstruct({
      topology,
      summary,
      triage,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    const flag = c.risk_flags.find(
      (f) => f.reason_code === "topology_without_edges",
    );
    expect(flag?.severity).toBe("warning");
  });

  it("density classification: empty/low/medium/high", () => {
    const empty = buildTopologyConstruct({
      topology: toTopologySourceView(null),
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(empty.layout_hints.density).toBe("empty");

    const lowNodes = Array.from({ length: 5 }, (_, i) =>
      makeNode(`n${i}`, `n${i}`),
    );
    const low = buildTopologyConstruct({
      topology: makeView(lowNodes, []),
      summary: summaryWith({ node_count: 5 }),
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(low.layout_hints.density).toBe("low");

    const mediumNodes = Array.from({ length: 50 }, (_, i) =>
      makeNode(`n${i}`, `n${i}`),
    );
    const medium = buildTopologyConstruct({
      topology: makeView(mediumNodes, []),
      summary: summaryWith({ node_count: 50 }),
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(medium.layout_hints.density).toBe("medium");

    const highNodes = Array.from({ length: 150 }, (_, i) =>
      makeNode(`n${i}`, `n${i}`),
    );
    const high = buildTopologyConstruct({
      topology: makeView(highNodes, []),
      summary: summaryWith({ node_count: 150 }),
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(high.layout_hints.density).toBe("high");
    expect(high.layout_hints.supports_minimap).toBe(true);
  });

  it("supports_3d toggles with node presence", () => {
    const empty = buildTopologyConstruct({
      topology: toTopologySourceView(null),
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(empty.layout_hints.supports_3d).toBe(false);

    const withNodes = buildTopologyConstruct({
      topology: makeView([makeNode("n1", "n1")], []),
      summary: summaryWith({ node_count: 1 }),
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(withNodes.layout_hints.supports_3d).toBe(true);
  });

  it("layout hints are deterministic for identical inputs", () => {
    const topology = makeView(
      [makeNode("n1", "n1"), makeNode("n2", "n2")],
      [makeEdge("e1", "n1", "n2")],
    );
    const summary = summaryWith({ node_count: 2, edge_count: 1 });
    const a = buildTopologyConstruct({
      topology,
      summary,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    const b = buildTopologyConstruct({
      topology,
      summary,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(a).toEqual(b);
  });

  it("evidence_state reflects accepted evidence totals", () => {
    const topology = makeView([makeNode("n1", "n1")], []);

    const noEvidence = buildTopologyConstruct({
      topology,
      summary: summaryWith({ node_count: 1 }),
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(noEvidence.nodes[0].evidence_state).toBe("none");

    const attempted = buildTopologyConstruct({
      topology,
      summary: summaryWith({ node_count: 1, attempted_import_count: 1 }),
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(attempted.nodes[0].evidence_state).toBe("inferred");

    const imported = buildTopologyConstruct({
      topology,
      summary: summaryWith({
        node_count: 1,
        attempted_import_count: 1,
        accepted_evidence_total: 3,
      }),
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(imported.nodes[0].evidence_state).toBe("imported");
  });

  it("default cluster aggregates all nodes; absent when no nodes", () => {
    const empty = buildTopologyConstruct({
      topology: toTopologySourceView(null),
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(empty.cluster_count).toBe(0);

    const withNodes = buildTopologyConstruct({
      topology: makeView([makeNode("n1", "n1"), makeNode("n2", "n2")], []),
      summary: summaryWith({ node_count: 2 }),
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(withNodes.cluster_count).toBe(1);
    expect(withNodes.clusters[0].node_ids).toEqual(["n1", "n2"]);
  });
});
