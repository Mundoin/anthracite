/**
 * V1CC — Topology Construct Model.
 *
 * Visual-independent semantic construct layer below tomorrow's topology
 * canvas / 3D / model work. Pure deterministic projection from the
 * current TopologySourceView + safe context.
 *
 * Hard discipline:
 *   - Inputs: TopologySourceView + WorkbenchContextSummary +
 *     DiagnoseTriage + AssessmentReadiness only.
 *   - Output: nodes/links derived STRICTLY from view.nodes/edges (no
 *     invented topology); clusters/layers/risk_flags/layout_hints
 *     derived from safe summaries and triage reason codes only.
 *   - Labels/counts/short-tokens only — no raw configs, no raw evidence,
 *     no markdown bodies, no command output, no credentials, no
 *     secrets, no evidence_set_id, no raw error messages.
 *   - Deterministic: same inputs + same clock/id factory → same
 *     construct.
 *   - No I/O, no fetch, no mutation, no rendering, no layout engine.
 *   - Limitations always declare: no 3D rendering, no layout engine,
 *     construct uses current safe summaries only.
 */

import type { TopologySourceView } from "../../data/topologySource";
import type { WorkbenchContextSummary } from "../../state/workbenchContextSummary";
import type { DiagnoseTriage } from "../diagnose/diagnoseTriage";
import type { AssessmentReadiness } from "../../state/assessmentReadiness";
import type { DataSourceState } from "../../types/dataSource";

export type TopologyConstructNodeRole =
  | "unknown"
  | "router"
  | "switch"
  | "firewall"
  | "server"
  | "endpoint";

export type TopologyConstructNodeLayer =
  | "physical"
  | "logical"
  | "service"
  | "unknown";

export type TopologyConstructLinkKind =
  | "physical"
  | "logical"
  | "tunnel"
  | "inferred"
  | "unknown";

export type TopologyConstructEvidenceState =
  | "none"
  | "inferred"
  | "imported";

export type TopologyConstructRiskLevel = "normal" | "warning" | "critical";

export type TopologyConstructRiskSeverity = "info" | "warning" | "critical";

export type TopologyConstructRiskTargetKind =
  | "construct"
  | "node"
  | "link"
  | "cluster";

export type TopologyConstructLayerKind =
  | "physical"
  | "logical"
  | "service"
  | "evidence"
  | "risk";

export type TopologyConstructProjection =
  | "flat"
  | "layered"
  | "radial"
  | "force";

export type TopologyConstructDensity =
  | "empty"
  | "low"
  | "medium"
  | "high";

export interface TopologyConstructNode {
  readonly id: string;
  readonly label: string;
  readonly role: TopologyConstructNodeRole;
  readonly vendor: string | null;
  readonly platform: string | null;
  readonly layer: TopologyConstructNodeLayer;
  readonly evidence_state: TopologyConstructEvidenceState;
  readonly risk_level: TopologyConstructRiskLevel;
}

export interface TopologyConstructLink {
  readonly id: string;
  readonly source_node_id: string;
  readonly target_node_id: string;
  readonly kind: TopologyConstructLinkKind;
  readonly evidence_state: TopologyConstructEvidenceState;
  readonly risk_level: TopologyConstructRiskLevel;
}

export interface TopologyConstructCluster {
  readonly id: string;
  readonly label: string;
  readonly node_ids: readonly string[];
  readonly reason_code: string;
}

export interface TopologyConstructLayer {
  readonly id: string;
  readonly label: string;
  readonly kind: TopologyConstructLayerKind;
  readonly visible_by_default: boolean;
}

export interface TopologyConstructRiskSupportingCounts {
  readonly node_count?: number;
  readonly link_count?: number;
  readonly accepted_evidence_total?: number;
  readonly rejected_evidence_total?: number;
  readonly attempted_import_count?: number;
}

export interface TopologyConstructRiskFlag {
  readonly id: string;
  readonly severity: TopologyConstructRiskSeverity;
  readonly reason_code: string;
  readonly target_kind: TopologyConstructRiskTargetKind;
  readonly target_id: string | null;
  readonly supporting_counts: TopologyConstructRiskSupportingCounts;
}

