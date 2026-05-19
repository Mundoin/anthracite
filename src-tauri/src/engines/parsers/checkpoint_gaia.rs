//! Check Point Gaia parser — first pass.
//!
//! Conservative coverage for the common bar:
//! identity, interfaces, IP addressing, VRFs, static routes, and
//! basic services. Firewall policy / object / NAT / VPN content stays
//! as honest evidence instead of being promoted into structured objects.

use std::collections::{BTreeMap, BTreeSet};

use crate::engines::network_model::{
    DeviceIdentity, DeviceModel, EvidenceMetadata, EvidenceSourceKind, InterfaceAdminState,
    InterfaceKind, InterfaceModel, IpAddressModel, IpFamily, L2Mode, LagGroupModel, LagMode,
    ParseConfidence, ParserMaturityObserved, PlatformRef, ServiceKind, ServiceModel,
    StaticRouteModel, UnknownConfigLine, UnknownReason, VlanModel, VrfModel,
};

pub const PARSER_VERSION: u32 = 1;

#[allow(dead_code)]
pub const IN_SCOPE_AREAS: &[&str] = &[
    "identity",
    "platform",
    "interfaces",
    "ip_addressing",
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
    "tunnels",
    "vpn_tunnels",
    "policy",
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
    vrfs: BTreeMap<String, VrfBuf>,
    lag_groups: BTreeMap<String, LagBuf>,
    static_routes: Vec<StaticRouteModel>,
    services: BTreeMap<ServiceKind, ServiceBuf>,
    unknown_lines: Vec<UnknownConfigLine>,
    parsed_line_count: u64,
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
struct VrfBuf {
    route_distinguisher: Option<String>,
    interfaces: BTreeSet<String>,
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
            if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with('!') {
                continue;
            }

            let tokens = split_args(trimmed);
            if tokens.is_empty() {
                continue;
            }

            if tokens[0] != "set" {
                self.record_unknown(line_no, line, Some("checkpoint-gaia"), UnknownReason::UnsupportedKeyword);
                continue;
            }

            let handled = match tokens.get(1).map(|s| s.as_str()) {
                Some("hostname") => self.handle_hostname(line_no, line, &tokens),
                Some("interface") => self.handle_interface(line_no, line, &tokens),
                Some("static-route") => self.handle_static_route(line_no, line, &tokens),
                Some("snmp") => self.handle_snmp(line_no, line, &tokens),
                Some("service") => self.handle_service(line_no, line, &tokens),
                Some("ntp") => self.handle_ntp(line_no, line, &tokens),
                Some("syslog") => self.handle_syslog(line_no, line, &tokens),
                Some("dns") => self.handle_dns(line_no, line, &tokens),
                Some("vrf") => self.handle_vrf(line_no, line, &tokens),
                _ => false,
            };
            if handled {
                continue;
            }

            if is_out_of_scope(&tokens) {
                self.record_unknown(line_no, line, Some("checkpoint-gaia out-of-scope"), UnknownReason::OutOfScope);
            } else {
                self.record_unknown(line_no, line, Some("checkpoint-gaia"), UnknownReason::UnsupportedKeyword);
            }
        }
    }

    fn handle_hostname(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if let Some(name) = tokens.get(2) {
            self.hostname = Some(clean_token(name));
            self.parsed_line_count += 1;
            true
        } else {
            self.record_unknown(line_no, raw, Some("set hostname"), UnknownReason::ParseError);
            true
        }
    }

    fn handle_interface(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 3 {
            self.record_unknown(line_no, raw, Some("set interface"), UnknownReason::ParseError);
            return true;
        }
        let name = clean_token(&tokens[2]);
        let kind = classify_interface(&name);
        if tokens.len() == 3 {
            self.ensure_interface(&name, kind);
            self.parsed_line_count += 1;
            return true;
        }

        match tokens[3].as_str() {
            "state" => {
                if let Some(state) = tokens.get(4) {
                    let buf = self.ensure_interface(&name, kind);
                    buf.admin_state = if state.eq_ignore_ascii_case("on") {
                        InterfaceAdminState::Up
                    } else {
                        InterfaceAdminState::Down
                    };
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interface state"), UnknownReason::ParseError);
                }
                true
            }
            "description" => {
                if let Some(value) = tokens.get(4) {
                    let buf = self.ensure_interface(&name, kind);
                    buf.description = Some(clean_token(value));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interface description"), UnknownReason::ParseError);
                }
                true
            }
            "ipv4-address" | "ipv6-address" => {
                let family = if tokens[3] == "ipv6-address" { IpFamily::V6 } else { IpFamily::V4 };
                if let Some((ip, _)) = parse_ip_address_family(&tokens[4..], family) {
                    let buf = self.ensure_interface(&name, kind);
                    match ip.family {
                        IpFamily::V4 => buf.ipv4_addresses.push(ip),
                        IpFamily::V6 => buf.ipv6_addresses.push(ip),
                    }
                    buf.admin_state = InterfaceAdminState::Up;
                    buf.l2_mode = Some(L2Mode::Routed);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interface ip-address"), UnknownReason::ParseError);
                }
                true
            }
            "member" => {
                if let Some(member) = tokens.get(4) {
                    let member = clean_token(member);
                    if kind == InterfaceKind::Lag {
                        self.ensure_lag(&name).members.insert(member.clone());
                        self.ensure_interface(&name, kind).child_interfaces.insert(member.clone());
                        self.ensure_interface(&member, classify_interface(&member)).lag_membership = Some(name.clone());
                    } else {
                        let buf = self.ensure_interface(&name, kind);
                        buf.child_interfaces.insert(member.clone());
                        self.ensure_interface(&member, classify_interface(&member)).parent_interface = Some(name.clone());
                    }
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interface member"), UnknownReason::ParseError);
                }
                true
            }
            "vrf" => {
                if let Some(vrf_name) = tokens.get(4) {
                    let vrf_name = clean_token(vrf_name);
                    let buf = self.ensure_interface(&name, kind);
                    buf.vrf = Some(vrf_name.clone());
                    self.ensure_vrf(&vrf_name).interfaces.insert(name.clone());
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interface vrf"), UnknownReason::ParseError);
                }
                true
            }
            _ => false,
        }
    }

    fn handle_static_route(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        let Some(prefix_token) = tokens.get(2) else {
            self.record_unknown(line_no, raw, Some("set static-route"), UnknownReason::ParseError);
            return true;
        };
        let prefix = if prefix_token.eq_ignore_ascii_case("default") {
            "0.0.0.0/0".to_string()
        } else {
            prefix_token.clone()
        };
        let mut next_hops = Vec::new();
        for idx in 3..tokens.len() {
            if tokens[idx].eq_ignore_ascii_case("address") {
                if let Some(addr) = tokens.get(idx + 1) {
                    next_hops.push(clean_token(addr));
                    break;
                }
            }
        }
        if next_hops.is_empty() {
            self.record_unknown(line_no, raw, Some("set static-route"), UnknownReason::ParseError);
            return true;
        }
        self.static_routes.push(StaticRouteModel {
            prefix,
            next_hops,
            admin_distance: None,
            metric: None,
            tag: None,
            vrf: None,
            name: None,
        });
        self.parsed_line_count += 1;
        true
    }

    fn handle_snmp(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        let svc = self.ensure_service(ServiceKind::Snmp);
        if let Some(community) = service_string_note(tokens, "community") {
            svc.notes.insert(format!("community {community}"));
        }
        self.parsed_line_count += 1;
        if tokens.len() >= 3 {
            true
        } else {
            self.record_unknown(line_no, raw, Some("set snmp"), UnknownReason::ParseError);
            true
        }
    }

    fn handle_service(&mut self, _line_no: u64, _raw: &str, tokens: &[String]) -> bool {
        if tokens.get(2).map(|s| s.as_str()) == Some("ssh") {
            self.ensure_service(ServiceKind::Ssh);
            self.parsed_line_count += 1;
            return true;
        }
        false
    }

    fn handle_ntp(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if let Some(server) = service_string_note(tokens, "server") {
            self.ensure_service(ServiceKind::Ntp).servers.insert(server);
            self.parsed_line_count += 1;
            true
        } else {
            self.record_unknown(line_no, raw, Some("set ntp"), UnknownReason::ParseError);
            true
        }
    }

    fn handle_syslog(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if let Some(server) = service_string_note(tokens, "server") {
            self.ensure_service(ServiceKind::Syslog).servers.insert(server);
            self.parsed_line_count += 1;
            true
        } else {
            self.record_unknown(line_no, raw, Some("set syslog"), UnknownReason::ParseError);
            true
        }
    }

    fn handle_dns(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if let Some(server) = service_string_note(tokens, "server") {
            self.ensure_service(ServiceKind::Dns).servers.insert(server);
            self.parsed_line_count += 1;
            true
        } else if let Some(server) = tokens.get(2) {
            self.ensure_service(ServiceKind::Dns).servers.insert(clean_token(server));
            self.parsed_line_count += 1;
            true
        } else {
            self.record_unknown(line_no, raw, Some("set dns"), UnknownReason::ParseError);
            true
        }
    }

    fn handle_vrf(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 4 {
            self.record_unknown(line_no, raw, Some("set vrf"), UnknownReason::ParseError);
            return true;
        }
        let name = clean_token(&tokens[2]);
        let vrf = self.ensure_vrf(&name);
        match tokens[3].as_str() {
            "route-distinguisher" => {
                if let Some(rd) = tokens.get(4) {
                    vrf.route_distinguisher = Some(clean_token(rd));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set vrf route-distinguisher"), UnknownReason::ParseError);
                }
                true
            }
            "interface" => {
                if let Some(iface) = tokens.get(4) {
                    let iface = clean_token(iface);
                    vrf.interfaces.insert(iface.clone());
                    self.ensure_interface(&iface, classify_interface(&iface)).vrf = Some(name.clone());
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set vrf interface"), UnknownReason::ParseError);
                }
                true
            }
            _ => false,
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
        Vec::new()
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
                address_families: Vec::new(),
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
        }
        idx += 1;
    }
    let prefix_length = prefix_length?;
    Some((IpAddressModel { family, address, prefix_length, secondary: false, vrf: None }, idx))
}

