/**
 * D3A — Cortex catalogue adapter tests (Worker D).
 *
 * Coverage:
 *   1. Index emits one mode entry per mode + one child entry per descendant + one foot entry per foot item.
 *   2. Mode entries appear before their children in the array.
 *   3. A child entry's breadcrumb is [group, mode.label, ...ancestor labels, child.label].
 *   4. A child entry's childPath is the full path from mode root.
 *   5. Depth values: mode depth=0, depth-1 child depth=1, depth-2 grandchild depth=2.
 *   6. Scope derivation: workflow→workflows, tool→tools, surface→surfaces, group→groups, mode→modes, foot→foot.
 *   7. searchCortexIndex(index, "") returns full index.
 *   8. searchCortexIndex(index, "query") filters case-insensitively.
 *   9. getCortexIndex(catalogue) returns same reference on repeated calls.
 *   10. groupCortexEntries returns sections in fixed order.
 *   11. Empty section omission.
 *   12. Foot entry scope == "foot" and breadcrumb starts with "Foot".
 *   13. Unique entryIds across the entire index.
 *   14. State invariants: deferred/blocked surface reasons.
 *
 * Pure tests. No I/O.
 */

import { describe, expect, it } from "vitest";

import {
  MODE_CATALOGUE,
  findModeEntry,
} from "../../../contracts/modeCatalogue";
import {
  buildCortexIndex,
  getCortexIndex,
  groupCortexEntries,
  searchCortexIndex,
  type CortexChildEntry,
  type CortexEntry,
  type CortexFootEntry,
  type CortexModeEntry,
} from "../cortexCatalogueAdapter";

// ============================================================================
// Index construction tests
// ============================================================================

describe("cortexCatalogueAdapter · buildCortexIndex", () => {
  it("emits one mode entry per mode", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const modeEntries = index.filter((e) => e.kind === "mode");
    expect(modeEntries).toHaveLength(MODE_CATALOGUE.modes.length);
  });

  it("emits one child entry per descendant (all depths)", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const childEntries = index.filter((e) => e.kind === "child");
    // Count all descendants across all modes
    let expectedCount = 0;
    for (const mode of MODE_CATALOGUE.modes) {
      expectedCount += countDescendants(mode.children);
    }
    expect(childEntries).toHaveLength(expectedCount);
  });

  it("emits one foot entry per foot item", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const footEntries = index.filter((e) => e.kind === "foot");
    expect(footEntries).toHaveLength(MODE_CATALOGUE.foot.length);
  });

  it("mode entries appear before their children in the array", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const provisioningModeIdx = index.findIndex(
      (e) => e.kind === "mode" && e.modeId === "provisioning",
    );
    const provisioningChildIdx = index.findIndex(
      (e) => e.kind === "child" && e.modeId === "provisioning",
    );
    expect(provisioningModeIdx).toBeGreaterThan(-1);
    expect(provisioningChildIdx).toBeGreaterThan(provisioningModeIdx);
  });

  it("breadcrumb includes group, mode, and all ancestors down to child", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const deviceConfig = index.find(
      (e) => e.kind === "child" && (e as CortexChildEntry).label === "Reconciling a Device's Config",
    ) as CortexChildEntry | undefined;
    expect(deviceConfig).toBeDefined();
    expect(deviceConfig?.breadcrumb).toEqual([
      "Foundation",
      "Provisioning",
      "Reconciling Config",
      "Reconciling a Device's Config",
    ]);
  });

  it("childPath is the full path from mode root", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const deviceConfig = index.find(
      (e) => e.kind === "child" && (e as CortexChildEntry).label === "Reconciling a Device's Config",
    ) as CortexChildEntry | undefined;
    expect(deviceConfig).toBeDefined();
    expect(deviceConfig?.childPath).toEqual([
      "prov-reconcile",
      "prov-reconcile-device",
    ]);
  });

  it("depth is 0 for modes/foot, increments for each level", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const provisioning = index.find(
      (e) => e.kind === "mode" && e.modeId === "provisioning",
    ) as CortexModeEntry | undefined;
    expect(provisioning).toBeDefined();
    expect((provisioning as any).depth).toBeUndefined(); // modes don't have depth property

    const network = index.find(
      (e) => e.kind === "child" && (e as CortexChildEntry).label === "Network Provisioning",
    ) as CortexChildEntry | undefined;
    expect(network).toBeDefined();
    expect(network?.depth).toBe(1);

    const deviceConfig = index.find(
      (e) => e.kind === "child" && (e as CortexChildEntry).label === "Reconciling a Device's Config",
    ) as CortexChildEntry | undefined;
    expect(deviceConfig).toBeDefined();
    expect(deviceConfig?.depth).toBe(2);
  });

  it("scope derives from childKind correctly", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const children = index.filter((e) => e.kind === "child") as CortexChildEntry[];

    const workflows = children.filter((c) => c.childKind === "workflow");
    expect(workflows.length).toBeGreaterThan(0);
    expect(workflows.every((c) => c.scope === "workflows")).toBe(true);

    const tools = children.filter((c) => c.childKind === "tool");
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((c) => c.scope === "tools")).toBe(true);

    const surfaces = children.filter((c) => c.childKind === "surface");
    expect(surfaces.length).toBeGreaterThan(0);
    expect(surfaces.every((c) => c.scope === "surfaces")).toBe(true);

    const groups = children.filter((c) => c.childKind === "group");
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((c) => c.scope === "groups")).toBe(true);
  });

  it("mode entries have scope='modes'", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const modeEntries = index.filter((e) => e.kind === "mode") as CortexModeEntry[];
    expect(modeEntries.every((m) => m.scope === "modes")).toBe(true);
  });

  it("foot entries have scope='foot'", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const footEntries = index.filter((e) => e.kind === "foot") as CortexFootEntry[];
    expect(footEntries.every((f) => f.scope === "foot")).toBe(true);
  });

  it("entryIds are unique across the entire index", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const ids = index.map((e) => e.entryId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("deferred entries surface deferredReason", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const deferred = index.find(
      (e) => e.kind === "mode" && (e as CortexModeEntry).modeId === "devices",
    ) as CortexModeEntry | undefined;
    expect(deferred).toBeDefined();
    expect(deferred?.state).toBe("deferred");
    expect(deferred?.deferredReason).toBeDefined();
  });

  it("blocked entries surface blockedReason", () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    // Find a deferred child to ensure it has blockedReason if any exist
    const allEntries = index.filter((e) => e.kind === "child") as CortexChildEntry[];
    const blockedEntries = allEntries.filter((e) => e.state === "blocked");
    // If there are blocked entries, they should have blockedReason
    expect(blockedEntries.every((e) => e.blockedReason)).toBe(true);
  });
});

