//! Cisco IOS XR parser — first pass.
//!
//! Conservative coverage for the common bar:
//! identity, interfaces, IP addressing, VRFs, static routes, LAG
//! groups, and basic management-plane services. Route-policy / BGP /
//! prefix-set content stays as honest evidence rather than being
//! promoted into structured objects.

use std::collections::{BTreeMap, BTreeSet};

use crate::engines::network_model::{
    DeviceIdentity, DeviceModel, EvidenceMetadata, EvidenceSourceKind, InterfaceAdminState,
    InterfaceKind, InterfaceModel, IpAddressModel, IpFamily, L2Mode, LagGroupModel, LagMode,
    ParseConfidence, ParserMaturityObserved, PlatformRef, ServiceKind, ServiceModel,
    StaticRouteModel, UnknownConfigLine, UnknownReason, VlanModel, VlanState, VrfModel,
};

pub const PARSER_VERSION: u32 = 1;

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
];

const OUT_OF_SCOPE_AREAS: &[&str] = &[
    "aaa_detail",
    "firewall_policies",
    "nat_rules",
    "qos_policies",
    "routing_protocols_bgp",
    "routing_protocols_isis",
    "routing_protocols_ospf",
    "route_policy",
    "prefix_set",
    "tunnels",
    "vpn_tunnels",
];

