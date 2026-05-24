/**
 * Blueprint Topology Layouts — V1BM.
 *
 * Role-aware, scenario-dispatched layouts for the generated-lab
 * Blueprint canvas. Replaces the V1BF concentric-ring formula
 * with five deterministic variants:
 *
 *   • branch     — small office, two/three rows by role
 *   • campus     — core / distribution / access / wireless stack
 *   • datacenter — spines, leafs, servers; firewall on the side
 *   • metro      — clustered rings on an outer ring (no central ball)
 *   • fallback   — the original concentric ring (kept verbatim)
 *
 * Pure, deterministic, no React, no DOM. Drag-overlay state in
 * `BlueprintTopologyCanvas` layers per-node `(dx, dy)` offsets on top
 * of these world coords. V1BQ — persisted positions survive Reset/Fit;
 * Fit adjusts pan/zoom only, Reset restores pan/zoom only.
 */

import type { GraphReadyTopologyNode } from "../topologyReview";
import type { NodeFamilyCode } from "./blueprintGlyph";
import { resolveIdentity } from "./blueprintIdentity";

export interface NodeLayout {
  node: GraphReadyTopologyNode;
  family: NodeFamilyCode;
  x: number;
  y: number;
}

export type ScenarioKind =
  | "branch"
  | "campus"
  | "datacenter"
  | "metro"
  | "fallback";

export interface LayoutHint {
  readonly scenarioId?: string | null;
  readonly envName?: string | null;
}

/**
 * Map an env hint (scenario id, env name) + node count into the layout
 * kind. Order of checks matters — datacenter / metro / campus are
 * matched on explicit keywords before falling back to count heuristics.
 */
export function detectScenario(
  hint: LayoutHint | null,
  nodeCount: number,
): ScenarioKind {
  const haystack = `${hint?.scenarioId ?? ""} ${hint?.envName ?? ""}`
    .toLowerCase()
    .trim();
  if (/datacenter|\bdc[-_]|\bpod\b|spine|leaf|fabric/.test(haystack)) {
    return "datacenter";
  }
  if (/metro|backbone|mega/.test(haystack)) {
    return "metro";
  }
  if (/campus/.test(haystack)) {
    return "campus";
  }
  if (/branch|small/.test(haystack) || nodeCount <= 12) {
    return "branch";
  }
  return "fallback";
}

