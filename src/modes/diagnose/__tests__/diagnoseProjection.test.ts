import { describe, expect, it } from "vitest";
import { projectDiagnose } from "../diagnoseProjection";
import type { DiscoveryDeviceRecord } from "../../../types/discovery";
import type {
  DeviceModel,
  InterfaceAdminState,
  InterfaceKind,
  InterfaceModel,
  ServiceKind,
  UnknownReason,
} from "../../../types/networkModel";
import type { TopologyView } from "../../../types/topology";

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

function iface(
  name: string,
  over: Partial<InterfaceModel> = {},
): InterfaceModel {
  return {
    name,
    normalized_name: null,
    kind: "physical" as InterfaceKind,
    admin_state: "unknown" as InterfaceAdminState,
    oper_state: "unknown",
    description: null,
    mtu: null,
    speed_mbps: null,
    duplex: null,
    l2_mode: null,
    access_vlan: null,
    allowed_vlans: [],
    native_vlan: null,
    vrf: null,
    ipv4_addresses: [],
    ipv6_addresses: [],
    parent_interface: null,
    child_interfaces: [],
    lag_membership: null,
    notes: null,
    ...over,
  };
}

function emptyTopologyView(): TopologyView {
  return {
    environment_id: "env-core-eu1",
    source_state: "real",
    nodes: [],
    edges: [],
    summary: {
      environment_id: "env-core-eu1",
      node_count: 0,
      edge_count: 0,
      source_record_count: 0,
    },
    message: "ok",
    adjacency_readiness: {
      eligible_node_count: 0,
      fact_source_state: "none_available",
      fact_sources: [],
      accepted_kinds: ["lldp", "cdp", "config_neighbor", "manual"],
      reason: "no adjacency fact sources connected",
    },
    projection_stats: {
      facts_total: 0,
      facts_accepted: 0,
      facts_rejected_unknown_node: 0,
      facts_rejected_self_link: 0,
      facts_collapsed_duplicate: 0,
      per_kind_counts: [],
    },
    evidence_stats: {
      evidence_total: 0,
      accepted: 0,
      rejected_unknown_local: 0,
      rejected_unknown_remote: 0,
      rejected_self_link: 0,
    },
  };
}

describe("diagnoseProjection — empty / honest", () => {
  it("returns empty model with is_empty_input=true when no devices and no topology", () => {
    const m = projectDiagnose({ devices: [], topology: null });
    expect(m.is_empty_input).toBe(true);
    expect(m.answers).toHaveLength(0);
    expect(m.summary.total_answers).toBe(0);
  });

  it("treats a supplied empty TopologyView as runnable (stats may still surface rules)", () => {
    const m = projectDiagnose({ devices: [], topology: emptyTopologyView() });
    expect(m.is_empty_input).toBe(false);
    // No nodes, no evidence → no topology-evidence answers either.
    expect(m.answers).toHaveLength(0);
  });

  it("clean device produces no answers", () => {
    const r = record("rec-1", "router-1", {
      interfaces: [
        iface("Gi0/0", {
          admin_state: "up",
          description: "uplink",
          ipv4_addresses: [
            { family: "v4", address: "10.0.0.1", prefix_length: 24, secondary: false, vrf: null },
          ],
        }),
      ],
    });
    const m = projectDiagnose({ devices: [r], topology: null });
    expect(m.answers).toHaveLength(0);
  });
});

describe("diagnoseProjection — management_access · telnet", () => {
  it("flags telnet enabled as critical", () => {
    const r = record("rec-1", "router-1", {
      services: [
        {
          kind: "telnet" as ServiceKind,
          servers: [],
          source_interface: null,
          vrf: null,
          authentication_mode: null,
          notes: "telnet on vty",
        },
      ],
    });
    const m = projectDiagnose({ devices: [r], topology: null });
    const a = m.answers.find((x) => x.category === "management_access");
    expect(a).toBeDefined();
    expect(a?.severity).toBe("critical");
    expect(a?.title).toBe("Telnet enabled");
    expect(a?.affected_devices).toContain("router-1");
    expect(a?.evidence.some((e) => e.value === "telnet")).toBe(true);
  });
});

describe("diagnoseProjection — identity · missing hostname", () => {
  it("flags missing hostname as warning", () => {
    const r = record("rec-1", null);
    const m = projectDiagnose({ devices: [r], topology: null });
    const a = m.answers.find((x) => x.category === "identity");
    expect(a?.severity).toBe("warning");
    expect(a?.title).toBe("Device identity missing hostname");
  });

  it("does NOT flag when hostname trimmed-non-empty", () => {
    const r = record("rec-1", "router-1");
    const m = projectDiagnose({ devices: [r], topology: null });
    expect(m.answers.some((x) => x.category === "identity")).toBe(false);
  });
});

