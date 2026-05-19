//! Aruba AOS-CX parser — first pass.
//!
//! Conservative coverage for the common parser bar:
//! identity, interfaces, IP addressing, VLANs, VRFs, LAG groups,
//! static routes, and basic services. Advanced switching / policy
//! features stay as honest evidence.

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
    "acls",
    "firewall_policies",
    "nat_rules",
    "qos_policies",
    "routing_protocols_bgp",
    "routing_protocols_isis",
    "routing_protocols_ospf",
    "tunnels",
    "vsx",
    "spanning_tree_detail",
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
    version: Option<String>,
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
    current_vlan: Option<u16>,
    current_vrf: Option<String>,
}

#[derive(Debug, Default)]
struct InterfaceBuf {
    name: String,
    kind: InterfaceKind,
    admin_state: InterfaceAdminState,
    description: Option<String>,
    l2_mode: Option<L2Mode>,
    access_vlan: Option<u16>,
    allowed_vlans: BTreeSet<u16>,
    native_vlan: Option<u16>,
    vrf: Option<String>,
    ipv4_addresses: Vec<IpAddressModel>,
    ipv6_addresses: Vec<IpAddressModel>,
    parent_interface: Option<String>,
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
    rd: Option<String>,
    import_targets: BTreeSet<String>,
    export_targets: BTreeSet<String>,
    interfaces: BTreeSet<String>,
    address_families: BTreeSet<String>,
}

#[derive(Debug, Default)]
struct LagBuf {
    mode: Option<LagMode>,
    members: BTreeSet<String>,
    hashing_mode: Option<String>,
    min_links: Option<u16>,
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
            if trimmed.eq_ignore_ascii_case("exit")
                || trimmed.eq_ignore_ascii_case("end")
                || trimmed.eq_ignore_ascii_case("quit")
            {
                self.current_iface = None;
                self.current_vlan = None;
                self.current_vrf = None;
                self.parsed_line_count += 1;
                continue;
            }

            let indent = line.len().saturating_sub(line.trim_start().len());
            if indent == 0 {
                self.current_iface = None;
                self.current_vlan = None;
                self.current_vrf = None;

                if let Some(rest) = trimmed.strip_prefix("interface ") {
                    self.handle_interface_open(rest, line_no, line);
                    continue;
                }
                if let Some(rest) = trimmed.strip_prefix("vlan ") {
                    self.handle_vlan_open(rest, line_no, line);
                    continue;
                }
                if let Some(rest) = trimmed.strip_prefix("vrf ") {
                    self.handle_vrf_open(rest, line_no, line);
                    continue;
                }
            }

