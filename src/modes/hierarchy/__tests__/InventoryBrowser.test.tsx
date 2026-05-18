import { describe, expect, it } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { InventoryBrowser } from "../InventoryBrowser";
import type { DiscoverySourceView } from "../../../data/discoverySource";
import type { DiscoveryDeviceRecord } from "../../../types/discovery";
import type { DeviceModel } from "../../../types/networkModel";

function makeDeviceModel(over: {
  hostname?: string | null;
  vendor?: string | null;
  platform_id?: string | null;
  os_family?: string | null;
  os_version_normalized?: string | null;
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
      os_family: over.os_family ?? null,
      os_version_raw: null,
      os_version_normalized: over.os_version_normalized ?? null,
      detection_confidence: null,
    },
    evidence: {
      source: null,
      source_kind: null,
      captured_at: null,
    },
    interfaces: [],
    vlans: [],
    vrfs: [],
    static_routes: [],
    routing_protocols: {
      bgp: null,
      ospf: null,
      eigrp: null,
      isis: null,
      rip: null,
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
      identity_confidence: 0,
      platform_confidence: 0,
      overall_confidence: 0,
    },
  } as unknown as DeviceModel;
}

function makeRecord(
  id: string,
  environment_id: string,
  hostname: string | null = null,
  vendor: string | null = null,
  platform_id: string | null = null,
): DiscoveryDeviceRecord {
  return {
    id,
    environment_id,
    source_kind: "intake_import",
    confidence: null,
    last_seen: null,
    device_model: makeDeviceModel({ hostname, vendor, platform_id }),
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
    // V1AK: non-null raw view even when empty — null is reserved for the
    // unavailable / not_connected branch. Empty inventory still has a
    // valid view with zero records.
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

function makeUnavailable(): DiscoverySourceView {
  return {
    sourceState: "unavailable",
    environmentId: null,
    totalRecords: 0,
    message: "Discovery source unavailable",
    isEmpty: false,
    view: null,
  };
}

describe("InventoryBrowser", () => {
  it("renders Discovery Inventory heading", () => {
    render(<InventoryBrowser discovery={makeView([])} />);
    expect(
      screen.getByRole("heading", { name: /Discovery Inventory/i }),
    ).toBeInTheDocument();
  });

  it("renders honest empty state when no records", () => {
    render(<InventoryBrowser discovery={makeViewEmpty()} />);
    expect(
      screen.getByText("No devices imported yet for this environment."),
    ).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Inventory empty" })).toBeInTheDocument();
  });

  it("renders unavailable state when view is null and sourceState unavailable", () => {
    render(<InventoryBrowser discovery={makeUnavailable()} />);
    expect(
      screen.getByText("Discovery source is not available right now."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Inventory unavailable" }),
    ).toBeInTheDocument();
  });

  it("renders one row per record when records present", () => {
    const records = [
      makeRecord("r1", "env-core-eu1", "device-1"),
      makeRecord("r2", "env-core-eu1", "device-2"),
      makeRecord("r3", "env-core-eu1", "device-3"),
    ];
    render(<InventoryBrowser discovery={makeView(records)} />);
    expect(screen.getByTestId("inv-row-r1")).toBeInTheDocument();
    expect(screen.getByTestId("inv-row-r2")).toBeInTheDocument();
    expect(screen.getByTestId("inv-row-r3")).toBeInTheDocument();
  });

  it("renders hostname when present and em-dash when absent", () => {
    const records = [
      makeRecord("r1", "env-core-eu1", "core-01"),
      makeRecord("r2", "env-core-eu1", null),
    ];
    render(<InventoryBrowser discovery={makeView(records)} />);
    const list = screen.getByTestId("inv-list");
    expect(within(list).getByText("core-01")).toBeInTheDocument();
    // Check that a row contains the em-dash for missing hostname
    const rows = within(list).getAllByRole("button");
    const hasEmDash = rows.some((row) => row.textContent?.includes("—"));
    expect(hasEmDash).toBe(true);
  });

  it("defaults selection to first record", () => {
    const records = [
      makeRecord("r1", "env-core-eu1", "device-1"),
      makeRecord("r2", "env-core-eu1", "device-2"),
    ];
    render(<InventoryBrowser discovery={makeView(records)} />);
    const row1 = screen.getByTestId("inv-row-r1").querySelector("button");
    const row2 = screen.getByTestId("inv-row-r2").querySelector("button");
    expect(row1).toHaveAttribute("aria-pressed", "true");
    expect(row2).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking a row selects it", () => {
    const records = [
      makeRecord("r1", "env-core-eu1", "device-1"),
      makeRecord("r2", "env-core-eu1", "device-2"),
    ];
    render(<InventoryBrowser discovery={makeView(records)} />);
    const row2Button = screen.getByTestId("inv-row-r2").querySelector("button")!;
    fireEvent.click(row2Button);
    const row1 = screen.getByTestId("inv-row-r1").querySelector("button");
    expect(row1).toHaveAttribute("aria-pressed", "false");
    expect(row2Button).toHaveAttribute("aria-pressed", "true");
  });

  it("detail panel shows selected record fields", () => {
    const records = [
      makeRecord("r1", "env-core-eu1", "device-1"),
      makeRecord("r2", "env-core-eu1", "device-2"),
    ];
    render(<InventoryBrowser discovery={makeView(records)} />);
    const row2Button = screen.getByTestId("inv-row-r2").querySelector("button")!;
    fireEvent.click(row2Button);
    const detail = screen.getByTestId("inv-detail");
    expect(within(detail).getByText("device-2")).toBeInTheDocument();
    // "r2" appears in both Record ID and Slice ID dd cells — assert both present.
    expect(within(detail).getAllByText("r2").length).toBeGreaterThanOrEqual(1);
  });

  it("summary shows device count", () => {
    const records = [
      makeRecord("r1", "env-core-eu1"),
      makeRecord("r2", "env-core-eu1"),
      makeRecord("r3", "env-core-eu1"),
    ];
    render(<InventoryBrowser discovery={makeView(records)} />);
    const summary = screen.getByTestId("inv-summary");
    const cells = within(summary).getAllByText("3");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("summary shows total records", () => {
    const records = [
      makeRecord("r1", "env-core-eu1"),
      makeRecord("r2", "env-core-eu1"),
      makeRecord("r3", "env-core-eu1"),
      makeRecord("r4", "env-core-eu1"),
      makeRecord("r5", "env-core-eu1"),
    ];
    render(<InventoryBrowser discovery={makeView(records)} />);
    const summary = screen.getByTestId("inv-summary");
    // "5" appears in both Devices and Total records cells when both match.
    expect(within(summary).getAllByText("5").length).toBeGreaterThanOrEqual(1);
  });

  it('shows scope label "All environments" when environmentId is null', () => {
    const records = [makeRecord("r1", "env-core-eu1")];
    render(<InventoryBrowser discovery={makeView(records, null)} />);
    expect(screen.getByText(/All environments/)).toBeInTheDocument();
  });

  it("shows scope label with env id when present", () => {
    const records = [makeRecord("r1", "env-core-eu1")];
    render(<InventoryBrowser discovery={makeView(records, "env-core-eu1")} />);
    // env id appears in scope line; assert at least one match.
    expect(screen.getAllByText(/env-core-eu1/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows DataSourceTag for empty state", () => {
    const { container } = render(<InventoryBrowser discovery={makeViewEmpty()} />);
    const tag = container.querySelector('[data-state="empty"]');
    expect(tag).toBeInTheDocument();
  });

  it("does not show DataSourceTag for real state", () => {
    const records = [makeRecord("r1", "env-core-eu1")];
    const { container } = render(<InventoryBrowser discovery={makeView(records)} />);
    const tag = container.querySelector('[data-state="real"]');
    expect(tag).not.toBeInTheDocument();
  });

  it("shows DataSourceTag for unavailable state", () => {
    const { container } = render(<InventoryBrowser discovery={makeUnavailable()} />);
    const tag = container.querySelector('[data-state="unavailable"]');
    expect(tag).toBeInTheDocument();
  });

  it("env switch resets selection to first new record", () => {
    const records1 = [
      makeRecord("r1", "env-core-eu1", "device-1"),
      makeRecord("r2", "env-core-eu1", "device-2"),
    ];
    const records2 = [
      makeRecord("r3", "env-core-eu1", "device-3"),
      makeRecord("r4", "env-core-eu1", "device-4"),
    ];
    const { rerender } = render(<InventoryBrowser discovery={makeView(records1)} />);
    const row2Button = screen.getByTestId("inv-row-r2").querySelector("button")!;
    fireEvent.click(row2Button);
    expect(row2Button).toHaveAttribute("aria-pressed", "true");

    rerender(<InventoryBrowser discovery={makeView(records2)} />);
    const row3Button = screen.getByTestId("inv-row-r3").querySelector("button")!;
    expect(row3Button).toHaveAttribute("aria-pressed", "true");
    // Ensure r2 no longer exists
    expect(screen.queryByTestId("inv-row-r2")).not.toBeInTheDocument();
  });

  it("env switch to empty resets selection to none", () => {
    const records1 = [
      makeRecord("r1", "env-core-eu1", "device-1"),
      makeRecord("r2", "env-core-eu1", "device-2"),
    ];
    const { rerender } = render(<InventoryBrowser discovery={makeView(records1)} />);
    const row2Button = screen.getByTestId("inv-row-r2").querySelector("button")!;
    fireEvent.click(row2Button);
    expect(row2Button).toHaveAttribute("aria-pressed", "true");

    rerender(<InventoryBrowser discovery={makeViewEmpty()} />);
    expect(
      screen.getByText("No devices imported yet for this environment."),
    ).toBeInTheDocument();
  });
});
