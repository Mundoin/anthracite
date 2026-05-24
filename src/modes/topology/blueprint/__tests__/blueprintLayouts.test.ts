/**
 * V1BM — blueprintLayouts unit tests.
 *
 * Covers scenario detection, per-layout ordering invariants, and
 * determinism (same input → same output across calls).
 */

import { describe, expect, it } from "vitest";

import {
  detectScenario,
  layoutNodes,
  type LayoutHint,
  type NodeLayout,
} from "../blueprintLayouts";
import type { GraphReadyTopologyNode } from "../../topologyReview";

function n(id: string, role: string): GraphReadyTopologyNode {
  return {
    id,
    label: id,
    vendor: null,
    platform_id: null,
    role_hint: role,
    layer: "physical",
  };
}

function ys(layouts: NodeLayout[], id: string): number {
  const found = layouts.find((l) => l.node.id === id);
  if (!found) throw new Error(`layout missing for ${id}`);
  return found.y;
}

describe("detectScenario", () => {
  it("matches branch from scenario_id", () => {
    expect(detectScenario({ scenarioId: "branch-office" }, 8)).toBe("branch");
  });
  it("matches campus from scenario_id", () => {
    expect(detectScenario({ scenarioId: "campus-west" }, 16)).toBe("campus");
  });
  it("matches datacenter from scenario_id", () => {
    expect(detectScenario({ scenarioId: "datacenter-pod-01" }, 24)).toBe(
      "datacenter",
    );
  });
  it("matches datacenter from 'spine' keyword", () => {
    expect(detectScenario({ envName: "spine-leaf-mini" }, 16)).toBe(
      "datacenter",
    );
  });
  it("matches metro from scenario_id", () => {
    expect(detectScenario({ scenarioId: "metro-backbone" }, 96)).toBe("metro");
  });
  it("matches metro from 'mega' keyword", () => {
    expect(detectScenario({ scenarioId: "mega-city" }, 200)).toBe("metro");
  });
  it("falls back to branch when no hint + small node count", () => {
    expect(detectScenario(null, 8)).toBe("branch");
    expect(detectScenario({}, 12)).toBe("branch");
  });
  it("falls back to fallback ring for large unlabeled graphs", () => {
    expect(detectScenario(null, 96)).toBe("fallback");
    expect(detectScenario({ scenarioId: "" }, 50)).toBe("fallback");
  });
});

describe("layoutNodes — branch", () => {
  const hint: LayoutHint = { scenarioId: "branch-office" };
  const nodes = [
    n("a-fw", "firewall"),
    n("b-edge", "edge router"),
    n("c-acc-1", "access switch"),
    n("d-acc-2", "access switch"),
    n("e-srv", "server"),
    n("f-wap", "wireless ap"),
  ];

  it("places firewall + edge router above access switches above hosts", () => {
    const lay = layoutNodes(nodes, hint);
    const fwY = ys(lay, "a-fw");
    const edgeY = ys(lay, "b-edge");
    const accY = ys(lay, "c-acc-1");
    const srvY = ys(lay, "e-srv");
    const wapY = ys(lay, "f-wap");
    expect(fwY).toBeLessThan(accY);
    expect(edgeY).toBeLessThan(accY);
    expect(accY).toBeLessThan(srvY);
    expect(accY).toBeLessThan(wapY);
  });

  it("is deterministic across calls", () => {
    const a = layoutNodes(nodes, hint);
    const b = layoutNodes(nodes, hint);
    expect(a).toEqual(b);
  });
});

describe("layoutNodes — campus", () => {
  const hint: LayoutHint = { scenarioId: "campus-west" };
  const nodes = [
    n("z-core", "core router"),
    n("y-dist", "distribution switch"),
    n("x-acc", "access switch"),
    n("w-srv", "server"),
  ];
  it("places core above distribution above access above hosts", () => {
    const lay = layoutNodes(nodes, hint);
    const core = ys(lay, "z-core");
    const dist = ys(lay, "y-dist");
    const acc = ys(lay, "x-acc");
    const srv = ys(lay, "w-srv");
    expect(core).toBeLessThan(dist);
    expect(dist).toBeLessThan(acc);
    expect(acc).toBeLessThan(srv);
  });
});

describe("layoutNodes — datacenter", () => {
  const hint: LayoutHint = { scenarioId: "datacenter-pod-01" };
  const nodes = [
    n("s1", "core router"),
    n("s2", "core router"),
    n("l1", "access switch"),
    n("l2", "access switch"),
    n("svr-a", "server"),
    n("fw-a", "firewall"),
  ];
  it("places spines above leafs above servers; firewall on left column", () => {
    const lay = layoutNodes(nodes, hint);
    const spine = ys(lay, "s1");
    const leaf = ys(lay, "l1");
    const srv = ys(lay, "svr-a");
    expect(spine).toBeLessThan(leaf);
    expect(leaf).toBeLessThan(srv);
    const fw = lay.find((l) => l.node.id === "fw-a")!;
    expect(fw.x).toBeLessThan(-200);
  });
});

describe("layoutNodes — metro", () => {
  const hint: LayoutHint = { scenarioId: "metro-backbone" };
  const nodes = Array.from({ length: 96 }, (_, i) =>
    n(`m${String(i).padStart(3, "0")}`, "router"),
  );
  it("spreads 96 nodes across multiple clusters (no central dense ball)", () => {
    const lay = layoutNodes(nodes, hint);
    // bbox width must exceed a generous threshold so the graph
    // doesn't collapse to the centre.
    const xs = lay.map((l) => l.x);
    const ys2 = lay.map((l) => l.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys2) - Math.min(...ys2);
    expect(w).toBeGreaterThan(800);
    expect(h).toBeGreaterThan(800);
  });
  it("is deterministic across calls", () => {
    const a = layoutNodes(nodes, hint);
    const b = layoutNodes(nodes, hint);
    expect(a).toEqual(b);
  });
});

describe("layoutNodes — fallback", () => {
  it("returns the concentric ring for large unlabeled graphs", () => {
    const nodes = Array.from({ length: 50 }, (_, i) =>
      n(`r${String(i).padStart(2, "0")}`, "router"),
    );
    const lay = layoutNodes(nodes, null);
    // 50 nodes with no scenario hint → fallback.
    expect(lay.length).toBe(50);
    // Concentric ring: distance from origin should be roughly equal
    // for nodes in the same ring (sample slot 0 + 1 + 2).
    const r0 = Math.hypot(lay[0].x, lay[0].y);
    const r1 = Math.hypot(lay[1].x, lay[1].y);
    const r2 = Math.hypot(lay[2].x, lay[2].y);
    expect(Math.abs(r0 - r1)).toBeLessThan(5);
    expect(Math.abs(r1 - r2)).toBeLessThan(5);
  });
});

describe("layoutNodes — empty input", () => {
  it("returns []", () => {
    expect(layoutNodes([], { scenarioId: "branch-office" })).toEqual([]);
  });
});