pub fn parse(platform_ref: PlatformRef, config_text: &str) -> DeviceModel {
    let lines: Vec<&str> = config_text.lines().collect();
    let byte_size = config_text.len() as u64;
    let line_count = lines.len() as u64;

    let mut state = ParseState::default();
    state.parse(&lines);

    let platform = build_platform(platform_ref);
    let evidence = build_evidence(byte_size, line_count);
    let parse_confidence = build_parse_confidence(&state);

    let mut model = DeviceModel::default();
    model.identity = DeviceIdentity {
        hostname: state.hostname.clone(),
        chassis: None,
        serial_numbers: Vec::new(),
        management_ips: state.management_ips.clone(),
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

#[derive(Debug, Default)]
struct ParseState {
    hostname: Option<String>,
    management_ips: Vec<IpAddressModel>,
    interfaces: BTreeMap<String, InterfaceBuf>,
    vlans: BTreeMap<u16, VlanBuf>,
    vrfs: BTreeMap<String, VrfBuf>,
    lag_groups: BTreeMap<String, LagBuf>,
    static_routes: Vec<StaticRouteModel>,
    services: BTreeMap<ServiceKind, ServiceBuf>,
    unknown_lines: Vec<UnknownConfigLine>,
    parsed_line_count: u64,
    current_iface: Option<String>,
    current_vrf: Option<String>,
    current_static: bool,
    current_static_af: bool,
}

#[derive(Debug, Default)]
struct InterfaceBuf {
    name: String,
    kind: InterfaceKind,
    admin_state: InterfaceAdminState,
    description: Option<String>,
    l2_mode: Option<L2Mode>,
    vrf: Option<String>,
    ipv4_addresses: Vec<IpAddressModel>,
    ipv6_addresses: Vec<IpAddressModel>,
    parent_interface: Option<String>,
    child_interfaces: BTreeSet<String>,
    lag_membership: Option<String>,
    notes: BTreeSet<String>,
}

#[derive(Debug, Default)]
struct VlanBuf {
    name: Option<String>,
    interfaces: BTreeSet<String>,
}

#[derive(Debug, Default)]
struct VrfBuf {
    route_distinguisher: Option<String>,
    interfaces: BTreeSet<String>,
    address_families: BTreeSet<String>,
}

#[derive(Debug, Default)]
struct LagBuf {
    mode: Option<LagMode>,
    members: BTreeSet<String>,
}

#[derive(Debug, Default)]
struct ServiceBuf {
    servers: BTreeSet<String>,
    notes: BTreeSet<String>,
}

impl ParseState {
    fn parse(&mut self, lines: &[&str]) {
        for (idx, raw) in lines.iter().enumerate() {
            let line_no = (idx as u64) + 1;
            let line = raw.trim_end_matches(['\r', '\n']);
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with('!') || trimmed.starts_with("!!") {
                continue;
            }
            if trimmed.eq_ignore_ascii_case("commit") {
                self.parsed_line_count += 1;
                continue;
            }

            let indent = line.len().saturating_sub(line.trim_start().len());
            if indent == 0 {
                self.current_iface = None;
                self.current_vrf = None;
                self.current_static = false;
                self.current_static_af = false;
            }

            if indent == 0 {
                if let Some(rest) = trimmed.strip_prefix("hostname ") {
                    self.hostname = Some(rest.trim().trim_matches('"').to_string());
                    self.parsed_line_count += 1;
                    continue;
                }
            }
            if indent == 0 {
                if let Some(rest) = trimmed.strip_prefix("interface ") {
                    self.current_iface = Some(rest.trim().trim_matches('"').to_string());
                    let name = self.current_iface.clone().unwrap();
                    let kind = classify_interface(&name);
                    self.ensure_interface(&name, kind);
                    if kind == InterfaceKind::Vlan {
                        if let Some(id) = extract_vlan_id_from_name(&name) {
                            self.ensure_vlan(id).interfaces.insert(name.clone());
                        }
                    }
                    if kind == InterfaceKind::Lag {
                        self.ensure_lag(&name);
                    }
                    self.parsed_line_count += 1;
                    continue;
                }
            }
            if indent == 0 {
                if let Some(rest) = trimmed.strip_prefix("vrf ") {
                    self.current_vrf = Some(rest.trim().trim_matches('"').to_string());
                    let vrf = self.current_vrf.clone().unwrap();
                    self.ensure_vrf(&vrf);
                    self.parsed_line_count += 1;
                    continue;
                }
            }
            if indent == 0 && trimmed == "router static" {
                self.current_static = true;
                self.parsed_line_count += 1;
                continue;
            }

            let tokens = split_args(trimmed);
            if tokens.is_empty() {
                continue;
            }

            if indent == 0 {
                if self.handle_top_level_service(line_no, line, &tokens) {
                    continue;
                }
            }

            if let Some(iface_name) = self.current_iface.clone() {
                if indent > 0 && self.handle_interface_line(line_no, line, &tokens, &iface_name) {
                    continue;
                }
            }
            if let Some(vrf_name) = self.current_vrf.clone() {
                if indent > 0 && self.handle_vrf_line(line_no, line, &tokens, &vrf_name) {
                    continue;
                }
            }
            if self.current_static && indent > 0 && self.handle_static_line(line_no, line, &tokens) {
                continue;
            }

            if is_out_of_scope(&tokens) {
                self.record_unknown(line_no, line, Some("cisco-iosxr out-of-scope"), UnknownReason::OutOfScope);
            } else {
                self.record_unknown(line_no, line, Some("cisco-iosxr"), UnknownReason::UnsupportedKeyword);
            }
        }
    }

    fn handle_top_level_service(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() >= 2 && tokens[0] == "ssh" && tokens[1] == "server" {
            self.ensure_service(ServiceKind::Ssh);
            self.parsed_line_count += 1;
            return true;
        }
        if tokens[0] == "snmp-server" || tokens[0] == "snmp" {
            self.ensure_service(ServiceKind::Snmp);
            self.parsed_line_count += 1;
            return true;
        }
        if tokens.len() >= 2 && tokens[0] == "ntp" && tokens[1] == "server" {
            if let Some(addr) = tokens.get(2) {
                self.ensure_service(ServiceKind::Ntp).servers.insert(clean_token(addr));
            } else {
                self.ensure_service(ServiceKind::Ntp);
            }
            self.parsed_line_count += 1;
            return true;
        }
        if tokens.len() >= 2 && tokens[0] == "logging" && tokens[1] == "host" {
            if let Some(addr) = tokens.get(2) {
                self.ensure_service(ServiceKind::Syslog).servers.insert(clean_token(addr));
            }
            self.parsed_line_count += 1;
            return true;
        }
        if tokens.len() >= 2 && tokens[0] == "domain" && tokens[1] == "name-server" {
            if let Some(addr) = tokens.get(2) {
                self.ensure_service(ServiceKind::Dns).servers.insert(clean_token(addr));
            }
            self.parsed_line_count += 1;
            return true;
        }
        if tokens[0] == "route-policy" || tokens[0] == "prefix-set" || tokens[0] == "router" {
            self.record_unknown(line_no, raw, Some("cisco-iosxr out-of-scope"), UnknownReason::OutOfScope);
            self.parsed_line_count += 1;
            return true;
        }
        false
    }

    fn handle_interface_line(&mut self, line_no: u64, raw: &str, tokens: &[String], iface_name: &str) -> bool {
        if tokens.is_empty() {
            return false;
        }
        let kind = classify_interface(iface_name);
        match tokens[0].as_str() {
            "description" => {
                if let Some(value) = tokens.get(1) {
                    self.ensure_interface(iface_name, kind).description = Some(clean_token(value));
                    self.parsed_line_count += 1;
                    true
                } else {
                    self.record_unknown(line_no, raw, Some("interface description"), UnknownReason::ParseError);
                    true
                }
            }
            "shutdown" => {
                self.ensure_interface(iface_name, kind).admin_state = InterfaceAdminState::Down;
                self.parsed_line_count += 1;
                true
            }
            "no" if tokens.get(1).map(|s| s.as_str()) == Some("shutdown") => {
                self.ensure_interface(iface_name, kind).admin_state = InterfaceAdminState::Up;
                self.parsed_line_count += 1;
                true
            }
            "ipv4" if tokens.get(1).map(|s| s.as_str()) == Some("address") => {
                if let Some((ip, _)) = parse_ip_address_family(&tokens[2..], IpFamily::V4) {
                    let buf = self.ensure_interface(iface_name, kind);
                    buf.ipv4_addresses.push(ip);
                    buf.admin_state = InterfaceAdminState::Up;
                    buf.l2_mode = Some(L2Mode::Routed);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("interface ipv4 address"), UnknownReason::ParseError);
                }
                true
            }
            "ipv6" if tokens.get(1).map(|s| s.as_str()) == Some("address") => {
                if let Some((ip, _)) = parse_ip_address_family(&tokens[2..], IpFamily::V6) {
                    let buf = self.ensure_interface(iface_name, kind);
                    buf.ipv6_addresses.push(ip);
                    buf.admin_state = InterfaceAdminState::Up;
                    buf.l2_mode = Some(L2Mode::Routed);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("interface ipv6 address"), UnknownReason::ParseError);
                }
                true
            }
            "vrf" => {
                if let Some(vrf_name) = tokens.get(1) {
                    let vrf_name = clean_token(vrf_name);
                    self.ensure_interface(iface_name, kind).vrf = Some(vrf_name.clone());
                    self.ensure_vrf(&vrf_name).interfaces.insert(iface_name.to_string());
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("interface vrf"), UnknownReason::ParseError);
                }
                true
            }
            "bundle" if tokens.get(1).map(|s| s.as_str()) == Some("id") => {
                if let Some(id) = tokens.get(2).and_then(|v| v.parse::<u16>().ok()) {
                    let bundle_name = bundle_interface_name(id);
                    let mode = if tokens.iter().any(|t| t.eq_ignore_ascii_case("active")) {
                        Some(LagMode::Active)
                    } else {
                        Some(LagMode::Static)
                    };
                    self.ensure_interface(iface_name, kind).lag_membership = Some(bundle_name.clone());
                    self.ensure_lag(&bundle_name).members.insert(iface_name.to_string());
                    self.ensure_lag(&bundle_name).mode = mode;
                    self.ensure_interface(&bundle_name, InterfaceKind::Lag)
                        .child_interfaces
                        .insert(iface_name.to_string());
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("interface bundle id"), UnknownReason::ParseError);
                }
                true
            }
            _ => false,
        }
    }

    fn handle_vrf_line(&mut self, line_no: u64, raw: &str, tokens: &[String], vrf_name: &str) -> bool {
        if tokens.is_empty() {
            return false;
        }
        match tokens[0].as_str() {
            "route-distinguisher" => {
                if let Some(value) = tokens.get(1) {
                    self.ensure_vrf(vrf_name).route_distinguisher = Some(clean_token(value));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("vrf route-distinguisher"), UnknownReason::ParseError);
                }
                true
            }
            "interface" => {
                if let Some(iface) = tokens.get(1) {
                    let iface = clean_token(iface);
                    self.ensure_vrf(vrf_name).interfaces.insert(iface.clone());
                    self.ensure_interface(&iface, classify_interface(&iface)).vrf = Some(vrf_name.to_string());
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("vrf interface"), UnknownReason::ParseError);
                }
                true
            }
            "address-family" => {
                if let Some(value) = tokens.get(1) {
                    self.ensure_vrf(vrf_name).address_families.insert(clean_token(value));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("vrf address-family"), UnknownReason::ParseError);
                }
                true
            }
            _ => false,
        }
    }

    fn handle_static_line(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens[0] == "address-family" {
            self.current_static_af = true;
            self.parsed_line_count += 1;
            return true;
        }
        if !self.current_static_af {
            return false;
        }
        let start = if tokens[0] == "route" { 1 } else { 0 };
        if let Some((route, _)) = parse_static_route(&tokens[start..], None) {
            self.static_routes.push(route);
            self.parsed_line_count += 1;
            true
        } else {
            self.record_unknown(line_no, raw, Some("router static"), UnknownReason::ParseError);
            true
        }
    }

    fn ensure_interface(&mut self, name: &str, kind: InterfaceKind) -> &mut InterfaceBuf {
        self.interfaces.entry(name.to_string()).or_insert_with(|| InterfaceBuf {
            name: name.to_string(),
            kind,
            admin_state: InterfaceAdminState::Unknown,
            description: None,
            l2_mode: None,
            vrf: None,
            ipv4_addresses: Vec::new(),
            ipv6_addresses: Vec::new(),
            parent_interface: None,
            child_interfaces: BTreeSet::new(),
            lag_membership: None,
            notes: BTreeSet::new(),
        })
    }

    fn ensure_vlan(&mut self, id: u16) -> &mut VlanBuf {
        self.vlans.entry(id).or_default()
    }

    fn ensure_vrf(&mut self, name: &str) -> &mut VrfBuf {
        self.vrfs.entry(name.to_string()).or_default()
    }

    fn ensure_lag(&mut self, name: &str) -> &mut LagBuf {
        self.lag_groups.entry(name.to_string()).or_default()
    }

    fn ensure_service(&mut self, kind: ServiceKind) -> &mut ServiceBuf {
        self.services.entry(kind).or_default()
    }

    fn take_interfaces(&self) -> Vec<InterfaceModel> {
        let mut out: Vec<InterfaceModel> = self.interfaces.values().map(|b| b.to_model()).collect();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    fn take_vlans(&self) -> Vec<VlanModel> {
        let mut out: Vec<VlanModel> = self
            .vlans
            .iter()
            .map(|(id, v)| VlanModel {
                id: *id,
                name: v.name.clone(),
                state: VlanState::Active,
                interfaces: {
                    let mut members: Vec<String> = v.interfaces.iter().cloned().collect();
                    members.sort();
                    members
                },
            })
            .collect();
        out.sort_by(|a, b| a.id.cmp(&b.id));
        out
    }

    fn take_vrfs(&self) -> Vec<VrfModel> {
        let mut out: Vec<VrfModel> = self
            .vrfs
            .iter()
            .map(|(name, v)| VrfModel {
                name: name.clone(),
                route_distinguisher: v.route_distinguisher.clone(),
                route_targets_import: Vec::new(),
                route_targets_export: Vec::new(),
                interfaces: {
                    let mut members: Vec<String> = v.interfaces.iter().cloned().collect();
                    members.sort();
                    members
                },
                address_families: {
                    let mut af: Vec<String> = v.address_families.iter().cloned().collect();
                    af.sort();
                    af
                },
            })
            .collect();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    fn take_lag_groups(&self) -> Vec<LagGroupModel> {
        let mut out: Vec<LagGroupModel> = self
            .lag_groups
            .iter()
            .map(|(name, lag)| LagGroupModel {
                name: name.clone(),
                mode: lag.mode,
                members: {
                    let mut members: Vec<String> = lag.members.iter().cloned().collect();
                    members.sort();
                    members
                },
                hashing_mode: None,
                min_links: None,
            })
            .collect();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    fn take_static_routes(&mut self) -> Vec<StaticRouteModel> {
        let mut out = std::mem::take(&mut self.static_routes);
        out.sort_by(|a, b| a.prefix.cmp(&b.prefix).then_with(|| a.next_hops.cmp(&b.next_hops)));
        out
    }

    fn take_services(&self) -> Vec<ServiceModel> {
        let mut out: Vec<ServiceModel> = self
            .services
            .iter()
            .map(|(kind, buf)| {
                let mut servers: Vec<String> = buf.servers.iter().cloned().collect();
                servers.sort();
                let mut notes: Vec<String> = buf.notes.iter().cloned().collect();
                notes.sort();
                ServiceModel {
                    kind: *kind,
                    servers,
                    source_interface: None,
                    vrf: None,
                    authentication_mode: None,
                    notes: if notes.is_empty() { None } else { Some(notes.join("; ")) },
                }
            })
            .collect();
        out.sort_by(|a, b| service_rank(a.kind).cmp(&service_rank(b.kind)));
        out
    }

    fn take_unknown_lines(&mut self) -> Vec<UnknownConfigLine> {
        let mut out = std::mem::take(&mut self.unknown_lines);
        out.sort_by_key(|l| l.line_number);
        out
    }

    fn record_unknown(&mut self, line_no: u64, raw: &str, context_path: Option<&str>, reason: UnknownReason) {
        self.unknown_lines.push(UnknownConfigLine {
            source: None,
            line_number: Some(line_no),
            raw: raw.to_string(),
            context_path: context_path.map(|s| s.to_string()),
            reason: Some(reason),
        });
    }
}

impl InterfaceBuf {
    fn to_model(&self) -> InterfaceModel {
        let mut notes: Vec<String> = self.notes.iter().cloned().collect();
        notes.sort();
        InterfaceModel {
            name: self.name.clone(),
            normalized_name: None,
            kind: self.kind,
            admin_state: self.admin_state,
            oper_state: Default::default(),
            description: self.description.clone(),
            mtu: None,
            speed_mbps: None,
            duplex: None,
            l2_mode: self.l2_mode.or_else(|| {
                if !self.ipv4_addresses.is_empty() || !self.ipv6_addresses.is_empty() {
                    Some(L2Mode::Routed)
                } else {
                    None
                }
            }),
            access_vlan: None,
            allowed_vlans: Vec::new(),
            native_vlan: None,
            vrf: self.vrf.clone(),
            ipv4_addresses: self.ipv4_addresses.clone(),
            ipv6_addresses: self.ipv6_addresses.clone(),
            parent_interface: self.parent_interface.clone(),
            child_interfaces: {
                let mut vals: Vec<String> = self.child_interfaces.iter().cloned().collect();
                vals.sort();
                vals
            },
            lag_membership: self.lag_membership.clone(),
            notes: if notes.is_empty() { None } else { Some(notes.join("; ")) },
        }
    }
}

fn split_args(input: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut buf = String::new();
    let mut in_quotes = false;
    for ch in input.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            c if c.is_whitespace() && !in_quotes => {
                if !buf.is_empty() {
                    out.push(std::mem::take(&mut buf));
                }
            }
            _ => buf.push(ch),
        }
    }
    if !buf.is_empty() {
        out.push(buf);
    }
    out
}

