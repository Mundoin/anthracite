//! fortinet-fortios parser — V1AV.
//!
//! Bounded FortiOS coverage using the existing canonical network model.
//! The parser stays deterministic, never panics, and preserves
//! unsupported content as first-class evidence.

use std::collections::{BTreeMap, BTreeSet};

use crate::engines::network_model::{
    DeviceIdentity, DeviceModel, EvidenceMetadata, EvidenceSourceKind, FirewallZoneModel,
    InterfaceAdminState, InterfaceKind, InterfaceModel, IpAddressModel, IpFamily, L2Mode,
    ParseConfidence, ParserMaturityObserved, PlatformRef, ServiceKind, ServiceModel,
    StaticRouteModel, UnknownConfigLine, UnknownReason, VlanModel, VlanState,
};

/// Monotonic parser version. Bump when any existing fixture output changes.
pub const PARSER_VERSION: u32 = 2;

/// In-scope areas for the FortiOS V1AV slice.
#[allow(dead_code)]
pub const IN_SCOPE_AREAS: &[&str] = &[
    "identity",
    "platform",
    "interfaces",
    "ip_addressing",
    "vlans",
    "firewall_zones",
    "static_routes",
    "services_ssh",
    "services_snmp",
    "services_ntp",
    "services_dns",
    "services_syslog",
];

const OUT_OF_SCOPE_AREAS: &[&str] = &[
    "firewall_address_objects",
    "firewall_service_objects",
    "firewall_policy",
    "nat_rules",
    "routing_protocols_ospf",
    "routing_protocols_isis",
    "routing_protocols_eigrp",
    "routing_protocols_bgp",
    "aaa_detail",
    "qos_policies",
    "tunnels",
    "vpn_tunnels",
    "sdwan",
];

#[derive(Debug, Default)]
struct ParseState {
    hostname: Option<String>,
    version: Option<String>,
    interfaces: BTreeMap<String, InterfaceBuf>,
    vlans: BTreeMap<u16, VlanBuf>,
    zones: BTreeMap<String, ZoneBuf>,
    static_routes: Vec<StaticRouteModel>,
    services: BTreeMap<ServiceKind, ServiceBuf>,
    has_ssh: bool,
    unknown_lines: Vec<UnknownConfigLine>,
    parsed_line_count: u64,
    section: Section,
    current_iface: Option<String>,
    current_zone: Option<String>,
    current_route: Option<StaticRouteModel>,
    truncated: bool,
}

#[derive(Debug, Clone)]
enum Section {
    None,
    SystemGlobal,
    SystemInterface,
    SystemZone,
    SystemDns,
    SystemNtp,
    SystemSnmp,
    LogSyslog,
    RouterStatic,
    Unsupported(String),
}

impl Default for Section {
    fn default() -> Self {
        Self::None
    }
}

#[derive(Debug, Default)]
struct InterfaceBuf {
    name: String,
    kind: InterfaceKind,
    admin_state: InterfaceAdminState,
    description: Option<String>,
    mtu: Option<u32>,
    speed_mbps: Option<u32>,
    duplex: Option<crate::engines::network_model::DuplexMode>,
    l2_mode: Option<L2Mode>,
    ipv4_addresses: Vec<IpAddressModel>,
    ipv6_addresses: Vec<IpAddressModel>,
    parent_interface: Option<String>,
    vlan_id: Option<u16>,
    notes: Vec<String>,
}

#[derive(Debug, Default)]
struct VlanBuf {
    name: Option<String>,
    interfaces: BTreeSet<String>,
}

#[derive(Debug, Default)]
struct ZoneBuf {
    interfaces: BTreeSet<String>,
}

#[derive(Debug, Default)]
struct ServiceBuf {
    servers: BTreeSet<String>,
    notes: Vec<String>,
}

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
    model.firewall_zones = state.take_zones();
    model.static_routes = state.take_static_routes();
    model.services = state.take_services();
    model.unknown_lines = state.take_unknown_lines();
    model.parse_confidence = parse_confidence;
    model
}

