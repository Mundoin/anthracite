/**
 * D3C — Cortex scope filter tests.
 *
 * Covers cycleScope, filterByScope, scope cycle order, label map.
 */

import { describe, expect, it } from "vitest";

import { MODE_CATALOGUE } from "../../../contracts/modeCatalogue";
import { buildCortexIndex } from "../../navigation/cortexCatalogueAdapter";
import {
  SCOPE_FILTER_LABEL,
  SCOPE_FILTER_ORDER,
  cycleScope,
  filterByScope,
} from "../cortexOverlayState";

const INDEX = buildCortexIndex(MODE_CATALOGUE);

describe("cortexScope · cycleScope", () => {
  it("cycles forward through the fixed order", () => {
    let scope = SCOPE_FILTER_ORDER[0];
    const seen: string[] = [scope];
    for (let i = 0; i < SCOPE_FILTER_ORDER.length; i += 1) {
      scope = cycleScope(scope, 1);
      seen.push(scope);
    }
    // After 7 steps from "all", we wrap back to "all".
    expect(seen[seen.length - 1]).toBe("all");
    // Every entry of the cycle covered.
    expect(new Set(seen).size).toBe(SCOPE_FILTER_ORDER.length);
  });

  it("cycles backward through the fixed order", () => {
    expect(cycleScope("all", -1)).toBe(SCOPE_FILTER_ORDER[SCOPE_FILTER_ORDER.length - 1]);
    expect(cycleScope("modes", -1)).toBe("all");
  });

  it("labels exist for every scope", () => {
    for (const s of SCOPE_FILTER_ORDER) {
      expect(SCOPE_FILTER_LABEL[s]).toBeTruthy();
    }
  });
});

describe("cortexScope · filterByScope", () => {
  it("'all' returns the index unchanged", () => {
    expect(filterByScope(INDEX, "all")).toBe(INDEX);
  });

  it("'modes' keeps only mode-kind entries", () => {
    const filtered = filterByScope(INDEX, "modes");
    expect(filtered.length).toBe(MODE_CATALOGUE.modes.length);
    for (const e of filtered) {
      expect(e.scope).toBe("modes");
    }
  });

  it("'workflows' keeps only workflow-kind children", () => {
    const filtered = filterByScope(INDEX, "workflows");
    for (const e of filtered) {
      expect(e.scope).toBe("workflows");
      if (e.kind === "child") expect(e.childKind).toBe("workflow");
    }
  });

  it("'foot' keeps only foot entries", () => {
    const filtered = filterByScope(INDEX, "foot");
    expect(filtered.length).toBe(MODE_CATALOGUE.foot.length);
    for (const e of filtered) {
      expect(e.scope).toBe("foot");
    }
  });

  it("'groups' keeps only group children", () => {
    const filtered = filterByScope(INDEX, "groups");
    for (const e of filtered) {
      expect(e.scope).toBe("groups");
      if (e.kind === "child") expect(e.childKind).toBe("group");
    }
    // Provisioning has 1 group child (Reconciling Config)
    expect(filtered.length).toBeGreaterThanOrEqual(1);
  });
});
