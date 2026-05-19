//! VyOS parser — first pass.
//!
//! Conservative coverage for the common parser bar:
//! identity, interfaces, IP addressing, VLAN-like subinterfaces,
//! VRF hints, LAG groups, static routes, and basic services.
//! Firewall / policy / routing-protocol content stays as honest
//! evidence instead of being promoted into structured objects.

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
    "tunnels",
    "vpn_tunnels",
    "wireguard",
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

            let tokens = split_args(trimmed);
            if tokens.is_empty() {
                continue;
            }

            if tokens[0] != "set" {
                self.record_unknown(line_no, line, Some("vyos"), UnknownReason::UnsupportedKeyword);
                continue;
            }

            let handled = match tokens.get(1).map(|s| s.as_str()) {
                Some("system") => self.handle_system(line_no, line, &tokens),
                Some("interfaces") => self.handle_interfaces(line_no, line, &tokens),
                Some("protocols") => self.handle_protocols(line_no, line, &tokens),
                Some("service") => self.handle_service(line_no, line, &tokens),
                Some("vrf") => self.handle_vrf(line_no, line, &tokens),
                _ => false,
            };
            if handled {
                continue;
            }

            if is_out_of_scope(&tokens) {
                self.record_unknown(line_no, line, Some("vyos out-of-scope"), UnknownReason::OutOfScope);
            } else {
                self.record_unknown(line_no, line, Some("vyos"), UnknownReason::UnsupportedKeyword);
            }
        }
    }

    fn handle_system(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 3 {
            self.record_unknown(line_no, raw, Some("set system"), UnknownReason::ParseError);
            return true;
        }
        match tokens[2].as_str() {
            "host-name" => {
                if let Some(name) = tokens.get(3) {
                    self.hostname = Some(clean_token(name));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set system host-name"), UnknownReason::ParseError);
                }
                true
            }
            "name-server" => {
                if let Some(addr) = tokens.get(3) {
                    self.ensure_service(ServiceKind::Dns)
                        .servers
                        .insert(clean_token(addr));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set system name-server"), UnknownReason::ParseError);
                }
                true
            }
            "ntp" if tokens.get(3).map(|s| s.as_str()) == Some("server") => {
                if let Some(addr) = tokens.get(4) {
                    self.ensure_service(ServiceKind::Ntp)
                        .servers
                        .insert(clean_token(addr));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set system ntp server"), UnknownReason::ParseError);
                }
                true
            }
            "syslog" if tokens.get(3).map(|s| s.as_str()) == Some("host") => {
                if let Some(addr) = tokens.get(4) {
                    self.ensure_service(ServiceKind::Syslog)
                        .servers
                        .insert(clean_token(addr));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set system syslog host"), UnknownReason::ParseError);
                }
                true
            }
            _ => false,
        }
    }

    fn handle_interfaces(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 4 {
            self.record_unknown(line_no, raw, Some("set interfaces"), UnknownReason::ParseError);
            return true;
        }
        match tokens[2].as_str() {
            "ethernet" => self.handle_ethernet(line_no, raw, tokens),
            "bridge" => self.handle_bridge(line_no, raw, tokens),
            "bonding" => self.handle_bonding(line_no, raw, tokens),
            "vlan" => self.handle_vlan_iface(line_no, raw, tokens),
            _ => false,
        }
    }

    fn handle_ethernet(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        let Some(iface_name) = tokens.get(3).map(|s| s.as_str()) else {
            self.record_unknown(line_no, raw, Some("set interfaces ethernet"), UnknownReason::ParseError);
            return true;
        };
        if tokens.len() < 5 {
            self.ensure_interface(iface_name, InterfaceKind::Physical);
            self.parsed_line_count += 1;
            return true;
        }
        if tokens.get(4).map(|s| s.as_str()) == Some("vif") {
            return self.handle_ethernet_vif(line_no, raw, tokens, iface_name);
        }
        match tokens[4].as_str() {
            "description" => {
                if let Some(value) = tokens.get(5) {
                    self.ensure_interface(iface_name, InterfaceKind::Physical).description = Some(clean_token(value));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces ethernet description"), UnknownReason::ParseError);
                }
                true
            }
            "address" => {
                if let Some((ip, _)) = parse_ip_address(&tokens[5..]) {
                    let buf = self.ensure_interface(iface_name, InterfaceKind::Physical);
                    match ip.family {
                        IpFamily::V4 => buf.ipv4_addresses.push(ip),
                        IpFamily::V6 => buf.ipv6_addresses.push(ip),
                    }
                    buf.admin_state = InterfaceAdminState::Up;
                    buf.l2_mode = Some(L2Mode::Routed);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces ethernet address"), UnknownReason::ParseError);
                }
                true
            }
            "disable" => {
                self.ensure_interface(iface_name, InterfaceKind::Physical).admin_state = InterfaceAdminState::Down;
                self.parsed_line_count += 1;
                true
            }
            "vrf" => {
                if let Some(vrf_name) = tokens.get(5) {
                    let vrf_name = clean_token(vrf_name);
                    let buf = self.ensure_interface(iface_name, InterfaceKind::Physical);
                    buf.vrf = Some(vrf_name.clone());
                    self.ensure_vrf(&vrf_name).interfaces.insert(iface_name.to_string());
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces ethernet vrf"), UnknownReason::ParseError);
                }
                true
            }
            _ => false,
        }
    }

    fn handle_ethernet_vif(&mut self, line_no: u64, raw: &str, tokens: &[String], parent: &str) -> bool {
        let Some(vlan_id) = tokens.get(5).and_then(|s| s.parse::<u16>().ok()) else {
            self.record_unknown(line_no, raw, Some("set interfaces ethernet vif"), UnknownReason::ParseError);
            return true;
        };
        let name = format!("{parent}.{vlan_id}");
        self.ensure_interface(parent, InterfaceKind::Physical)
            .child_interfaces
            .insert(name.clone());
        self.ensure_vlan(vlan_id).interfaces.insert(name.clone());
        if tokens.len() < 7 {
            self.ensure_interface(&name, InterfaceKind::SubInterface)
                .parent_interface = Some(parent.to_string());
            self.parsed_line_count += 1;
            return true;
        }
        match tokens[6].as_str() {
            "address" => {
                if let Some((ip, _)) = parse_ip_address(&tokens[7..]) {
                    let buf = self.ensure_interface(&name, InterfaceKind::SubInterface);
                    buf.parent_interface = Some(parent.to_string());
                    match ip.family {
                        IpFamily::V4 => buf.ipv4_addresses.push(ip),
                        IpFamily::V6 => buf.ipv6_addresses.push(ip),
                    }
                    buf.l2_mode = Some(L2Mode::Routed);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces ethernet vif address"), UnknownReason::ParseError);
                }
                true
            }
            "description" => {
                if let Some(value) = tokens.get(7) {
                    let buf = self.ensure_interface(&name, InterfaceKind::SubInterface);
                    buf.parent_interface = Some(parent.to_string());
                    buf.description = Some(clean_token(value));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces ethernet vif description"), UnknownReason::ParseError);
                }
                true
            }
            "vrf" => {
                if let Some(vrf_name) = tokens.get(7) {
                    let vrf_name = clean_token(vrf_name);
                    let buf = self.ensure_interface(&name, InterfaceKind::SubInterface);
                    buf.parent_interface = Some(parent.to_string());
                    buf.vrf = Some(vrf_name.clone());
                    self.ensure_vrf(&vrf_name).interfaces.insert(name.clone());
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces ethernet vif vrf"), UnknownReason::ParseError);
                }
                true
            }
            _ => false,
        }
    }

    fn handle_bridge(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        let Some(bridge_name) = tokens.get(3).map(|s| s.as_str()) else {
            self.record_unknown(line_no, raw, Some("set interfaces bridge"), UnknownReason::ParseError);
            return true;
        };
        let buf = self.ensure_interface(bridge_name, InterfaceKind::Virtual);
        if tokens.len() < 5 {
            self.parsed_line_count += 1;
            return true;
        }
        match tokens[4].as_str() {
            "member" if tokens.get(5).map(|s| s.as_str()) == Some("interface") => {
                if let Some(member) = tokens.get(6) {
                    let member = clean_token(member);
                    buf.child_interfaces.insert(member.clone());
                    self.ensure_interface(&member, classify_interface(&member))
                        .parent_interface = Some(bridge_name.to_string());
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces bridge member interface"), UnknownReason::ParseError);
                }
                true
            }
            "address" => {
                if let Some((ip, _)) = parse_ip_address(&tokens[5..]) {
                    match ip.family {
                        IpFamily::V4 => buf.ipv4_addresses.push(ip),
                        IpFamily::V6 => buf.ipv6_addresses.push(ip),
                    }
                    buf.l2_mode = Some(L2Mode::Routed);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces bridge address"), UnknownReason::ParseError);
                }
                true
            }
            "description" => {
                if let Some(value) = tokens.get(5) {
                    buf.description = Some(clean_token(value));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces bridge description"), UnknownReason::ParseError);
                }
                true
            }
            _ => false,
        }
    }

    fn handle_bonding(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        let Some(bond_name) = tokens.get(3).map(|s| s.as_str()) else {
            self.record_unknown(line_no, raw, Some("set interfaces bonding"), UnknownReason::ParseError);
            return true;
        };
        if tokens.len() < 5 {
            self.ensure_interface(bond_name, InterfaceKind::Lag);
            self.ensure_lag(bond_name);
            self.parsed_line_count += 1;
            return true;
        }
        match tokens[4].as_str() {
            "mode" => {
                if let Some(mode) = tokens.get(5) {
                    let mode = mode.to_ascii_lowercase();
                    self.ensure_lag(bond_name).mode = match mode.as_str() {
                        "802.3ad" | "lacp" => Some(LagMode::Active),
                        "active-backup" => Some(LagMode::Static),
                        _ => Some(LagMode::Static),
                    };
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces bonding mode"), UnknownReason::ParseError);
                }
                true
            }
            "member" if tokens.get(5).map(|s| s.as_str()) == Some("interface") => {
                if let Some(member) = tokens.get(6) {
                    let member = clean_token(member);
                    self.ensure_lag(bond_name).members.insert(member.clone());
                    self.ensure_interface(bond_name, InterfaceKind::Lag)
                        .child_interfaces
                        .insert(member.clone());
                    self.ensure_interface(&member, classify_interface(&member))
                        .lag_membership = Some(bond_name.to_string());
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces bonding member interface"), UnknownReason::ParseError);
                }
                true
            }
            "description" => {
                if let Some(value) = tokens.get(5) {
                    self.ensure_interface(bond_name, InterfaceKind::Lag).description = Some(clean_token(value));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces bonding description"), UnknownReason::ParseError);
                }
                true
            }
            "address" => {
                if let Some((ip, _)) = parse_ip_address(&tokens[5..]) {
                    let buf = self.ensure_interface(bond_name, InterfaceKind::Lag);
                    match ip.family {
                        IpFamily::V4 => buf.ipv4_addresses.push(ip),
                        IpFamily::V6 => buf.ipv6_addresses.push(ip),
                    }
                    buf.admin_state = InterfaceAdminState::Up;
                    buf.l2_mode = Some(L2Mode::Routed);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces bonding address"), UnknownReason::ParseError);
                }
                true
            }
            _ => false,
        }
    }

    fn handle_vlan_iface(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        let Some(name) = tokens.get(3).map(|s| s.as_str()) else {
            self.record_unknown(line_no, raw, Some("set interfaces vlan"), UnknownReason::ParseError);
            return true;
        };
        let vlan_id = extract_vlan_id_from_name(name);
        if let Some(id) = vlan_id {
            self.ensure_vlan(id).interfaces.insert(name.to_string());
        }
        if tokens.len() < 5 {
            self.ensure_interface(name, InterfaceKind::Vlan);
            self.parsed_line_count += 1;
            return true;
        }
        match tokens[4].as_str() {
            "address" => {
                if let Some((ip, _)) = parse_ip_address(&tokens[5..]) {
                    let buf = self.ensure_interface(name, InterfaceKind::Vlan);
                    match ip.family {
                        IpFamily::V4 => buf.ipv4_addresses.push(ip),
                        IpFamily::V6 => buf.ipv6_addresses.push(ip),
                    }
                    buf.l2_mode = Some(L2Mode::Routed);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces vlan address"), UnknownReason::ParseError);
                }
                true
            }
            "description" => {
                if let Some(value) = tokens.get(5) {
                    let buf = self.ensure_interface(name, InterfaceKind::Vlan);
                    buf.description = Some(clean_token(value));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces vlan description"), UnknownReason::ParseError);
                }
                true
            }
            "vrf" => {
                if let Some(vrf_name) = tokens.get(5) {
                    let vrf_name = clean_token(vrf_name);
                    let buf = self.ensure_interface(name, InterfaceKind::Vlan);
                    buf.vrf = Some(vrf_name.clone());
                    self.ensure_vrf(&vrf_name).interfaces.insert(name.to_string());
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set interfaces vlan vrf"), UnknownReason::ParseError);
                }
                true
            }
            _ => false,
        }
    }

    fn handle_protocols(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 3 {
            self.record_unknown(line_no, raw, Some("set protocols"), UnknownReason::ParseError);
            return true;
        }
        match tokens[2].as_str() {
            "static" => self.handle_static_route(line_no, raw, tokens),
            "bgp" | "ospf" | "isis" | "rip" => {
                self.record_unknown(line_no, raw, Some("set protocols"), UnknownReason::OutOfScope);
                true
            }
            _ => false,
        }
    }

    fn handle_static_route(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.get(3).map(|s| s.as_str()) != Some("route") {
            return false;
        }
        let Some((route, _)) = parse_static_route(&tokens[4..], None) else {
            self.record_unknown(line_no, raw, Some("set protocols static route"), UnknownReason::ParseError);
            return true;
        };
        self.static_routes.push(route);
        self.parsed_line_count += 1;
        true
    }

    fn handle_service(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 3 {
            self.record_unknown(line_no, raw, Some("set service"), UnknownReason::ParseError);
            return true;
        }
        match tokens[2].as_str() {
            "ssh" => {
                let svc = self.ensure_service(ServiceKind::Ssh);
                if let Some(port) = service_string_note(tokens, "port") {
                    svc.notes.insert(format!("port {port}"));
                }
                self.parsed_line_count += 1;
                true
            }
            "snmp" => {
                let svc = self.ensure_service(ServiceKind::Snmp);
                if let Some(community) = service_string_note(tokens, "community") {
                    svc.notes.insert(format!("community {community}"));
                }
                self.parsed_line_count += 1;
                true
            }
            "ntp" => {
                if let Some(server) = service_string_note(tokens, "server") {
                    self.ensure_service(ServiceKind::Ntp).servers.insert(server);
                } else {
                    self.ensure_service(ServiceKind::Ntp);
                }
                self.parsed_line_count += 1;
                true
            }
            _ => false,
        }
    }

    fn handle_vrf(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 4 {
            self.record_unknown(line_no, raw, Some("set vrf"), UnknownReason::ParseError);
            return true;
        }
        match tokens[2].as_str() {
            "name" => {
                if let Some(name) = tokens.get(3) {
                    let name = clean_token(name);
                    let vrf = self.ensure_vrf(&name);
                    if tokens.get(4).map(|s| s.as_str()) == Some("table") {
                        if let Some(table) = tokens.get(5) {
                            vrf.route_distinguisher.get_or_insert_with(|| clean_token(table));
                        }
                    }
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set vrf name"), UnknownReason::ParseError);
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
            access_vlan: None,
            allowed_vlans: BTreeSet::new(),
            native_vlan: None,
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

fn parse_ip_address(tokens: &[String]) -> Option<(IpAddressModel, usize)> {
    let first = tokens.first()?;
    let family = if first.contains(':') { IpFamily::V6 } else { IpFamily::V4 };
    if let Some((address, prefix)) = first.split_once('/') {
        let prefix_length = prefix.parse::<u8>().ok()?;
        return Some((IpAddressModel { family, address: clean_token(address), prefix_length, secondary: false, vrf: None }, 1));
    }
    if let Some(mask) = tokens.get(1) {
        if let Some(prefix_length) = mask_to_prefix(mask) {
            return Some((IpAddressModel { family, address: clean_token(first), prefix_length, secondary: false, vrf: None }, 2));
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
    Some((StaticRouteModel { prefix: prefix.0, next_hops, admin_distance: None, metric: None, tag: None, vrf, name: None }, idx))
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

fn extract_vlan_id_from_name(name: &str) -> Option<u16> {
    let lower = name.trim().to_ascii_lowercase();
    let stripped = lower.strip_prefix("vlan")?;
    stripped.trim().parse::<u16>().ok()
}

fn is_out_of_scope(tokens: &[String]) -> bool {
    match tokens.get(1).map(|s| s.as_str()) {
        Some("firewall") | Some("nat") | Some("policy") | Some("qos") | Some("vpn") => true,
        Some("protocols") if matches!(tokens.get(2).map(|s| s.as_str()), Some("bgp" | "ospf" | "isis")) => true,
        _ => false,
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

fn classify_interface(name: &str) -> InterfaceKind {
    let lower = name.trim().to_ascii_lowercase();
    if lower.starts_with("bond") || lower.starts_with("bonding") {
        InterfaceKind::Lag
    } else if lower.starts_with("vlan") {
        InterfaceKind::Vlan
    } else if lower.starts_with("br") || lower.starts_with("bridge") {
        InterfaceKind::Virtual
    } else if lower.starts_with("lo") || lower.starts_with("loopback") {
        InterfaceKind::Loopback
    } else if lower.contains('.') {
        InterfaceKind::SubInterface
    } else if lower.contains("eth") || lower.contains("wan") || lower.contains("lan") || lower.contains('/') {
        InterfaceKind::Physical
    } else {
        InterfaceKind::Unknown
    }
}

fn build_platform(mut platform_ref: PlatformRef) -> PlatformRef {
    platform_ref.platform_id = Some("vyos".to_string());
    if platform_ref.vendor.is_none() {
        platform_ref.vendor = Some("VyOS".to_string());
    }
    if platform_ref.os_family.is_none() {
        platform_ref.os_family = Some("VyOS".to_string());
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
            platform_id: Some("vyos".to_string()),
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
        assert_eq!(m.platform.platform_id.as_deref(), Some("vyos"));
        assert!(m.identity.hostname.is_none());
        assert!(m.interfaces.is_empty());
        assert!(m.vrfs.is_empty());
    }

    #[test]
    fn hostname_interfaces_services_and_routes_parse() {
        let cfg = r#"
set system host-name vyos-core-01
set interfaces ethernet eth0 address 198.51.100.2/30
set interfaces ethernet eth1 description access
set interfaces bonding bond0 mode 802.3ad
set interfaces bonding bond0 member interface eth0
set interfaces ethernet eth0 vif 10 address 192.0.2.1/24
set protocols static route 0.0.0.0/0 next-hop 198.51.100.1
set service ssh port 22
set system ntp server 192.0.2.100
set system name-server 192.0.2.53
"#;
        let m = parse(pref(), cfg);
        assert_eq!(m.identity.hostname.as_deref(), Some("vyos-core-01"));
        assert!(m.interfaces.iter().any(|i| i.name == "eth0"));
        assert!(m.interfaces.iter().any(|i| i.name == "eth0.10"));
        assert!(m.lag_groups.iter().any(|l| l.name == "bond0"));
        assert_eq!(m.static_routes.len(), 1);
        let kinds: Vec<ServiceKind> = m.services.iter().map(|s| s.kind).collect();
        assert!(kinds.contains(&ServiceKind::Ssh));
        assert!(kinds.contains(&ServiceKind::Ntp));
        assert!(kinds.contains(&ServiceKind::Dns));
    }

    #[test]
    fn out_of_scope_commands_are_recorded_honestly() {
        let cfg = r#"
set protocols bgp 65000 neighbor 203.0.113.1 remote-as 65001
set firewall name WAN_IN default-action drop
"#;
        let m = parse(pref(), cfg);
        assert!(m.unknown_lines.iter().any(|u| matches!(u.reason, Some(UnknownReason::OutOfScope))));
    }

    #[test]
    fn deterministic_repeated_parse() {
        let cfg = "set system host-name vyos-repeat\nset interfaces ethernet eth0 address 10.0.0.1/24\n";
        let a = parse(pref(), cfg);
        let b = parse(pref(), cfg);
        assert_eq!(a, b);
    }
}
