/**
 * Blueprint glyph helpers — role → family code mapping + density bands.
 *
 * Stage V1BF. Maps GraphReadyTopologyNode.role_hint into the 8 node families
 * named in design-review/.../contracts/topology-node-family-contract.md
 * and selects a density band based on visible node count.
 */

import type { GraphReadyTopologyNode } from "../topologyReview";

export type NodeFamilyCode =
  | "ACC-SW"
  | "DIST-SW"
  | "CORE-RT"
  | "EDGE-RT"
  | "FW"
  | "SRV"
  | "WAP"
  | "UNK";

/**
 * Density bands map a glyph to a render mode. Following the desk
 * design-board contract (`density-and-zoom-rules.md`), we degrade
 * by node count rather than zoom (zoom control lands later):
 *
 *   ≤  8 nodes  → "full"        full glyph + family code + label
 *   ≤ 24 nodes  → "faceplate"   merged faceplate band + family code
 *   ≤ 48 nodes  → "silhouette"  silhouette + state ring + family code
 *      >48      → "dot"         dot at state-ring colour
 */
export type DensityBand = "full" | "faceplate" | "silhouette" | "dot";

export function pickDensityBand(nodeCount: number): DensityBand {
  if (nodeCount <= 8) return "full";
  if (nodeCount <= 24) return "faceplate";
  if (nodeCount <= 48) return "silhouette";
  return "dot";
}

/**
 * Derive a family code from a graph-ready node. Vendor/platform are
 * available but unused at v0 — we only branch on role_hint until
 * downstream resolvers grow access/distribution/core distinctions.
 */
export function familyOf(node: GraphReadyTopologyNode): NodeFamilyCode {
  const hint = (node.role_hint || "").toLowerCase();
  if (hint.includes("firewall")) return "FW";
  if (hint.includes("wireless") || hint === "ap" || hint === "wap") return "WAP";
  if (hint.includes("server") || hint.includes("endpoint") || hint.includes("host")) {
    return "SRV";
  }
  if (hint.includes("router")) {
    if (hint.includes("core")) return "CORE-RT";
    return "EDGE-RT";
  }
  if (hint.includes("switch")) {
    if (hint.includes("dist")) return "DIST-SW";
    return "ACC-SW";
  }
  return "UNK";
}

/**
 * Per-family silhouette frame dimensions in canvas units. Width/height
 * are the *outer* glyph footprint at "full" density; lower bands scale
 * these down via CSS transform.
 */
export const FAMILY_FRAME: Record<
  NodeFamilyCode,
  { w: number; h: number; rx: number }
> = {
  "ACC-SW":  { w: 88, h: 26, rx: 2 },
  "DIST-SW": { w: 88, h: 36, rx: 2 },
  "CORE-RT": { w: 96, h: 60, rx: 3 },
  "EDGE-RT": { w: 90, h: 32, rx: 3 },
  FW:        { w: 84, h: 32, rx: 3 },
  SRV:       { w: 80, h: 36, rx: 1 },
  WAP:       { w: 52, h: 24, rx: 12 },
  UNK:       { w: 78, h: 26, rx: 1 },
};

/**
 * Operational state for the outer ring. Until live state arrives, every
 * lab-projected glyph is "ok"; the contract keeps the slot open.
 */
export type OperationalState = "ok" | "warn" | "err" | "deferred" | "critical";

export function stateRingColor(state: OperationalState): string {
  switch (state) {
    case "ok": return "var(--topo-ok)";
    case "warn": return "var(--topo-warn)";
    case "err": return "var(--topo-err)";
    case "deferred": return "var(--topo-deferred)";
    case "critical": return "var(--topo-critical)";
  }
}
