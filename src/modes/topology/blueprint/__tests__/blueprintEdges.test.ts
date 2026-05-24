/**
 * V1BN — blueprintEdges routing tests.
 */

import { describe, expect, it } from "vitest";

import { routeEdge } from "../blueprintEdges";

const A = { x: 0, y: 0 };
const B_DIFF_ROW = { x: 400, y: 200 };
const B_SAME_ROW = { x: 400, y: 0 };

describe("routeEdge — branch/campus/datacenter elbow", () => {
  it("returns an elbow path when rows differ", () => {
    const r = routeEdge(A, B_DIFF_ROW, { scenario: "branch", band: "full" });
    expect(r.kind).toBe("elbow");
    // Elbow path uses Q (rounded corners) + multiple L commands.
    expect(r.d).toMatch(/Q /);
    expect(r.d.split(" L ").length).toBeGreaterThanOrEqual(3);
  });
  it("returns a straight path when source / target share a row", () => {
    const r = routeEdge(A, B_SAME_ROW, { scenario: "campus", band: "full" });
    expect(r.kind).toBe("straight");
    expect(r.d).toBe("M 0.00 0.00 L 400.00 0.00");
  });
  it("datacenter scenario uses elbow on hierarchical edges", () => {
    const r = routeEdge(A, B_DIFF_ROW, {
      scenario: "datacenter",
      band: "faceplate",
    });
    expect(r.kind).toBe("elbow");
  });
});

describe("routeEdge — metro curve", () => {
  it("returns a cubic bezier S-curve", () => {
    const r = routeEdge(
      { x: 0, y: 0 },
      { x: 600, y: 300 },
      { scenario: "metro", band: "silhouette" },
    );
    expect(r.kind).toBe("curve");
    expect(r.d).toMatch(/^M /);
    expect(r.d).toMatch(/ C /);
  });
  it("dot density inside metro falls back to straight", () => {
    const r = routeEdge(
      { x: 0, y: 0 },
      { x: 600, y: 300 },
      { scenario: "metro", band: "dot" },
    );
    expect(r.kind).toBe("straight");
  });
});

describe("routeEdge — fallback", () => {
  it("uses straight line", () => {
    const r = routeEdge(A, B_DIFF_ROW, {
      scenario: "fallback",
      band: "full",
    });
    expect(r.kind).toBe("straight");
    expect(r.d).toBe("M 0.00 0.00 L 400.00 200.00");
  });
});

describe("routeEdge — determinism", () => {
  it("identical input → identical path string (byte-equal)", () => {
    const ctx = { scenario: "campus" as const, band: "full" as const };
    const a = routeEdge({ x: 12.345, y: 6.789 }, { x: 80, y: 100 }, ctx);
    const b = routeEdge({ x: 12.345, y: 6.789 }, { x: 80, y: 100 }, ctx);
    expect(a.d).toBe(b.d);
    expect(a.kind).toBe(b.kind);
  });
});
