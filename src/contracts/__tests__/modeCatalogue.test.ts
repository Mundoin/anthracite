/**
 * D3A — Mode Catalogue contract tests.
 *
 * Locks the catalogue shape from D3_NAV_SPEC §2 + §9. Tests guard:
 *   - version + depth cap constants
 *   - structural invariants (children always array, unique ids,
 *     icon shape, deferred/blocked reasons)
 *   - required children sets (Hierarchy 6, Devices 9, Events 8,
 *     Provisioning with nested Reconciling Config)
 *   - helpers: flatten, find, getChildren, isExpandable, groupForSidebar
 *   - badge propagation (deferred/partial counts, alerts sum)
 *   - group projection (catalogue order)
 *   - icon registry resolution for every catalogued iconId
 *
 * Pure tests. No I/O.
 */

import { describe, expect, it } from "vitest";

import {
  CATALOGUE_DEPTH_CAP,
  MODE_CATALOGUE,
  MODE_CATALOGUE_VERSION,
  computeBadgeSummary,
  findCatalogueNode,
  findModeEntry,
  flattenModeCatalogue,
  getModeChildren,
  groupChildrenForSidebar,
  isExpandableNode,
  projectCatalogueGroups,
  propagateBadges,
  validateModeCatalogue,
  type ModeChild,
  type ModeEntry,
} from "../modeCatalogue";
import { resolveIcon } from "../../components/icons/iconRegistry";

describe("modeCatalogue · constants", () => {
  it("version is 3", () => {
    expect(MODE_CATALOGUE_VERSION).toBe(3);
    expect(MODE_CATALOGUE.version).toBe(3);
  });

  it("depth cap is 3", () => {
    expect(CATALOGUE_DEPTH_CAP).toBe(3);
  });
});

describe("modeCatalogue · groups", () => {
  it("contains Foundation, Run, Governance, Workshop in catalogue order", () => {
    const groups = projectCatalogueGroups();
    expect(groups.map((g) => g.label)).toEqual([
      "Foundation",
      "Run",
      "Governance",
      "Workshop",
    ]);
  });

  it("foot contains Ops Console", () => {
    const foot = MODE_CATALOGUE.foot;
    expect(foot.length).toBeGreaterThan(0);
    expect(foot.find((f) => f.id === "opsConsole")).toBeDefined();
  });
});

describe("modeCatalogue · Foundation order", () => {
  it("places modes in spec order: Environments → Hierarchy → Devices → Intake → Discovery → Provisioning", () => {
    const foundation = projectCatalogueGroups().find((g) => g.label === "Foundation");
    expect(foundation).toBeDefined();
    expect(foundation?.modes.map((m) => m.id)).toEqual([
      "environments",
      "hierarchy",
      "devices",
      "intake",
      "discovery",
      "provisioning",
    ]);
  });
});

describe("modeCatalogue · required children sets", () => {
  it("Hierarchy carries the environment lifecycle children", () => {
    const children = getModeChildren(MODE_CATALOGUE, "hierarchy");
    expect(children.map((c) => c.label)).toEqual([
      "Environment Overview",
      "Creating an Environment",
      "Building an Environment",
      "Synchronizing an Environment",
      "Synchronization Status",
      "Environment Island",
    ]);
  });

  it("Devices has all 9 required children", () => {
    const children = getModeChildren(MODE_CATALOGUE, "devices");
    expect(children.length).toBe(9);
    expect(children.map((c) => c.label)).toEqual([
      "Inventory",
      "Selected Device",
      "Data Sources",
      "Comparison",
      "Network Utilisation",
      "Compliance Overview",
      "Traffic Flows",
      "Virtual Topologies",
      "Endpoint Search",
    ]);
  });

  it("Events has all 8 required children", () => {
    const children = getModeChildren(MODE_CATALOGUE, "events");
    expect(children.length).toBe(8);
    expect(children.map((c) => c.label)).toEqual([
      "Event Overview",
      "View Event",
      "Event Generation",
      "Notifications",
      "Categories",
      "Syslog Event Point",
      "PTP Events",
      "Event Rules / Sources",
    ]);
  });

  it("Provisioning has Reconciling Config as a depth-2 group with Device + Container children", () => {
    const children = getModeChildren(MODE_CATALOGUE, "provisioning");
    const reconcile = children.find((c) => c.id === "prov-reconcile") as ModeChild | undefined;
    expect(reconcile).toBeDefined();
    expect(reconcile?.kind).toBe("group");
    expect(reconcile?.children?.map((c) => c.id)).toEqual([
      "prov-reconcile-device",
      "prov-reconcile-container",
    ]);
  });
});