/** Top-level dispatcher used by `BlueprintTopologyCanvas`. */
export function layoutNodes(
  nodes: readonly GraphReadyTopologyNode[],
  hint?: LayoutHint | null,
): NodeLayout[] {
  if (nodes.length === 0) return [];
  const scenario = detectScenario(hint ?? null, nodes.length);
  switch (scenario) {
    case "branch":
      return layoutBranch(nodes);
    case "campus":
      return layoutCampus(nodes);
    case "datacenter":
      return layoutDatacenter(nodes);
    case "metro":
      return layoutMetro(nodes);
    case "fallback":
    default:
      return layoutFallback(nodes);
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

interface Tagged {
  node: GraphReadyTopologyNode;
  family: NodeFamilyCode;
}

function sortedTagged(
  nodes: readonly GraphReadyTopologyNode[],
): readonly Tagged[] {
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  // V1BN — resolveIdentity infers family from vendor/platform/label
  // when the role_hint alone is generic, so a node like
  // `fw-fortinet-001` lands in the FW row instead of the UNK row.
  return sorted.map((n) => ({ node: n, family: resolveIdentity(n).family }));
}

function rowSpread(items: readonly Tagged[], y: number, spacing: number): NodeLayout[] {
  if (items.length === 0) return [];
  const totalW = (items.length - 1) * spacing;
  const startX = -totalW / 2;
  return items.map((it, i) => ({
    node: it.node,
    family: it.family,
    x: Math.round(startX + i * spacing),
    y: Math.round(y),
  }));
}

function columnSpread(items: readonly Tagged[], x: number, spacing: number): NodeLayout[] {
  if (items.length === 0) return [];
  const totalH = (items.length - 1) * spacing;
  const startY = -totalH / 2;
  return items.map((it, i) => ({
    node: it.node,
    family: it.family,
    x: Math.round(x),
    y: Math.round(startY + i * spacing),
  }));
}

// ─────────────────────────────────────────────────────────────────
// Layouts
// ─────────────────────────────────────────────────────────────────

/**
 * Branch (small office). Three rows top-down:
 *   row 0  edge / firewall / router
 *   row 1  access / distribution switches + unknown
 *   row 2  hosts / servers / WAPs
 */
function layoutBranch(nodes: readonly GraphReadyTopologyNode[]): NodeLayout[] {
  const tagged = sortedTagged(nodes);
  const r0: Tagged[] = [];
  const r1: Tagged[] = [];
  const r2: Tagged[] = [];
  for (const t of tagged) {
    switch (t.family) {
      case "FW":
      case "EDGE-RT":
      case "CORE-RT":
        r0.push(t);
        break;
      case "ACC-SW":
      case "DIST-SW":
      case "UNK":
        r1.push(t);
        break;
      case "SRV":
      case "WAP":
        r2.push(t);
        break;
    }
  }
  return [
    ...rowSpread(r0, -180, 200),
    ...rowSpread(r1, -20, 180),
    ...rowSpread(r2, 160, 140),
  ];
}

/**
 * Campus. Four rows top-down:
 *   row 0  core routers
 *   row 1  distribution switches + edge routers
 *   row 2  access switches + firewalls
 *   row 3  servers / WAPs
 */
function layoutCampus(nodes: readonly GraphReadyTopologyNode[]): NodeLayout[] {
  const tagged = sortedTagged(nodes);
  const r0: Tagged[] = [];
  const r1: Tagged[] = [];
  const r2: Tagged[] = [];
  const r3: Tagged[] = [];
  for (const t of tagged) {
    switch (t.family) {
      case "CORE-RT":
        r0.push(t);
        break;
      case "DIST-SW":
      case "EDGE-RT":
        r1.push(t);
        break;
      case "ACC-SW":
      case "FW":
      case "UNK":
        r2.push(t);
        break;
      case "SRV":
      case "WAP":
        r3.push(t);
        break;
    }
  }
  return [
    ...rowSpread(r0, -260, 220),
    ...rowSpread(r1, -100, 180),
    ...rowSpread(r2, 60, 150),
    ...rowSpread(r3, 220, 110),
  ];
}

/**
 * Datacenter / pod / fabric. Spines top row, leafs middle row,
 * servers bottom row, firewalls anchored to a left column.
 */
function layoutDatacenter(nodes: readonly GraphReadyTopologyNode[]): NodeLayout[] {
  const tagged = sortedTagged(nodes);
  const spines: Tagged[] = []; // CORE-RT
  const leafs: Tagged[] = []; // DIST-SW + ACC-SW
  const servers: Tagged[] = []; // SRV + WAP
  const firewalls: Tagged[] = []; // FW
  const other: Tagged[] = []; // EDGE-RT + UNK
  for (const t of tagged) {
    switch (t.family) {
      case "CORE-RT":
        spines.push(t);
        break;
      case "DIST-SW":
      case "ACC-SW":
        leafs.push(t);
        break;
      case "SRV":
      case "WAP":
        servers.push(t);
        break;
      case "FW":
        firewalls.push(t);
        break;
      case "EDGE-RT":
      case "UNK":
        other.push(t);
        break;
    }
  }
  return [
    ...rowSpread(spines, -220, 220),
    ...rowSpread(leafs, -40, 150),
    ...rowSpread(servers, 160, 120),
    ...columnSpread(firewalls, -480, 120),
    ...rowSpread(other, -360, 160),
  ];
}

/**
 * Metro / mega city / backbone. Cluster the node set into roughly
 * `ceil(n / 12)` clusters of ≤12 nodes each. Place cluster centres
 * on a big outer ring so the graph reads as several sites instead
 * of one dense ball. Inside each cluster, lay nodes out on a small
 * inner ring.
 */
function layoutMetro(nodes: readonly GraphReadyTopologyNode[]): NodeLayout[] {
  const tagged = sortedTagged(nodes);
  const n = tagged.length;
  const clusterCount = Math.max(4, Math.ceil(n / 12));
  const ringRadius = Math.max(420, 80 * clusterCount);
  const innerRadius = 90;
  const out: NodeLayout[] = [];
  const perCluster = Math.ceil(n / clusterCount);
  for (let ci = 0; ci < clusterCount; ci++) {
    const ang = (2 * Math.PI * ci) / clusterCount - Math.PI / 2;
    const cx = ringRadius * Math.cos(ang);
    const cy = ringRadius * Math.sin(ang);
    const startIdx = ci * perCluster;
    const cnt = Math.max(0, Math.min(perCluster, n - startIdx));
    for (let i = 0; i < cnt; i++) {
      const t = tagged[startIdx + i];
      const a2 = (2 * Math.PI * i) / Math.max(1, cnt);
      out.push({
        node: t.node,
        family: t.family,
        x: Math.round(cx + innerRadius * Math.cos(a2)),
        y: Math.round(cy + innerRadius * Math.sin(a2)),
      });
    }
  }
  return out;
}

/**
 * Fallback — the original V1BF concentric-ring formula kept verbatim
 * so any graph that doesn't match a named scenario renders identically
 * to pre-V1BM. Dispatched only for non-keyword scenarios with > 12
 * nodes.
 */
function layoutFallback(nodes: readonly GraphReadyTopologyNode[]): NodeLayout[] {
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const n = sorted.length;
  if (n === 0) return [];
  const ringSize = n <= 12 ? n : Math.ceil(Math.sqrt(n) * 2);
  const baseRadius = Math.max(140, 28 * ringSize);
  const out: NodeLayout[] = [];
  for (let i = 0; i < n; i++) {
    const ringIndex = Math.floor(i / ringSize);
    const slot = i % ringSize;
    const slotsThisRing = Math.min(ringSize, n - ringIndex * ringSize);
    const r = baseRadius + ringIndex * 110;
    const angle = (2 * Math.PI * slot) / slotsThisRing - Math.PI / 2;
    out.push({
      node: sorted[i],
      family: resolveIdentity(sorted[i]).family,
      x: Math.round(r * Math.cos(angle)),
      y: Math.round(r * Math.sin(angle)),
    });
  }
  return out;
}
