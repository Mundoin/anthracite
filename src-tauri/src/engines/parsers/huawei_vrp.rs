//! huawei-vrp parser — V1AV initial.
//!
//! Per [`PARSER_COMMAND_CONTRACT.md`](../../../../docs/architecture/PARSER_COMMAND_CONTRACT.md)
//! and [`PARSER_CONTRACT_INVARIANTS.md`](../../../../docs/architecture/PARSER_CONTRACT_INVARIANTS.md):
//! deterministic, never panics, BTreeMap-only, sorted Vec outputs, no
//! floats except the single rounded `ParseConfidence.score`.
//!
//! V1 coverage (intentionally bounded — V1AV scaffold lane):
//!   - identity (sysname → hostname)
//!   - platform metadata (platform_id, vendor, os_family, version when present)
//!   - interfaces (name, description, admin state, vrf binding)
//!   - ip addressing (interface `ip address X.X.X.X Y.Y.Y.Y`)
//!   - static routes (`ip route-static`)
//!   - services_telnet (`user-interface vty …` + `protocol inbound telnet`)
//!   - unknown line trail for every recognized-but-out-of-scope block
//!
//! Explicitly out of scope (emitted as `not_in_scope:` warnings, future
//! stages extend coverage):
//!   - VLANs / VLAN-batch / port trunk vocabulary
//!   - VRF instance bodies (`ip vpn-instance` blocks)
//!   - LAG / Eth-Trunk groups
//!   - routing protocol bodies (ospf, bgp, isis)
//!   - ACL / traffic policy / QoS
//!   - firewall / NAT / VPN tunnels
//!   - AAA / SNMP / NTP / syslog / DNS service details
//!
//! Doctrine: V1AV is the first parser-coverage expansion stage. Bumps
//! the per-platform parser_version when new areas land. The fixture
//! corpus harness enforces byte-equal `expected.json` outputs.

use std::collections::BTreeMap;

use crate::engines::network_model::{
    DeviceIdentity, DeviceModel, EvidenceMetadata, EvidenceSourceKind, InterfaceAdminState,
    InterfaceKind, InterfaceModel, IpAddressModel, IpFamily, ParseConfidence,
    ParserMaturityObserved, PlatformRef, ServiceKind, ServiceModel, StaticRouteModel,
    UnknownConfigLine, UnknownReason,
};

/// Monotonic parser version. Bump per
/// [`PARSER_VERSIONING.md`](../../../../docs/architecture/PARSER_VERSIONING.md).
///
/// V1 — V1AV initial: identity, interfaces, ip addressing, static
/// routes, telnet service note, unknown trail.
pub const PARSER_VERSION: u32 = 1;

/// V1AV in-scope coverage areas for huawei-vrp. Order matches
/// [`PARSER_COVERAGE_AREAS.md`](../../../../docs/architecture/PARSER_COVERAGE_AREAS.md).
/// Public so downstream consumers (docs, validators) can introspect.
#[allow(dead_code)]
pub const IN_SCOPE_AREAS: &[&str] = &[
    "identity",
    "platform",
    "interfaces",
    "ip_addressing",
    "static_routes",
    "services_telnet",
];

/// V1AV out-of-scope areas. Stable vocabulary so cross-vendor consumers
/// can compare absent vs. not-in-scope deterministically.
const OUT_OF_SCOPE_AREAS: &[&str] = &[
    "aaa_detail",
    "acls",
    "firewall_policies",
    "lag_groups",
    "nat_rules",
    "qos_policies",
    "routing_protocols_bgp",
    "routing_protocols_isis",
    "routing_protocols_ospf",
    "services_dns",
    "services_ntp",
    "services_snmp",
    "services_ssh",
    "services_syslog",
    "tunnels",
    "vlans",
    "vrfs",
];