            if let Some(rest) = trimmed.strip_prefix("hostname ") {
                self.hostname = Some(rest.trim().trim_matches('"').to_string());
                self.parsed_line_count += 1;
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("version ") {
                self.version = Some(rest.trim().to_string());
                self.parsed_line_count += 1;
                continue;
            }
            if trimmed.eq_ignore_ascii_case("vsx") {
                self.record_unknown(line_no, line, Some("vsx"), UnknownReason::OutOfScope);
                continue;
            }

            if indent == 0 && self.handle_top_level_service_or_route(line_no, line, trimmed) {
                continue;
            }

            if let Some(iface_name) = self.current_iface.clone() {
                self.handle_interface_line(line_no, line, trimmed, &iface_name);
                continue;
            }
            if let Some(vlan_id) = self.current_vlan {
                self.handle_vlan_line(line_no, line, trimmed, vlan_id);
                continue;
            }
            if let Some(vrf_name) = self.current_vrf.clone() {
                self.handle_vrf_line(line_no, line, trimmed, &vrf_name);
                continue;
            }

            if is_out_of_scope(trimmed) {
                self.record_unknown(line_no, line, Some("aruba-aoscx out-of-scope"), UnknownReason::OutOfScope);
            } else {
                self.record_unknown(line_no, line, Some("aruba-aoscx"), UnknownReason::UnsupportedKeyword);
            }
        }
    }

    fn handle_interface_open(&mut self, rest: &str, line_no: u64, raw: &str) {
        let name = rest.trim().trim_matches('"').to_string();
        self.current_iface = Some(name.clone());
        self.interfaces.entry(name.clone()).or_insert_with(|| InterfaceBuf {
            name: name.clone(),
            kind: classify_interface(&name),
            admin_state: InterfaceAdminState::Unknown,
            description: None,
            l2_mode: None,
            access_vlan: None,
            allowed_vlans: BTreeSet::new(),
            native_vlan: None,
            vrf: None,
            ipv4_addresses: Vec::new(),
            ipv6_addresses: Vec::new(),
            parent_interface: None,
            lag_membership: None,
            notes: BTreeSet::new(),
        });
        if classify_interface(&name) == InterfaceKind::Lag {
            self.lag_groups.entry(name.clone()).or_default();
        }
        self.parsed_line_count += 1;
        let _ = (line_no, raw);
    }

    fn handle_vlan_open(&mut self, rest: &str, line_no: u64, raw: &str) {
        if let Some(vlan_id) = rest.trim().split_whitespace().next().and_then(|s| s.parse::<u16>().ok()) {
            self.current_vlan = Some(vlan_id);
            self.vlans.entry(vlan_id).or_default();
            self.parsed_line_count += 1;
            let _ = (line_no, raw);
        } else {
            self.record_unknown(line_no, raw, Some("vlan"), UnknownReason::ParseError);
        }
    }

    fn handle_vrf_open(&mut self, rest: &str, line_no: u64, raw: &str) {
        let name = rest.trim().trim_matches('"').to_string();
        self.current_vrf = Some(name.clone());
        self.vrfs.entry(name).or_default();
        self.parsed_line_count += 1;
        let _ = (line_no, raw);
    }

    fn handle_top_level_service_or_route(&mut self, line_no: u64, raw: &str, trimmed: &str) -> bool {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return false;
        }

        match tokens[0].as_str() {
            "ssh" if tokens.get(1).map(|s| s.as_str()) == Some("server") => {
                self.ensure_service(ServiceKind::Ssh);
                self.parsed_line_count += 1;
                true
            }
            "snmp-server" | "snmp" => {
                self.ensure_service(ServiceKind::Snmp);
                self.parsed_line_count += 1;
                true
            }
            "ntp" if tokens.get(1).map(|s| s.as_str()) == Some("server") => {
                self.ensure_service(ServiceKind::Ntp);
                if let Some(server) = tokens.get(2) {
                    self.ensure_service(ServiceKind::Ntp)
                        .servers
                        .insert(clean_token(server));
                }
                self.parsed_line_count += 1;
                true
            }
            "ip" if tokens.get(1).map(|s| s.as_str()) == Some("dns") => {
                self.ensure_service(ServiceKind::Dns);
                if let Some(addr) = tokens.get(3) {
                    self.ensure_service(ServiceKind::Dns)
                        .servers
                        .insert(clean_token(addr));
                }
                self.parsed_line_count += 1;
                true
            }
            "logging" => {
                self.ensure_service(ServiceKind::Syslog);
                if let Some(addr) = tokens.get(1) {
                    self.ensure_service(ServiceKind::Syslog)
                        .servers
                        .insert(clean_token(addr));
                }
                self.parsed_line_count += 1;
                true
            }
            "ip" if tokens.get(1).map(|s| s.as_str()) == Some("route") => {
                if let Some((route, _)) = parse_static_route(&tokens[2..], None) {
                    self.static_routes.push(route);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("ip route"), UnknownReason::ParseError);
                }
                true
            }
            _ => false,
        }
    }

    fn handle_interface_line(&mut self, line_no: u64, raw: &str, trimmed: &str, iface_name: &str) {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return;
        }

        let kind = classify_interface(iface_name);
        match tokens[0].as_str() {
            "description" => {
                if let Some(value) = tokens.get(1) {
                    self.ensure_interface(iface_name, kind).description = Some(clean_token(value));
                    self.parsed_line_count += 1;
                    return;
                }
            }
            "shutdown" => {
                self.ensure_interface(iface_name, kind).admin_state = InterfaceAdminState::Down;
                self.parsed_line_count += 1;
                return;
            }
            "no" if tokens.get(1).map(|s| s.as_str()) == Some("shutdown") => {
                self.ensure_interface(iface_name, kind).admin_state = InterfaceAdminState::Up;
                self.parsed_line_count += 1;
                return;
            }
            "ip" if tokens.get(1).map(|s| s.as_str()) == Some("address") => {
                if let Some((ip, consumed)) = parse_ip_address(&tokens[2..]) {
                    let buf = self.ensure_interface(iface_name, kind);
                    match ip.family {
                        IpFamily::V4 => buf.ipv4_addresses.push(ip),
                        IpFamily::V6 => buf.ipv6_addresses.push(ip),
                    }
                    if buf.l2_mode.is_none() {
                        buf.l2_mode = Some(L2Mode::Routed);
                    }
                    self.parsed_line_count += 1;
                    let _ = consumed;
                    return;
                }
            }
            "vrf" => {
                if let Some(vrf_name) = tokens.get(1) {
                    let vrf_name = clean_token(vrf_name);
                    self.ensure_interface(iface_name, kind).vrf = Some(vrf_name.clone());
                    self.ensure_vrf(&vrf_name).interfaces.insert(iface_name.to_string());
                    self.parsed_line_count += 1;
                    return;
                }
            }
            "lag" => {
                if let Some(lag_name) = tokens.get(1) {
                    let lag_name = normalize_lag_name(&clean_token(lag_name));
                    self.ensure_interface(iface_name, kind).lag_membership = Some(lag_name.clone());
                    self.ensure_lag(&lag_name).members.insert(iface_name.to_string());
                    self.parsed_line_count += 1;
                    return;
                }
            }
            "vlan" if tokens.get(1).map(|s| s.as_str()) == Some("access") => {
                if let Some(vlan_id) = tokens.get(2).and_then(|v| v.parse::<u16>().ok()) {
                    let buf = self.ensure_interface(iface_name, kind);
                    buf.access_vlan = Some(vlan_id);
                    buf.l2_mode = Some(L2Mode::Access);
                    self.ensure_vlan(vlan_id).interfaces.insert(iface_name.to_string());
                    self.parsed_line_count += 1;
                    return;
                }
            }
            "vlan" if tokens.get(1).map(|s| s.as_str()) == Some("trunk") => {
                let vlans = parse_vlan_id_list(&tokens[3..]);
                if !vlans.is_empty() {
                    for vlan_id in vlans {
                        {
                            let buf = self.ensure_interface(iface_name, kind);
                            buf.allowed_vlans.insert(vlan_id);
                        }
                        self.ensure_vlan(vlan_id).interfaces.insert(iface_name.to_string());
                    }
                    self.ensure_interface(iface_name, kind).l2_mode = Some(L2Mode::Trunk);
                    self.parsed_line_count += 1;
                    return;
                }
            }
            "ip" if tokens.get(1).map(|s| s.as_str()) == Some("route") => {
                let route_tokens = &tokens[2..];
                if let Some((route, _)) = parse_static_route(route_tokens, None) {
                    self.static_routes.push(route);
                    self.parsed_line_count += 1;
                    return;
                }
            }
            "routing" => {
                self.record_unknown(line_no, raw, Some("interface"), UnknownReason::OutOfScope);
                return;
            }
            _ => {}
        }

        self.ensure_interface(iface_name, kind)
            .notes
            .insert(tokens.join(" "));
    }

    fn handle_vlan_line(&mut self, line_no: u64, raw: &str, trimmed: &str, vlan_id: u16) {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return;
        }
        let entry = self.ensure_vlan(vlan_id);
        match tokens[0].as_str() {
            "name" | "description" => {
                if let Some(value) = tokens.get(1) {
                    entry.name = Some(clean_token(value));
                    self.parsed_line_count += 1;
                    return;
                }
            }
            "interface" => {
                if let Some(iface) = tokens.get(1) {
                    entry.interfaces.insert(clean_token(iface));
                    self.parsed_line_count += 1;
                    return;
                }
            }
            _ => {}
        }
        self.record_unknown(line_no, raw, Some("vlan"), UnknownReason::UnsupportedKeyword);
    }

    fn handle_vrf_line(&mut self, line_no: u64, raw: &str, trimmed: &str, vrf_name: &str) {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return;
        }

        match tokens[0].as_str() {
            "route-distinguisher" | "rd" => {
                if let Some(value) = tokens.get(1) {
                    self.ensure_vrf(vrf_name).rd = Some(clean_token(value));
                    self.parsed_line_count += 1;
                    return;
                }
            }
            "route-target" => {
                if let (Some(dir), Some(value)) = (tokens.get(1), tokens.get(2)) {
                    let target = clean_token(value);
                    let vrf = self.ensure_vrf(vrf_name);
                    match dir.to_ascii_lowercase().as_str() {
                        "import" => {
                            let _ = vrf.import_targets.insert(target);
                        }
                        "export" => {
                            let _ = vrf.export_targets.insert(target);
                        }
                        _ => {}
                    }
                    self.parsed_line_count += 1;
                    return;
                }
            }
            "interface" => {
                if let Some(iface) = tokens.get(1) {
                    let iface = clean_token(iface);
                    self.ensure_vrf(vrf_name).interfaces.insert(iface.clone());
                    self.ensure_interface(&iface, classify_interface(&iface))
                        .vrf = Some(vrf_name.to_string());
                    self.parsed_line_count += 1;
                    return;
                }
            }
            "address-family" => {
                if let Some(value) = tokens.get(1) {
                    self.ensure_vrf(vrf_name)
                        .address_families
                        .insert(clean_token(value));
                    self.parsed_line_count += 1;
                    return;
                }
            }
            "ip" if tokens.get(1).map(|s| s.as_str()) == Some("route") => {
                if let Some((route, _)) = parse_static_route(&tokens[2..], Some(vrf_name.to_string())) {
                    self.static_routes.push(route);
                    self.parsed_line_count += 1;
                    return;
                }
            }
            _ => {}
        }

        self.record_unknown(line_no, raw, Some("vrf"), UnknownReason::UnsupportedKeyword);
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
                route_distinguisher: v.rd.clone(),
                route_targets_import: v.import_targets.iter().cloned().collect(),
                route_targets_export: v.export_targets.iter().cloned().collect(),
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
                hashing_mode: lag.hashing_mode.clone(),
                min_links: lag.min_links,
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

    fn ensure_interface(&mut self, name: &str, kind: InterfaceKind) -> &mut InterfaceBuf {
        self.interfaces.entry(name.to_string()).or_insert_with(|| InterfaceBuf {
            name: name.to_string(),
            kind,
            admin_state: InterfaceAdminState::Unknown,
            description: None,
            l2_mode: None,
            access_vlan: None,
            allowed_vlans: BTreeSet::new(),
            native_vlan: None,
            vrf: None,
            ipv4_addresses: Vec::new(),
            ipv6_addresses: Vec::new(),
            parent_interface: None,
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

    fn record_unknown(
        &mut self,
        line_no: u64,
        raw: &str,
        context_path: Option<&str>,
        reason: UnknownReason,
    ) {
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
                if self.access_vlan.is_some() {
                    Some(L2Mode::Access)
                } else if !self.allowed_vlans.is_empty() {
                    Some(L2Mode::Trunk)
                } else if !self.ipv4_addresses.is_empty() || !self.ipv6_addresses.is_empty() {
                    Some(L2Mode::Routed)
                } else {
                    None
                }
            }),
            access_vlan: self.access_vlan,
            allowed_vlans: {
                let mut vals: Vec<u16> = self.allowed_vlans.iter().copied().collect();
                vals.sort();
                vals
            },
            native_vlan: self.native_vlan,
            vrf: self.vrf.clone(),
            ipv4_addresses: self.ipv4_addresses.clone(),
            ipv6_addresses: self.ipv6_addresses.clone(),
            parent_interface: self.parent_interface.clone(),
            child_interfaces: Vec::new(),
            lag_membership: self.lag_membership.clone(),
            notes: if notes.is_empty() { None } else { Some(notes.join("; ")) },
        }
    }
}

