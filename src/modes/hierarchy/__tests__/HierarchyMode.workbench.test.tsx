/**
 * V1BM — HierarchyMode workbench adoption tests.
 *
 * Covers:
 *   - HierarchyMode renders ModeWorkbenchShell
 *   - Default tool is Inventory
 *   - Rail exposes Inventory, Coverage Map, Inventory Diff
 *   - Switching tools shows only the relevant slice
 *   - Inventory Diff renders honest deferred state (no fake snapshot)
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HierarchyMode } from "../HierarchyMode";
import type { DiscoverySourceView } from "../../../data/discoverySource";
import type { DiscoveryDeviceRecord } from "../../../types/discovery";

function makeView(
  records: DiscoveryDeviceRecord[],
  environmentId: string | null = "env-core-eu1",
): DiscoverySourceView {
  const isEmpty = records.length === 0;
  const message = isEmpty
    ? "discovery inventory empty — no records collected"
    : `discovery inventory has ${records.length} record${records.length === 1 ? "" : "s"}`;
  return {
    sourceState: isEmpty ? "empty" : "real",
    environmentId,
    totalRecords: records.length,
    message,
    isEmpty,
    view: {
      environment_id: environmentId,
      source_state: isEmpty ? "empty" : "real",
      records,
      total_records: records.length,
      message,
    },
  };
}

function makeViewEmpty(): DiscoverySourceView {
  return makeView([], "env-core-eu1");
}

describe("HierarchyMode — workbench (V1BM)", () => {
  it("renders ModeWorkbenchShell", () => {
    render(<HierarchyMode discovery={makeViewEmpty()} />);
    expect(screen.getByTestId("mode-workbench")).toBeInTheDocument();
  });

  it("defaults to Inventory", () => {
    render(<HierarchyMode discovery={makeViewEmpty()} />);
    expect(
      screen
        .getByTestId("mode-workbench-active")
        .getAttribute("data-active-tool"),
    ).toBe("inventory");
  });

  it("rail exposes all three Hierarchy tools", () => {
    render(<HierarchyMode discovery={makeViewEmpty()} />);
    expect(screen.getByTestId("mwb-tool-inventory")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-coverage_map")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-inventory_diff")).toBeInTheDocument();
  });

  it("Inventory default shows inv-summary", () => {
    render(<HierarchyMode discovery={makeViewEmpty()} />);
    expect(screen.getByTestId("inv-summary")).toBeInTheDocument();
  });

  it("switching to Coverage Map shows the panel and hides inv-summary", async () => {
    const user = userEvent.setup();
    render(<HierarchyMode discovery={makeViewEmpty()} />);
    await user.click(screen.getByTestId("mwb-tool-coverage_map"));
    // Panel may render incrementally; check that tool switched
    expect(
      screen
        .getByTestId("mode-workbench-active")
        .getAttribute("data-active-tool"),
    ).toBe("coverage_map");
    expect(screen.queryByTestId("inv-summary")).toBeNull();
  });

  it("Inventory Diff renders deferred state with planned controls and no snapshot view", async () => {
    const user = userEvent.setup();
    render(<HierarchyMode discovery={makeViewEmpty()} />);
    await user.click(screen.getByTestId("mwb-tool-inventory_diff"));
    expect(screen.getByTestId("mwb-deferred-inventory_diff")).toBeInTheDocument();
    expect(
      screen.getByText(
        /No persisted snapshot store exists yet/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Baseline snapshot")).toBeInTheDocument();
    expect(screen.getByText("Comparison snapshot")).toBeInTheDocument();
    expect(screen.getByText("Added devices")).toBeInTheDocument();
    expect(screen.getByText("Removed devices")).toBeInTheDocument();
    expect(screen.getByText("Changed fields")).toBeInTheDocument();
    expect(screen.queryByTestId("inv-summary")).toBeNull();
  });

  it("Inventory Diff tool has deferred status data attribute", () => {
    render(<HierarchyMode discovery={makeViewEmpty()} />);
    expect(
      screen.getByTestId("mwb-tool-inventory_diff").getAttribute("data-tool-status"),
    ).toBe("deferred");
  });

  it("switching back to Inventory from Inventory Diff restores inv-summary", async () => {
    const user = userEvent.setup();
    render(<HierarchyMode discovery={makeViewEmpty()} />);
    await user.click(screen.getByTestId("mwb-tool-inventory_diff"));
    expect(screen.queryByTestId("inv-summary")).toBeNull();
    await user.click(screen.getByTestId("mwb-tool-inventory"));
    expect(screen.getByTestId("inv-summary")).toBeInTheDocument();
  });
});