impl ParseState {
    fn parse(&mut self, lines: &[&str]) {
        for (idx, raw) in lines.iter().enumerate() {
            let line_no = (idx as u64) + 1;
            let line = raw.trim_end_matches(['\r', '\n']);
            let trimmed = line.trim_start();

            if trimmed.is_empty() {
                continue;
            }
            if trimmed.starts_with('!') || trimmed.starts_with('#') {
                continue;
            }
            if trimmed.eq_ignore_ascii_case("return") || trimmed.eq_ignore_ascii_case("quit") {
                self.parsed_line_count += 1;
                continue;
            }

            if trimmed.eq_ignore_ascii_case("end") {
                self.finish_route();
                self.current_iface = None;
                self.current_zone = None;
                self.section = Section::None;
                self.parsed_line_count += 1;
                continue;
            }

            if let Some(rest) = trimmed.strip_prefix("config ") {
                self.finish_route();
                self.current_iface = None;
                self.current_zone = None;
                self.section = match rest.trim() {
                    "system global" => Section::SystemGlobal,
                    "system interface" => Section::SystemInterface,
                    "system zone" => Section::SystemZone,
                    "system dns" => Section::SystemDns,
                    "system ntp" => Section::SystemNtp,
                    "system snmp" | "system snmp community" => Section::SystemSnmp,
                    "log syslogd setting" | "log syslogd2 setting" => Section::LogSyslog,
                    "router static" => Section::RouterStatic,
                    other => Section::Unsupported(format!("config {other}")),
                };
                if let Section::Unsupported(block) = &self.section {
                    let block = block.clone();
                    self.record_unknown(line_no, line, Some(block.as_str()), UnknownReason::OutOfScope);
                }
                self.parsed_line_count += 1;
                continue;
            }

            match self.section.clone() {
                Section::SystemGlobal => self.handle_system_global(line_no, line, trimmed),
                Section::SystemInterface => self.handle_system_interface(line_no, line, trimmed),
                Section::SystemZone => self.handle_system_zone(line_no, line, trimmed),
                Section::SystemDns => self.handle_system_dns(line_no, line, trimmed),
                Section::SystemNtp => self.handle_system_ntp(line_no, line, trimmed),
                Section::SystemSnmp => self.handle_system_snmp(line_no, line, trimmed),
                Section::LogSyslog => self.handle_log_syslog(line_no, line, trimmed),
                Section::RouterStatic => self.handle_router_static(line_no, line, trimmed),
                Section::Unsupported(block) => {
                    self.record_unknown(line_no, line, Some(block.as_str()), UnknownReason::OutOfScope);
                }
                Section::None => {
                    self.record_unknown(line_no, line, None, UnknownReason::UnsupportedKeyword);
                }
            }
        }

        self.finish_route();
        if !matches!(self.section, Section::None) {
            self.truncated = true;
        }
    }

