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

use std::collections::{BTreeMap, BTreeSet};

use crate::engines::network_model::{
    DeviceIdentity, DeviceModel, EvidenceMetadata, EvidenceSourceKind, InterfaceAdminState,
    InterfaceKind, InterfaceModel, IpAddressModel, IpFamily, LagGroupModel, LagMode, L2Mode,
    ParseConfidence, ParserMaturityObserved, PlatformRef, ServiceKind, ServiceModel,
    StaticRouteModel, UnknownConfigLine, UnknownReason, VlanModel, VlanState, VrfModel,
};

/// Monotonic parser version. Bump per
/// [`PARSER_VERSIONING.md`](../../../../docs/architecture/PARSER_VERSIONING.md).
///
/// V2 — V1AV uplift: adds VLANs, VRFs, LAG groups, and core service
/// hints to the original Huawei VRP slice.
pub const PARSER_VERSION: u32 = 2;

/// V1AV in-scope coverage areas for huawei-vrp. Order matches
/// [`PARSER_COVERAGE_AREAS.md`](../../../../docs/architecture/PARSER_COVERAGE_AREAS.md).
/// Public so downstream consumers (docs, validators) can introspect.
#[allow(dead_code)]
pub const IN_SCOPE_AREAS: &[&str] = &[
    "identity",
    "platform",
    "interfaces",
    "ip_addressing",
    "vlans",
    "vrfs",
    "static_routes",
    "lag_groups",
    "services_ssh",
    "services_snmp",
    "services_ntp",
    "services_dns",
    "services_syslog",
    "services_telnet",
];

/// V1AV out-of-scope areas. Stable vocabulary so cross-vendor consumers
/// can compare absent vs. not-in-scope deterministically.
const OUT_OF_SCOPE_AREAS: &[&str] = &[
    "aaa_detail",
    "acls",
    "firewall_policies",
    "nat_rules",
    "qos_policies",
    "routing_protocols_bgp",
    "routing_protocols_isis",
    "routing_protocols_ospf",
    "tunnels",
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
    model.vlans = state.take_vlans();
    model.vrfs = state.take_vrfs();
    model.static_routes = state.take_static_routes();
    model.lag_groups = state.take_lag_groups();
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
    vlans: BTreeMap<u16, VlanBuf>,
    vrfs: BTreeMap<String, VrfBuf>,
    lag_groups: BTreeMap<String, LagBuf>,
    static_routes: Vec<StaticRouteModel>,
    has_telnet: bool,
    has_ssh: bool,
    has_snmp: bool,
    has_ntp: bool,
    has_dns: bool,
    has_syslog: bool,
    ntp_servers: BTreeSet<String>,
    dns_servers: BTreeSet<String>,
    syslog_servers: BTreeSet<String>,
    in_vty_block: bool,
    current_vlan: Option<u16>,
    current_vrf: Option<String>,
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
    access_vlan: Option<u16>,
    allowed_vlans: BTreeSet<u16>,
    lag_membership: Option<String>,
    notes: Vec<String>,
}

#[derive(Default)]
struct VlanBuf {
    name: Option<String>,
    interfaces: BTreeSet<String>,
}

#[derive(Default)]
struct VrfBuf {
    rd: Option<String>,
    import_targets: BTreeSet<String>,
    export_targets: BTreeSet<String>,
    interfaces: BTreeSet<String>,
    address_families: BTreeSet<String>,
}