export interface TopologyConstructLayoutHints {
  readonly preferred_projection: TopologyConstructProjection;
  readonly supports_3d: boolean;
  readonly supports_minimap: boolean;
  readonly density: TopologyConstructDensity;
  readonly recommended_focus: string | null;
}

export interface TopologyConstruct {
  readonly construct_id: string;
  readonly created_at: string;
  readonly source_state: DataSourceState;
  readonly node_count: number;
  readonly link_count: number;
  readonly cluster_count: number;
  readonly layer_count: number;
  readonly risk_flag_count: number;
  readonly nodes: readonly TopologyConstructNode[];
  readonly links: readonly TopologyConstructLink[];
  readonly clusters: readonly TopologyConstructCluster[];
  readonly layers: readonly TopologyConstructLayer[];
  readonly risk_flags: readonly TopologyConstructRiskFlag[];
  readonly layout_hints: TopologyConstructLayoutHints;
  readonly limitations: readonly string[];
}

export const CONSTRUCT_HONESTY_LIMITATIONS: readonly string[] = [
  "No 3D rendering has run.",
  "No layout engine has run.",
  "Construct uses current safe topology/evidence summaries only.",
];

const DEFAULT_LAYERS: readonly TopologyConstructLayer[] = [
  { id: "layer-physical", label: "Physical", kind: "physical", visible_by_default: true },
  { id: "layer-logical", label: "Logical", kind: "logical", visible_by_default: true },
  { id: "layer-service", label: "Service", kind: "service", visible_by_default: false },
  { id: "layer-evidence", label: "Evidence", kind: "evidence", visible_by_default: true },
  { id: "layer-risk", label: "Risk", kind: "risk", visible_by_default: true },
];

export const EMPTY_TOPOLOGY_CONSTRUCT: TopologyConstruct = {
  construct_id: "construct-empty",
  created_at: "1970-01-01T00:00:00.000Z",
  source_state: "not_connected",
  node_count: 0,
  link_count: 0,
  cluster_count: 0,
  layer_count: DEFAULT_LAYERS.length,
  risk_flag_count: 0,
  nodes: [],
  links: [],
  clusters: [],
  layers: DEFAULT_LAYERS,
  risk_flags: [],
  layout_hints: {
    preferred_projection: "flat",
    supports_3d: false,
    supports_minimap: false,
    density: "empty",
    recommended_focus: null,
  },
  limitations: CONSTRUCT_HONESTY_LIMITATIONS,
};

export interface BuildTopologyConstructInputs {
  readonly topology: TopologySourceView;
  readonly summary: WorkbenchContextSummary;
  readonly triage: DiagnoseTriage;
  readonly readiness: AssessmentReadiness;
  readonly now?: () => string;
  readonly idFactory?: (topology: TopologySourceView) => string;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultIdFactory(topology: TopologySourceView): string {
  return `construct-${topology.sourceState}-${topology.nodeCount}-${topology.edgeCount}`;
}

function densityOf(node_count: number): TopologyConstructDensity {
  if (node_count === 0) return "empty";
  if (node_count <= 20) return "low";
  if (node_count <= 100) return "medium";
  return "high";
}

function projectionOf(
  density: TopologyConstructDensity,
  link_count: number,
): TopologyConstructProjection {
  if (density === "empty") return "flat";
  if (density === "low") return "layered";
  if (link_count > 0) return "force";
  return "radial";
}

function mapNodes(
  topology: TopologySourceView,
  evidenceState: TopologyConstructEvidenceState,
  nodeRiskLevel: TopologyConstructRiskLevel,
): readonly TopologyConstructNode[] {
  const v = topology.view;
  if (v === null) return [];
  return v.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    role: "unknown",
    vendor: n.vendor,
    platform: n.platform_id,
    layer: "unknown",
    evidence_state: evidenceState,
    risk_level: nodeRiskLevel,
  }));
}

function mapLinks(
  topology: TopologySourceView,
  evidenceState: TopologyConstructEvidenceState,
): readonly TopologyConstructLink[] {
  const v = topology.view;
  if (v === null) return [];
  return v.edges.map((e) => ({
    id: e.id,
    source_node_id: e.source_node_id,
    target_node_id: e.target_node_id,
    kind: "unknown",
    evidence_state: evidenceState,
    risk_level: "normal",
  }));
}