describe("diagnoseProjection — interfaces", () => {
  it("flags interfaces with unknown admin state", () => {
    const r = record("rec-1", "router-1", {
      interfaces: [
        iface("Gi0/0", { admin_state: "unknown" }),
        iface("Gi0/1", { admin_state: "up" }),
      ],
    });
    const m = projectDiagnose({ devices: [r], topology: null });
    const a = m.answers.find(
      (x) => x.title === "Interfaces with unspecified admin state",
    );
    expect(a?.severity).toBe("info");
    expect(a?.evidence[0].value).toContain("Gi0/0");
    expect(a?.evidence[0].value).not.toContain("Gi0/1");
  });

  it("flags described interfaces without addressing", () => {
    const r = record("rec-1", "router-1", {
      interfaces: [
        iface("Gi0/0", {
          admin_state: "up",
          description: "spare port",
        }),
        iface("Gi0/1", {
          admin_state: "up",
          description: "uplink",
          ipv4_addresses: [
            { family: "v4", address: "10.0.0.1", prefix_length: 24, secondary: false, vrf: null },
          ],
        }),
      ],
    });
    const m = projectDiagnose({ devices: [r], topology: null });
    const a = m.answers.find(
      (x) => x.title === "Interfaces with description but no IP addressing",
    );
    expect(a?.severity).toBe("info");
    expect(a?.evidence[0].value).toContain("Gi0/0");
    expect(a?.evidence[0].value).not.toContain("Gi0/1");
  });

  it("does not flag described interfaces with IPv6 only", () => {
    const r = record("rec-1", "router-1", {
      interfaces: [
        iface("Gi0/0", {
          admin_state: "up",
          description: "v6 only",
          ipv6_addresses: [
            { family: "v6", address: "2001:db8::1", prefix_length: 64, secondary: false, vrf: null },
          ],
        }),
      ],
    });
    const m = projectDiagnose({ devices: [r], topology: null });
    expect(
      m.answers.some(
        (x) => x.title === "Interfaces with description but no IP addressing",
      ),
    ).toBe(false);
  });
});

describe("diagnoseProjection — platform_support", () => {
  it("flags known-unsupported platforms (default: iosxr, mikrotik)", () => {
    const r = record("rec-1", "router-xr", {
      platform: {
        platform_id: "cisco-iosxr",
        vendor: "Cisco",
        os_family: "IOS-XR",
        os_version_raw: null,
        os_version_normalized: null,
        detection_confidence: 0.9,
      },
    });
    const m = projectDiagnose({ devices: [r], topology: null });
    const a = m.answers.find((x) => x.category === "platform_support");
    expect(a?.severity).toBe("warning");
    expect(a?.title).toContain("cisco-iosxr");
  });

  it("does NOT flag supported platform", () => {
    const r = record("rec-1", "router-1", {
      platform: {
        platform_id: "huawei-vrp",
        vendor: "Huawei",
        os_family: "VRP",
        os_version_raw: null,
        os_version_normalized: null,
        detection_confidence: 0.9,
      },
    });
    const m = projectDiagnose({ devices: [r], topology: null });
    expect(m.answers.some((x) => x.category === "platform_support")).toBe(false);
  });

  it("honours known_unsupported_platforms override", () => {
    const r = record("rec-1", "router-1", {
      platform: {
        platform_id: "fortinet-fortios",
        vendor: "Fortinet",
        os_family: "FortiOS",
        os_version_raw: null,
        os_version_normalized: null,
        detection_confidence: 0.9,
      },
    });
    const m = projectDiagnose({
      devices: [r],
      topology: null,
      known_unsupported_platforms: ["fortinet-fortios"],
    });
    expect(m.answers.some((x) => x.category === "platform_support")).toBe(true);
  });
});