/// Entry point. Per dispatch contract: never panics, returns a populated
/// `DeviceModel` shaped exactly like the other vendor parsers.
pub fn parse(platform_ref: PlatformRef, config_text: &str) -> DeviceModel {
    let lines: Vec<&str> = config_text.lines().collect();
    let byte_size = config_text.len() as u64;
    let line_count = lines.len() as u64;

    let mut state = ParseState::default();
    state.parse(&lines);

    let platform = build_platform(platform_ref, &state.version);
    let evidence = build_evidence(byte_size, line_count);
    let parse_confidence = build_parse_confidence(&state);

    let mut model = DeviceModel::default();
    model.identity = DeviceIdentity {
        hostname: state.hostname.clone(),
        chassis: None,
        serial_numbers: Vec::new(),
        management_ips: Vec::new(),
        last_change_marker: None,
    };
    model.platform = platform;
    model.evidence = evidence;
    model.interfaces = state.take_interfaces();
    model.static_routes = state.take_static_routes();
    model.services = state.take_services();
    model.unknown_lines = state.take_unknown_lines();
    model.parse_confidence = parse_confidence;
    model
}

// ---------------------------------------------------------------------
// Parse state machine
// ---------------------------------------------------------------------

#[derive(Default)]
struct ParseState {
    hostname: Option<String>,
    version: Option<String>,
    interfaces: BTreeMap<String, InterfaceBuf>,
    static_routes: Vec<StaticRouteModel>,
    has_telnet: bool,
    in_vty_block: bool,
    unknown: Vec<UnknownConfigLine>,
    parsed_line_count: u64,
}

#[derive(Default)]
struct InterfaceBuf {
    name: String,
    kind: InterfaceKind,
    admin_state: InterfaceAdminState,
    description: Option<String>,
    ipv4: Vec<IpAddressModel>,
    vrf: Option<String>,
}

