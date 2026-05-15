/**
 * Canonical Network Model — TypeScript surface (V1I).
 *
 * Mirrors `src-tauri/src/engines/network_model.rs`. The Rust side is
 * authoritative; this file describes the wire shape produced by the parser
 * boundary. Keep in sync — renaming a shipped field is forbidden.
 */

// =====================================================================
// Identity / platform / evidence
// =====================================================================

export interface DeviceIdentity {
  readonly hostname: string | null;
  readonly chassis: string | null;
  readonly serial_numbers: ReadonlyArray<string>;
  readonly management_ips: ReadonlyArray<IpAddressModel>;
  readonly last_change_marker: string | null;
}

export interface PlatformRef {
  readonly platform_id: string | null;
  readonly vendor: string | null;
  readonly os_family: string | null;
  readonly os_version_raw: string | null;
  readonly os_version_normalized: string | null;
  readonly detection_confidence: number | null;
}

export type EvidenceSourceKind =
  | "config_file"
  | "config_paste"
  | "archive"
  | "live_collection"
  | "other";

export interface EvidenceMetadata {
  readonly source: string | null;
  readonly source_kind: EvidenceSourceKind | null;
  readonly captured_at: string | null;
  readonly parser_version: string | null;
  readonly registry_version: string | null;
  readonly fixture_corpus_version: string | null;
  readonly byte_size: number | null;
  readonly line_count: number | null;
}

// =====================================================================
// Interfaces / IP addressing
// =====================================================================

export type IpFamily = "v4" | "v6";

export interface IpAddressModel {
  readonly family: IpFamily;
  readonly address: string;
  readonly prefix_length: number;
  readonly secondary: boolean;
  readonly vrf: string | null;
}

export type InterfaceKind =
  | "unknown"
  | "physical"
  | "sub_interface"
  | "loopback"
  | "vlan"
  | "lag"
  | "tunnel"
  | "management"
  | "virtual";

export type InterfaceAdminState = "unknown" | "up" | "down";

export type InterfaceOperState =
  | "unknown"
  | "up"
  | "down"
  | "testing"
  | "dormant";

export type DuplexMode = "full" | "half" | "auto";

export type L2Mode = "access" | "trunk" | "routed";

export interface InterfaceModel {
  readonly name: string;
  readonly normalized_name: string | null;
  readonly kind: InterfaceKind;
  readonly admin_state: InterfaceAdminState;
  readonly oper_state: InterfaceOperState;
  readonly description: string | null;
  readonly mtu: number | null;
  readonly speed_mbps: number | null;
  readonly duplex: DuplexMode | null;
  readonly l2_mode: L2Mode | null;
  readonly access_vlan: number | null;
  readonly allowed_vlans: ReadonlyArray<number>;
  readonly native_vlan: number | null;
  readonly vrf: string | null;
  readonly ipv4_addresses: ReadonlyArray<IpAddressModel>;
  readonly ipv6_addresses: ReadonlyArray<IpAddressModel>;
  readonly parent_interface: string | null;
  readonly child_interfaces: ReadonlyArray<string>;
  readonly lag_membership: string | null;
  readonly notes: string | null;
}

// =====================================================================
// L2 / L3 containers
// =====================================================================

export type VlanState = "unknown" | "active" | "suspended";

export interface VlanModel {
  readonly id: number;
  readonly name: string | null;
  readonly state: VlanState;
  readonly interfaces: ReadonlyArray<string>;
}

export interface VrfModel {
  readonly name: string;
  readonly route_distinguisher: string | null;
  readonly route_targets_import: ReadonlyArray<string>;
  readonly route_targets_export: ReadonlyArray<string>;
  readonly interfaces: ReadonlyArray<string>;
  readonly address_families: ReadonlyArray<string>;
}

export interface StaticRouteModel {
  readonly prefix: string;
  readonly next_hops: ReadonlyArray<string>;
  readonly admin_distance: number | null;
  readonly metric: number | null;
  readonly tag: number | null;
  readonly vrf: string | null;
  readonly name: string | null;
}

// =====================================================================
// Routing protocols
// =====================================================================

