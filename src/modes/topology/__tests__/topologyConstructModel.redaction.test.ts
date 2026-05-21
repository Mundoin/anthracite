/**
 * V1CC — TopologyConstructModel redaction proof.
 */

import { describe, expect, it } from "vitest";
import {
  buildTopologyConstruct,
  type TopologyConstruct,
  type TopologyConstructNode,
  type TopologyConstructLink,
} from "../topologyConstructModel";
import type { TopologySourceView } from "../../../data/topologySource";
import type {
  NeighborEvidenceMappingStats,
  ProjectionStats,
  TopologyAdjacencyReadiness,
  TopologyView,
} from "../../../types/topology";
import { toTopologySourceView } from "../../../data/topologySource";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
} from "../../diagnose/diagnoseTriage";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../../../state/operatorActivityLedger";

const FORBIDDEN_TOKENS: readonly string[] = [
  "BEGIN RSA PRIVATE KEY",
  "password=hunter2",
  "evidence_set_id",
  "raw_config:",
  "stderr:",
  "```",
  "AKIAIOSFODNN7EXAMPLE",
  "Bearer ey",
];

const STATS_P: ProjectionStats = {
  facts_total: 0,
  facts_accepted: 0,
  facts_rejected_unknown_node: 0,
  facts_rejected_self_link: 0,
  facts_collapsed_duplicate: 0,
  per_kind_counts: [],
};
const STATS_E: NeighborEvidenceMappingStats = {
  evidence_total: 0,
  accepted: 0,
  rejected_unknown_local: 0,
  rejected_unknown_remote: 0,
  rejected_self_link: 0,
};
const READY: TopologyAdjacencyReadiness = {
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

function populatedView(): TopologySourceView {
  const v: TopologyView = {
    environment_id: "prod",
    source_state: "real",
    nodes: [
      {
        id: "n1",
        label: "R1",
        device_record_id: "dev-n1",
        hostname: "R1",
        platform_id: "cisco-ios",
        vendor: "cisco",
        role_hint: "device",
        layer: "inventory",
        source_kind: "discovery_inventory",
      },
      {
        id: "n2",
        label: "R2",
        device_record_id: "dev-n2",
        hostname: "R2",
        platform_id: "arista-eos",
        vendor: "arista",
        role_hint: "device",
        layer: "inventory",
        source_kind: "discovery_inventory",
      },
    ],
    edges: [
      {
        id: "e1",
        source_node_id: "n1",
        target_node_id: "n2",
        kind: "lldp",
        confidence: 0.9,
        source: "manual",
        local_interface: null,
        remote_interface: null,
        evidence: [],
      },
    ],
    summary: {
      environment_id: "prod",
      node_count: 2,
      edge_count: 1,
      source_record_count: 2,
    },
    message: "ok",
    adjacency_readiness: READY,
    projection_stats: STATS_P,
    evidence_stats: STATS_E,
  };
  return toTopologySourceView(v);
}

describe("TopologyConstructModel — redaction", () => {
  it("serialized construct contains zero forbidden tokens", () => {
    const summary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 2,
        edge_count: 1,
      },
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        attempted_import_count: 3,
        accepted_import_count: 1,
        rejected_import_count: 2,
        accepted_evidence_total: 2,
        rejected_evidence_total: 5,
      },
    };
    const triage = buildDiagnoseTriage({
      summary,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    const c = buildTopologyConstruct({
      topology: populatedView(),
      summary,
      triage,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => "2026-05-21T00:00:00.000Z",
    });
    const json = JSON.stringify(c);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
  });

  it("construct exposes only documented fields", () => {
    const c = buildTopologyConstruct({
      topology: toTopologySourceView(null),
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => "2026-05-21T00:00:00.000Z",
    });
    const allowed: ReadonlyArray<keyof TopologyConstruct> = [
      "construct_id",
      "created_at",
      "source_state",
      "node_count",
      "link_count",
      "cluster_count",
      "layer_count",
      "risk_flag_count",
      "nodes",
      "links",
      "clusters",
      "layers",
      "risk_flags",
      "layout_hints",
      "limitations",
    ];
    expect(Object.keys(c).sort()).toEqual([...allowed].sort());
  });

  it("nodes and links expose only documented fields", () => {
    const c = buildTopologyConstruct({
      topology: populatedView(),
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => "2026-05-21T00:00:00.000Z",
    });
    const nodeAllowed: ReadonlyArray<keyof TopologyConstructNode> = [
      "id",
      "label",
      "role",
      "vendor",
      "platform",
      "layer",
      "evidence_state",
      "risk_level",
    ];
    for (const n of c.nodes) {
      expect(Object.keys(n).sort()).toEqual([...nodeAllowed].sort());
    }
    const linkAllowed: ReadonlyArray<keyof TopologyConstructLink> = [
      "id",
      "source_node_id",
      "target_node_id",
      "kind",
      "evidence_state",
      "risk_level",
    ];
    for (const l of c.links) {
      expect(Object.keys(l).sort()).toEqual([...linkAllowed].sort());
    }
  });
});