impl ParseState {
    fn parse(&mut self, lines: &[&str]) {
        let mut current_iface: Option<String> = None;
        for (idx, raw) in lines.iter().enumerate() {
            let line_no = (idx as u64) + 1;
            let line = raw.trim_end();
            let trimmed = line.trim_start();
            let indent = line.len() - trimmed.len();

            // Skip empty + comment + section terminators we know about.
            if trimmed.is_empty() {
                continue;
            }
            if trimmed.starts_with('#') {
                self.parsed_line_count += 1;
                continue;
            }
            if trimmed == "return" || trimmed == "quit" {
                self.parsed_line_count += 1;
                continue;
            }

            // Block exit: any line with indent 0 closes the current
            // interface or vty block. Huawei VRP commonly indents inner
            // lines by one space; top-level commands start at column 0.
            if indent == 0 {
                if current_iface.is_some() && !trimmed.starts_with("interface ") {
                    current_iface = None;
                }
                if self.in_vty_block && !trimmed.starts_with("user-interface ") {
                    self.in_vty_block = false;
                }
            }

            // ---- top-level dispatch ----
            if let Some(rest) = trimmed.strip_prefix("sysname ") {
                self.hostname = Some(rest.trim().to_string());
                self.parsed_line_count += 1;
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("version ") {
                self.version = Some(rest.trim().to_string());
                self.parsed_line_count += 1;
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("interface ") {
                let name = rest.trim().to_string();
                current_iface = Some(name.clone());
                self.interfaces.entry(name.clone()).or_insert_with(|| InterfaceBuf {
                    name: name.clone(),
                    kind: classify_interface(&name),
                    admin_state: InterfaceAdminState::Unknown,
                    description: None,
                    ipv4: Vec::new(),
                    vrf: None,
                });
                self.parsed_line_count += 1;
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("ip route-static ") {
                if let Some(route) = parse_static_route(rest) {
                    self.static_routes.push(route);
                    self.parsed_line_count += 1;
                } else {
                    self.unknown.push(UnknownConfigLine {
                        source: None,
                        line_number: Some(line_no),
                        raw: line.to_string(),
                        context_path: None,
                        reason: Some(UnknownReason::ParseError),
                    });
                }
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("user-interface ") {
                if rest.starts_with("vty ") {
                    self.in_vty_block = true;
                    self.parsed_line_count += 1;
                    continue;
                }
                self.parsed_line_count += 1;
                continue;
            }

            // ---- nested dispatch ----
            if let Some(ref iface_name) = current_iface {
                let buf = match self.interfaces.get_mut(iface_name) {
                    Some(b) => b,
                    None => continue,
                };
                if let Some(rest) = trimmed.strip_prefix("description ") {
                    buf.description = Some(rest.trim().to_string());
                    self.parsed_line_count += 1;
                    continue;
                }
                if trimmed == "shutdown" {
                    buf.admin_state = InterfaceAdminState::Down;
                    self.parsed_line_count += 1;
                    continue;
                }
                if trimmed == "undo shutdown" {
                    buf.admin_state = InterfaceAdminState::Up;
                    self.parsed_line_count += 1;
                    continue;
                }
                if let Some(rest) = trimmed.strip_prefix("ip address ") {
                    if let Some(addr) = parse_ip_address(rest) {
                        buf.ipv4.push(addr);
                        self.parsed_line_count += 1;
                        continue;
                    }
                    self.unknown.push(UnknownConfigLine {
                        source: None,
                        line_number: Some(line_no),
                        raw: line.to_string(),
                        context_path: Some(format!("interface {iface_name}")),
                        reason: Some(UnknownReason::ParseError),
                    });
                    continue;
                }
                if let Some(rest) = trimmed.strip_prefix("ip binding vpn-instance ") {
                    buf.vrf = Some(rest.trim().to_string());
                    self.parsed_line_count += 1;
                    continue;
                }
                // Anything else inside an interface block is out of scope
                // for V1.
                self.unknown.push(UnknownConfigLine {
                    source: None,
                    line_number: Some(line_no),
                    raw: line.to_string(),
                    context_path: Some(format!("interface {iface_name}")),
                    reason: Some(UnknownReason::OutOfScope),
                });
                continue;
            }

            if self.in_vty_block {
                if trimmed == "protocol inbound telnet" || trimmed == "protocol inbound all" {
                    self.has_telnet = true;
                    self.parsed_line_count += 1;
                    continue;
                }
                self.unknown.push(UnknownConfigLine {
                    source: None,
                    line_number: Some(line_no),
                    raw: line.to_string(),
                    context_path: Some("user-interface vty".to_string()),
                    reason: Some(UnknownReason::OutOfScope),
                });
                continue;
            }

            // ---- explicit out-of-scope top-level vocabulary ----
            if is_out_of_scope_top_level(trimmed) {
                self.unknown.push(UnknownConfigLine {
                    source: None,
                    line_number: Some(line_no),
                    raw: line.to_string(),
                    context_path: None,
                    reason: Some(UnknownReason::OutOfScope),
                });
                continue;
            }

            // Unrecognised — keep it as evidence.
            self.unknown.push(UnknownConfigLine {
                source: None,
                line_number: Some(line_no),
                raw: line.to_string(),
                context_path: None,
                reason: Some(UnknownReason::UnsupportedKeyword),
            });
        }
    }

    fn take_interfaces(&mut self) -> Vec<InterfaceModel> {
        let mut out: Vec<InterfaceModel> = self
            .interfaces
            .values()
            .map(|b| InterfaceModel {
                name: b.name.clone(),
                normalized_name: None,
                kind: b.kind,
                admin_state: b.admin_state,
                oper_state: Default::default(),
                description: b.description.clone(),
                mtu: None,
                speed_mbps: None,
                duplex: None,
                l2_mode: None,
                access_vlan: None,
                allowed_vlans: Vec::new(),
                native_vlan: None,
                vrf: b.vrf.clone(),
                ipv4_addresses: b.ipv4.clone(),
                ipv6_addresses: Vec::new(),
                parent_interface: None,
                child_interfaces: Vec::new(),
                lag_membership: None,
                notes: None,
            })
            .collect();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    fn take_static_routes(&mut self) -> Vec<StaticRouteModel> {
        let mut out = std::mem::take(&mut self.static_routes);
        out.sort_by(|a, b| {
            a.prefix
                .cmp(&b.prefix)
                .then_with(|| a.next_hops.cmp(&b.next_hops))
        });
        out
    }

    fn take_services(&mut self) -> Vec<ServiceModel> {
        let mut out: Vec<ServiceModel> = Vec::new();
        if self.has_telnet {
            out.push(ServiceModel {
                kind: ServiceKind::Telnet,
                servers: Vec::new(),
                source_interface: None,
                vrf: None,
                authentication_mode: None,
                notes: Some("telnet enabled on user-interface vty".to_string()),
            });
        }
        out
    }

    fn take_unknown_lines(&mut self) -> Vec<UnknownConfigLine> {
        let mut out = std::mem::take(&mut self.unknown);
        out.sort_by_key(|l| l.line_number);
        out
    }
}

fn classify_interface(name: &str) -> InterfaceKind {
    let n = name.to_ascii_lowercase();
    if n.starts_with("loopback") {
        InterfaceKind::Loopback
    } else if n.starts_with("vlanif") {
        InterfaceKind::Vlan
    } else if n.starts_with("eth-trunk") {
        InterfaceKind::Lag
    } else if n.starts_with("tunnel") {
        InterfaceKind::Tunnel
    } else if n.starts_with("nullif") || n.starts_with("null") {
        InterfaceKind::Virtual
    } else if n.starts_with("meth") || n.starts_with("management") {
        InterfaceKind::Management
    } else if n.contains('.') {
        InterfaceKind::SubInterface
    } else if n.starts_with("gigabitethernet")
        || n.starts_with("xgigabitethernet")
        || n.starts_with("10ge")
        || n.starts_with("25ge")
        || n.starts_with("40ge")
        || n.starts_with("100ge")
        || n.starts_with("ethernet")
    {
        InterfaceKind::Physical
    } else {
        InterfaceKind::Unknown
    }
}

fn parse_ip_address(rest: &str) -> Option<IpAddressModel> {
    let mut parts = rest.split_whitespace();
    let addr = parts.next()?;
    let mask = parts.next()?;
    let prefix = mask_to_prefix(mask)?;
    Some(IpAddressModel {
        family: IpFamily::V4,
        address: addr.to_string(),
        prefix_length: prefix,
        secondary: false,
        vrf: None,
    })
}

fn mask_to_prefix(mask: &str) -> Option<u8> {
    // Accept dotted-decimal mask, "/N", or bare numeric prefix form.
    let stripped = mask.strip_prefix('/').unwrap_or(mask);
    if !stripped.contains('.') {
        return stripped.parse::<u8>().ok().filter(|n| *n <= 32);
    }
    let octets: Vec<u8> = stripped
        .split('.')
        .map(|s| s.parse::<u8>().ok())
        .collect::<Option<Vec<u8>>>()?;
    if octets.len() != 4 {
        return None;
    }
    let bits: u32 = ((octets[0] as u32) << 24)
        | ((octets[1] as u32) << 16)
        | ((octets[2] as u32) << 8)
        | (octets[3] as u32);
    if bits == 0 {
        return Some(0);
    }
    if bits == 0xFFFF_FFFF {
        return Some(32);
    }
    let leading = bits.leading_ones();
    let trailing = bits.trailing_zeros();
    if leading + trailing != 32 {
        return None;
    }
    Some(leading as u8)
}

fn parse_static_route(rest: &str) -> Option<StaticRouteModel> {
    // Forms (V1):
    //   ip route-static <dest> <mask> <next-hop>
    //   ip route-static <dest> <prefix> <next-hop>
    //   ip route-static <dest> <mask|prefix> NULL0
    let parts: Vec<&str> = rest.split_whitespace().collect();
    if parts.len() < 3 {
        return None;
    }
    let dest = parts[0];
    let mask_or_prefix = parts[1];
    let next_hop = parts[2];
    let prefix = mask_to_prefix(mask_or_prefix)?;
    Some(StaticRouteModel {
        prefix: format!("{dest}/{prefix}"),
        next_hops: vec![next_hop.to_string()],
        admin_distance: None,
        metric: None,
        tag: None,
        vrf: None,
        name: None,
    })
}

fn is_out_of_scope_top_level(line: &str) -> bool {
    const PREFIXES: &[&str] = &[
        "acl ",
        "bgp ",
        "ospf ",
        "isis ",
        "traffic-policy ",
        "traffic classifier ",
        "traffic behavior ",
        "qos ",
        "nat ",
        "ip vpn-instance ",
        "vlan ",
        "vlan batch ",
        "snmp-agent ",
        "ssh server ",
        "info-center ",
        "ntp-service ",
        "aaa ",
        "ntp ",
        "dns server ",
        "firewall ",
        "service-management ",
    ];
    PREFIXES.iter().any(|p| line.starts_with(p))
}

fn build_platform(mut platform_ref: PlatformRef, version: &Option<String>) -> PlatformRef {
    platform_ref.platform_id = Some("huawei-vrp".to_string());
    if platform_ref.vendor.is_none() {
        platform_ref.vendor = Some("Huawei".to_string());
    }
    if platform_ref.os_family.is_none() {
        platform_ref.os_family = Some("VRP".to_string());
    }
    if platform_ref.os_version_raw.is_none() {
        platform_ref.os_version_raw = version.clone();
    }
    if platform_ref.os_version_normalized.is_none() {
        platform_ref.os_version_normalized = version.clone();
    }
    if platform_ref.detection_confidence.is_none() {
        platform_ref.detection_confidence = Some(0.9);
    }
    platform_ref
}

fn build_evidence(byte_size: u64, line_count: u64) -> EvidenceMetadata {
    EvidenceMetadata {
        source: None,
        source_kind: Some(EvidenceSourceKind::ConfigPaste),
        captured_at: None,
        parser_version: Some(PARSER_VERSION.to_string()),
        registry_version: None,
        fixture_corpus_version: None,
        byte_size: Some(byte_size),
        line_count: Some(line_count),
    }
}

fn build_parse_confidence(state: &ParseState) -> ParseConfidence {
    let mut warnings: Vec<String> = Vec::new();
    if state.hostname.is_none() {
        warnings.push("absent:identity".to_string());
    }
    if state.interfaces.is_empty() {
        warnings.push("absent:interfaces".to_string());
        warnings.push("absent:ip_addressing".to_string());
    } else {
        let any_ipv4 = state.interfaces.values().any(|b| !b.ipv4.is_empty());
        if !any_ipv4 {
            warnings.push("absent:ip_addressing".to_string());
        }
    }
    if state.static_routes.is_empty() {
        warnings.push("absent:static_routes".to_string());
    }
    if !state.has_telnet {
        warnings.push("absent:services_telnet".to_string());
    }
    for area in OUT_OF_SCOPE_AREAS {
        warnings.push(format!("not_in_scope:{area}"));
    }
    warnings.sort();
    warnings.dedup();

    let parsed = state.parsed_line_count;
    let unknown = state.unknown.len() as u64;
    let denom = parsed + unknown + (warnings.len() as u64) + 1;
    let raw = (parsed as f64) / (denom as f64);
    let score = ((raw * 10_000.0).round() / 10_000.0) as f32;

    ParseConfidence {
        maturity_observed: Some(ParserMaturityObserved::L2Topology),
        score: Some(score),
        parsed_line_count: parsed,
        unknown_line_count: unknown,
        warnings,
    }
}

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn pref() -> PlatformRef {
        PlatformRef {
            platform_id: Some("huawei-vrp".to_string()),
            vendor: None,
            os_family: None,
            os_version_raw: None,
            os_version_normalized: None,
            detection_confidence: None,
        }
    }

    #[test]
    fn parse_version_constant_is_one() {
        assert_eq!(PARSER_VERSION, 1);
    }

    #[test]
    fn empty_config_returns_minimal_model() {
        let m = parse(pref(), "");
        assert!(m.identity.hostname.is_none());
        assert_eq!(m.platform.platform_id.as_deref(), Some("huawei-vrp"));
        assert_eq!(m.platform.vendor.as_deref(), Some("Huawei"));
        assert_eq!(m.interfaces.len(), 0);
        assert_eq!(m.static_routes.len(), 0);
        assert_eq!(m.services.len(), 0);
        assert_eq!(m.unknown_lines.len(), 0);
    }

    #[test]
    fn sysname_becomes_hostname() {
        let m = parse(pref(), "sysname vrp-a\nreturn\n");
        assert_eq!(m.identity.hostname.as_deref(), Some("vrp-a"));
    }

    #[test]
    fn version_captured_into_platform() {
        let m = parse(pref(), "version 5.170\nsysname x\n");
        assert_eq!(m.platform.os_version_raw.as_deref(), Some("5.170"));
        assert_eq!(m.platform.os_version_normalized.as_deref(), Some("5.170"));
    }

    #[test]
    fn interface_block_with_description_and_admin_state() {
        let cfg = "sysname x\ninterface GigabitEthernet0/0/1\n description uplink\n undo shutdown\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.interfaces.len(), 1);
        let iface = &m.interfaces[0];
        assert_eq!(iface.name, "GigabitEthernet0/0/1");
        assert_eq!(iface.kind, InterfaceKind::Physical);
        assert_eq!(iface.admin_state, InterfaceAdminState::Up);
        assert_eq!(iface.description.as_deref(), Some("uplink"));
    }

    #[test]
    fn ip_address_dotted_mask_parses_to_prefix() {
        let cfg = "interface GigabitEthernet0/0/1\n ip address 10.0.0.1 255.255.255.0\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.interfaces.len(), 1);
        let a = &m.interfaces[0].ipv4_addresses[0];
        assert_eq!(a.address, "10.0.0.1");
        assert_eq!(a.prefix_length, 24);
    }

    #[test]
    fn static_route_parses() {
        let cfg = "ip route-static 192.0.2.0 255.255.255.0 198.51.100.1\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.static_routes.len(), 1);
        let r = &m.static_routes[0];
        assert_eq!(r.prefix, "192.0.2.0/24");
        assert_eq!(r.next_hops, vec!["198.51.100.1".to_string()]);
    }

    #[test]
    fn telnet_service_detected_in_vty_block() {
        let cfg = "user-interface vty 0 4\n protocol inbound telnet\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.services.len(), 1);
        assert_eq!(m.services[0].kind, ServiceKind::Telnet);
        assert!(m.services[0].notes.is_some());
    }

    #[test]
    fn out_of_scope_top_level_is_recorded_honestly() {
        let cfg = "acl number 2000\nbgp 65000\n";
        let m = parse(pref(), cfg);
        assert!(m.unknown_lines.iter().any(|u| u.raw.starts_with("acl ")));
        assert!(m.unknown_lines.iter().any(|u| u.raw.starts_with("bgp ")));
        for u in &m.unknown_lines {
            assert!(matches!(u.reason, Some(UnknownReason::OutOfScope)));
        }
    }

    #[test]
    fn warnings_sorted_and_deduped() {
        let m = parse(pref(), "sysname x\n");
        let w = &m.parse_confidence.warnings;
        let mut sorted = w.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(w, &sorted);
    }

    #[test]
    fn interfaces_sorted_by_name() {
        let cfg = "interface GigabitEthernet0/0/3\ninterface GigabitEthernet0/0/1\ninterface GigabitEthernet0/0/2\n";
        let m = parse(pref(), cfg);
        let names: Vec<&str> = m.interfaces.iter().map(|i| i.name.as_str()).collect();
        let mut sorted = names.clone();
        sorted.sort();
        assert_eq!(names, sorted);
    }

    #[test]
    fn deterministic_repeated_parse() {
        let cfg = "sysname x\ninterface GigabitEthernet0/0/1\n ip address 10.0.0.1 255.255.255.0\nip route-static 192.0.2.0 24 198.51.100.1\n";
        let a = parse(pref(), cfg);
        let b = parse(pref(), cfg);
        assert_eq!(a, b);
    }

    #[test]
    fn parses_prefix_length_form_in_static_route() {
        let cfg = "ip route-static 192.0.2.0 24 198.51.100.1\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.static_routes[0].prefix, "192.0.2.0/24");
    }

    #[test]
    fn ip_binding_vpn_instance_captures_vrf_on_interface() {
        let cfg = "interface GigabitEthernet0/0/1\n ip binding vpn-instance CUST-A\n ip address 10.0.0.1 255.255.255.0\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.interfaces[0].vrf.as_deref(), Some("CUST-A"));
    }
}