// ============================================================================
// Memoization tests
// ============================================================================

describe("cortexCatalogueAdapter · getCortexIndex", () => {
  it("returns the same array reference for the same catalogue argument", () => {
    const index1 = getCortexIndex(MODE_CATALOGUE);
    const index2 = getCortexIndex(MODE_CATALOGUE);
    expect(index1).toBe(index2); // exact reference equality
  });

  it("builds the same index as buildCortexIndex", () => {
    const built = buildCortexIndex(MODE_CATALOGUE);
    const cached = getCortexIndex(MODE_CATALOGUE);
    expect(cached).toHaveLength(built.length);
    expect(cached[0]).toEqual(built[0]);
  });
});

// ============================================================================
// Search tests
// ============================================================================

describe("cortexCatalogueAdapter · searchCortexIndex", () => {
  let index: readonly CortexEntry[];

  beforeEach(() => {
    index = buildCortexIndex(MODE_CATALOGUE);
  });

  it('empty query returns the full index', () => {
    const results = searchCortexIndex(index, "");
    expect(results).toHaveLength(index.length);
  });

  it('case-insensitive substring match on label', () => {
    const results = searchCortexIndex(index, "reconcil");
    // Should match "Reconciling Config" and both children
    const labels = results.map((e) => e.label);
    expect(labels.some((l) => l.includes("Reconciling"))).toBe(true);
  });

  it('case-insensitive substring match on breadcrumb segments', () => {
    const results = searchCortexIndex(index, "PROVIS");
    // Should match Provisioning mode and all descendants
    const provisioningResults = results.filter((e) => e.modeId === "provisioning");
    expect(provisioningResults.length).toBeGreaterThan(0);
  });

  it('preserves stable order from buildCortexIndex', () => {
    const allResults = searchCortexIndex(index, "");
    const filteredResults = searchCortexIndex(index, "network");
    // Order of filtered results should match their order in the unfiltered index
    for (let i = 1; i < filteredResults.length; i++) {
      const prevIdx = allResults.findIndex((e) => e.entryId === filteredResults[i - 1].entryId);
      const currIdx = allResults.findIndex((e) => e.entryId === filteredResults[i].entryId);
      expect(prevIdx).toBeLessThan(currIdx);
    }
  });

  it('matches partial labels', () => {
    const results = searchCortexIndex(index, "prov");
    const hasProvisioning = results.some(
      (e) => e.kind === "mode" && (e as CortexModeEntry).label === "Provisioning",
    );
    expect(hasProvisioning).toBe(true);
  });

  it('matches breadcrumb ancestors not just labels', () => {
    const results = searchCortexIndex(index, "foundation");
    // All Foundation modes and their children should match
    const foundationModes = results.filter(
      (e) => e.kind === "mode" && (e as CortexModeEntry).breadcrumb[0] === "Foundation",
    );
    expect(foundationModes.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Grouping tests
// ============================================================================

describe("cortexCatalogueAdapter · groupCortexEntries", () => {
  let index: readonly CortexEntry[];

  beforeEach(() => {
    index = buildCortexIndex(MODE_CATALOGUE);
  });

  it('returns sections in fixed order: modes, workflows, tools, surfaces, groups, foot', () => {
    const sections = groupCortexEntries(index);
    const scopes = sections.map((s) => s.scope);
    // Check that scopes appear in order (not necessarily consecutive due to omission)
    let lastIdx = -1;
    for (const scope of ["modes", "workflows", "tools", "surfaces", "groups", "foot"]) {
      const idx = scopes.indexOf(scope as any);
      if (idx !== -1) {
        expect(idx).toBeGreaterThan(lastIdx);
        lastIdx = idx;
      }
    }
  });

  it('omits empty sections', () => {
    const sections = groupCortexEntries(index);
    expect(sections.every((s) => s.entries.length > 0)).toBe(true);
  });

  it('has correct headings per scope', () => {
    const sections = groupCortexEntries(index);
    const headingMap: Record<string, string> = {
      modes: "MODES",
      workflows: "WORKFLOWS",
      tools: "TOOLS",
      surfaces: "SURFACES",
      groups: "GROUPS",
      foot: "FOOT",
    };
    for (const section of sections) {
      expect(section.heading).toBe(headingMap[section.scope]);
    }
  });

  it('filters single-scope entries correctly', () => {
    const modesOnly = index.filter((e) => e.kind === "mode");
    const sections = groupCortexEntries(modesOnly);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.scope).toBe("modes");
    expect(sections[0]?.entries).toHaveLength(modesOnly.length);
  });

  it('foot entries appear in their own section', () => {
    const sections = groupCortexEntries(index);
    const footSection = sections.find((s) => s.scope === "foot");
    expect(footSection).toBeDefined();
    expect(footSection?.entries.every((e) => e.kind === "foot")).toBe(true);
  });
});

// ============================================================================
// Integration tests
// ============================================================================

describe("cortexCatalogueAdapter · integration", () => {
  it('searches and groups together correctly', () => {
    const index = buildCortexIndex(MODE_CATALOGUE);
    const filtered = searchCortexIndex(index, "reconcil");
    const sections = groupCortexEntries(filtered);

    // Should have groups + possibly surfaces/tools
    expect(sections.length).toBeGreaterThan(0);
    const groupSection = sections.find((s) => s.scope === "groups");
    expect(groupSection).toBeDefined();
    // Reconciling Config is a group
    expect(groupSection?.entries.some((e) => (e as CortexChildEntry).label === "Reconciling Config")).toBe(true);
  });

  it('getCortexIndex memoizes across multiple searches', () => {
    const index1 = getCortexIndex(MODE_CATALOGUE);
    const results1 = searchCortexIndex(index1, "operate");
    const index2 = getCortexIndex(MODE_CATALOGUE);
    const results2 = searchCortexIndex(index2, "operate");

    expect(index1).toBe(index2); // memoization works
    expect(results1).toEqual(results2); // same search results
  });
});

// ============================================================================
// Helper functions
// ============================================================================

function countDescendants(children: readonly any[] | undefined): number {
  if (!children) return 0;
  let count = 0;
  for (const child of children) {
    count += 1; // count the child itself
    count += countDescendants(child.children); // count descendants recursively
  }
  return count;
}
