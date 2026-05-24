/**
 * Blueprint Edge Routing v0 — V1BN.
 *
 * Pure routing module. Given a source / target point + the current
 * scenario kind + density band, returns an SVG path `d` string plus
 * the routing kind ("elbow" / "curve" / "straight"). The canvas
 * `<Edge>` component renders an `<path>` instead of the V1BF raw
 * `<line>` so links read with visual intent instead of being raw
 * cross-canvas spaghetti.
 *
 * Rules:
 *   • branch / campus / datacenter → orthogonal elbow when rows
 *     differ (typical hierarchy); straight when same row.
 *   • metro → gentle S-curve (cubic bezier) to reduce overlap
 *     across clusters.
 *   • fallback / dot density (>48 nodes) → straight to keep dense
 *     scenes legible.
 */

import type { ScenarioKind } from "./blueprintLayouts";
import type { DensityBand } from "./blueprintGlyph";

export type EdgeRouteKind = "elbow" | "curve" | "straight";

export interface EdgeRoute {
  readonly d: string;
  readonly kind: EdgeRouteKind;
}

export interface RoutePoint {
  readonly x: number;
  readonly y: number;
}

export interface RouteContext {
  readonly scenario: ScenarioKind;
  readonly band: DensityBand;
}

const ELBOW_RADIUS = 8;

/**
 * Compute the SVG path data for an edge between two world-space
 * points under the given scenario + density context.
 */
export function routeEdge(
  from: RoutePoint,
  to: RoutePoint,
  ctx: RouteContext,
): EdgeRoute {
  // Dot density → always straight. The dot glyph is tiny and elbow
  // chrome would dominate.
  if (ctx.band === "dot") {
    return straight(from, to);
  }

  switch (ctx.scenario) {
    case "metro":
      return curve(from, to);
    case "branch":
    case "campus":
    case "datacenter":
      return elbow(from, to);
    case "fallback":
    default:
      return straight(from, to);
  }
}

function straight(a: RoutePoint, b: RoutePoint): EdgeRoute {
  return {
    d: `M ${fmt(a.x)} ${fmt(a.y)} L ${fmt(b.x)} ${fmt(b.y)}`,
    kind: "straight",
  };
}

/**
 * Orthogonal elbow with rounded corner. Routes vertically from
 * source to midY, horizontally across, then vertically to target.
 * Falls back to a straight line if the two points already share
 * a row (|dy| < 1px).
 */
function elbow(a: RoutePoint, b: RoutePoint): EdgeRoute {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dy) < 1) {
    return straight(a, b);
  }
  // Use vertical-first elbow for row-based layouts: source goes
  // down (or up) to midY, crosses horizontally, then connects to
  // target.
  const midY = a.y + dy / 2;
  // Rounded corner radius capped to half the segment length so
  // short elbows still look clean.
  const r = Math.min(
    ELBOW_RADIUS,
    Math.abs(dx) / 2,
    Math.abs(dy) / 2,
  );
  const signX = Math.sign(dx) || 1;
  const signY = Math.sign(dy) || 1;
  // First vertical: from (a.x, a.y) down to (a.x, midY - r * signY)
  // First corner:  arc/quad to (a.x + r*signX, midY)
  // Horizontal:    to (b.x - r*signX, midY)
  // Second corner: to (b.x, midY + r*signY)
  // Final vertical:to (b.x, b.y)
  const d =
    `M ${fmt(a.x)} ${fmt(a.y)}` +
    ` L ${fmt(a.x)} ${fmt(midY - r * signY)}` +
    ` Q ${fmt(a.x)} ${fmt(midY)} ${fmt(a.x + r * signX)} ${fmt(midY)}` +
    ` L ${fmt(b.x - r * signX)} ${fmt(midY)}` +
    ` Q ${fmt(b.x)} ${fmt(midY)} ${fmt(b.x)} ${fmt(midY + r * signY)}` +
    ` L ${fmt(b.x)} ${fmt(b.y)}`;
  return { d, kind: "elbow" };
}

/**
 * Gentle cubic bezier S-curve for metro / cross-cluster routing.
 * Control points sit at the same y as their endpoint but pulled
 * 40 % / 60 % of the dx toward the midpoint, producing a calm
 * sigmoid that reduces overlap with straight-line edges.
 */
function curve(a: RoutePoint, b: RoutePoint): EdgeRoute {
  const dx = b.x - a.x;
  const c1x = a.x + dx * 0.4;
  const c2x = a.x + dx * 0.6;
  const d =
    `M ${fmt(a.x)} ${fmt(a.y)}` +
    ` C ${fmt(c1x)} ${fmt(a.y)}, ${fmt(c2x)} ${fmt(b.y)}, ${fmt(b.x)} ${fmt(b.y)}`;
  return { d, kind: "curve" };
}

function fmt(n: number): string {
  // Snap to 2 decimals so identical inputs produce byte-identical
  // strings (deterministic, easy to assert in tests).
  return n.toFixed(2);
}