fn is_out_of_scope(tokens: &[String]) -> bool {
    match tokens.get(1).map(|s| s.as_str()) {
        Some("firewall") | Some("policy") | Some("nat") | Some("vpn") => true,
        Some("set") if tokens.get(2).map(|s| s.as_str()) == Some("policy") => true,
        _ => false,
    }
}

fn classify_interface(name: &str) -> InterfaceKind {
    let lower = name.trim().to_ascii_lowercase();
    if lower.starts_with("bond") {
        InterfaceKind::Lag
    } else if lower.starts_with("vlan") {
        InterfaceKind::Vlan
    } else if lower.starts_with("lo") {
        InterfaceKind::Loopback
    } else if lower.contains('.') {
        InterfaceKind::SubInterface
    } else if lower.contains("eth") {
        InterfaceKind::Physical
    } else {
        InterfaceKind::Unknown
    }
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

fn service_string_note(tokens: &[String], key: &str) -> Option<String> {
    tokens.windows(2).find_map(|pair| {
        if pair[0].eq_ignore_ascii_case(key) { Some(clean_token(&pair[1])) } else { None }
    })
}

fn build_platform(mut platform_ref: PlatformRef) -> PlatformRef {
    platform_ref.platform_id = Some("checkpoint-gaia".to_string());
    if platform_ref.vendor.is_none() {
        platform_ref.vendor = Some("Check Point".to_string());
    }
    if platform_ref.os_family.is_none() {
        platform_ref.os_family = Some("Gaia".to_string());
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
            platform_id: Some("checkpoint-gaia".to_string()),
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
        assert_eq!(m.platform.platform_id.as_deref(), Some("checkpoint-gaia"));
        assert!(m.identity.hostname.is_none());
        assert!(m.interfaces.is_empty());
    }

    #[test]
    fn hostname_interfaces_services_and_routes_parse() {
        let cfg = r#"
set hostname gaia-core-01
set interface eth0 state on
set interface eth0 ipv4-address 198.51.100.2 mask-length 30
set interface eth1 state on
set interface eth1 ipv4-address 10.0.10.2 mask-length 24
set interface bond0 state on
set interface bond0 member eth0
set interface bond0 member eth1
set vrf MGMT route-distinguisher 65000:10
set vrf MGMT interface eth1
set static-route 0.0.0.0/0 nexthop gateway address 198.51.100.1
set service ssh on
set snmp community public
set ntp server 192.0.2.100
set syslog server 192.0.2.200
set dns server 192.0.2.53
"#;
        let m = parse(pref(), cfg);
        assert_eq!(m.identity.hostname.as_deref(), Some("gaia-core-01"));
        assert!(m.interfaces.iter().any(|i| i.name == "eth0"));
        assert!(m.interfaces.iter().any(|i| i.name == "bond0"));
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
set firewall policy drop-all
set vpn tunnel 1
"#;
        let m = parse(pref(), cfg);
        assert!(m.unknown_lines.iter().any(|u| matches!(u.reason, Some(UnknownReason::OutOfScope))));
    }

    #[test]
    fn deterministic_repeated_parse() {
        let cfg = "set hostname gaia-repeat\nset interface eth0 ipv4-address 10.0.0.1 mask-length 24\n";
        let a = parse(pref(), cfg);
        let b = parse(pref(), cfg);
        assert_eq!(a, b);
    }
}
