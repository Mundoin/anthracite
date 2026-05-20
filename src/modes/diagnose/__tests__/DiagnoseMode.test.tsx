import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DiagnoseMode } from "../DiagnoseMode";
import type { DiscoverySourceView } from "../../../data/discoverySource";
import type { TopologySourceView } from "../../../data/topologySource";
import type { DiscoveryDeviceRecord } from "../../../types/discovery";
import type { DeviceModel, ServiceKind } from "../../../types/networkModel";

function discoveryEmpty(): DiscoverySourceView {
  return {
    sourceState: "not_connected",
    environmentId: null,
    totalRecords: 0,
    message: "not connected",
    isEmpty: false,
    view: null,
  };
}

function topologyEmpty(): TopologySourceView {
  return {
    sourceState: "not_connected",
    environmentId: null,
    nodeCount: 0,
    edgeCount: 0,
    sourceRecordCount: 0,
    message: "not connected",
    isEmpty: false,
    projectionStats: null,
    evidenceStats: null,
    view: null,
  };
}

function blankModel(over: Partial<DeviceModel> = {}): DeviceModel {
  return {
    identity: {
      hostname: null,
      chassis: null,
      serial_numbers: [],
      management_ips: [],
      last_change_marker: null,
    },
    platform: {
      platform_id: "cisco-iosxe",
      vendor: "Cisco",
      os_family: "IOS-XE",
      os_version_raw: null,
      os_version_normalized: null,
      detection_confidence: 0.9,
    },
    evidence: {
      source: null,
      source_kind: "config_paste",
      captured_at: null,
      parser_version: "1",
      registry_version: null,
      fixture_corpus_version: null,
      byte_size: 0,
      line_count: 0,
    },
    interfaces: [],
    vlans: [],
    vrfs: [],
    static_routes: [],
    routing_protocols: { ospf: [], isis: [], eigrp: [], bgp: [] },
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
      maturity_observed: "l2topology",
      score: 0.5,
      parsed_line_count: 0,
      unknown_line_count: 0,
      warnings: [],
    },
    ...over,
  };
}

function record(
  id: string,
  hostname: string | null,
  over: Partial<DeviceModel> = {},
): DiscoveryDeviceRecord {
  return {
    id,
    environment_id: "env-core-eu1",
    source_kind: "intake_import",
    confidence: 0.9,
    last_seen: null,
    source_label: id,
    slice_id: null,
    device_model: blankModel({
      ...over,
      identity: {
        hostname,
        chassis: null,
        serial_numbers: [],
        management_ips: [],
        last_change_marker: null,
      },
    }),
  };
}

function discoveryWith(records: DiscoveryDeviceRecord[]): DiscoverySourceView {
  return {
    sourceState: "real",
    environmentId: "env-core-eu1",
    totalRecords: records.length,
    message: "ok",
    isEmpty: false,
    view: {
      environment_id: "env-core-eu1",
      source_state: "real",
      records,
      total_records: records.length,
      message: "ok",
    },
  };
}

describe("DiagnoseMode — render", () => {
  it("renders header + tagline + summary", () => {
    render(<DiagnoseMode discovery={discoveryEmpty()} topology={topologyEmpty()} />);
    expect(screen.getByRole("heading", { name: /Diagnose/i })).toBeInTheDocument();
    expect(screen.getByText(/What should I inspect first/)).toBeInTheDocument();
    expect(screen.getByTestId("dx-summary")).toBeInTheDocument();
  });

  it("renders honest empty state when no devices and no topology", () => {
    render(<DiagnoseMode discovery={discoveryEmpty()} topology={topologyEmpty()} />);
    expect(screen.getByTestId("dx-empty")).toBeInTheDocument();
    expect(screen.getByTestId("dx-empty")).toHaveTextContent(/Import or select/);
  });

  it("renders clean state when devices present but no diagnostic answers", () => {
    const clean = record("rec-clean", "router-clean", {
      interfaces: [
        {
          name: "Gi0/0",
          normalized_name: null,
          kind: "physical",
          admin_state: "up",
          oper_state: "unknown",
          description: "uplink",
          mtu: null,
          speed_mbps: null,
          duplex: null,
          l2_mode: null,
          access_vlan: null,
          allowed_vlans: [],
          native_vlan: null,
          vrf: null,
          ipv4_addresses: [
            { family: "v4", address: "10.0.0.1", prefix_length: 24, secondary: false, vrf: null },
          ],
          ipv6_addresses: [],
          parent_interface: null,
          child_interfaces: [],
          lag_membership: null,
          notes: null,
        },
      ],
    });
    render(
      <DiagnoseMode
        discovery={discoveryWith([clean])}
        topology={topologyEmpty()}
      />,
    );
    expect(screen.getByTestId("dx-clean")).toBeInTheDocument();
  });

  it("renders answer cards and summary counts when telnet enabled", () => {
    const r = record("rec-1", "router-1", {
      services: [
        {
          kind: "telnet" as ServiceKind,
          servers: [],
          source_interface: null,
          vrf: null,
          authentication_mode: null,
          notes: null,
        },
      ],
    });
    render(
      <DiagnoseMode
        discovery={discoveryWith([r])}
        topology={topologyEmpty()}
      />,
    );
    expect(screen.getByTestId("dx-summary-total")).toHaveTextContent("1");
    expect(screen.getByTestId("dx-summary-critical")).toHaveTextContent("1");
    expect(screen.getByTestId("dx-list")).toBeInTheDocument();
    expect(
      screen.getByTestId("dx-answer-management_access:telnet_enabled:rec-1"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("dx-severity-critical")).toBeInTheDocument();
  });

  it("clicking an answer opens inspector with evidence + suggested target", () => {
    const r = record("rec-1", "router-1", {
      services: [
        {
          kind: "telnet" as ServiceKind,
          servers: [],
          source_interface: null,
          vrf: null,
          authentication_mode: null,
          notes: null,
        },
      ],
    });
    render(
      <DiagnoseMode
        discovery={discoveryWith([r])}
        topology={topologyEmpty()}
      />,
    );
    expect(screen.getByTestId("dx-inspector-empty")).toBeInTheDocument();
    fireEvent.click(
      screen.getByTestId("dx-answer-management_access:telnet_enabled:rec-1"),
    );
    expect(
      screen.getByTestId("dx-inspector-title"),
    ).toHaveTextContent("Telnet enabled");
    expect(
      screen.getByTestId("dx-inspector-affected"),
    ).toHaveTextContent("router-1");
    expect(
      screen.getByTestId("dx-inspector-target"),
    ).toHaveTextContent(/management vty/);
    expect(screen.getByTestId("dx-inspector-source")).toHaveTextContent(
      /discovery_inventory/,
    );
    expect(screen.getByTestId("dx-evidence-0")).toBeInTheDocument();
  });

});
