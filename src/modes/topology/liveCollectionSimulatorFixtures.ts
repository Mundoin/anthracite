/**
 * Fixture-backed Live Collection Simulator — synthetic raw neighbour
 * output bundles (V1AU).
 *
 * Every fixture is synthetic. No real customer or device data. No host
 * names, no IP addresses, no MAC addresses that resolve to a real
 * vendor allocation. Coverage matches the V1AT plan / V1AQ parser
 * dispatcher: IOS-XE / NX-OS / EOS get LLDP + CDP; Junos and IOS-XR
 * get LLDP only; Huawei VRP, Nokia SR OS, FortiOS, and MikroTik are
 * deliberately absent — V1AT marks them unsupported / driver-deferred
 * and the simulator must not pretend otherwise.
 *
 * Doctrine: `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` V1AU.
 */

import type { LiveCollectionPlatform, LiveCollectionSourceKind } from "../../types/liveCollection";

export interface LiveCollectionSimulatorFixture {
  readonly platform: LiveCollectionPlatform;
  readonly source_kind: LiveCollectionSourceKind;
  readonly command: string;
  /** Synthetic, display-only local node label that pairs with the raw
   *  output below. Never used to open a connection. */
  readonly local_node: string;
  readonly raw_output: string;
  readonly label: string;
  readonly expected_route_note: string;
}

export const LIVE_COLLECTION_SIMULATOR_FIXTURES: readonly LiveCollectionSimulatorFixture[] = [
  {
    platform: "iosxe",
    source_kind: "lldp",
    command: "show lldp neighbors detail",
    local_node: "sim-iosxe-a",
    raw_output: [
      "------------------------------------------------",
      "Local Intf: GigabitEthernet0/0/1",
      "Chassis id: 0011.2233.4455",
      "Port id: GigabitEthernet0/0/2",
      "Port Description: Uplink to sim-iosxe-b",
      "System Name: sim-iosxe-b",
      "System Description: Cisco IOS Software, Catalyst",
      "",
      "Total entries displayed: 1",
    ].join("\n"),
    label: "IOS-XE LLDP — synthetic single neighbour",
    expected_route_note:
      "V1AP IOS-XE LLDP detail parser → exact resolver → V1AR managed store.",
  },
  {
    platform: "iosxe",
    source_kind: "cdp",
    command: "show cdp neighbors detail",
    local_node: "sim-iosxe-a",
    raw_output: [
      "-------------------------",
      "Device ID: sim-iosxe-b",
      "Entry address(es):",
      "  IP address: 198.51.100.2",
      "Platform: cisco WS-C3850,  Capabilities: Router Switch",
      "Interface: GigabitEthernet0/0/1,  Port ID (outgoing port): GigabitEthernet0/0/2",
      "Holdtime : 175 sec",
      "",
    ].join("\n"),
    label: "IOS-XE CDP — synthetic single neighbour",
    expected_route_note:
      "V1AP IOS-XE CDP detail parser → exact resolver → V1AR managed store.",
  },
  {
    platform: "nxos",
    source_kind: "lldp",
    command: "show lldp neighbors detail",
    local_node: "sim-nxos-a",
    raw_output: [
      "Chassis id: 1122.3344.5566",
      "Port id: Ethernet1/1",
      "Local Port id: Ethernet1/2",
      "Port Description: Link to sim-nxos-b",
      "System Name: sim-nxos-b",
      "System Description: Cisco Nexus Operating System (NX-OS)",
      "Time remaining: 110 seconds",
      "",
    ].join("\n"),
    label: "NX-OS LLDP — synthetic single neighbour",
    expected_route_note: "V1AQ NX-OS LLDP detail parser route.",
  },
  {
    platform: "nxos",
    source_kind: "cdp",
    command: "show cdp neighbors detail",
    local_node: "sim-nxos-a",
    raw_output: [
      "----------------------------------------",
      "Device ID:sim-nxos-b",
      "System Name: sim-nxos-b",
      "Interface: Ethernet1/2,  Port ID (outgoing port): Ethernet1/1",
      "Platform: N9K-C93180YC-EX",
      "Holdtime: 145 sec",
      "",
    ].join("\n"),
    label: "NX-OS CDP — synthetic single neighbour",
    expected_route_note: "V1AQ NX-OS CDP detail parser route.",
  },
  {
    platform: "eos",
    source_kind: "lldp",
    command: "show lldp neighbors detail",
    local_node: "sim-eos-a",
    raw_output: [
      "Interface Ethernet1 detected 1 LLDP neighbors:",
      "  Neighbor 0011.2233.7788/Ethernet2, age 35 seconds",
      "  Discovered 1 hour, 12 minutes, 4 seconds ago; Last changed 1 hour ago",
      "  - System Name: \"sim-eos-b\"",
      "  - Port ID    : \"Ethernet2\"",
      "  - Port description: \"link to sim-eos-a\"",
      "",
    ].join("\n"),
    label: "EOS LLDP — synthetic single neighbour",
    expected_route_note: "V1AP EOS LLDP detail parser route.",
  },
  {
    platform: "eos",
    source_kind: "cdp",
    command: "show cdp neighbors detail",
    local_node: "sim-eos-a",
    raw_output: [
      "----------------------------------------",
      "Device ID: sim-eos-b",
      "Interface: Ethernet1,  Port ID (outgoing port): Ethernet2",
      "Platform: cEOSLab, Capabilities: Router Switch",
      "Holdtime : 173 sec",
      "",
    ].join("\n"),
    label: "EOS CDP — synthetic single neighbour",
    expected_route_note: "V1AQ EOS CDP detail parser route.",
  },
  {
    platform: "junos",
    source_kind: "lldp",
    command: "show lldp neighbors",
    local_node: "sim-junos-a",
    raw_output: [
      "Local Interface    Parent Interface    Chassis Id          Port info          System Name",
      "ge-0/0/0           -                   00:55:aa:11:22:33   ge-0/0/1           sim-junos-b",
      "",
    ].join("\n"),
    label: "Junos LLDP terse — synthetic single neighbour",
    expected_route_note: "V1AQ Junos LLDP terse parser route.",
  },
  {
    platform: "iosxr",
    source_kind: "lldp",
    command: "show lldp neighbors detail",
    local_node: "sim-iosxr-a",
    raw_output: [
      "------------------------------------------------",
      "Local Interface: GigabitEthernet0/0/0/0",
      "Chassis id: aabb.cc00.0001",
      "Port id: GigabitEthernet0/0/0/1",
      "Port Description: link to sim-iosxr-b",
      "System Name: sim-iosxr-b",
      "System Description: Cisco IOS XR Software",
      "Time remaining: 95 seconds",
      "",
    ].join("\n"),
    label: "IOS-XR LLDP — synthetic single neighbour",
    expected_route_note: "V1AQ IOS-XR LLDP detail parser route.",
  },
];
