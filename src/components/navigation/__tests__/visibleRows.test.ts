/**
 * D3C — visibleRows helper tests.
 *
 * Pure walk over a mode's children + openIds.
 */

import { describe, expect, it } from "vitest";

import { MODE_CATALOGUE, getModeChildren } from "../../../contracts/modeCatalogue";
import { findRowIndex, flattenVisibleRows } from "../visibleRows";

const provisioningChildren = getModeChildren(MODE_CATALOGUE, "provisioning");
const devicesChildren = getModeChildren(MODE_CATALOGUE, "devices");

describe("visibleRows · flattenVisibleRows", () => {
  it("emits one row per top-level child when nothing is expanded", () => {
    const rows = flattenVisibleRows(provisioningChildren, new Set());
    expect(rows.length).toBe(provisioningChildren.length);
    for (const row of rows) {
      expect(row.depth).toBe(1);
      expect(row.parentPath).toEqual([]);
    }
  });

  it("emits depth-2 rows when their parent is in openIds", () => {
    const rows = flattenVisibleRows(
      provisioningChildren,
      new Set(["prov-reconcile"]),
    );
    const device = rows.find((r) => r.child.id === "prov-reconcile-device");
    const container = rows.find((r) => r.child.id === "prov-reconcile-container");
    expect(device).toBeDefined();
    expect(container).toBeDefined();
    expect(device?.depth).toBe(2);
    expect(device?.parentPath).toEqual(["prov-reconcile"]);
    expect(device?.path).toEqual(["prov-reconcile", "prov-reconcile-device"]);
  });

  it("hides depth-2 rows when parent is collapsed", () => {
    const rows = flattenVisibleRows(provisioningChildren, new Set());
    expect(rows.find((r) => r.child.id === "prov-reconcile-device")).toBeUndefined();
  });

  it("marks expandable + expanded flags correctly", () => {
    const rows = flattenVisibleRows(
      provisioningChildren,
      new Set(["prov-reconcile"]),
    );
    const group = rows.find((r) => r.child.id === "prov-reconcile");
    expect(group?.expandable).toBe(true);
    expect(group?.expanded).toBe(true);
  });

  it("Devices children: every row is depth 1 (no groups in catalogue)", () => {
    const rows = flattenVisibleRows(devicesChildren, new Set());
    expect(rows.length).toBe(devicesChildren.length);
    for (const row of rows) {
      expect(row.depth).toBe(1);
      expect(row.expandable).toBe(false);
    }
  });
});

describe("visibleRows · findRowIndex", () => {
  it("returns the index for a matching path", () => {
    const rows = flattenVisibleRows(
      provisioningChildren,
      new Set(["prov-reconcile"]),
    );
    const idx = findRowIndex(rows, ["prov-reconcile", "prov-reconcile-device"]);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(rows[idx].child.id).toBe("prov-reconcile-device");
  });

  it("returns -1 for an unknown path", () => {
    const rows = flattenVisibleRows(provisioningChildren, new Set());
    expect(findRowIndex(rows, ["nope"])).toBe(-1);
  });
});