fn clean_token(token: &str) -> String {
    token.trim().trim_matches('"').trim_matches(';').to_string()
}

fn parse_ip_address_family(tokens: &[String], family: IpFamily) -> Option<(IpAddressModel, usize)> {
    let first = tokens.first()?;
    let address = clean_token(first);
    let mut idx = 1usize;
    let mut prefix_length: Option<u8> = None;
    while idx < tokens.len() {
        if tokens[idx].eq_ignore_ascii_case("mask-length") {
            if let Some(value) = tokens.get(idx + 1) {
                prefix_length = value.parse::<u8>().ok();
                idx += 2;
                break;
            }
        } else if tokens[idx].eq_ignore_ascii_case("255.255.255.0") {
            prefix_length = Some(24);
        }
        idx += 1;
    }
    let prefix_length = prefix_length?;
    Some((IpAddressModel { family, address, prefix_length, secondary: false, vrf: None }, idx))
}

fn parse_static_route(tokens: &[String], vrf: Option<String>) -> Option<(StaticRouteModel, usize)> {
    let first = tokens.first()?;
    let (prefix, mut idx) = if first.eq_ignore_ascii_case("default") {
        ("0.0.0.0/0".to_string(), 1usize)
    } else {
        (first.clone(), 1usize)
    };
    let mut next_hops = Vec::new();
    while idx < tokens.len() {
        if let Some(candidate) = tokens.get(idx) {
            if candidate.eq_ignore_ascii_case("address") {
                if let Some(addr) = tokens.get(idx + 1) {
                    next_hops.push(clean_token(addr));
                    idx += 2;
                    continue;
                }
            }
            if candidate.contains('.') || candidate.contains(':') {
                next_hops.push(clean_token(candidate));
                idx += 1;
                continue;
            }
        }
        idx += 1;
    }
    if next_hops.is_empty() {
        return None;
    }
    Some((StaticRouteModel { prefix, next_hops, admin_distance: None, metric: None, tag: None, vrf, name: None }, idx))
}

