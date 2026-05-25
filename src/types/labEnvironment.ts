import type { InterfaceKind, IpAddressModel } from "./networkModel";

// Vendor identity — meaningful per device class. NEVER "synthetic" if a real vendor analog exists.
// Inherit from src-tauri vendor_registry.rs platform IDs where appropriate.
export type LabVendor =
  | "cisco"
  | "juniper"
  | "arista"
  | "mikrotik"
  | "fortinet"
  | "paloalto"
  | "huawei"
  | "nokia"
  | "aruba"
  | "extreme"
  | "ubiquiti"
  | "avm"        // FRITZ!Box-class home/branch gateway
  | "axis"       // IP camera class
  | "isp"        // ISP edge (generic)
  | "generic";   // truly generic (endpoint/server/IoT placeholder)

export type LabPlatformId =
  | "cisco-iosxe"
  | "cisco-iosxr"
  | "cisco-ios"
  | "juniper-junos"
  | "arista-eos"
  | "mikrotik-routeros"
  | "fortinet-fortios"
  | "paloalto-panos"
  | "huawei-vrp"
  | "nokia-sros"
  | "aruba-aoscx"
  | "extreme-exos"
  | "ubiquiti-edgeos"
  | "avm-fritzos"
  | "axis-os"
  | "isp-generic"
  | "generic-os";

export type LabDeviceClass =
  | "router"
  | "switch"
  | "firewall"
  | "access_point"
  | "camera"
  | "server"
  | "endpoint"
  | "isp_edge"
  | "cpe"
  | "home_gateway";

export type LabLinkType =
  | "access"
  | "trunk"
  | "routed"
  | "wan"
  | "isp"
  | "uplink"
  | "peer"
  | "service";

export type LabLinkMedium = "ethernet" | "fiber" | "wireless" | "virtual";

export type LabConfigKind = "cli_config" | "structured_profile" | "appliance_manifest";

export type LabProvenance = "generated-lab" | "synthetic" | "fabricated";

export type LabSourceState = "lab" | "demo" | "local";

export type LabOperationalState =
  | "healthy"
  | "warning"
  | "degraded"
  | "down"
  | "maintenance"
  | "unknown";

export interface LabInterface {
  readonly id: string;
  readonly name: string;                        // e.g. "GigabitEthernet0/0/0", "ether1", "vlan10"
  readonly kind: InterfaceKind;                 // inherit from networkModel
  readonly description: string | null;
  readonly ip_addresses: readonly IpAddressModel[];
  readonly vlan_id: number | null;
  readonly speed_mbps: number | null;
  readonly enabled: boolean;
}

export interface LabDevice {
  readonly id: string;                          // stable lab-dev-NNN (except env-fab-demo legacy)
  readonly hostname: string;
  readonly display_label: string;
  readonly device_class: LabDeviceClass;
  readonly vendor: LabVendor;
  readonly platform_id: LabPlatformId;
  readonly os_family: string;                   // e.g. "IOS XE", "Junos", "FRITZ!OS"
  readonly management_ip: IpAddressModel | null;
  readonly loopback_ip: IpAddressModel | null;
  readonly site_id: string | null;
  readonly zone: string | null;
  readonly tags: readonly string[];
  readonly capabilities: readonly string[];      // e.g. ["routing", "vlan", "ospf"]
  readonly interfaces: readonly LabInterface[];
  readonly operational_state?: LabOperationalState;  // V1BU — device operational condition
  readonly provenance: LabProvenance;
  readonly source_state: LabSourceState;
}

export interface LabLink {
  readonly id: string;                          // stable lab-link-NNN
  readonly endpoint_a_device_id: string;
  readonly endpoint_a_interface_id: string;
  readonly endpoint_b_device_id: string;
  readonly endpoint_b_interface_id: string;
  readonly link_type: LabLinkType;
  readonly medium: LabLinkMedium;
  readonly speed_mbps: number | null;
  readonly enabled: boolean;
  readonly vlan_id: number | null;
  readonly provenance: LabProvenance;
}

export interface LabSubnet {
  readonly id: string;
  readonly cidr: string;                        // e.g. "10.0.0.0/24"
  readonly purpose: "management" | "loopback" | "transit" | "vlan" | "site";
  readonly site_id: string | null;
  readonly vlan_id: number | null;
}

export interface LabAddressPlan {
  readonly management_subnet: string;            // "10.10.0.0/24"
  readonly loopback_subnet: string;              // "10.255.0.0/24"
  readonly transit_subnet: string;               // "10.20.0.0/16" (parent for /30s)
  readonly vlan_subnets: readonly LabSubnet[];
  readonly site_subnets: readonly LabSubnet[];
  readonly allocated: readonly LabSubnet[];      // every /xx actually carved out
}

export interface LabConfigArtifact {
  readonly device_id: string;
  readonly config_kind: LabConfigKind;
  readonly vendor: LabVendor;
  readonly platform_id: LabPlatformId;
  readonly generated_at: string;                 // ISO or "lab-deterministic"
  readonly config_text: string | null;            // null when structured-only
  readonly structured_profile: Record<string, unknown> | null;
  readonly parser_hint: string | null;
  readonly provenance: LabProvenance;
  readonly limitations: readonly string[];
}

export interface LabEnvironmentCapabilityFlags {
  readonly topology: boolean;
  readonly inventory: boolean;
  readonly interfaces: boolean;
  readonly addressing: boolean;
  readonly configs: boolean;
  readonly routing: boolean;
  readonly services: boolean;
  readonly security: boolean;
}

export interface LabEnvironment {
  readonly environment_id: string;
  readonly name: string;
  readonly scenario_id: string;
  readonly scenario_name: string;
  readonly scenario_seed: string;
  readonly source_kind: "network-lab";
  readonly provenance: LabProvenance;
  readonly source_state: LabSourceState;
  readonly generator_version: string;            // e.g. "lab-engine/0.1.0"
  readonly schema_version: "1";
  readonly devices: readonly LabDevice[];
  readonly links: readonly LabLink[];
  readonly address_plan: LabAddressPlan;
  readonly configs: readonly LabConfigArtifact[];
  readonly capability_flags: LabEnvironmentCapabilityFlags;
  readonly device_count: number;
  readonly link_count: number;
  readonly config_count: number;
}

// Caps — every scenario + generator must respect these
export const LAB_MAX_DEVICES = 128;
export const LAB_MAX_LINKS = 384;
export const LAB_GENERATOR_VERSION = "lab-engine/0.1.0";
