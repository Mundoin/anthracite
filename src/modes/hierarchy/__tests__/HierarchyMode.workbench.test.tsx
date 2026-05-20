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
import type { DeviceModel } from "../../../types/networkModel";
import type { WorkbenchIntakeSummary } from "../../../state/workbenchContextSummary";

function makeDeviceModel(over: {
  hostname?: string | null;
  vendor?: string | null;
  platform_id?: string | null;
} = {}): DeviceModel {
  return {
    identity: {
      hostname: over.hostname ?? null,
      chassis: null,
      serial_numbers: [],
      management_ips: [],
      last_change_marker: null,
    },
    platform: {
      platform_id: over.platform_id ?? null,
      vendor: over.vendor ?? null,
      os_family: null,
      os_version_raw: null,
      os_version_normalized: null,
      detection_confidence: null,
    },
    evidence: {
      source: null,
      source_kind: null,
      captured_at: null,
      parser_version: null,
      registry_version: null,
      fixture_corpus_version: null,
      byte_size: null,
      line_count: null,
    },
    interfaces: [],
    vlans: [],
    vrfs: [],
    static_routes: [],
    routing_protocols: {
      bgp: [],
      ospf: [],
      eigrp: [],
      isis: [],
    },
    acls: [],
    firewall_zones: [],
    nat_rules: [],
    tunnels: [],
    qos_policies: [],
    lag_groups: [],
    services: [],
    topology_hints: [],
    findings: [],
    unknown_lines: [],
    parse_confidence: {
      maturity_observed: null,
      score: null,
      parsed_line_count: 0,
      unknown_line_count: 0,
      warnings: [],
    },
  } as unknown as DeviceModel;
}

function makeRecord(
  id: string,
  environment_id: string,
  over: {
    hostname?: string | null;
    vendor?: string | null;
    platform_id?: string | null;
  } = {},
): DiscoveryDeviceRecord {
  return {
    id,
    environment_id,
    source_kind: "intake_import",
    confidence: null,
    last_seen: null,
    device_model: makeDeviceModel(over),
    source_label: null,
    slice_id: id,
  };
}

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

  it("Coverage Map renders with intakeSummary when provided and switching to coverage_map shows Intake Source with records", async () => {
    const user = userEvent.setup();
    // Need at least one record to trigger normal-render path where Intake Source is shown
    const records: DiscoveryDeviceRecord[] = [
      makeRecord("r1", "env-core-eu1", { hostname: "device-1", vendor: "Cisco" }),
    ];
    const intakeSummary: WorkbenchIntakeSummary = {
      current_platform_id: "iosxe",
      parse_status: "parsed",
      parsed_device_count: 3,
      finding_count: 1,
    };

    render(<HierarchyMode discovery={makeView(records)} intakeSummary={intakeSummary} />);

    // Switch to Coverage Map
    await user.click(screen.getByTestId("mwb-tool-coverage_map"));

    // Coverage Map tool should be active
    expect(
      screen
        .getByTestId("mode-workbench-active")
        .getAttribute("data-active-tool"),
    ).toBe("coverage_map");

    // Intake Source section should be visible (only in normal-render path with records + intakeSummary content)
    expect(screen.getByTestId("coverage-intake-source")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-intake-platform")).toHaveTextContent("iosxe");
    expect(screen.getByTestId("coverage-intake-status")).toHaveTextContent("parsed");
    expect(screen.getByTestId("coverage-intake-devices")).toHaveTextContent("3");
    expect(screen.getByTestId("coverage-intake-findings")).toHaveTextContent("1");
  });
});
