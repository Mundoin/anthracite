/**
 * V1CF — Fixture-backed device responses for the single-device
 * read-only collector. Pure, deterministic. No I/O. Mirrors the
 * shape of facts a real read-only SSH/SNMP run would yield, scoped
 * to inventory + version_facts + interface_summary + topology_neighbors.
 */

export interface SingleDeviceInterfaceFact {
  readonly name: string;
  readonly admin_up: boolean;
  readonly oper_up: boolean;
  readonly speed_mbps: number | null;
}

export interface SingleDeviceNeighborFact {
  readonly local_interface: string;
  readonly remote_node_hint: string;
  readonly remote_interface: string;
  readonly source_kind: "lldp" | "cdp";
}

export interface SingleDeviceFixture {
  readonly id: string;
  readonly hostname: string;
  readonly vendor: string;
  readonly platform: string;
  readonly os_family: string;
  readonly os_version: string;
  readonly interfaces: readonly SingleDeviceInterfaceFact[];
  readonly neighbours: readonly SingleDeviceNeighborFact[];
  /** Free-form provenance label for the receipt. */
  readonly source_label: string;
}

/**
 * Fixture matched to the V1CC demo target `tgt-demo-edge-01`
 * (Cisco IOS-XE campus edge router).
 */
export const FIXTURE_DEMO_EDGE_01: SingleDeviceFixture = {
  id: "fixture-edge-rtr-01-iosxe",
  hostname: "edge-rtr-01",
  vendor: "Cisco",
  platform: "iosxe",
  os_family: "IOS-XE",
  os_version: "17.9.4a",
  interfaces: [
    { name: "GigabitEthernet0/0", admin_up: true, oper_up: true, speed_mbps: 1000 },
    { name: "GigabitEthernet0/1", admin_up: true, oper_up: true, speed_mbps: 1000 },
    { name: "GigabitEthernet0/2", admin_up: false, oper_up: false, speed_mbps: null },
  ],
  neighbours: [
    {
      local_interface: "GigabitEthernet0/0",
      remote_node_hint: "fw-edge-01",
      remote_interface: "Ethernet1/1",
      source_kind: "lldp",
    },
    {
      local_interface: "GigabitEthernet0/1",
      remote_node_hint: "dist-sw-01",
      remote_interface: "Ethernet1/1",
      source_kind: "lldp",
    },
  ],
  source_label: "fixture://iosxe/campus-edge",
};

const FIXTURES_BY_TARGET: Record<string, SingleDeviceFixture> = {
  "tgt-demo-edge-01": FIXTURE_DEMO_EDGE_01,
};

export function getFixtureForTarget(targetId: string): SingleDeviceFixture | null {
  return FIXTURES_BY_TARGET[targetId] ?? null;
}