describe("modeCatalogue · validate", () => {
  it("passes the binding invariants", () => {
    const result = validateModeCatalogue(MODE_CATALOGUE);
    if (!result.ok) console.error(result.errors);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails when version mismatches", () => {
    const result = validateModeCatalogue({ ...MODE_CATALOGUE, version: 2 });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("version"))).toBe(true);
  });

  it("fails when an id is duplicated", () => {
    const m = MODE_CATALOGUE.modes[0];
    const result = validateModeCatalogue({
      ...MODE_CATALOGUE,
      modes: [...MODE_CATALOGUE.modes, m],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /duplicate id/.test(e))).toBe(true);
  });

  it("fails when children exceed depth cap", () => {
    const tooDeep: ModeEntry = {
      id: "_too-deep",
      label: "Too Deep",
      shortLabel: "TD",
      iconId: "mode-build",
      group: "Workshop",
      state: "available",
      children: [
        {
          id: "_td-l1",
          label: "L1",
          kind: "group",
          state: "available",
          children: [
            {
              id: "_td-l2",
              label: "L2",
              kind: "group",
              state: "available",
              children: [
                { id: "_td-l3", label: "L3", kind: "surface", state: "available" },
              ],
            },
          ],
        },
      ],
    };
    const result = validateModeCatalogue({
      ...MODE_CATALOGUE,
      modes: [...MODE_CATALOGUE.modes, tooDeep],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /depth cap/.test(e))).toBe(true);
  });

  it("fails when deferred state has no reason", () => {
    const bad: ModeEntry = {
      id: "_bad-deferred",
      label: "Bad",
      shortLabel: "BD",
      iconId: "mode-build",
      group: "Workshop",
      state: "deferred",
      children: [],
    };
    const result = validateModeCatalogue({
      ...MODE_CATALOGUE,
      modes: [...MODE_CATALOGUE.modes, bad],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /deferredReason/.test(e))).toBe(true);
  });
});

describe("modeCatalogue · icon registry resolution", () => {
  it("every mode iconId resolves to a registered icon", () => {
    for (const mode of MODE_CATALOGUE.modes) {
      const found = resolveIcon(mode.iconId);
      expect(found, `mode ${mode.id} iconId=${mode.iconId}`).not.toBeNull();
    }
  });

  it("every foot iconId resolves to a registered icon", () => {
    for (const foot of MODE_CATALOGUE.foot) {
      const found = resolveIcon(foot.iconId);
      expect(found, `foot ${foot.id} iconId=${foot.iconId}`).not.toBeNull();
    }
  });
});

