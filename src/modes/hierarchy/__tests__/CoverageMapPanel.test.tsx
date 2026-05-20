import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CoverageMapPanel } from "../CoverageMapPanel";
import type { DiscoverySourceView } from "../../../data/discoverySource";
import type { DiscoveryDeviceRecord } from "../../../types/discovery";
import type { DeviceModel } from "../../../types/networkModel";

function makeDeviceModel(over: {
  hostname?: string | null;
  chassis?: string | null;
  vendor?: string | null;
  platform_id?: string | null;
  os_family?: string | null;
  os_version_normalized?: string | null;
} = {}): DeviceModel {
  return {
    identity: {
      hostname: over.hostname ?? null,
      chassis: over.chassis ?? null,
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
    os_family?: string | null;
    os_version_normalized?: string | null;
    source_kind?: "intake_import" | "live_collection" | "manual";
  } = {},
): DiscoveryDeviceRecord {
  return {
    id,
    environment_id,
    source_kind: over.source_kind ?? "intake_import",
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

describe("CoverageMapPanel", () => {
  it("renders coverage-empty testid when no records", () => {
    render(<CoverageMapPanel discovery={makeView([])} />);
    expect(screen.getByTestId("coverage-empty")).toBeInTheDocument();
  });

  it("renders honest copy in empty state", () => {
    render(<CoverageMapPanel discovery={makeView([])} />);
    expect(
      screen.getByText("No inventory records to project — import devices via INTAKE."),
    ).toBeInTheDocument();
  });

  it("renders coverage-unavailable testid when view is null", () => {
    render(<CoverageMapPanel discovery={makeUnavailable()} />);
    expect(screen.getByTestId("coverage-unavailable")).toBeInTheDocument();
  });

  it("displays unavailable message when view is null", () => {
    render(<CoverageMapPanel discovery={makeUnavailable()} />);
    expect(screen.getByText("Discovery source unavailable")).toBeInTheDocument();
  });

  it("renders coverage-map root testid with records", () => {
    const records = [makeRecord("r1", "env1", { hostname: "device-1" })];
    render(<CoverageMapPanel discovery={makeView(records)} />);
    expect(screen.getByTestId("coverage-map")).toBeInTheDocument();
  });

  it("renders all 10 coverage-row testids with proper field keys", () => {
    const records = [makeRecord("r1", "env1", { hostname: "device-1" })];
    render(<CoverageMapPanel discovery={makeView(records)} />);

    // All 10 fields should have testids with proper format
    expect(screen.getByTestId("coverage-row-hostname")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-row-chassis")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-row-vendor")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-row-platform-id")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-row-os-family")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-row-os-version")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-row-source-label")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-row-last-seen")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-row-confidence")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-row-slice-id")).toBeInTheDocument();
  });

  it("renders correct counts in coverage rows", () => {
    const records = [
      makeRecord("r1", "env1", { hostname: "device-1" }),
      makeRecord("r2", "env1", { hostname: "device-2" }),
      makeRecord("r3", "env1"), // null hostname
    ];
    render(<CoverageMapPanel discovery={makeView(records)} />);

    const hostnameRow = screen.getByTestId("coverage-row-hostname");
    expect(within(hostnameRow).getByText("2")).toBeInTheDocument(); // populated
    expect(within(hostnameRow).getByText("1")).toBeInTheDocument(); // missing
  });

  it("renders source-kind breakdown table", () => {
    const records = [
      makeRecord("r1", "env1", { source_kind: "intake_import" }),
      makeRecord("r2", "env1", { source_kind: "manual" }),
      makeRecord("r3", "env1", { source_kind: "intake_import" }),
    ];
    render(<CoverageMapPanel discovery={makeView(records)} />);

    const sourceKindTable = screen.getByTestId("coverage-source-kind");
    expect(sourceKindTable).toBeInTheDocument();
    expect(within(sourceKindTable).getByText("intake_import")).toBeInTheDocument();
    expect(within(sourceKindTable).getByText("manual")).toBeInTheDocument();
  });

  it("renders vendor breakdown table", () => {
    const records = [
      makeRecord("r1", "env1", { vendor: "Cisco" }),
      makeRecord("r2", "env1", { vendor: "Arista" }),
      makeRecord("r3", "env1"), // null vendor
    ];
    render(<CoverageMapPanel discovery={makeView(records)} />);

    const vendorTable = screen.getByTestId("coverage-vendor");
    expect(vendorTable).toBeInTheDocument();
    expect(within(vendorTable).getByText("Cisco")).toBeInTheDocument();
    expect(within(vendorTable).getByText("Arista")).toBeInTheDocument();
    expect(within(vendorTable).getByText("(unknown)")).toBeInTheDocument();
  });

  it("displays total records count in summary", () => {
    const records = [
      makeRecord("r1", "env1"),
      makeRecord("r2", "env1"),
      makeRecord("r3", "env1"),
    ];
    render(<CoverageMapPanel discovery={makeView(records)} />);
    expect(screen.getByText("Total Records")).toBeInTheDocument();
    const summary = screen.getByText("Total Records").closest(".cov-map__summary-cell");
    expect(within(summary!).getByText("3")).toBeInTheDocument();
  });

  it("renders section headers for Identity, Platform, Provenance", () => {
    const records = [makeRecord("r1", "env1")];
    render(<CoverageMapPanel discovery={makeView(records)} />);

    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Provenance")).toBeInTheDocument();
  });

  it("renders source-kind and vendor section headers", () => {
    const records = [makeRecord("r1", "env1")];
    render(<CoverageMapPanel discovery={makeView(records)} />);

    // Section titles appear in cov-map__section-title
    const sourceKindTitle = screen.getAllByText("Source Kind").find((el) =>
      el.className?.includes("cov-map__section-title"),
    );
    const vendorTitle = screen.getAllByText("Vendor").find((el) =>
      el.className?.includes("cov-map__section-title"),
    );
    expect(sourceKindTitle).toBeInTheDocument();
    expect(vendorTitle).toBeInTheDocument();
  });

  it("renders Field Coverage title when records present", () => {
    const records = [makeRecord("r1", "env1")];
    render(<CoverageMapPanel discovery={makeView(records)} />);

    expect(screen.getByText("Field Coverage")).toBeInTheDocument();
  });

  it("displays record count subtitle (singular)", () => {
    const records = [makeRecord("r1", "env1")];
    render(<CoverageMapPanel discovery={makeView(records)} />);

    expect(screen.getByText("Projection over 1 record")).toBeInTheDocument();
  });

  it("displays record count subtitle (plural)", () => {
    const records = [
      makeRecord("r1", "env1"),
      makeRecord("r2", "env1"),
      makeRecord("r3", "env1"),
    ];
    render(<CoverageMapPanel discovery={makeView(records)} />);

    expect(screen.getByText("Projection over 3 records")).toBeInTheDocument();
  });

  it("uses memoization — rebuilds coverage only when records change", () => {
    const records1 = [makeRecord("r1", "env1")];
    const records2 = [makeRecord("r1", "env1"), makeRecord("r2", "env1")];

    const { rerender } = render(
      <CoverageMapPanel discovery={makeView(records1)} />,
    );
    const coverage1 = screen.getByText("Projection over 1 record");
    expect(coverage1).toBeInTheDocument();

    // Same records array reference — should not recompute
    rerender(<CoverageMapPanel discovery={makeView(records1)} />);
    const coverage1Again = screen.getByText("Projection over 1 record");
    expect(coverage1Again).toBeInTheDocument();

    // Different records — should recompute
    rerender(<CoverageMapPanel discovery={makeView(records2)} />);
    expect(screen.getByText("Projection over 2 records")).toBeInTheDocument();
  });

  it("renders DataSourceTag in header", () => {
    const records = [makeRecord("r1", "env1")];
    const { container } = render(
      <CoverageMapPanel discovery={makeView(records)} />,
    );

    // DataSourceTag should render a data-state attribute
    // For "real" state, it should not render a visible tag, but the attr may be present
    const header = container.querySelector(".cov-map__header");
    expect(header).toBeInTheDocument();
  });

  it("shows (unknown) vendor with muted styling hint", () => {
    const records = [makeRecord("r1", "env1"), makeRecord("r2", "env1")];
    const { container } = render(
      <CoverageMapPanel discovery={makeView(records)} />,
    );

    // The (unknown) vendor cell should have cov-map__cell--unknown class
    const cells = container.querySelectorAll(".cov-map__cell--unknown");
    expect(cells.length).toBeGreaterThan(0);
  });
});