#[derive(Default)]
struct LagBuf {
    mode: Option<LagMode>,
    members: BTreeSet<String>,
    hashing_mode: Option<String>,
    min_links: Option<u16>,
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
                current_iface = None;
                self.in_vty_block = false;
                self.current_vlan = None;
                self.current_vrf = None;
                self.parsed_line_count += 1;
                continue;
            }

            // Block exit: any line with indent 0 closes the current
            // interface / vlan / vrf / vty block. Huawei VRP commonly
            // indents inner lines by one space; top-level commands start
            // at column 0.
            if indent == 0 {
                if current_iface.is_some() && !trimmed.starts_with("interface ") {
                    current_iface = None;
                }
                if self.current_vlan.is_some() && !trimmed.starts_with("vlan ") {
                    self.current_vlan = None;
                }
                if self.current_vrf.is_some() && !trimmed.starts_with("ip vpn-instance ") {
                    self.current_vrf = None;
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
                    access_vlan: None,
                    allowed_vlans: BTreeSet::new(),
                    lag_membership: None,
                    notes: Vec::new(),
                });
                if let Some(vlan_id) = vlan_id_from_interface_name(&name) {
                    let entry = self.vlans.entry(vlan_id).or_default();
                    entry.interfaces.insert(name.clone());
                }
                if let Some(lag_name) = lag_name_from_interface_name(&name) {
                    self.lag_groups.entry(lag_name).or_default();
                }
                self.parsed_line_count += 1;
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("vlan batch ") {
                for vlan_id in parse_vlan_id_list(rest) {
                    self.vlans.entry(vlan_id).or_default();
                }
                self.parsed_line_count += 1;
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("vlan ") {
                if let Ok(vlan_id) = rest.trim().parse::<u16>() {
                    self.current_vlan = Some(vlan_id);
                    self.vlans.entry(vlan_id).or_default();
                    self.parsed_line_count += 1;
                    continue;
                }
            }
            if let Some(rest) = trimmed.strip_prefix("ip vpn-instance ") {
                let name = rest.trim().to_string();
                self.current_vrf = Some(name.clone());
                self.vrfs.entry(name).or_default();
                self.parsed_line_count += 1;
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("ip route-static ") {
                if let Some((vrf, route)) = parse_static_route(rest) {
                    if let Some(vrf_name) = vrf {
                        self.vrfs.entry(vrf_name).or_default();
                    }
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
            if handle_service_top_level(self, line_no, line, trimmed) {
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
                    let vrf_name = rest.trim().to_string();
                    buf.vrf = Some(vrf_name.clone());
                    self.vrfs
                        .entry(vrf_name.clone())
                        .or_default()
                        .interfaces
                        .insert(iface_name.clone());
                    self.parsed_line_count += 1;
                    continue;
                }
                if let Some(rest) = trimmed.strip_prefix("eth-trunk ") {
                    let id = rest.trim().split_whitespace().next().and_then(|s| s.parse::<u16>().ok());
                    if let Some(id) = id {
                        let lag_name = format!("Eth-Trunk{id}");
                        buf.lag_membership = Some(lag_name.clone());
                        self.lag_groups.entry(lag_name.clone()).or_default().members.insert(iface_name.clone());
                        self.parsed_line_count += 1;
                        continue;
                    }
                }
                if let Some(rest) = trimmed.strip_prefix("port link-type ") {
                    buf.notes.push(format!("l2_mode={}", rest.trim()));
                    if rest.trim() == "access" {
                        buf.notes.push("l2_access".to_string());
                    } else if rest.trim() == "trunk" {
                        buf.notes.push("l2_trunk".to_string());
                    }
                    self.parsed_line_count += 1;
                    continue;
                }
                if let Some(rest) = trimmed.strip_prefix("port default vlan ") {
                    if let Some(vlan_id) = rest.trim().split_whitespace().next().and_then(|s| s.parse::<u16>().ok()) {
                        buf.access_vlan = Some(vlan_id);
                        self.vlans.entry(vlan_id).or_default().interfaces.insert(iface_name.clone());
                        self.parsed_line_count += 1;
                        continue;
                    }
                }
                if let Some(rest) = trimmed.strip_prefix("port trunk allow-pass vlan ") {
                    let vlans = parse_vlan_id_list(rest);
                    for vlan_id in &vlans {
                        buf.allowed_vlans.insert(*vlan_id);
                        self.vlans.entry(*vlan_id).or_default().interfaces.insert(iface_name.clone());
                    }
                    self.parsed_line_count += 1;
                    continue;
                }
                if let Some(rest) = trimmed.strip_prefix("trunkport ") {
                    let member = rest.trim().to_string();
                    if let Some(lag_name) = lag_name_from_interface_name(iface_name) {
                        self.lag_groups.entry(lag_name.clone()).or_default().members.insert(member);
                        self.parsed_line_count += 1;
                        continue;
                    }
                }
                if let Some(rest) = trimmed.strip_prefix("mode ") {
                    if let Some(lag_name) = lag_name_from_interface_name(iface_name) {
                        let mode = parse_lag_mode(rest.trim());
                        self.lag_groups.entry(lag_name).or_default().mode = mode;
                        self.parsed_line_count += 1;
                        continue;
                    }
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

            if let Some(vlan_id) = self.current_vlan {
                if let Some(entry) = self.vlans.get_mut(&vlan_id) {
                    if let Some(rest) = trimmed.strip_prefix("name ") {
                        entry.name = Some(rest.trim_matches('"').trim().to_string());
                        self.parsed_line_count += 1;
                        continue;
                    }
                    if let Some(rest) = trimmed.strip_prefix("description ") {
                        entry.name = Some(rest.trim_matches('"').trim().to_string());
                        self.parsed_line_count += 1;
                        continue;
                    }
                    if let Some(rest) = trimmed.strip_prefix("port ") {
                        for token in rest.split_whitespace() {
                            entry.interfaces.insert(token.trim_matches(',').to_string());
                        }
                        self.parsed_line_count += 1;
                        continue;
                    }
                    self.unknown.push(UnknownConfigLine {
                        source: None,
                        line_number: Some(line_no),
                        raw: line.to_string(),
                        context_path: Some(format!("vlan {vlan_id}")),
                        reason: Some(UnknownReason::OutOfScope),
                    });
                    continue;
                }
            }

            if let Some(vrf_name) = self.current_vrf.clone() {
                let entry = self.vrfs.entry(vrf_name.clone()).or_default();
                if let Some(rest) = trimmed.strip_prefix("route-distinguisher ") {
                    entry.rd = Some(rest.trim_end_matches(';').trim().to_string());
                    self.parsed_line_count += 1;
                    continue;
                }
                if trimmed == "ipv4-family" || trimmed == "ipv4-family unicast" {
                    entry.address_families.insert("ipv4-unicast".to_string());
                    self.parsed_line_count += 1;
                    continue;
                }
                if trimmed == "ipv6-family" || trimmed == "ipv6-family unicast" {
                    entry.address_families.insert("ipv6-unicast".to_string());
                    self.parsed_line_count += 1;
                    continue;
                }
                if let Some(rest) = trimmed.strip_prefix("vpn-target ") {
                    let tokens: Vec<&str> = rest.split_whitespace().collect();
                    if let Some(target) = tokens.first() {
                        if tokens.iter().any(|t| t.contains("import")) {
                            entry.import_targets.insert(target.trim_end_matches(';').to_string());
                            self.parsed_line_count += 1;
                            continue;
                        }
                        if tokens.iter().any(|t| t.contains("export")) || tokens.iter().any(|t| *t == "both") {
                            entry.export_targets.insert(target.trim_end_matches(';').to_string());
                            self.parsed_line_count += 1;
                            continue;
                        }
                    }
                }
                self.unknown.push(UnknownConfigLine {
                    source: None,
                    line_number: Some(line_no),
                    raw: line.to_string(),
                    context_path: Some(format!("ip vpn-instance {vrf_name}")),
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
                l2_mode: if b.access_vlan.is_some() {
                    Some(L2Mode::Access)
                } else if !b.allowed_vlans.is_empty() {
                    Some(L2Mode::Trunk)
                } else {
                    None
                },
                access_vlan: b.access_vlan,
                allowed_vlans: b.allowed_vlans.iter().copied().collect(),
                native_vlan: None,
                vrf: b.vrf.clone(),
                ipv4_addresses: b.ipv4.clone(),
                ipv6_addresses: Vec::new(),
                parent_interface: None,
                child_interfaces: Vec::new(),
                lag_membership: b.lag_membership.clone(),
                notes: if b.notes.is_empty() {
                    None
                } else {
                    let mut notes = b.notes.clone();
                    notes.sort();
                    notes.dedup();
                    Some(notes.join("; "))
                },
            })
            .collect();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    fn take_vlans(&mut self) -> Vec<VlanModel> {
        let mut out: Vec<VlanModel> = self
            .vlans
            .iter()
            .map(|(id, b)| {
                let mut interfaces: Vec<String> = b.interfaces.iter().cloned().collect();
                interfaces.sort();
                VlanModel {
                    id: *id,
                    name: b.name.clone(),
                    state: VlanState::Active,
                    interfaces,
                }
            })
            .collect();
        out.sort_by_key(|v| v.id);
        out
    }

    fn take_vrfs(&mut self) -> Vec<VrfModel> {
        let mut out: Vec<VrfModel> = self
            .vrfs
            .iter()
            .map(|(name, b)| {
                let mut import_targets: Vec<String> = b.import_targets.iter().cloned().collect();
                import_targets.sort();
                let mut export_targets: Vec<String> = b.export_targets.iter().cloned().collect();
                export_targets.sort();
                let mut interfaces: Vec<String> = b.interfaces.iter().cloned().collect();
                interfaces.sort();
                let mut address_families: Vec<String> = b.address_families.iter().cloned().collect();
                address_families.sort();
                VrfModel {
                    name: name.clone(),
                    route_distinguisher: b.rd.clone(),
                    route_targets_import: import_targets,
                    route_targets_export: export_targets,
                    interfaces,
                    address_families,
                }
            })
            .collect();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    fn take_lag_groups(&mut self) -> Vec<LagGroupModel> {
        let mut out: Vec<LagGroupModel> = self
            .lag_groups
            .iter()
            .map(|(name, b)| {
                let mut members: Vec<String> = b.members.iter().cloned().collect();
                members.sort();
                LagGroupModel {
                    name: name.clone(),
                    mode: b.mode,
                    members,
                    hashing_mode: b.hashing_mode.clone(),
                    min_links: b.min_links,
                }
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
        if self.has_ssh {
            out.push(ServiceModel {
                kind: ServiceKind::Ssh,
                servers: Vec::new(),
                source_interface: None,
                vrf: None,
                authentication_mode: None,
                notes: Some("stelnet/ssh server enabled".to_string()),
            });
        }
        if self.has_snmp {
            out.push(ServiceModel {
                kind: ServiceKind::Snmp,
                servers: Vec::new(),
                source_interface: None,
                vrf: None,
                authentication_mode: None,
                notes: Some("snmp-agent present".to_string()),
            });
        }
        if self.has_ntp || !self.ntp_servers.is_empty() {
            out.push(ServiceModel {
                kind: ServiceKind::Ntp,
                servers: self.ntp_servers.iter().cloned().collect(),
                source_interface: None,
                vrf: None,
                authentication_mode: None,
                notes: if self.has_ntp {
                    Some("ntp-service enabled".to_string())
                } else {
                    None
                },
            });
        }
        if self.has_dns || !self.dns_servers.is_empty() {
            out.push(ServiceModel {
                kind: ServiceKind::Dns,
                servers: self.dns_servers.iter().cloned().collect(),
                source_interface: None,
                vrf: None,
                authentication_mode: None,
                notes: if self.has_dns {
                    Some("dns server configured".to_string())
                } else {
                    None
                },
            });
        }
        if self.has_syslog || !self.syslog_servers.is_empty() {
            out.push(ServiceModel {
                kind: ServiceKind::Syslog,
                servers: self.syslog_servers.iter().cloned().collect(),
                source_interface: None,
                vrf: None,
                authentication_mode: None,
                notes: if self.has_syslog {
                    Some("info-center syslog configured".to_string())
                } else {
                    None
                },
            });
        }
        out.sort_by(|a, b| service_kind_rank(a.kind).cmp(&service_kind_rank(b.kind)));
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

fn vlan_id_from_interface_name(name: &str) -> Option<u16> {
    let lower = name.to_ascii_lowercase();
    for prefix in ["vlanif", "vlan"] {
        if let Some(rest) = lower.strip_prefix(prefix) {
            if !rest.is_empty() {
                return rest.parse::<u16>().ok();
            }
        }
    }
    None
}

fn lag_name_from_interface_name(name: &str) -> Option<String> {
    let trimmed = name.trim();
    let lower = trimmed.to_ascii_lowercase();
    if let Some(rest) = lower.strip_prefix("eth-trunk") {
        if rest.chars().all(|c| c.is_ascii_digit()) && !rest.is_empty() {
            return Some(format!("Eth-Trunk{}", rest));
        }
    }
    None
}

fn parse_vlan_id_list(input: &str) -> Vec<u16> {
    let replaced = input.replace(',', " ");
    let tokens: Vec<&str> = replaced.split_whitespace().collect();
    let mut out: Vec<u16> = Vec::new();
    let mut idx = 0;
    while idx < tokens.len() {
        let token = tokens[idx];
        if token.eq_ignore_ascii_case("to") {
            idx += 1;
            continue;
        }
        let start = match token.parse::<u16>() {
            Ok(v) => v,
            Err(_) => {
                idx += 1;
                continue;
            }
        };
        if idx + 2 < tokens.len() && tokens[idx + 1].eq_ignore_ascii_case("to") {
            if let Ok(end) = tokens[idx + 2].parse::<u16>() {
                let (a, b) = if start <= end { (start, end) } else { (end, start) };
                for v in a..=b {
                    out.push(v);
                }
                idx += 3;
                continue;
            }
        }
        out.push(start);
        idx += 1;
    }
    out.sort();
    out.dedup();
    out
}

fn parse_lag_mode(text: &str) -> Option<LagMode> {
    let lower = text.to_ascii_lowercase();
    if lower.contains("static") {
        Some(LagMode::Static)
    } else if lower.contains("passive") {
        Some(LagMode::Passive)
    } else if lower.contains("active") || lower.contains("dynamic") || lower.contains("lacp") {
        Some(LagMode::Active)
    } else {
        None
    }
}

fn service_kind_rank(kind: ServiceKind) -> u8 {
    match kind {
        ServiceKind::Telnet => 0,
        ServiceKind::Ssh => 1,
        ServiceKind::Snmp => 2,
        ServiceKind::Ntp => 3,
        ServiceKind::Dns => 4,
        ServiceKind::Syslog => 5,
        _ => 99,
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

fn parse_static_route(rest: &str) -> Option<(Option<String>, StaticRouteModel)> {
    // Forms:
    //   ip route-static <dest> <mask> <next-hop>
    //   ip route-static <dest> <prefix> <next-hop>
    //   ip route-static vpn-instance <vrf> <dest> <mask|prefix> <next-hop>
    let parts: Vec<&str> = rest.split_whitespace().collect();
    if parts.len() < 3 {
        return None;
    }
    let mut idx = 0;
    let mut vrf: Option<String> = None;
    if parts.get(0) == Some(&"vpn-instance") {
        if parts.len() < 5 {
            return None;
        }
        vrf = Some(parts[1].to_string());
        idx = 2;
    }
    if parts.len().saturating_sub(idx) < 3 {
        return None;
    }
    let dest = parts[idx];
    let mask_or_prefix = parts[idx + 1];
    let next_hop = parts[idx + 2];
    let prefix = mask_to_prefix(mask_or_prefix)?;
    Some((
        vrf.clone(),
        StaticRouteModel {
            prefix: format!("{dest}/{prefix}"),
            next_hops: vec![next_hop.to_string()],
            admin_distance: None,
            metric: None,
            tag: None,
            vrf,
            name: None,
        },
    ))
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
        "aaa ",
        "firewall ",
        "service-management ",
    ];
    PREFIXES.iter().any(|p| line.starts_with(p))
}

fn handle_service_top_level(state: &mut ParseState, line_no: u64, raw: &str, trimmed: &str) -> bool {
    if trimmed == "stelnet server enable" || trimmed == "ssh server enable" {
        state.has_ssh = true;
        state.parsed_line_count += 1;
        return true;
    }
    if trimmed.starts_with("snmp-agent") {
        state.has_snmp = true;
        state.parsed_line_count += 1;
        return true;
    }
    if let Some(rest) = trimmed.strip_prefix("ntp-service ") {
        state.has_ntp = true;
        let tokens: Vec<&str> = rest.split_whitespace().collect();
        if let Some(kind) = tokens.first().copied() {
            if matches!(kind, "unicast-server" | "server" | "peer") {
                for addr in &tokens[1..] {
                    state.ntp_servers.insert(addr.trim_end_matches(';').to_string());
                }
            }
        }
        state.parsed_line_count += 1;
        return true;
    }
    if let Some(rest) = trimmed.strip_prefix("dns server ") {
        state.has_dns = true;
        for addr in rest.split_whitespace() {
            state.dns_servers.insert(addr.trim_end_matches(';').to_string());
        }
        state.parsed_line_count += 1;
        return true;
    }
    if let Some(rest) = trimmed.strip_prefix("ip dns server ") {
        state.has_dns = true;
        for addr in rest.split_whitespace() {
            state.dns_servers.insert(addr.trim_end_matches(';').to_string());
        }
        state.parsed_line_count += 1;
        return true;
    }
    if let Some(rest) = trimmed.strip_prefix("info-center ") {
        state.has_syslog = true;
        let tokens: Vec<&str> = rest.split_whitespace().collect();
        if let Some(first) = tokens.first().copied() {
            if first == "loghost" {
                for addr in &tokens[1..] {
                    if addr.parse::<u32>().is_ok() {
                        continue;
                    }
                    state.syslog_servers.insert(addr.trim_end_matches(';').to_string());
                }
            }
        }
        state.parsed_line_count += 1;
        return true;
    }
    let _ = (line_no, raw);
    false
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
    if state.vlans.is_empty() {
        warnings.push("absent:vlans".to_string());
    }
    if state.vrfs.is_empty() {
        warnings.push("absent:vrfs".to_string());
    }
    if state.lag_groups.is_empty() {
        warnings.push("absent:lag_groups".to_string());
    }
    if !state.has_ssh {
        warnings.push("absent:services_ssh".to_string());
    }
    if !state.has_snmp {
        warnings.push("absent:services_snmp".to_string());
    }
    if !state.has_ntp && state.ntp_servers.is_empty() {
        warnings.push("absent:services_ntp".to_string());
    }
    if !state.has_dns && state.dns_servers.is_empty() {
        warnings.push("absent:services_dns".to_string());
    }
    if !state.has_syslog && state.syslog_servers.is_empty() {
        warnings.push("absent:services_syslog".to_string());
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
    fn parse_version_constant_is_two() {
        assert_eq!(PARSER_VERSION, 2);
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

    #[test]
    fn vlan_batch_and_vlanif_interfaces_create_vlans() {
        let cfg = "vlan batch 10 20\ninterface Vlanif10\n ip address 10.0.10.1 255.255.255.0\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.vlans.len(), 2);
        assert!(m.vlans.iter().any(|v| v.id == 10 && v.interfaces.contains(&"Vlanif10".to_string())));
        assert!(m.interfaces.iter().any(|i| i.name == "Vlanif10" && i.kind == InterfaceKind::Vlan));
    }

    #[test]
    fn vrf_and_static_route_vrf_binding_parse() {
        let cfg = "ip vpn-instance MGMT\n route-distinguisher 65000:1\nquit\nip route-static vpn-instance MGMT 10.0.0.0 255.255.255.0 192.0.2.1\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.vrfs.len(), 1);
        assert_eq!(m.vrfs[0].name, "MGMT");
        assert_eq!(m.vrfs[0].route_distinguisher.as_deref(), Some("65000:1"));
        assert_eq!(m.static_routes[0].vrf.as_deref(), Some("MGMT"));
    }

    #[test]
    fn lag_groups_and_members_are_recorded() {
        let cfg = "interface Eth-Trunk1\n mode lacp-static\n trunkport GigabitEthernet0/0/1\ninterface GigabitEthernet0/0/1\n eth-trunk 1\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.lag_groups.len(), 1);
        assert_eq!(m.lag_groups[0].name, "Eth-Trunk1");
        assert!(m.lag_groups[0].members.contains(&"GigabitEthernet0/0/1".to_string()));
        assert_eq!(m.interfaces.iter().find(|i| i.name == "GigabitEthernet0/0/1").and_then(|i| i.lag_membership.as_deref()), Some("Eth-Trunk1"));
    }

    #[test]
    fn service_lines_create_ssh_snmp_ntp_dns_and_syslog() {
        let cfg = "stelnet server enable\nsnmp-agent\nntp-service enable\nntp-service unicast-server 192.0.2.100\ndns server 192.0.2.53\ninfo-center loghost 192.0.2.200\n";
        let m = parse(pref(), cfg);
        let kinds: Vec<ServiceKind> = m.services.iter().map(|s| s.kind).collect();
        assert!(kinds.contains(&ServiceKind::Ssh));
        assert!(kinds.contains(&ServiceKind::Snmp));
        assert!(kinds.contains(&ServiceKind::Ntp));
        assert!(kinds.contains(&ServiceKind::Dns));
        assert!(kinds.contains(&ServiceKind::Syslog));
        let ntp = m.services.iter().find(|s| s.kind == ServiceKind::Ntp).unwrap();
        assert!(ntp.servers.contains(&"192.0.2.100".to_string()));
    }
}