describe("modeCatalogue · flatten", () => {
  it("emits a mode entry per mode and a child entry per descendant", () => {
    const flat = flattenModeCatalogue();
    const modeEntries = flat.filter((e) => e.kind === "mode");
    expect(modeEntries.length).toBe(MODE_CATALOGUE.modes.length);

    const footEntries = flat.filter((e) => e.kind === "foot");
    expect(footEntries.length).toBe(MODE_CATALOGUE.foot.length);
  });

  it("includes breadcrumbs from group → mode → child", () => {
    const flat = flattenModeCatalogue();
    const device = flat.find((e) => e.label === "Reconciling a Device's Config");
    expect(device).toBeDefined();
    expect(device?.breadcrumbs).toEqual([
      "Foundation",
      "Provisioning",
      "Reconciling Config",
      "Reconciling a Device's Config",
    ]);
    expect(device?.childPath).toEqual(["prov-reconcile", "prov-reconcile-device"]);
    expect(device?.depth).toBe(2);
    expect(device?.modeId).toBe("provisioning");
  });

  it("emits unique nodeIds across the flattened list", () => {
    const flat = flattenModeCatalogue();
    const ids = flat.map((e) => e.nodeId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("modeCatalogue · find + getChildren + isExpandable", () => {
  it("finds a mode by id", () => {
    const mode = findModeEntry(MODE_CATALOGUE, "diagnose");
    expect(mode?.label).toBe("Diagnose");
  });

  it("returns null for an unknown mode", () => {
    expect(findModeEntry(MODE_CATALOGUE, "_no-such")).toBeNull();
  });

  it("resolves a nested child by path", () => {
    const node = findCatalogueNode(
      MODE_CATALOGUE,
      "provisioning",
      ["prov-reconcile", "prov-reconcile-device"],
    );
    expect(node?.label).toBe("Reconciling a Device's Config");
  });

  it("returns null for missing child path", () => {
    expect(
      findCatalogueNode(MODE_CATALOGUE, "provisioning", ["prov-reconcile", "_missing"]),
    ).toBeNull();
  });

  it("getModeChildren returns [] for zero-child modes", () => {
    expect(getModeChildren(MODE_CATALOGUE, "operate")).toEqual([]);
    expect(getModeChildren(MODE_CATALOGUE, "topology")).toEqual([]);
  });

  it("isExpandableNode is true for groups with children, false otherwise", () => {
    const group = findCatalogueNode(MODE_CATALOGUE, "provisioning", ["prov-reconcile"]);
    expect(group && isExpandableNode(group)).toBe(true);
    const leaf = findCatalogueNode(
      MODE_CATALOGUE,
      "provisioning",
      ["prov-reconcile", "prov-reconcile-device"],
    );
    expect(leaf && isExpandableNode(leaf)).toBe(false);
  });
});

describe("modeCatalogue · groupChildrenForSidebar", () => {
  it("buckets entries into kind sections in defined order", () => {
    const children: readonly ModeChild[] = [
      { id: "w1", label: "W1", kind: "workflow", state: "available" },
      { id: "t1", label: "T1", kind: "tool", state: "available" },
      { id: "s1", label: "S1", kind: "surface", state: "available" },
      { id: "g1", label: "G1", kind: "group", state: "available", children: [
        { id: "g1-c", label: "G1C", kind: "workflow", state: "available" },
      ] },
      { id: "d1", label: "D1", kind: "workflow", state: "deferred", deferredReason: "x" },
      { id: "b1", label: "B1", kind: "workflow", state: "blocked", blockedReason: "x" },
    ];
    const sections = groupChildrenForSidebar(children);
    expect(sections.map((s) => s.key)).toEqual([
      "workflows",
      "tools",
      "surfaces",
      "groups",
      "deferred",
      "blocked",
    ]);
    expect(sections.find((s) => s.key === "deferred")?.entries[0]?.id).toBe("d1");
    expect(sections.find((s) => s.key === "blocked")?.entries[0]?.id).toBe("b1");
  });

  it("omits empty sections", () => {
    const sections = groupChildrenForSidebar([
      { id: "w1", label: "W1", kind: "workflow", state: "available" },
    ]);
    expect(sections.map((s) => s.key)).toEqual(["workflows"]);
  });

  it("DEFERRED + BLOCKED always render when populated, even if no available children", () => {
    const sections = groupChildrenForSidebar([
      { id: "d1", label: "D1", kind: "workflow", state: "deferred", deferredReason: "x" },
      { id: "b1", label: "B1", kind: "workflow", state: "blocked", blockedReason: "x" },
    ]);
    expect(sections.map((s) => s.key)).toEqual(["deferred", "blocked"]);
  });
});

describe("modeCatalogue · badge propagation", () => {
  it("computes deferred + partial counts on a mode", () => {
    const provisioning = findModeEntry(MODE_CATALOGUE, "provisioning");
    expect(provisioning).not.toBeNull();
    const badges = computeBadgeSummary(provisioning as ModeEntry);
    // All Provisioning children + grandchildren start deferred in D3A.
    expect((badges.deferred ?? 0)).toBeGreaterThan(0);
    expect((badges.blocked ?? 0)).toBe(0);
  });

  it("sums alert badges from available descendants only", () => {
    const synthetic: ModeEntry = {
      id: "_synth",
      label: "Synth",
      shortLabel: "S",
      iconId: "mode-build",
      group: "Workshop",
      state: "available",
      children: [
        { id: "a", label: "A", kind: "surface", state: "available", badge: 3 },
        { id: "b", label: "B", kind: "surface", state: "deferred", deferredReason: "x", badge: 99 },
        { id: "c", label: "C", kind: "group", state: "available", children: [
          { id: "c1", label: "C1", kind: "surface", state: "available", badge: 4 },
        ] },
      ],
    };
    const badges = computeBadgeSummary(synthetic);
    expect(badges.alerts).toBe(3 + 4);
    expect(badges.deferred).toBe(1);
  });

  it("propagateBadges returns a new catalogue with badges populated on every mode", () => {
    const cached = propagateBadges();
    for (const mode of cached.modes) {
      expect(mode.badges).toBeDefined();
    }
    // Mode without children should still have zero counts.
    const operate = cached.modes.find((m) => m.id === "operate");
    expect(operate?.badges?.deferred).toBe(0);
  });
});