function buildClusters(
  nodes: readonly TopologyConstructNode[],
  topology: TopologySourceView,
): readonly TopologyConstructCluster[] {
  if (nodes.length === 0) return [];
  return [
    {
      id: `cluster-default-${topology.environmentId ?? "none"}`,
      label: "Default cluster",
      node_ids: nodes.map((n) => n.id),
      reason_code: "single_default_cluster",
    },
  ];
}

function buildRiskFlags(
  summary: WorkbenchContextSummary,
  triage: DiagnoseTriage,
): readonly TopologyConstructRiskFlag[] {
  const flags: TopologyConstructRiskFlag[] = [];
  let i = 1;

  const has = (rc: string) =>
    triage.findings.some((f) => f.reason_code === rc);

  if (has("evidence_exists_but_no_topology")) {
    flags.push({
      id: `risk-${i++}-evidence-no-topology`,
      severity: "critical",
      reason_code: "evidence_exists_but_no_topology",
      target_kind: "construct",
      target_id: null,
      supporting_counts: {
        accepted_evidence_total:
          summary.evidence_import.accepted_evidence_total,
        node_count: summary.topology.node_count,
      },
    });
  }
  if (has("topology_without_edges")) {
    flags.push({
      id: `risk-${i++}-topology-no-edges`,
      severity: "warning",
      reason_code: "topology_without_edges",
      target_kind: "construct",
      target_id: null,
      supporting_counts: {
        node_count: summary.topology.node_count,
        link_count: summary.topology.edge_count,
      },
    });
  }
  if (has("evidence_rejected_majority")) {
    flags.push({
      id: `risk-${i++}-evidence-rejected-majority`,
      severity: "critical",
      reason_code: "evidence_rejected_majority",
      target_kind: "construct",
      target_id: null,
      supporting_counts: {
        attempted_import_count:
          summary.evidence_import.attempted_import_count,
        rejected_evidence_total:
          summary.evidence_import.rejected_evidence_total,
        accepted_evidence_total:
          summary.evidence_import.accepted_evidence_total,
      },
    });
  }
  if (has("crawl_preview_not_imported")) {
    flags.push({
      id: `risk-${i++}-crawl-preview-not-imported`,
      severity: "warning",
      reason_code: "crawl_preview_not_imported",
      target_kind: "construct",
      target_id: null,
      supporting_counts: {
        accepted_evidence_total:
          summary.evidence_import.accepted_evidence_total,
      },
    });
  }
  return flags;
}

export function buildTopologyConstruct(
  inputs: BuildTopologyConstructInputs,
): TopologyConstruct {
  const {
    topology,
    summary,
    triage,
    readiness,
    now = defaultNow,
    idFactory = defaultIdFactory,
  } = inputs;
  void readiness;

  const evidenceState: TopologyConstructEvidenceState =
    summary.evidence_import.accepted_evidence_total > 0
      ? "imported"
      : summary.evidence_import.attempted_import_count > 0
        ? "inferred"
        : "none";

  const hasCriticalTriage = triage.critical_count > 0;
  const nodeRiskLevel: TopologyConstructRiskLevel = hasCriticalTriage
    ? "warning"
    : "normal";

  const nodes = mapNodes(topology, evidenceState, nodeRiskLevel);
  const links = mapLinks(topology, evidenceState);
  const clusters = buildClusters(nodes, topology);
  const risk_flags = buildRiskFlags(summary, triage);

  const density = densityOf(nodes.length);
  const layout_hints: TopologyConstructLayoutHints = {
    preferred_projection: projectionOf(density, links.length),
    supports_3d: nodes.length > 0,
    supports_minimap: nodes.length > 20,
    density,
    recommended_focus: nodes.length > 0 ? nodes[0].id : null,
  };

  return {
    construct_id: idFactory(topology),
    created_at: now(),
    source_state: topology.sourceState,
    node_count: nodes.length,
    link_count: links.length,
    cluster_count: clusters.length,
    layer_count: DEFAULT_LAYERS.length,
    risk_flag_count: risk_flags.length,
    nodes,
    links,
    clusters,
    layers: DEFAULT_LAYERS,
    risk_flags,
    layout_hints,
    limitations: CONSTRUCT_HONESTY_LIMITATIONS,
  };
}