export interface OspfArea {
  readonly id: string;
  readonly area_type: string | null;
  readonly networks: ReadonlyArray<string>;
  readonly interfaces: ReadonlyArray<string>;
}

export interface OspfModel {
  readonly process_id: string | null;
  readonly router_id: string | null;
  readonly vrf: string | null;
  readonly areas: ReadonlyArray<OspfArea>;
  readonly authentication_mode: string | null;
  readonly redistribution: ReadonlyArray<string>;
}

export type IsisLevel = "l1" | "l2" | "l1_l2";

export interface IsisModel {
  readonly instance: string | null;
  readonly net: string | null;
  readonly level: IsisLevel | null;
  readonly interfaces: ReadonlyArray<string>;
  readonly authentication_mode: string | null;
  readonly redistribution: ReadonlyArray<string>;
}

export interface EigrpModel {
  readonly autonomous_system: number | null;
  readonly router_id: string | null;
  readonly vrf: string | null;
  readonly networks: ReadonlyArray<string>;
  readonly authentication_mode: string | null;
  readonly redistribution: ReadonlyArray<string>;
}

export interface BgpNeighborModel {
  readonly peer_address: string;
  readonly remote_as: number | null;
  readonly description: string | null;
  readonly update_source: string | null;
  readonly ebgp_multihop: number | null;
  readonly address_families: ReadonlyArray<string>;
  readonly route_map_in: string | null;
  readonly route_map_out: string | null;
  readonly peer_group: string | null;
  readonly password_set: boolean;
  readonly soft_reconfig_inbound: boolean;
}

export interface BgpModel {
  readonly local_as: number | null;
  readonly router_id: string | null;
  readonly neighbors: ReadonlyArray<BgpNeighborModel>;
  readonly address_families: ReadonlyArray<string>;
  readonly redistribution: ReadonlyArray<string>;
  readonly network_statements: ReadonlyArray<string>;
}

export interface RoutingProtocolsModel {
  readonly ospf: ReadonlyArray<OspfModel>;
  readonly isis: ReadonlyArray<IsisModel>;
  readonly eigrp: ReadonlyArray<EigrpModel>;
  readonly bgp: ReadonlyArray<BgpModel>;
}

// =====================================================================
// Policy: ACL / firewall / NAT
// =====================================================================

export type AclAction = "unknown" | "permit" | "deny" | "remark";
export type AclDirection = "in" | "out";

export interface AclRuleModel {
  readonly sequence: number | null;
  readonly action: AclAction;
  readonly protocol: string | null;
  readonly source: string | null;
  readonly destination: string | null;
  readonly source_ports: string | null;
  readonly destination_ports: string | null;
  readonly log: boolean;
  readonly remark: string | null;
}

export interface AclAttachment {
  readonly interface: string;
  readonly direction: AclDirection;
}

export interface AclModel {
  readonly name: string;
  readonly family: IpFamily | null;
  readonly rules: ReadonlyArray<AclRuleModel>;
  readonly attached_interfaces: ReadonlyArray<AclAttachment>;
}

export interface FirewallZoneModel {
  readonly name: string;
  readonly interfaces: ReadonlyArray<string>;
  readonly default_action: AclAction | null;
}

export type NatKind =
  | "unknown"
  | "static_source"
  | "static_destination"
  | "dynamic"
  | "pat";

export interface NatRuleModel {
  readonly name: string | null;
  readonly kind: NatKind;
  readonly original_source: string | null;
  readonly original_destination: string | null;
  readonly translated_source: string | null;
  readonly translated_destination: string | null;
  readonly service: string | null;
  readonly pool: string | null;
}

// =====================================================================
// VPN / tunnels / QoS / LAG / services
// =====================================================================

export type TunnelKind =
  | "unknown"
  | "ipsec"
  | "gre"
  | "vti"
  | "l2tp"
  | "wireguard"
  | "mpls_l3vpn"
  | "mpls_l2vpn"
  | "vxlan";

export interface TunnelModel {
  readonly name: string;
  readonly kind: TunnelKind;
  readonly source: string | null;
  readonly destination: string | null;
  readonly vrf: string | null;
  readonly crypto_profile: string | null;
  readonly bound_interface: string | null;
}

