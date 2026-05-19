//! Canonical Network Model — V1I.
//!
//! Anthracite's internal, vendor-neutral language for "what a device is and
//! how it is configured". Every parser, validator, topology engine, and
//! operator surface speaks this model; raw vendor config never leaks past
//! the parser boundary.
//!
//! Boundary (per `ENGINE_AND_API_BOUNDARIES.md`):
//!   - Owns:    the typed shape of a parsed device's canonical state.
//!   - Does NOT own: parsing, detection, validation logic, live state,
//!                   topology synthesis.
//!
//! Source-of-truth pairing:
//!   - `docs/architecture/CANONICAL_NETWORK_MODEL.md` (area map, doctrine).
//!   - `docs/architecture/VENDOR_ENGINE_PLAN.md` (maturity ladder).
//!   - `src-tauri/src/engines/vendor_registry.rs` (platform vocabulary).
//!
//! Design rules (do not regress):
//!   1. Unknown/unparsed config lines are first-class evidence, never dropped.
//!   2. Parse confidence is explicit per device and per area.
//!   3. Vendor-neutral root. Vendor-specific metadata lives in `notes`.
//!   4. Serde snake_case wire names; renaming a shipped field is forbidden.
//!   5. First-pass pragmatic shape — enough for Cisco IOS/XE L1/L2 next stage.

use serde::{Deserialize, Serialize};

// =====================================================================
// Root
// =====================================================================

/// Canonical, vendor-neutral representation of a single device.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case", default)]
pub struct DeviceModel {
    pub identity: DeviceIdentity,
    pub platform: PlatformRef,
    pub evidence: EvidenceMetadata,
    pub interfaces: Vec<InterfaceModel>,
    pub vlans: Vec<VlanModel>,
    pub vrfs: Vec<VrfModel>,
    pub static_routes: Vec<StaticRouteModel>,
    pub routing_protocols: RoutingProtocolsModel,
    pub acls: Vec<AclModel>,
    pub firewall_zones: Vec<FirewallZoneModel>,
    pub nat_rules: Vec<NatRuleModel>,
    pub tunnels: Vec<TunnelModel>,
    pub qos_policies: Vec<QosPolicyModel>,
    pub lag_groups: Vec<LagGroupModel>,
    pub services: Vec<ServiceModel>,
    pub topology_hints: Vec<TopologyHint>,
    pub findings: Vec<FindingModel>,
    pub unknown_lines: Vec<UnknownConfigLine>,
    pub parse_confidence: ParseConfidence,
}

impl DeviceModel {
    /// Construct a minimal device model from identity + platform reference.
    pub fn minimal(identity: DeviceIdentity, platform: PlatformRef) -> Self {
        Self {
            identity,
            platform,
            ..Self::default()
        }
    }
}

// =====================================================================
// Identity, platform, evidence
// =====================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct DeviceIdentity {
    pub hostname: Option<String>,
    pub chassis: Option<String>,
    pub serial_numbers: Vec<String>,
    pub management_ips: Vec<IpAddressModel>,
    pub last_change_marker: Option<String>,
}