fn classify_interface(name: &str) -> InterfaceKind {
    let lower = name.trim().to_ascii_lowercase();
    if lower.starts_with("lag") {
        InterfaceKind::Lag
    } else if lower.starts_with("vlan") {
        InterfaceKind::Vlan
    } else if lower.starts_with("loopback") || lower.starts_with("lo") {
        InterfaceKind::Loopback
    } else if lower.starts_with("mgmt") || lower.starts_with("management") {
        InterfaceKind::Management
    } else if lower.contains('.') {
        InterfaceKind::SubInterface
    } else if lower.contains('/') {
        InterfaceKind::Physical
    } else {
        InterfaceKind::Unknown
    }
}

fn normalize_lag_name(name: &str) -> String {
    let trimmed = name.trim();
    if trimmed.chars().all(|c| c.is_ascii_digit()) {
        format!("lag{trimmed}")
    } else {
        trimmed.to_string()
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

fn parse_ip_address(tokens: &[String]) -> Option<(IpAddressModel, usize)> {
    let first = tokens.first()?;
    let family = if first.contains(':') { IpFamily::V6 } else { IpFamily::V4 };
    if let Some((address, prefix)) = first.split_once('/') {
        let prefix_length = prefix.parse::<u8>().ok()?;
        return Some((IpAddressModel {
            family,
            address: clean_token(address),
            prefix_length,
            secondary: false,
            vrf: None,
        }, 1));
    }
    if let Some(mask) = tokens.get(1) {
        if let Some(prefix_length) = mask_to_prefix(mask) {
            return Some((IpAddressModel {
                family,
                address: clean_token(first),
                prefix_length,
                secondary: false,
                vrf: None,
            }, 2));
        }
    }
    None
}

fn parse_static_route(tokens: &[String], vrf: Option<String>) -> Option<(StaticRouteModel, usize)> {
    let prefix = parse_prefix(tokens)?;
    let mut idx = prefix.1;
    let mut next_hops: Vec<String> = Vec::new();
    while idx < tokens.len() {
        match tokens[idx].as_str() {
            "via" | "next-hop" | "nexthop" => {
                if let Some(value) = tokens.get(idx + 1) {
                    next_hops.push(clean_token(value));
                    idx += 2;
                    continue;
                }
            }
            _ => {}
        }
        idx += 1;
    }
    if next_hops.is_empty() {
        if let Some(value) = tokens.get(prefix.1) {
            let candidate = clean_token(value);
            if !candidate.is_empty()
                && (candidate.contains('.') || candidate.contains(':') || candidate.chars().any(|c| c.is_ascii_alphabetic()))
            {
                next_hops.push(candidate);
            }
        }
    }
    if next_hops.is_empty() {
        return None;
    }
    Some((StaticRouteModel {
        prefix: prefix.0,
        next_hops,
        admin_distance: None,
        metric: None,
        tag: None,
        vrf,
        name: None,
    }, idx))
}

fn parse_prefix(tokens: &[String]) -> Option<(String, usize)> {
    let first = tokens.first()?;
    if let Some((addr, prefix)) = first.split_once('/') {
        let prefix_length = prefix.parse::<u8>().ok()?;
        return Some((format!("{addr}/{prefix_length}"), 1));
    }
    if let Some(mask) = tokens.get(1) {
        if let Some(prefix_length) = mask_to_prefix(mask) {
            return Some((format!("{}/{}", first, prefix_length), 2));
        }
    }
    None
}

fn parse_vlan_id_list(tokens: &[String]) -> Vec<u16> {
    let mut out = Vec::new();
    let mut idx = 0usize;
    while idx < tokens.len() {
        let token = tokens[idx].trim_matches(',');
        if token.eq_ignore_ascii_case("to") {
            idx += 1;
            continue;
        }
        if let Ok(start) = token.parse::<u16>() {
            if idx + 2 < tokens.len() && tokens[idx + 1].eq_ignore_ascii_case("to") {
                if let Ok(end) = tokens[idx + 2].trim_matches(',').parse::<u16>() {
                    let (a, b) = if start <= end { (start, end) } else { (end, start) };
                    for vlan in a..=b {
                        out.push(vlan);
                    }
                    idx += 3;
                    continue;
                }
            }
            out.push(start);
        }
        idx += 1;
    }
    out.sort();
    out.dedup();
    out
}

fn mask_to_prefix(mask: &str) -> Option<u8> {
    let stripped = mask.trim().trim_matches('"').strip_prefix('/').unwrap_or(mask.trim().trim_matches('"'));
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

fn is_out_of_scope(line: &str) -> bool {
    let prefixes = [
        "aaa ",
        "router bgp ",
        "router ospf ",
        "router isis ",
        "router rip ",
        "policy ",
        "qos ",
        "firewall ",
        "nat ",
        "vxlan ",
        "spanning-tree ",
        "vsx ",
    ];
    prefixes.iter().any(|p| line.starts_with(p))
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
    platform_ref.platform_id = Some("aruba-aoscx".to_string());
    if platform_ref.vendor.is_none() {
        platform_ref.vendor = Some("HPE Aruba".to_string());
    }
    if platform_ref.os_family.is_none() {
        platform_ref.os_family = Some("AOS-CX / ArubaOS".to_string());
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
            platform_id: Some("aruba-aoscx".to_string()),
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
        assert_eq!(m.platform.platform_id.as_deref(), Some("aruba-aoscx"));
        assert!(m.identity.hostname.is_none());
        assert!(m.interfaces.is_empty());
        assert!(m.vrfs.is_empty());
    }

    #[test]
    fn hostname_and_services_parse() {
        let cfg = r#"
hostname aoscx-01
ssh server enable
snmp-server enable
ntp server 192.0.2.100
ip dns server-address 192.0.2.53
logging 192.0.2.200
"#;
        let m = parse(pref(), cfg);
        assert_eq!(m.identity.hostname.as_deref(), Some("aoscx-01"));
        let kinds: Vec<ServiceKind> = m.services.iter().map(|s| s.kind).collect();
        assert!(kinds.contains(&ServiceKind::Ssh));
        assert!(kinds.contains(&ServiceKind::Snmp));
        assert!(kinds.contains(&ServiceKind::Ntp));
        assert!(kinds.contains(&ServiceKind::Dns));
        assert!(kinds.contains(&ServiceKind::Syslog));
    }

    #[test]
    fn interfaces_vlans_vrfs_lags_and_routes_parse() {
        let cfg = r#"
hostname aoscx-01
interface 1/1/1
   description uplink
   no shutdown
   ip address 198.51.100.2/30
   vlan trunk allowed 10 20
interface 1/1/2
   no shutdown
   lag 1
interface lag 1
   no shutdown
   vlan access 10
   lacp mode active
vlan 10
   name users
   interface 1/1/1
vrf MGMT
   route-distinguisher 65000:10
   interface 1/1/1
   address-family ipv4 unicast
   route-target import 65000:10
ip route 0.0.0.0/0 198.51.100.1
"#;
        let m = parse(pref(), cfg);
        assert!(m.interfaces.iter().any(|i| i.name == "1/1/1"));
        assert!(m.interfaces.iter().any(|i| i.name == "lag 1"));
        assert_eq!(m.vlans.len(), 2);
        assert_eq!(m.vrfs.len(), 1);
        assert_eq!(m.lag_groups.len(), 2);
        assert_eq!(m.static_routes.len(), 1);
    }

    #[test]
    fn out_of_scope_commands_are_recorded_honestly() {
        let cfg = r#"
vsx
router ospfv3 1
aaa authentication login default local
"#;
        let m = parse(pref(), cfg);
        assert!(m.unknown_lines.iter().any(|u| matches!(u.reason, Some(UnknownReason::OutOfScope))));
    }

    #[test]
    fn deterministic_repeated_parse() {
        let cfg = "hostname aoscx-repeat\ninterface 1/1/1\n   ip address 10.0.0.1/24\n";
        let a = parse(pref(), cfg);
        let b = parse(pref(), cfg);
        assert_eq!(a, b);
    }
}
