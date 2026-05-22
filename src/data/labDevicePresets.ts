import type { LabDeviceClass, LabPlatformId, LabVendor } from "../types/labEnvironment";

export interface LabDevicePreset {
  readonly device_class: LabDeviceClass;
  readonly vendor: LabVendor;
  readonly platform_id: LabPlatformId;
  readonly os_family: string;
  readonly hostname_prefix: string;             // e.g. "core-rtr"
  readonly interface_name_pattern: string;       // e.g. "GigabitEthernet0/0/{n}"
  readonly default_interface_count: number;
  readonly default_capabilities: readonly string[];
  readonly default_config_kind: "cli_config" | "structured_profile" | "appliance_manifest";
}

export const LAB_DEVICE_PRESETS: readonly LabDevicePreset[] = Object.freeze([
  {
    device_class: "router",
    vendor: "cisco",
    platform_id: "cisco-iosxe",
    os_family: "IOS XE",
    hostname_prefix: "rtr-cisco",
    interface_name_pattern: "GigabitEthernet0/0/{n}",
    default_interface_count: 4,
    default_capabilities: ["routing", "ospf", "bgp"],
    default_config_kind: "cli_config",
  },
  {
    device_class: "router",
    vendor: "juniper",
    platform_id: "juniper-junos",
    os_family: "Junos",
    hostname_prefix: "rtr-juniper",
    interface_name_pattern: "ge-0/0/{n}",
    default_interface_count: 4,
    default_capabilities: ["routing", "ospf", "bgp"],
    default_config_kind: "cli_config",
  },
  {
    device_class: "switch",
    vendor: "cisco",
    platform_id: "cisco-iosxe",
    os_family: "IOS XE",
    hostname_prefix: "sw-cisco",
    interface_name_pattern: "GigabitEthernet1/0/{n}",
    default_interface_count: 24,
    default_capabilities: ["vlan", "spanning-tree"],
    default_config_kind: "cli_config",
  },
  {
    device_class: "switch",
    vendor: "arista",
    platform_id: "arista-eos",
    os_family: "EOS",
    hostname_prefix: "sw-arista",
    interface_name_pattern: "Ethernet{n}",
    default_interface_count: 32,
    default_capabilities: ["vlan", "spanning-tree", "vxlan"],
    default_config_kind: "cli_config",
  },
  {
    device_class: "firewall",
    vendor: "fortinet",
    platform_id: "fortinet-fortios",
    os_family: "FortiOS",
    hostname_prefix: "fw-fortinet",
    interface_name_pattern: "port{n}",
    default_interface_count: 6,
    default_capabilities: ["nat", "policy", "ipsec"],
    default_config_kind: "cli_config",
  },
  {
    device_class: "firewall",
    vendor: "paloalto",
    platform_id: "paloalto-panos",
    os_family: "PAN-OS",
    hostname_prefix: "fw-paloalto",
    interface_name_pattern: "ethernet1/{n}",
    default_interface_count: 6,
    default_capabilities: ["nat", "appid", "ipsec"],
    default_config_kind: "cli_config",
  },
  {
    device_class: "router",
    vendor: "mikrotik",
    platform_id: "mikrotik-routeros",
    os_family: "RouterOS",
    hostname_prefix: "rtr-mikrotik",
    interface_name_pattern: "ether{n}",
    default_interface_count: 5,
    default_capabilities: ["routing", "nat"],
    default_config_kind: "cli_config",
  },
  {
    device_class: "home_gateway",
    vendor: "avm",
    platform_id: "avm-fritzos",
    os_family: "FRITZ!OS",
    hostname_prefix: "fritzbox",
    interface_name_pattern: "lan{n}",
    default_interface_count: 4,
    default_capabilities: ["nat", "wifi", "dhcp"],
    default_config_kind: "appliance_manifest",
  },
  {
    device_class: "access_point",
    vendor: "aruba",
    platform_id: "aruba-aoscx",
    os_family: "AOS-CX",
    hostname_prefix: "ap-aruba",
    interface_name_pattern: "wlan{n}",
    default_interface_count: 2,
    default_capabilities: ["wifi", "vlan"],
    default_config_kind: "structured_profile",
  },
  {
    device_class: "camera",
    vendor: "axis",
    platform_id: "axis-os",
    os_family: "AXIS OS",
    hostname_prefix: "cam-axis",
    interface_name_pattern: "eth{n}",
    default_interface_count: 1,
    default_capabilities: ["video"],
    default_config_kind: "appliance_manifest",
  },
  {
    device_class: "isp_edge",
    vendor: "isp",
    platform_id: "isp-generic",
    os_family: "ISP",
    hostname_prefix: "isp-edge",
    interface_name_pattern: "wan{n}",
    default_interface_count: 2,
    default_capabilities: ["wan"],
    default_config_kind: "structured_profile",
  },
  {
    device_class: "server",
    vendor: "generic",
    platform_id: "generic-os",
    os_family: "Linux",
    hostname_prefix: "srv",
    interface_name_pattern: "eth{n}",
    default_interface_count: 2,
    default_capabilities: ["service"],
    default_config_kind: "structured_profile",
  },
  {
    device_class: "endpoint",
    vendor: "generic",
    platform_id: "generic-os",
    os_family: "Generic",
    hostname_prefix: "host",
    interface_name_pattern: "eth{n}",
    default_interface_count: 1,
    default_capabilities: [],
    default_config_kind: "structured_profile",
  },
  {
    device_class: "cpe",
    vendor: "ubiquiti",
    platform_id: "ubiquiti-edgeos",
    os_family: "EdgeOS",
    hostname_prefix: "cpe-ubnt",
    interface_name_pattern: "eth{n}",
    default_interface_count: 3,
    default_capabilities: ["routing", "nat", "wifi"],
    default_config_kind: "cli_config",
  },
]);

export function getPreset(
  deviceClass: LabDeviceClass,
  vendor: LabVendor
): LabDevicePreset | undefined {
  return LAB_DEVICE_PRESETS.find(
    (p) => p.device_class === deviceClass && p.vendor === vendor
  );
}

export function requirePreset(
  deviceClass: LabDeviceClass,
  vendor: LabVendor
): LabDevicePreset {
  const preset = getPreset(deviceClass, vendor);
  if (!preset) throw new Error(`No preset for ${deviceClass}/${vendor}`);
  return preset;
}