describe("diagnoseProjection — parser_scope", () => {
  it("flags out-of-scope parser evidence per device", () => {
    const r = record("rec-1", "router-1", {
      unknown_lines: [
        {
          source: null,
          line_number: 12,
          raw: "acl number 2000",
          context_path: null,
          reason: "out_of_scope" as UnknownReason,
        },
        {
          source: null,
          line_number: 13,
          raw: "bgp 65000",
          context_path: null,
          reason: "out_of_scope" as UnknownReason,
        },
      ],
    });
    const m = projectDiagnose({ devices: [r], topology: null });
    const a = m.answers.find((x) => x.category === "parser_scope");
    expect(a?.severity).toBe("info");
    expect(a?.evidence.find((e) => e.label === "out_of_scope_line_count")?.value).toBe("2");
  });

  it("ignores unknown_lines without out_of_scope reason", () => {
    const r = record("rec-1", "router-1", {
      unknown_lines: [
        {
          source: null,
          line_number: 1,
          raw: "weirdthing",
          context_path: null,
          reason: "unsupported_keyword" as UnknownReason,
        },
      ],
    });
    const m = projectDiagnose({ devices: [r], topology: null });
    expect(m.answers.some((x) => x.category === "parser_scope")).toBe(false);
  });
});

describe("diagnoseProjection — topology_evidence", () => {
  it("flags rejections present as warning", () => {
    const view = emptyTopologyView();
    const m = projectDiagnose({
      devices: [],
      topology: {
        ...view,
        evidence_stats: {
          evidence_total: 3,
          accepted: 2,
          rejected_unknown_local: 1,
          rejected_unknown_remote: 0,
          rejected_self_link: 0,
        },
      },
    });
    const a = m.answers.find(
      (x) => x.title === "Topology evidence carries rejected entries",
    );
    expect(a?.severity).toBe("warning");
  });

  it("flags accepted evidence with zero edges as warning", () => {
    const view = emptyTopologyView();
    const m = projectDiagnose({
      devices: [],
      topology: {
        ...view,
        evidence_stats: {
          evidence_total: 2,
          accepted: 2,
          rejected_unknown_local: 0,
          rejected_unknown_remote: 0,
          rejected_self_link: 0,
        },
      },
    });
    const a = m.answers.find(
      (x) => x.title === "Accepted evidence but no projected edges",
    );
    expect(a?.severity).toBe("warning");
  });

  it("flags no adjacency sources as info when nodes exist", () => {
    const view = emptyTopologyView();
    const m = projectDiagnose({
      devices: [],
      topology: {
        ...view,
        nodes: [
          {
            id: "topo::a",
            label: "a",
            device_record_id: "rec-1",
            hostname: "a",
            platform_id: "cisco-iosxe",
            vendor: "Cisco",
            role_hint: "device",
            layer: "inventory",
            source_kind: "discovery_inventory",
          },
        ],
        summary: { ...view.summary, node_count: 1 },
      },
    });
    const a = m.answers.find(
      (x) => x.title === "No adjacency fact sources connected",
    );
    expect(a?.severity).toBe("info");
  });
});

describe("diagnoseProjection — sort + summary", () => {
  it("sorts critical → warning → info, then by category, then by title", () => {
    const r1 = record("rec-1", "router-1", {
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
      interfaces: [iface("Gi0/0", { admin_state: "unknown" })],
    });
    const r2 = record("rec-2", null);
    const m = projectDiagnose({ devices: [r1, r2], topology: null });
    expect(m.answers[0].severity).toBe("critical");
    const sevSequence = m.answers.map((a) => a.severity);
    for (let i = 1; i < sevSequence.length; i++) {
      expect(
        ["critical", "warning", "info"].indexOf(sevSequence[i]),
      ).toBeGreaterThanOrEqual(
        ["critical", "warning", "info"].indexOf(sevSequence[i - 1]),
      );
    }
  });

  it("summary counts match severity and per_category buckets", () => {
    const r = record("rec-1", null, {
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
    const m = projectDiagnose({ devices: [r], topology: null });
    expect(m.summary.total_answers).toBe(m.answers.length);
    expect(m.summary.critical_count).toBe(
      m.answers.filter((a) => a.severity === "critical").length,
    );
    expect(m.summary.warning_count).toBe(
      m.answers.filter((a) => a.severity === "warning").length,
    );
    const reportedCats = m.summary.per_category.map((c) => c.category).sort();
    const realCats = Array.from(new Set(m.answers.map((a) => a.category))).sort();
    expect(reportedCats).toEqual(realCats);
  });

  it("deterministic — same input twice produces equal answers", () => {
    const r = record("rec-1", "router-1", {
      interfaces: [
        iface("Gi0/0", { admin_state: "unknown" }),
        iface("Gi0/1", { admin_state: "unknown" }),
      ],
    });
    const a = projectDiagnose({ devices: [r], topology: null });
    const b = projectDiagnose({ devices: [r], topology: null });
    expect(a).toEqual(b);
  });
});