/// Pointer into the Vendor Registry plus what the parser actually observed
/// on disk. `platform_id` SHOULD match a stable id from
/// [`crate::engines::vendor_registry`]; the model does not enforce this so
/// detection can record best-effort guesses with low confidence.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case", default)]
pub struct PlatformRef {
    pub platform_id: Option<String>,
    pub vendor: Option<String>,
    pub os_family: Option<String>,
    pub os_version_raw: Option<String>,
    pub os_version_normalized: Option<String>,
    pub detection_confidence: Option<f32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct EvidenceMetadata {
    pub source: Option<String>,
    pub source_kind: Option<EvidenceSourceKind>,
    pub captured_at: Option<String>,
    pub parser_version: Option<String>,
    pub registry_version: Option<String>,
    pub fixture_corpus_version: Option<String>,
    pub byte_size: Option<u64>,
    pub line_count: Option<u64>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum EvidenceSourceKind {
    ConfigFile,
    ConfigPaste,
    Archive,
    LiveCollection,
    Other,
}

// =====================================================================
// Interfaces and IP addressing
// =====================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct InterfaceModel {
    pub name: String,
    pub normalized_name: Option<String>,
    pub kind: InterfaceKind,
    pub admin_state: InterfaceAdminState,
    pub oper_state: InterfaceOperState,
    pub description: Option<String>,
    pub mtu: Option<u32>,
    pub speed_mbps: Option<u32>,
    pub duplex: Option<DuplexMode>,
    pub l2_mode: Option<L2Mode>,
    pub access_vlan: Option<u16>,
    pub allowed_vlans: Vec<u16>,
    pub native_vlan: Option<u16>,
    pub vrf: Option<String>,
    pub ipv4_addresses: Vec<IpAddressModel>,
    pub ipv6_addresses: Vec<IpAddressModel>,
    pub parent_interface: Option<String>,
    pub child_interfaces: Vec<String>,
    pub lag_membership: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InterfaceKind {
    #[default]
    Unknown,
    Physical,
    SubInterface,
    Loopback,
    Vlan,
    Lag,
    Tunnel,
    Management,
    Virtual,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InterfaceAdminState {
    #[default]
    Unknown,
    Up,
    Down,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InterfaceOperState {
    #[default]
    Unknown,
    Up,
    Down,
    Testing,
    Dormant,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DuplexMode {
    Full,
    Half,
    Auto,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum L2Mode {
    Access,
    Trunk,
    Routed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct IpAddressModel {
    pub family: IpFamily,
    pub address: String,
    pub prefix_length: u8,
    #[serde(default)]
    pub secondary: bool,
    #[serde(default)]
    pub vrf: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum IpFamily {
    V4,
    V6,
}

// =====================================================================
// L2 / L3 containers
// =====================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct VlanModel {
    pub id: u16,
    pub name: Option<String>,
    pub state: VlanState,
    pub interfaces: Vec<String>,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VlanState {
    #[default]
    Unknown,
    Active,
    Suspended,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct VrfModel {
    pub name: String,
    pub route_distinguisher: Option<String>,
    pub route_targets_import: Vec<String>,
    pub route_targets_export: Vec<String>,
    pub interfaces: Vec<String>,
    pub address_families: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct StaticRouteModel {
    pub prefix: String,
    pub next_hops: Vec<String>,
    pub admin_distance: Option<u32>,
    pub metric: Option<u32>,
    pub tag: Option<u32>,
    pub vrf: Option<String>,
    pub name: Option<String>,
}

// =====================================================================
// Routing protocols
// =====================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct RoutingProtocolsModel {
    pub ospf: Vec<OspfModel>,
    pub isis: Vec<IsisModel>,
    pub eigrp: Vec<EigrpModel>,
    pub bgp: Vec<BgpModel>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct OspfModel {
    pub process_id: Option<String>,
    pub router_id: Option<String>,
    pub vrf: Option<String>,
    pub areas: Vec<OspfArea>,
    pub authentication_mode: Option<String>,
    pub redistribution: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct OspfArea {
    pub id: String,
    pub area_type: Option<String>,
    pub networks: Vec<String>,
    pub interfaces: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct IsisModel {
    pub instance: Option<String>,
    pub net: Option<String>,
    pub level: Option<IsisLevel>,
    pub interfaces: Vec<String>,
    pub authentication_mode: Option<String>,
    pub redistribution: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum IsisLevel {
    L1,
    L2,
    L1L2,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct EigrpModel {
    pub autonomous_system: Option<u32>,
    pub router_id: Option<String>,
    pub vrf: Option<String>,
    pub networks: Vec<String>,
    pub authentication_mode: Option<String>,
    pub redistribution: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct BgpModel {
    pub local_as: Option<u32>,
    pub router_id: Option<String>,
    pub neighbors: Vec<BgpNeighborModel>,
    pub address_families: Vec<String>,
    pub redistribution: Vec<String>,
    pub network_statements: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct BgpNeighborModel {
    pub peer_address: String,
    pub remote_as: Option<u32>,
    pub description: Option<String>,
    pub update_source: Option<String>,
    pub ebgp_multihop: Option<u32>,
    pub address_families: Vec<String>,
    pub route_map_in: Option<String>,
    pub route_map_out: Option<String>,
    pub peer_group: Option<String>,
    pub password_set: bool,
    pub soft_reconfig_inbound: bool,
}

// =====================================================================
// Policy: ACL / firewall / NAT
// =====================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct AclModel {
    pub name: String,
    pub family: Option<IpFamily>,
    pub rules: Vec<AclRuleModel>,
    pub attached_interfaces: Vec<AclAttachment>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct AclRuleModel {
    pub sequence: Option<u32>,
    pub action: AclAction,
    pub protocol: Option<String>,
    pub source: Option<String>,
    pub destination: Option<String>,
    pub source_ports: Option<String>,
    pub destination_ports: Option<String>,
    pub log: bool,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AclAction {
    #[default]
    Unknown,
    Permit,
    Deny,
    Remark,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct AclAttachment {
    pub interface: String,
    pub direction: AclDirection,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AclDirection {
    In,
    Out,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct FirewallZoneModel {
    pub name: String,
    pub interfaces: Vec<String>,
    pub default_action: Option<AclAction>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct NatRuleModel {
    pub name: Option<String>,
    pub kind: NatKind,
    pub original_source: Option<String>,
    pub original_destination: Option<String>,
    pub translated_source: Option<String>,
    pub translated_destination: Option<String>,
    pub service: Option<String>,
    pub pool: Option<String>,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NatKind {
    #[default]
    Unknown,
    StaticSource,
    StaticDestination,
    Dynamic,
    Pat,
}

// =====================================================================
// VPN / tunnels / QoS / LAG / services
// =====================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct TunnelModel {
    pub name: String,
    pub kind: TunnelKind,
    pub source: Option<String>,
    pub destination: Option<String>,
    pub vrf: Option<String>,
    pub crypto_profile: Option<String>,
    pub bound_interface: Option<String>,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TunnelKind {
    #[default]
    Unknown,
    Ipsec,
    Gre,
    Vti,
    L2tp,
    Wireguard,
    MplsL3vpn,
    MplsL2vpn,
    Vxlan,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct QosPolicyModel {
    pub name: String,
    pub class_maps: Vec<String>,
    pub policy_maps: Vec<String>,
    pub attached_interfaces: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct LagGroupModel {
    pub name: String,
    pub mode: Option<LagMode>,
    pub members: Vec<String>,
    pub hashing_mode: Option<String>,
    pub min_links: Option<u16>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LagMode {
    Active,
    Passive,
    Static,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct ServiceModel {
    pub kind: ServiceKind,
    pub servers: Vec<String>,
    pub source_interface: Option<String>,
    pub vrf: Option<String>,
    pub authentication_mode: Option<String>,
    pub notes: Option<String>,
}

#[derive(
    Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq, Hash, PartialOrd, Ord,
)]
#[serde(rename_all = "snake_case")]
pub enum ServiceKind {
    #[default]
    Unknown,
    Snmp,
    Ntp,
    Dns,
    Ssh,
    Syslog,
    Aaa,
    Tacacs,
    Radius,
    Http,
    Https,
    Telnet,
}

// =====================================================================
// Topology hints, findings, unknowns, confidence
// =====================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct TopologyHint {
    pub kind: TopologyHintKind,
    pub local_interface: Option<String>,
    pub neighbour: Option<NeighbourModel>,
    pub evidence: Option<String>,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TopologyHintKind {
    #[default]
    Unknown,
    LldpDeclared,
    CdpDeclared,
    BgpPeer,
    OspfNeighbour,
    SharedVlan,
    SharedSubnet,
    LagMate,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct NeighbourModel {
    pub system_name: Option<String>,
    pub interface: Option<String>,
    pub address: Option<String>,
    pub platform_hint: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct FindingModel {
    pub category: String,
    pub severity: FindingSeverity,
    pub message: String,
    pub evidence_path: Option<String>,
    pub line_start: Option<u64>,
    pub line_end: Option<u64>,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FindingSeverity {
    Info,
    #[default]
    Low,
    Medium,
    High,
    Critical,
}

/// First-class evidence for config the parser did not understand.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case", default)]
pub struct UnknownConfigLine {
    pub source: Option<String>,
    pub line_number: Option<u64>,
    pub raw: String,
    pub context_path: Option<String>,
    pub reason: Option<UnknownReason>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UnknownReason {
    UnsupportedKeyword,
    UnsupportedBlock,
    ParseError,
    OutOfScope,
    VendorExtension,
    /// Interface form did not match any known vendor pattern (e.g.
    /// Cisco short-form normalization table). Added V1L.
    UnrecognizedInterfaceForm,
    Other,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case", default)]
pub struct ParseConfidence {
    pub maturity_observed: Option<ParserMaturityObserved>,
    pub score: Option<f32>,
    pub parsed_line_count: u64,
    pub unknown_line_count: u64,
    pub warnings: Vec<String>,
}

/// Parser maturity actually achieved on this device. Mirrors the
/// `ParserMaturity` ladder in [`crate::engines::vendor_registry`] but is
/// repeated here so the model has no compile-time dependency on the
/// registry's enum identity.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum ParserMaturityObserved {
    L0Identify,
    L1Inventory,
    L2Topology,
    L3Policy,
    L4Intent,
    L5Validation,
    L6Render,
}

// =====================================================================
// Tests
// =====================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_identity() -> DeviceIdentity {
        DeviceIdentity {
            hostname: Some("core-01".to_string()),
            chassis: Some("ISR4451".to_string()),
            serial_numbers: vec!["FOC2300ABCD".to_string()],
            management_ips: vec![IpAddressModel {
                family: IpFamily::V4,
                address: "10.0.0.1".to_string(),
                prefix_length: 32,
                secondary: false,
                vrf: Some("mgmt".to_string()),
            }],
            last_change_marker: None,
        }
    }

    fn sample_platform() -> PlatformRef {
        PlatformRef {
            platform_id: Some("cisco-iosxe".to_string()),
            vendor: Some("Cisco".to_string()),
            os_family: Some("IOS / IOS XE".to_string()),
            os_version_raw: Some("17.9.3".to_string()),
            os_version_normalized: Some("17.9.3".to_string()),
            detection_confidence: Some(0.95),
        }
    }

    #[test]
    fn minimal_device_model_carries_identity_and_platform() {
        let m = DeviceModel::minimal(sample_identity(), sample_platform());
        assert_eq!(m.identity.hostname.as_deref(), Some("core-01"));
        assert_eq!(m.platform.platform_id.as_deref(), Some("cisco-iosxe"));
        assert!(m.interfaces.is_empty());
        assert!(m.unknown_lines.is_empty());
    }

    #[test]
    fn unknown_config_line_preserves_raw_text_and_line_number() {
        let u = UnknownConfigLine {
            source: Some("startup-config".to_string()),
            line_number: Some(427),
            raw: "service-policy type weird-bag input wat".to_string(),
            context_path: Some("interface GigabitEthernet0/1".to_string()),
            reason: Some(UnknownReason::UnsupportedKeyword),
        };
        let json = serde_json::to_string(&u).unwrap();
        let back: UnknownConfigLine = serde_json::from_str(&json).unwrap();
        assert_eq!(back, u);
        assert_eq!(back.line_number, Some(427));
        assert!(back.raw.contains("weird-bag"));
    }

    #[test]
    fn parse_confidence_tracks_parsed_and_unknown_counts() {
        let mut conf = ParseConfidence {
            maturity_observed: Some(ParserMaturityObserved::L2Topology),
            score: Some(0.82),
            parsed_line_count: 0,
            unknown_line_count: 0,
            warnings: vec![],
        };
        conf.parsed_line_count += 1234;
        conf.unknown_line_count += 17;
        assert_eq!(conf.parsed_line_count, 1234);
        assert_eq!(conf.unknown_line_count, 17);
        assert!(conf.maturity_observed >= Some(ParserMaturityObserved::L1Inventory));
    }

    #[test]
    fn interface_model_supports_ipv4_and_ipv6_addresses() {
        let iface = InterfaceModel {
            name: "GigabitEthernet0/1".to_string(),
            normalized_name: Some("Gi0/1".to_string()),
            kind: InterfaceKind::Physical,
            admin_state: InterfaceAdminState::Up,
            oper_state: InterfaceOperState::Up,
            ipv4_addresses: vec![IpAddressModel {
                family: IpFamily::V4,
                address: "192.0.2.1".to_string(),
                prefix_length: 24,
                secondary: false,
                vrf: None,
            }],
            ipv6_addresses: vec![IpAddressModel {
                family: IpFamily::V6,
                address: "2001:db8::1".to_string(),
                prefix_length: 64,
                secondary: false,
                vrf: None,
            }],
            ..InterfaceModel::default()
        };
        assert_eq!(iface.ipv4_addresses.len(), 1);
        assert_eq!(iface.ipv6_addresses.len(), 1);
        assert_eq!(iface.ipv4_addresses[0].family, IpFamily::V4);
        assert_eq!(iface.ipv6_addresses[0].family, IpFamily::V6);
    }

    #[test]
    fn bgp_neighbor_represents_asn_and_address() {
        let n = BgpNeighborModel {
            peer_address: "203.0.113.7".to_string(),
            remote_as: Some(64512),
            description: Some("upstream-a".to_string()),
            ..BgpNeighborModel::default()
        };
        assert_eq!(n.peer_address, "203.0.113.7");
        assert_eq!(n.remote_as, Some(64512));
    }

    #[test]
    fn vlan_and_vrf_serialise_round_trip() {
        let vlan = VlanModel {
            id: 100,
            name: Some("USERS".to_string()),
            state: VlanState::Active,
            interfaces: vec!["Gi0/1".to_string(), "Gi0/2".to_string()],
        };
        let vrf = VrfModel {
            name: "CUSTOMER-A".to_string(),
            route_distinguisher: Some("65000:100".to_string()),
            route_targets_import: vec!["65000:100".to_string()],
            route_targets_export: vec!["65000:100".to_string()],
            interfaces: vec!["Gi0/3".to_string()],
            address_families: vec!["ipv4-unicast".to_string()],
        };
        let vlan_json = serde_json::to_string(&vlan).unwrap();
        let vrf_json = serde_json::to_string(&vrf).unwrap();
        assert_eq!(vlan, serde_json::from_str::<VlanModel>(&vlan_json).unwrap());
        assert_eq!(vrf, serde_json::from_str::<VrfModel>(&vrf_json).unwrap());
    }

    #[test]
    fn findings_support_severity_and_category() {
        let f = FindingModel {
            category: "weak-crypto".to_string(),
            severity: FindingSeverity::High,
            message: "SSH version 1 enabled".to_string(),
            evidence_path: Some("startup-config".to_string()),
            line_start: Some(12),
            line_end: Some(12),
        };
        assert_eq!(f.severity, FindingSeverity::High);
        assert_eq!(f.category, "weak-crypto");
    }

    #[test]
    fn unrecognized_interface_form_round_trips() {
        let u = UnknownConfigLine {
            source: Some("startup-config".to_string()),
            line_number: Some(42),
            raw: "interface WeirdEthernet0/99".to_string(),
            context_path: None,
            reason: Some(UnknownReason::UnrecognizedInterfaceForm),
        };
        let json = serde_json::to_string(&u).unwrap();
        assert!(json.contains("unrecognized_interface_form"));
        let back: UnknownConfigLine = serde_json::from_str(&json).unwrap();
        assert_eq!(back, u);
    }

    #[test]
    fn default_device_model_round_trips_through_serde() {
        let m = DeviceModel::default();
        let json = serde_json::to_string(&m).unwrap();
        let back: DeviceModel = serde_json::from_str(&json).unwrap();
        assert_eq!(m, back);
    }

    #[test]
    fn populated_device_model_round_trips_through_serde() {
        let mut m = DeviceModel::minimal(sample_identity(), sample_platform());
        m.vlans.push(VlanModel {
            id: 10,
            name: Some("MGMT".to_string()),
            state: VlanState::Active,
            interfaces: vec![],
        });
        m.unknown_lines.push(UnknownConfigLine {
            source: None,
            line_number: Some(1),
            raw: "totally novel keyword".to_string(),
            context_path: None,
            reason: Some(UnknownReason::UnsupportedKeyword),
        });
        m.parse_confidence = ParseConfidence {
            maturity_observed: Some(ParserMaturityObserved::L1Inventory),
            score: Some(0.5),
            parsed_line_count: 10,
            unknown_line_count: 1,
            warnings: vec!["heuristic fallback used".to_string()],
        };
        let json = serde_json::to_string(&m).unwrap();
        let back: DeviceModel = serde_json::from_str(&json).unwrap();
        assert_eq!(m, back);
    }
}
