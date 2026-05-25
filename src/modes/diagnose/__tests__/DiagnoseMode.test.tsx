import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DiagnoseMode } from "../DiagnoseMode";
import type { DiagnoseHandoffPayload } from "../../topology/diagnoseHandoff";
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

describe("DiagnoseMode — V1BZ Topology handoff stub", () => {
  function handoffSample(over: Partial<DiagnoseHandoffPayload> = {}): DiagnoseHandoffPayload {
    return {
      source: "topology",
      environment_id: "env-fab",
      topology_source_kind: "fabricated",
      topology_freshness: "static",
      selected_node_id: "n1",
      selected_label: "edge-01",
      selected_state: "warning",
      selected_role: "edge router",
      affected_neighbor_ids: ["n2"],
      affected_neighbor_labels: ["dist-02"],
      affected_edge_ids: ["e1"],
      worst_state: "warning",
      counts_by_state: {
        healthy: 0,
        warning: 1,
        degraded: 0,
        down: 0,
        maintenance: 0,
        unknown: 0,
      },
      ...over,
    };
  }

  it("renders empty stub when no handoff is provided", () => {
    render(
      <DiagnoseMode
        discovery={discoveryEmpty()}
        topology={topologyEmpty()}
        activeToolId="topology_handoff"
        onToolChange={() => {}}
      />,
    );
    expect(screen.getByTestId("dx-topology-handoff-empty")).toBeInTheDocument();
  });

  it("renders handoff card with selected node + source/freshness + affected counts", () => {
    render(
      <DiagnoseMode
        discovery={discoveryEmpty()}
        topology={topologyEmpty()}
        activeToolId="topology_handoff"
        onToolChange={() => {}}
        topologyHandoff={handoffSample()}
      />,
    );
    expect(screen.getByTestId("dx-topology-handoff-title")).toHaveTextContent(
      "edge-01",
    );
    expect(screen.getByTestId("dx-topology-handoff-node-id")).toHaveTextContent(
      "n1",
    );
    expect(screen.getByTestId("dx-topology-handoff-state")).toHaveTextContent(
      "warning",
    );
    expect(screen.getByTestId("dx-topology-handoff-source")).toHaveTextContent(
      "fabricated · static",
    );
    expect(
      screen.getByTestId("dx-topology-handoff-link-count"),
    ).toHaveTextContent("1");
    expect(
      screen.getByTestId("dx-topology-handoff-neighbor-count"),
    ).toHaveTextContent("1");
    expect(screen.getByTestId("dx-topology-handoff-worst")).toHaveTextContent(
      "warning",
    );
    expect(
      screen.getByTestId("dx-topology-handoff-neighbors"),
    ).toHaveTextContent("dist-02");
  });

  it("V1CA — state pill carries data-state attribute so colour ramp can apply", () => {
    render(
      <DiagnoseMode
        discovery={discoveryEmpty()}
        topology={topologyEmpty()}
        activeToolId="topology_handoff"
        onToolChange={() => {}}
        topologyHandoff={handoffSample()}
      />,
    );
    const pill = screen.getByTestId("dx-topology-handoff-state");
    expect(pill.getAttribute("data-state")).toBe("warning");
    const worst = screen.getByTestId("dx-topology-handoff-worst");
    expect(worst.getAttribute("data-state")).toBe("warning");
  });

  it("V1CA — surfaces a next-direction line built from affected scope", () => {
    render(
      <DiagnoseMode
        discovery={discoveryEmpty()}
        topology={topologyEmpty()}
        activeToolId="topology_handoff"
        onToolChange={() => {}}
        topologyHandoff={handoffSample()}
      />,
    );
    const next = screen.getByTestId("dx-topology-handoff-next");
    expect(next.textContent).toContain("1 affected neighbour");
    expect(next.textContent).toContain("1 affected link");
  });

  it("V1CA — next-direction line is calm when no affected scope", () => {
    const calm = handoffSample({
      selected_state: "healthy",
      affected_neighbor_ids: [],
      affected_neighbor_labels: [],
      affected_edge_ids: [],
      worst_state: undefined,
    });
    render(
      <DiagnoseMode
        discovery={discoveryEmpty()}
        topology={topologyEmpty()}
        activeToolId="topology_handoff"
        onToolChange={() => {}}
        topologyHandoff={calm}
      />,
    );
    expect(
      screen.getByTestId("dx-topology-handoff-next"),
    ).toHaveTextContent(/no affected neighbourhood/i);
  });

  it("includes a summary string built from the payload", () => {
    render(
      <DiagnoseMode
        discovery={discoveryEmpty()}
        topology={topologyEmpty()}
        activeToolId="topology_handoff"
        onToolChange={() => {}}
        topologyHandoff={handoffSample()}
      />,
    );
    const summary = screen.getByTestId("dx-topology-handoff-summary");
    expect(summary).toHaveTextContent("edge-01");
    expect(summary).toHaveTextContent("Warning");
    expect(summary).toHaveTextContent("1 link");
    expect(summary).toHaveTextContent("1 neighbour");
  });
});
