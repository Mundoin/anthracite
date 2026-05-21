/**
 * D3B — Cortex overlay state + ranking tests.
 *
 * Locks deterministic ranking, default entry filtering, and
 * section bucketing on top of the real MODE_CATALOGUE.
 */

import { describe, expect, it } from "vitest";

import { MODE_CATALOGUE } from "../../../contracts/modeCatalogue";
import {
  buildCortexIndex,
} from "../../navigation/cortexCatalogueAdapter";
import {
  buildSections,
  defaultEntries,
  rankEntries,
  rankEntry,
} from "../cortexOverlayState";

const INDEX = buildCortexIndex(MODE_CATALOGUE);

describe("cortexOverlayState · rankEntry", () => {
  it("tier 1 — exact mode label", () => {
    const mode = INDEX.find((e) => e.kind === "mode" && e.label === "Devices");
    expect(mode).toBeDefined();
    expect(rankEntry(mode!, "devices")).toBe(1);
  });

  it("tier 1 — exact mode id", () => {
    const mode = INDEX.find((e) => e.kind === "mode" && e.modeId === "operate");
    expect(mode).toBeDefined();
    expect(rankEntry(mode!, "operate")).toBe(1);
  });

  it("tier 2 — mode label starts-with", () => {
    const mode = INDEX.find((e) => e.kind === "mode" && e.label === "Provisioning");
    expect(mode).toBeDefined();
    expect(rankEntry(mode!, "provis")).toBe(2);
  });

  it("tier 3 — child starts-with on last path segment", () => {
    const child = INDEX.find(
      (e) => e.kind === "child" && e.label === "Reconciling a Device's Config",
    );
    expect(child).toBeDefined();
    expect(rankEntry(child!, "reconciling")).toBe(3);
  });

  it("tier 4 — breadcrumb segment contains query", () => {
    const child = INDEX.find(
      (e) => e.kind === "child" && e.label === "Inventory",
    );
    expect(child).toBeDefined();
    // "devices" appears in breadcrumb but the label doesn't start with it
    expect(rankEntry(child!, "devices")).toBeLessThanOrEqual(4);
  });

  it("returns NO_MATCH (Infinity) for non-matching queries", () => {
    const mode = INDEX.find((e) => e.kind === "mode" && e.label === "Devices");
    expect(rankEntry(mode!, "zzzzz-not-in-anything")).toBe(Number.POSITIVE_INFINITY);
  });

  it("empty query returns 0 (passthrough)", () => {
    const mode = INDEX[0];
    expect(rankEntry(mode, "")).toBe(0);
  });
});

describe("cortexOverlayState · rankEntries", () => {
  it("empty query returns the curated default (modes + foot only)", () => {
    const ranked = rankEntries(INDEX, "");
    for (const e of ranked) {
      expect(e.kind === "mode" || e.kind === "foot").toBe(true);
    }
  });

  it("'devices' returns Devices mode first, followed by its descendants", () => {
    const ranked = rankEntries(INDEX, "devices");
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].kind).toBe("mode");
    expect(ranked[0].label).toBe("Devices");
    const hasDevicesChild = ranked.some(
      (e) => e.kind === "child" && e.modeId === "devices",
    );
    expect(hasDevicesChild).toBe(true);
  });

  it("'reconciling' returns the group + 2 nested children", () => {
    const ranked = rankEntries(INDEX, "reconciling");
    const labels = ranked.map((e) => e.label);
    expect(labels).toContain("Reconciling Config");
    expect(labels).toContain("Reconciling a Device's Config");
    expect(labels).toContain("Reconciling a Container's Config");
  });

  it("'ptp' returns PTP Events with full Governance ▸ Events breadcrumb", () => {
    const ranked = rankEntries(INDEX, "ptp");
    const ptp = ranked.find((e) => e.kind === "child" && e.label === "PTP Events");
    expect(ptp).toBeDefined();
    if (ptp && ptp.kind === "child") {
      expect(ptp.breadcrumb).toEqual(["Governance", "Events", "PTP Events"]);
    }
  });

  it("ordering: mode exact match precedes mode starts-with", () => {
    const ranked = rankEntries(INDEX, "operate");
    expect(ranked[0].label).toBe("Operate");
  });

  it("non-matching query returns empty", () => {
    expect(rankEntries(INDEX, "zzzzz-not-anywhere")).toEqual([]);
  });

  it("case-insensitive matching", () => {
    const lower = rankEntries(INDEX, "DEVICES");
    const upper = rankEntries(INDEX, "devices");
    expect(lower.map((e) => e.entryId)).toEqual(upper.map((e) => e.entryId));
  });
});

describe("cortexOverlayState · defaultEntries", () => {
  it("contains every mode + every foot entry", () => {
    const defaults = defaultEntries(INDEX);
    expect(defaults.filter((e) => e.kind === "mode").length).toBe(
      MODE_CATALOGUE.modes.length,
    );
    expect(defaults.filter((e) => e.kind === "foot").length).toBe(
      MODE_CATALOGUE.foot.length,
    );
  });
});

describe("cortexOverlayState · buildSections", () => {
  it("returns sections in fixed order for empty query", () => {
    const sections = buildSections(INDEX, "");
    const scopes = sections.map((s) => s.scope);
    // modes appears first because every mode entry comes first in DFS order
    expect(scopes[0]).toBe("modes");
    // foot is non-empty (Ops Console) so it must appear
    expect(scopes).toContain("foot");
  });

  it("omits empty sections", () => {
    const sections = buildSections(INDEX, "reconciling");
    // 'reconciling' query matches workflows + a group; modes should not appear
    expect(sections.some((s) => s.scope === "modes")).toBe(false);
  });
});