    fn handle_system_global(&mut self, line_no: u64, raw: &str, trimmed: &str) {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return;
        }
        if tokens[0] == "set" && tokens.len() >= 3 && tokens[1] == "hostname" {
            self.hostname = Some(tokens[2..].join(" "));
            self.parsed_line_count += 1;
            return;
        }
        if tokens[0] == "set" && tokens.len() >= 3 && tokens[1] == "version" {
            self.version = Some(tokens[2..].join(" "));
            self.parsed_line_count += 1;
            return;
        }
        self.record_unknown(line_no, raw, Some("config system global"), UnknownReason::UnsupportedKeyword);
        self.parsed_line_count += 1;
    }

    fn handle_system_interface(&mut self, line_no: u64, raw: &str, trimmed: &str) {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return;
        }

        match tokens[0].as_str() {
            "edit" => {
                if let Some(name) = tokens.get(1).cloned() {
                    self.current_iface = Some(name.clone());
                    self.interfaces.entry(name.clone()).or_insert_with(|| InterfaceBuf {
                        name: name.clone(),
                        kind: classify_interface(&name),
                        ..InterfaceBuf::default()
                    });
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(
                        line_no,
                        raw,
                        Some("config system interface"),
                        UnknownReason::ParseError,
                    );
                }
            }
            "next" => {
                self.current_iface = None;
                self.parsed_line_count += 1;
            }
            "set" => {
                let Some(iface_name) = self.current_iface.clone() else {
                    self.record_unknown(
                        line_no,
                        raw,
                        Some("config system interface"),
                        UnknownReason::UnsupportedKeyword,
                    );
                    return;
                };
                let Some(buf) = self.interfaces.get_mut(&iface_name) else {
                    return;
                };
                self.parsed_line_count += 1;
                match tokens.get(1).map(|s| s.as_str()) {
                    Some("alias") if tokens.len() >= 3 => {
                        let alias = tokens[2..].join(" ");
                        buf.description = Some(alias.clone());
                        if let Some(vlan_id) = buf.vlan_id {
                            if let Some(entry) = self.vlans.get_mut(&vlan_id) {
                                if entry.name.is_none() {
                                    entry.name = Some(alias);
                                }
                            }
                        }
                    }
                    Some("status") if tokens.len() >= 3 => match tokens[2].to_ascii_lowercase().as_str() {
                        "up" | "enable" | "enabled" => buf.admin_state = InterfaceAdminState::Up,
                        "down" | "disable" | "disabled" => buf.admin_state = InterfaceAdminState::Down,
                        _ => self.record_unknown(line_no, raw, Some(&format!("config system interface / edit {iface_name}")), UnknownReason::UnsupportedKeyword),
                    },
                    Some("ip") if tokens.len() >= 4 => {
                if let Some(addr) = parse_ip_address(&tokens[2..]) {
                            buf.ipv4_addresses.push(addr);
                        } else {
                            self.record_unknown(
                                line_no,
                                raw,
                                Some(&format!("config system interface / edit {iface_name}")),
                                UnknownReason::ParseError,
                            );
                        }
                    }
                    Some("interface") if tokens.len() >= 3 => {
                        buf.parent_interface = Some(tokens[2].clone());
                    }
                    Some("vlanid") if tokens.len() >= 3 => {
                        if let Ok(vlan_id) = tokens[2].parse::<u16>() {
                            buf.vlan_id = Some(vlan_id);
                            let entry = self.vlans.entry(vlan_id).or_insert_with(VlanBuf::default);
                            if entry.name.is_none() && buf.name.to_ascii_lowercase().starts_with("vlan") {
                                entry.name = buf.description.clone();
                            }
                            entry.interfaces.insert(buf.name.clone());
                        } else {
                            self.record_unknown(
                                line_no,
                                raw,
                                Some(&format!("config system interface / edit {iface_name}")),
                                UnknownReason::ParseError,
                            );
                        }
                    }
                    Some("mtu") if tokens.len() >= 3 => {
                        buf.mtu = tokens[2].parse::<u32>().ok();
                    }
                    Some("mtu-override") if tokens.len() >= 3 => {
                        if let Some(state) = tokens.get(2) {
                            buf.notes.push(format!("mtu_override={state}"));
                        }
                    }
                    Some("allowaccess") if tokens.len() >= 3 => {
                        buf.notes.push(format!("allowaccess={}", tokens[2..].join(",")));
                        if tokens.iter().any(|t| t == "ssh") {
                            self.has_ssh = true;
                        }
                    }
                    Some("role") if tokens.len() >= 3 => {
                        buf.notes.push(format!("role={}", tokens[2..].join(" ")));
                    }
                    Some("vdom") if tokens.len() >= 3 => {
                        buf.notes.push(format!("vdom={}", tokens[2..].join(" ")));
                    }
                    Some("description") if tokens.len() >= 3 => {
                        buf.notes.push(format!("description={}", tokens[2..].join(" ")));
                    }
                    _ => {
                        self.record_unknown(
                            line_no,
                            raw,
                            Some(&format!("config system interface / edit {iface_name}")),
                            UnknownReason::UnsupportedKeyword,
                        );
                    }
                }
            }
            _ => {
                self.record_unknown(line_no, raw, Some("config system interface"), UnknownReason::UnsupportedKeyword);
                self.parsed_line_count += 1;
            }
        }
    }

    fn handle_system_dns(&mut self, line_no: u64, raw: &str, trimmed: &str) {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return;
        }
        if tokens[0] == "set" && tokens.len() >= 3 && (tokens[1] == "primary" || tokens[1] == "secondary") {
            self.ensure_service(ServiceKind::Dns)
                .servers
                .insert(tokens[2].trim_matches('"').to_string());
            self.parsed_line_count += 1;
            return;
        }
        if tokens[0] == "set" && tokens.len() >= 3 && tokens[1] == "dns-server1" {
            self.ensure_service(ServiceKind::Dns)
                .servers
                .insert(tokens[2].trim_matches('"').to_string());
            self.parsed_line_count += 1;
            return;
        }
        self.record_unknown(line_no, raw, Some("config system dns"), UnknownReason::UnsupportedKeyword);
        self.parsed_line_count += 1;
    }

    fn handle_system_ntp(&mut self, line_no: u64, raw: &str, trimmed: &str) {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return;
        }
        if tokens[0] == "set" && tokens.len() >= 3 && (tokens[1] == "server" || tokens[1] == "source-ip") {
            self.ensure_service(ServiceKind::Ntp)
                .servers
                .insert(tokens[2].trim_matches('"').to_string());
            self.parsed_line_count += 1;
            return;
        }
        self.record_unknown(line_no, raw, Some("config system ntp"), UnknownReason::UnsupportedKeyword);
        self.parsed_line_count += 1;
    }

    fn handle_system_snmp(&mut self, line_no: u64, raw: &str, trimmed: &str) {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return;
        }
        if tokens[0] == "set" && tokens.len() >= 2 {
            if tokens[1] == "status" || tokens[1] == "contact" || tokens[1] == "location" {
                self.ensure_service(ServiceKind::Snmp);
                self.parsed_line_count += 1;
                return;
            }
        }
        if tokens[0] == "edit" && tokens.len() >= 2 {
            self.ensure_service(ServiceKind::Snmp);
            self.parsed_line_count += 1;
            return;
        }
        self.record_unknown(line_no, raw, Some("config system snmp"), UnknownReason::UnsupportedKeyword);
        self.parsed_line_count += 1;
    }

    fn handle_log_syslog(&mut self, line_no: u64, raw: &str, trimmed: &str) {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return;
        }
        if tokens[0] == "set" && tokens.len() >= 3 && tokens[1] == "server" {
            self.ensure_service(ServiceKind::Syslog)
                .servers
                .insert(tokens[2].trim_matches('"').to_string());
            self.parsed_line_count += 1;
            return;
        }
        if tokens[0] == "set" && tokens.len() >= 3 && tokens[1] == "status" {
            self.ensure_service(ServiceKind::Syslog);
            self.parsed_line_count += 1;
            return;
        }
        self.record_unknown(line_no, raw, Some("config log syslogd setting"), UnknownReason::UnsupportedKeyword);
        self.parsed_line_count += 1;
    }

    fn handle_system_zone(&mut self, line_no: u64, raw: &str, trimmed: &str) {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return;
        }

        match tokens[0].as_str() {
            "edit" => {
                if let Some(name) = tokens.get(1).cloned() {
                    self.current_zone = Some(name.clone());
                    self.zones.entry(name.clone()).or_insert_with(ZoneBuf::default);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("config system zone"), UnknownReason::ParseError);
                }
            }
            "next" => {
                self.current_zone = None;
                self.parsed_line_count += 1;
            }
            "set" => {
                let Some(zone_name) = self.current_zone.clone() else {
                    self.record_unknown(line_no, raw, Some("config system zone"), UnknownReason::UnsupportedKeyword);
                    return;
                };
                let Some(zone) = self.zones.get_mut(&zone_name) else {
                    return;
                };
                self.parsed_line_count += 1;
                if tokens.get(1).map(|s| s.as_str()) == Some("interface") && tokens.len() >= 3 {
                    for iface in &tokens[2..] {
                        zone.interfaces.insert(iface.clone());
                    }
                } else {
                    self.record_unknown(
                        line_no,
                        raw,
                        Some(&format!("config system zone / edit {zone_name}")),
                        UnknownReason::UnsupportedKeyword,
                    );
                }
            }
            _ => {
                self.record_unknown(line_no, raw, Some("config system zone"), UnknownReason::UnsupportedKeyword);
                self.parsed_line_count += 1;
            }
        }
    }

    fn handle_router_static(&mut self, line_no: u64, raw: &str, trimmed: &str) {
        let tokens = split_args(trimmed);
        if tokens.is_empty() {
            return;
        }

        match tokens[0].as_str() {
            "edit" => {
                self.finish_route();
                self.current_route = Some(StaticRouteModel::default());
                self.parsed_line_count += 1;
            }
            "next" => {
                self.finish_route();
                self.parsed_line_count += 1;
            }
            "set" => {
                let Some(route) = self.current_route.as_mut() else {
                    self.record_unknown(line_no, raw, Some("config router static"), UnknownReason::UnsupportedKeyword);
                    return;
                };
                self.parsed_line_count += 1;
                match tokens.get(1).map(|s| s.as_str()) {
                    Some("dst") if tokens.len() >= 3 => {
                        if let Some(prefix) = parse_prefix(&tokens[2..]) {
                            route.prefix = prefix;
                        } else {
                            self.record_unknown(
                                line_no,
                                raw,
                                Some("config router static"),
                                UnknownReason::ParseError,
                            );
                        }
                    }
                    Some("gateway") if tokens.len() >= 3 => {
                        if route.next_hops.is_empty() {
                            route.next_hops.push(tokens[2..].join(" "));
                        } else {
                            route.next_hops[0] = tokens[2..].join(" ");
                        }
                    }
                    Some("distance") if tokens.len() >= 3 => {
                        route.admin_distance = tokens[2].parse::<u32>().ok();
                    }
                    Some("metric") if tokens.len() >= 3 => {
                        route.metric = tokens[2].parse::<u32>().ok();
                    }
                    Some("comment") | Some("name") if tokens.len() >= 3 => {
                        route.name = Some(tokens[2..].join(" "));
                    }
                    Some("device") if tokens.len() >= 3 => {
                        self.record_unknown(
                            line_no,
                            raw,
                            Some("config router static"),
                            UnknownReason::OutOfScope,
                        );
                    }
                    _ => {
                        self.record_unknown(
                            line_no,
                            raw,
                            Some("config router static"),
                            UnknownReason::UnsupportedKeyword,
                        );
                    }
                }
            }
            _ => {
                self.record_unknown(line_no, raw, Some("config router static"), UnknownReason::UnsupportedKeyword);
                self.parsed_line_count += 1;
            }
        }
    }

    fn finish_route(&mut self) {
        if let Some(route) = self.current_route.take() {
            if !route.prefix.is_empty() {
                self.static_routes.push(route);
            }
        }
    }

    fn take_interfaces(&self) -> Vec<InterfaceModel> {
        let mut out: Vec<InterfaceModel> = self
            .interfaces
            .values()
            .map(|b| b.to_model())
            .collect();

        let mut children: BTreeMap<String, Vec<String>> = BTreeMap::new();
        for iface in &out {
            if let Some(parent) = iface.parent_interface.clone() {
                children.entry(parent).or_default().push(iface.name.clone());
            }
        }

        for iface in &mut out {
            if let Some(kids) = children.get(&iface.name) {
                let mut kids = kids.clone();
                kids.sort();
                kids.dedup();
                iface.child_interfaces = kids;
            }
        }

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
                    let mut interfaces: Vec<String> = v.interfaces.iter().cloned().collect();
                    interfaces.sort();
                    interfaces
                },
            })
            .collect();
        out.sort_by(|a, b| a.id.cmp(&b.id).then(a.name.cmp(&b.name)));
        out
    }

    fn take_zones(&self) -> Vec<FirewallZoneModel> {
        let mut out: Vec<FirewallZoneModel> = self
            .zones
            .iter()
            .map(|(name, z)| {
                let mut interfaces: Vec<String> = z.interfaces.iter().cloned().collect();
                interfaces.sort();
                FirewallZoneModel {
                    name: name.clone(),
                    interfaces,
                    default_action: None,
                }
            })
            .collect();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    fn take_static_routes(&mut self) -> Vec<StaticRouteModel> {
        self.finish_route();
        let mut out = std::mem::take(&mut self.static_routes);
        out.sort_by(|a, b| {
            a.prefix
                .cmp(&b.prefix)
                .then_with(|| a.next_hops.cmp(&b.next_hops))
        });
        out
    }

    fn take_services(&mut self) -> Vec<ServiceModel> {
        let mut out: Vec<ServiceModel> = self
            .services
            .iter()
            .map(|(kind, buf)| {
                let mut servers: Vec<String> = buf.servers.iter().cloned().collect();
                servers.sort();
                ServiceModel {
                    kind: *kind,
                    servers,
                    source_interface: None,
                    vrf: None,
                    authentication_mode: None,
                    notes: if buf.notes.is_empty() {
                        None
                    } else {
                        let mut notes = buf.notes.clone();
                        notes.sort();
                        notes.dedup();
                        Some(notes.join("; "))
                    },
                }
            })
            .collect();
        if self.has_ssh {
            out.push(ServiceModel {
                kind: ServiceKind::Ssh,
                servers: Vec::new(),
                source_interface: None,
                vrf: None,
                authentication_mode: None,
                notes: Some("allowaccess ssh".to_string()),
            });
        }
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

    fn ensure_service(&mut self, kind: ServiceKind) -> &mut ServiceBuf {
        self.services.entry(kind).or_default()
    }
}

impl InterfaceBuf {
    fn to_model(&self) -> InterfaceModel {
        let mut notes = self.notes.clone();
        notes.sort();
        notes.dedup();
        InterfaceModel {
            name: self.name.clone(),
            normalized_name: None,
            kind: self.kind,
            admin_state: self.admin_state,
            oper_state: Default::default(),
            description: self.description.clone(),
            mtu: self.mtu,
            speed_mbps: self.speed_mbps,
            duplex: self.duplex,
            l2_mode: self.l2_mode.or_else(|| {
                if self.vlan_id.is_some() {
                    Some(L2Mode::Access)
                } else {
                    None
                }
            }),
            access_vlan: None,
            allowed_vlans: Vec::new(),
            native_vlan: None,
            vrf: None,
            ipv4_addresses: self.ipv4_addresses.clone(),
            ipv6_addresses: self.ipv6_addresses.clone(),
            parent_interface: self.parent_interface.clone(),
            child_interfaces: Vec::new(),
            lag_membership: None,
            notes: if notes.is_empty() { None } else { Some(notes.join("; ")) },
        }
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

fn classify_interface(name: &str) -> InterfaceKind {
    let lower = name.trim().to_ascii_lowercase();
    if lower.starts_with("vlan") {
        InterfaceKind::Vlan
    } else if lower.starts_with("loopback") {
        InterfaceKind::Loopback
    } else if lower.starts_with("port") && lower[4..].chars().all(|c| c.is_ascii_digit()) {
        InterfaceKind::Physical
    } else if lower.starts_with("aggregate") || lower.starts_with("agg") {
        InterfaceKind::Lag
    } else if lower.starts_with("mgmt") || lower.starts_with("management") {
        InterfaceKind::Management
    } else if lower.contains('.') {
        InterfaceKind::SubInterface
    } else {
        InterfaceKind::Unknown
    }
}

fn split_args(input: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut buf = String::new();
    let mut in_quotes = false;
    for ch in input.chars() {
        match ch {
            '"' => {
                in_quotes = !in_quotes;
                if !in_quotes {
                    if !buf.is_empty() {
                        out.push(std::mem::take(&mut buf));
                    }
                }
            }
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

fn parse_ip_address(tokens: &[String]) -> Option<IpAddressModel> {
    if tokens.len() < 2 {
        return None;
    }
    let address = tokens[0].clone();
    if address.contains('/') {
        let (addr, prefix) = address.split_once('/')?;
        let prefix_length = prefix.parse::<u8>().ok()?;
        return Some(IpAddressModel {
            family: IpFamily::V4,
            address: addr.to_string(),
            prefix_length,
            secondary: false,
            vrf: None,
        });
    }
    let prefix_length = mask_to_prefix(&tokens[1])?;
    Some(IpAddressModel {
        family: IpFamily::V4,
        address,
        prefix_length,
        secondary: false,
        vrf: None,
    })
}

fn parse_prefix(tokens: &[String]) -> Option<String> {
    if tokens.is_empty() {
        return None;
    }
    let raw = tokens[0].clone();
    if let Some((addr, prefix)) = raw.split_once('/') {
        let prefix_length = prefix.parse::<u8>().ok()?;
        return Some(format!("{addr}/{prefix_length}"));
    }
    if tokens.len() >= 2 {
        let prefix_length = mask_to_prefix(&tokens[1])?;
        return Some(format!("{}/{}", tokens[0], prefix_length));
    }
    None
}

fn mask_to_prefix(mask: &str) -> Option<u8> {
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

fn build_platform(mut platform_ref: PlatformRef, version: &Option<String>) -> PlatformRef {
    platform_ref.platform_id = Some("fortinet-fortios".to_string());
    if platform_ref.vendor.is_none() {
        platform_ref.vendor = Some("Fortinet".to_string());
    }
    if platform_ref.os_family.is_none() {
        platform_ref.os_family = Some("FortiOS".to_string());
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
    if state.truncated {
        warnings.push("truncated_input".to_string());
    }
    if state.hostname.is_none() {
        warnings.push("absent:identity".to_string());
    }
    if state.interfaces.is_empty() {
        warnings.push("absent:interfaces".to_string());
        warnings.push("absent:ip_addressing".to_string());
    } else {
        let any_ipv4 = state.interfaces.values().any(|b| !b.ipv4_addresses.is_empty());
        if !any_ipv4 {
            warnings.push("absent:ip_addressing".to_string());
        }
    }
    if state.vlans.is_empty() {
        warnings.push("absent:vlans".to_string());
    }
    if state.zones.is_empty() {
        warnings.push("absent:firewall_zones".to_string());
    }
    if state.static_routes.is_empty() {
        warnings.push("absent:static_routes".to_string());
    }
    if !state.has_ssh {
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
            platform_id: Some("fortinet-fortios".to_string()),
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
        assert_eq!(m.platform.platform_id.as_deref(), Some("fortinet-fortios"));
        assert_eq!(m.platform.vendor.as_deref(), Some("Fortinet"));
        assert!(m.interfaces.is_empty());
        assert!(m.vlans.is_empty());
        assert!(m.firewall_zones.is_empty());
        assert!(m.static_routes.is_empty());
        assert!(m.unknown_lines.is_empty());
    }

    #[test]
    fn hostname_and_interface_details_parse() {
        let cfg = r#"
config system global
    set hostname "fg-test"
end
config system interface
    edit "port1"
        set vdom "root"
        set alias "wan-uplink"
        set status up
        set ip 198.51.100.2 255.255.255.252
        set allowaccess ping https ssh
        set role wan
        set mtu-override enable
        set mtu 1500
    next
    edit "VLAN10"
        set interface "port1"
        set vlanid 10
        set alias "users"
        set ip 192.0.2.10 255.255.255.0
    next
end
config system zone
    edit "WAN"
        set interface "port1"
    next
    edit "LAN"
        set interface "VLAN10"
    next
end
config router static
    edit 1
        set dst 0.0.0.0/0
        set gateway 198.51.100.1
        set device "port1"
        set distance 10
    next
end
"#;
        let m = parse(pref(), cfg);
        assert_eq!(m.identity.hostname.as_deref(), Some("fg-test"));
        assert_eq!(m.interfaces.len(), 2);
        let port1 = m
            .interfaces
            .iter()
            .find(|iface| iface.name == "port1")
            .expect("port1");
        assert_eq!(port1.kind, InterfaceKind::Physical);
        assert_eq!(port1.admin_state, InterfaceAdminState::Up);
        assert_eq!(port1.description.as_deref(), Some("wan-uplink"));
        assert_eq!(port1.mtu, Some(1500));
        assert!(port1
            .notes
            .as_ref()
            .expect("notes")
            .contains("allowaccess=ping,https,ssh"));
        assert!(port1
            .notes
            .as_ref()
            .expect("notes")
            .contains("role=wan"));
        assert_eq!(m.vlans.len(), 1);
        assert_eq!(m.vlans[0].id, 10);
        assert_eq!(m.vlans[0].name.as_deref(), Some("users"));
        assert!(m.vlans[0].interfaces.contains(&"VLAN10".to_string()));
        assert_eq!(m.firewall_zones.len(), 2);
        assert!(m.firewall_zones.iter().any(|z| z.name == "LAN" && z.interfaces.contains(&"VLAN10".to_string())));
        assert_eq!(m.static_routes.len(), 1);
        assert_eq!(m.static_routes[0].prefix, "0.0.0.0/0");
        assert_eq!(m.static_routes[0].next_hops, vec!["198.51.100.1".to_string()]);
    }

    #[test]
    fn vlan_child_interface_is_cross_linked() {
        let cfg = "config system interface\n    edit \"port2\"\n    next\n    edit \"VLAN20\"\n        set interface \"port2\"\n        set vlanid 20\n    next\nend\n";
        let m = parse(pref(), cfg);
        let parent = m.interfaces.iter().find(|iface| iface.name == "port2").unwrap();
        assert!(parent.child_interfaces.contains(&"VLAN20".to_string()));
    }

    #[test]
    fn service_hints_parse_from_interfaces_and_service_sections() {
        let cfg = r#"
config system interface
    edit "port1"
        set allowaccess ping ssh
    next
end
config system dns
    set primary 192.0.2.53
end
config system ntp
    set server 192.0.2.100
end
config system snmp
    set status enable
end
config log syslogd setting
    set server 192.0.2.200
end
"#;
        let m = parse(pref(), cfg);
        let kinds: Vec<ServiceKind> = m.services.iter().map(|s| s.kind).collect();
        assert!(kinds.contains(&ServiceKind::Ssh));
        assert!(kinds.contains(&ServiceKind::Dns));
        assert!(kinds.contains(&ServiceKind::Ntp));
        assert!(kinds.contains(&ServiceKind::Snmp));
        assert!(kinds.contains(&ServiceKind::Syslog));
    }

    #[test]
    fn out_of_scope_blocks_are_recorded_honestly() {
        let cfg = r#"
config firewall address
    edit "LAN_NET"
        set subnet 192.0.2.0 255.255.255.0
    next
end
config firewall service custom
    edit "HTTPS"
        set tcp-portrange 443
    next
end
config firewall policy
    edit 1
        set srcintf "LAN"
        set dstintf "WAN"
        set nat enable
    next
end
config firewall ippool
    edit "SNAT"
        set type overload
    next
end
config vpn ipsec phase1-interface
    edit "vpn-1"
    next
end
config system sdwan
    config members
    end
end
"#;
        let m = parse(pref(), cfg);
        assert!(!m.unknown_lines.is_empty());
        assert!(m
            .unknown_lines
            .iter()
            .any(|u| u.raw.contains("config firewall policy")));
        for u in &m.unknown_lines {
            assert!(matches!(u.reason, Some(UnknownReason::OutOfScope | UnknownReason::UnsupportedKeyword)));
        }
    }

    #[test]
    fn deterministic_repeated_parse() {
        let cfg = "config system global\n    set hostname \"fg-repeat\"\nend\n";
        let a = parse(pref(), cfg);
        let b = parse(pref(), cfg);
        assert_eq!(a, b);
    }
}