fn is_out_of_scope(tokens: &[String]) -> bool {
    match tokens.first().map(|s| s.as_str()) {
        Some("route-policy") | Some("prefix-set") | Some("router") => true,
        _ => false,
    }
}

fn classify_interface(name: &str) -> InterfaceKind {
    let lower = name.trim().to_ascii_lowercase();
    if lower.starts_with("bundle-ether") || lower.starts_with("bundle") {
        InterfaceKind::Lag
    } else if lower.starts_with("vlan") {
        InterfaceKind::Vlan
    } else if lower.starts_with("loopback") || lower.starts_with("lo") {
        InterfaceKind::Loopback
    } else if lower.contains('.') {
        InterfaceKind::SubInterface
    } else if lower.starts_with("mgmt") {
        InterfaceKind::Management
    } else if lower.contains("hundredge") || lower.contains("gig") || lower.contains("ether") {
        InterfaceKind::Physical
    } else {
        InterfaceKind::Unknown
    }
}

fn extract_vlan_id_from_name(name: &str) -> Option<u16> {
    let lower = name.trim().to_ascii_lowercase();
    let stripped = lower.strip_prefix("vlan")?;
    stripped.trim().parse::<u16>().ok()
}

fn bundle_interface_name(id: u16) -> String {
    format!("Bundle-Ether{id}")
}