export interface QosPolicyModel {
  readonly name: string;
  readonly class_maps: ReadonlyArray<string>;
  readonly policy_maps: ReadonlyArray<string>;
  readonly attached_interfaces: ReadonlyArray<string>;
}

export type LagMode = "active" | "passive" | "static";

export interface LagGroupModel {
  readonly name: string;
  readonly mode: LagMode | null;
  readonly members: ReadonlyArray<string>;
  readonly hashing_mode: string | null;
  readonly min_links: number | null;
}

export type ServiceKind =
  | "unknown"
  | "snmp"
  | "ntp"
  | "dns"
  | "ssh"
  | "syslog"
  | "aaa"
  | "tacacs"
  | "radius"
  | "http"
  | "https"
  | "telnet";

export interface ServiceModel {
  readonly kind: ServiceKind;
  readonly servers: ReadonlyArray<string>;
  readonly source_interface: string | null;
  readonly vrf: string | null;
  readonly authentication_mode: string | null;
  readonly notes: string | null;
}

// =====================================================================
// Topology hints / findings / unknowns / confidence
// =====================================================================

export type TopologyHintKind =
  | "unknown"
  | "lldp_declared"
  | "cdp_declared"
  | "bgp_peer"
  | "ospf_neighbour"
  | "shared_vlan"
  | "shared_subnet"
  | "lag_mate";

export interface NeighbourModel {
  readonly system_name: string | null;
  readonly interface: string | null;
  readonly address: string | null;
  readonly platform_hint: string | null;
}

export interface TopologyHint {
  readonly kind: TopologyHintKind;
  readonly local_interface: string | null;
  readonly neighbour: NeighbourModel | null;
  readonly evidence: string | null;
}

export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface FindingModel {
  readonly category: string;
  readonly severity: FindingSeverity;
  readonly message: string;
  readonly evidence_path: string | null;
  readonly line_start: number | null;
  readonly line_end: number | null;
}

export type UnknownReason =
  | "unsupported_keyword"
  | "unsupported_block"
  | "parse_error"
  | "out_of_scope"
  | "vendor_extension"
  | "other";

export interface UnknownConfigLine {
  readonly source: string | null;
  readonly line_number: number | null;
  readonly raw: string;
  readonly context_path: string | null;
  readonly reason: UnknownReason | null;
}

export type ParserMaturityObserved =
  | "l0identify"
  | "l1inventory"
  | "l2topology"
  | "l3policy"
  | "l4intent"
  | "l5validation"
  | "l6render";

export interface ParseConfidence {
  readonly maturity_observed: ParserMaturityObserved | null;
  readonly score: number | null;
  readonly parsed_line_count: number;
  readonly unknown_line_count: number;
  readonly warnings: ReadonlyArray<string>;
}

// =====================================================================
// Root
// =====================================================================

export interface DeviceModel {
  readonly identity: DeviceIdentity;
  readonly platform: PlatformRef;
  readonly evidence: EvidenceMetadata;
  readonly interfaces: ReadonlyArray<InterfaceModel>;
  readonly vlans: ReadonlyArray<VlanModel>;
  readonly vrfs: ReadonlyArray<VrfModel>;
  readonly static_routes: ReadonlyArray<StaticRouteModel>;
  readonly routing_protocols: RoutingProtocolsModel;
  readonly acls: ReadonlyArray<AclModel>;
  readonly firewall_zones: ReadonlyArray<FirewallZoneModel>;
  readonly nat_rules: ReadonlyArray<NatRuleModel>;
  readonly tunnels: ReadonlyArray<TunnelModel>;
  readonly qos_policies: ReadonlyArray<QosPolicyModel>;
  readonly lag_groups: ReadonlyArray<LagGroupModel>;
  readonly services: ReadonlyArray<ServiceModel>;
  readonly topology_hints: ReadonlyArray<TopologyHint>;
  readonly findings: ReadonlyArray<FindingModel>;
  readonly unknown_lines: ReadonlyArray<UnknownConfigLine>;
  readonly parse_confidence: ParseConfidence;
}