fn service_rank(kind: ServiceKind) -> u8 {
    match kind {
        ServiceKind::Ssh => 0,
        ServiceKind::Snmp => 1,
        ServiceKind::Ntp => 2,
        ServiceKind::Dns => 3,
        ServiceKind::Syslog => 4,
        _ => 99,
    }
}

fn build_platform(mut platform_ref: PlatformRef) -> PlatformRef {
    platform_ref.platform_id = Some("cisco-iosxr".to_string());
    if platform_ref.vendor.is_none() {
        platform_ref.vendor = Some("Cisco".to_string());
    }
    if platform_ref.os_family.is_none() {
        platform_ref.os_family = Some("IOS XR".to_string());
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
        let any_ip = state.interfaces.values().any(|b| !b.ipv4_addresses.is_empty() || !b.ipv6_addresses.is_empty());
        if !any_ip && state.management_ips.is_empty() {
            warnings.push("absent:ip_addressing".to_string());
        }
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
    if state.static_routes.is_empty() {
        warnings.push("absent:static_routes".to_string());
    }
    if !state.services.contains_key(&ServiceKind::Ssh) {
        warnings.push("absent:services_ssh".to_string());
    }
    if !state.services.contains_key(&ServiceKind::Snmp) {
        warnings.push("absent:services_snmp".to_string());
    }
    if !state.services.contains_key(&ServiceKind::Ntp) {
        warnings.push("absent:services_ntp".to_string());
    }
    if !state.services.contains_key(&ServiceKind::Dns) {
        warnings.push("absent:services_dns".to_string());
    }
    if !state.services.contains_key(&ServiceKind::Syslog) {
        warnings.push("absent:services_syslog".to_string());
    }
    for area in OUT_OF_SCOPE_AREAS {
        warnings.push(format!("not_in_scope:{area}"));
    }
    warnings.sort();
    warnings.dedup();

    let parsed = state.parsed_line_count;
    let unknown = state.unknown_lines.len() as u64;
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

#[cfg(test)]
mod tests {
    use super::*;

    fn pref() -> PlatformRef {
        PlatformRef {
            platform_id: Some("cisco-iosxr".to_string()),
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
        assert_eq!(m.platform.platform_id.as_deref(), Some("cisco-iosxr"));
        assert!(m.identity.hostname.is_none());
        assert!(m.interfaces.is_empty());
    }

    #[test]
    fn hostname_interfaces_services_and_routes_parse() {
        let cfg = r#"
!! IOS XR Configuration
hostname xr-core-01
interface HundredGigE0/0/0/0
 description uplink
 no shutdown
 ipv4 address 198.51.100.2 255.255.255.252
 bundle id 1 mode active
interface Bundle-Ether1
 description core-bundle
 no shutdown
 ipv4 address 10.0.10.1 255.255.255.0
 vrf MGMT
interface Vlan10
 ipv4 address 10.10.10.1 255.255.255.0
 vrf MGMT
vrf MGMT
 route-distinguisher 65000:10
 interface Bundle-Ether1
router static
 address-family ipv4 unicast
 0.0.0.0/0 198.51.100.1
ssh server v2
snmp-server community public
ntp server 192.0.2.100
logging host 192.0.2.200
domain name-server 192.0.2.53
"#;
        let m = parse(pref(), cfg);
        assert_eq!(m.identity.hostname.as_deref(), Some("xr-core-01"));
        assert!(m.interfaces.iter().any(|i| i.name == "HundredGigE0/0/0/0"));
        assert!(m.interfaces.iter().any(|i| i.name == "Bundle-Ether1"));
        assert_eq!(m.static_routes.len(), 1);
        assert!(m.vrfs.iter().any(|v| v.name == "MGMT"));
        let kinds: Vec<ServiceKind> = m.services.iter().map(|s| s.kind).collect();
        assert!(kinds.contains(&ServiceKind::Ssh));
        assert!(kinds.contains(&ServiceKind::Snmp));
        assert!(kinds.contains(&ServiceKind::Ntp));
        assert!(kinds.contains(&ServiceKind::Dns));
        assert!(kinds.contains(&ServiceKind::Syslog));
    }

    #[test]
    fn out_of_scope_commands_are_recorded_honestly() {
        let cfg = r#"
route-policy DROP-ALL
prefix-set LOOPBACKS
router bgp 65000
"#;
        let m = parse(pref(), cfg);
        assert!(m.unknown_lines.iter().any(|u| matches!(u.reason, Some(UnknownReason::OutOfScope))));
    }

    #[test]
    fn deterministic_repeated_parse() {
        let cfg = "hostname xr-repeat\ninterface HundredGigE0/0/0/0\n ipv4 address 10.0.0.1 255.255.255.0\n";
        let a = parse(pref(), cfg);
        let b = parse(pref(), cfg);
        assert_eq!(a, b);
    }
}
