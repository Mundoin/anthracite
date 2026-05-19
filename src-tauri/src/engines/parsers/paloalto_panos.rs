//! Palo Alto PAN-OS parser — V1 first pass.
//!
//! Conservative inventory coverage for the current common bar:
//! identity, interfaces, IP addressing, VLANs, VRFs, aggregate-ethernet
//! LAGs, static routes, and basic management-plane services. Policy,
//! NAT, and VPN content stay as honest evidence rather than being
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
    "lag_groups",
    "static_routes",
    "services_ssh",
    "services_snmp",
    "services_ntp",
    "services_dns",
    "services_syslog",
];

const OUT_OF_SCOPE_AREAS: &[&str] = &[
    "acl_firewall",
    "nat_rules",
    "vpn_tunnels",
    "qos_policies",
    "routing_protocols_ospf",
    "routing_protocols_bgp",
    "routing_protocols_isis",
    "routing_protocols_eigrp",
    "shared_objects",
    "rulebase_security_rules",
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
    truncated: bool,
}

#[derive(Debug, Default)]
struct InterfaceBuf {
    name: String,
    kind: InterfaceKind,
    admin_state: InterfaceAdminState,
    description: Option<String>,
    mtu: Option<u32>,
    speed_mbps: Option<u32>,
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
    interfaces: BTreeSet<String>,
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
    source_interface: Option<String>,
    vrf: Option<String>,
    authentication_mode: Option<String>,
    notes: BTreeSet<String>,
}

impl ParseState {
    fn parse(&mut self, lines: &[&str]) {
        for (idx, raw) in lines.iter().enumerate() {
            let line_no = (idx as u64) + 1;
            let line = raw.trim_end_matches(['\r', '\n']);
            let trimmed = line.trim();

            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            if let Some(rest) = trimmed.strip_prefix("set deviceconfig system hostname ") {
                self.hostname = Some(strip_quotes(rest));
                self.parsed_line_count += 1;
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("set deviceconfig system ip-address ") {
                if let Some(ip) = parse_system_ip_address(rest) {
                    self.management_ips.push(ip);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(
                        line_no,
                        line,
                        Some("set deviceconfig system ip-address"),
                        UnknownReason::ParseError,
                    );
                }
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("set deviceconfig system service ") {
                self.parse_system_service(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("set deviceconfig system dns-setting ") {
                self.parse_dns_setting(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("set deviceconfig system ntp-servers ") {
                self.parse_ntp_servers(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("set deviceconfig system log-settings ") {
                self.parse_log_settings(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("set network interface ") {
                self.parse_network_interface(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("set network virtual-router ") {
                self.parse_virtual_router(line_no, line, rest);
                continue;
            }
            if trimmed.starts_with("set rulebase security rules")
                || trimmed.starts_with("set network address")
                || trimmed.starts_with("set shared address")
                || trimmed.starts_with("set shared service")
                || trimmed.starts_with("set deviceconfig system zone")
            {
                self.record_unknown(
                    line_no,
                    line,
                    Some("pan-os out-of-scope"),
                    UnknownReason::OutOfScope,
                );
                continue;
            }
            if trimmed.starts_with('<') {
                self.record_unknown(
                    line_no,
                    line,
                    Some("pan-os xml"),
                    UnknownReason::OutOfScope,
                );
                continue;
            }

            self.record_unknown(
                line_no,
                line,
                Some("pan-os"),
                UnknownReason::UnsupportedKeyword,
            );
        }
    }

    fn parse_system_service(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = split_args(rest);
        if tokens.is_empty() {
            self.record_unknown(line_no, raw, Some("set deviceconfig system service"), UnknownReason::ParseError);
            return;
        }

        let mut captured = false;
        for idx in 0..tokens.len() {
            let token = tokens[idx].to_ascii_lowercase();
            if let Some(kind) = service_kind_from_toggle(&token) {
                let enabled = tokens
                    .get(idx + 1)
                    .map(|v| !is_truthy(v))
                    .unwrap_or(true);
                if enabled {
                    self.ensure_service(kind);
                    captured = true;
                }
            }
        }

        if tokens.iter().any(|t| t.eq_ignore_ascii_case("allow-ssh")) {
            self.ensure_service(ServiceKind::Ssh);
            captured = true;
        }
        if tokens.iter().any(|t| t.eq_ignore_ascii_case("allow-snmp")) {
            self.ensure_service(ServiceKind::Snmp);
            captured = true;
        }

        if captured {
            self.parsed_line_count += 1;
        } else {
            self.record_unknown(
                line_no,
                raw,
                Some("set deviceconfig system service"),
                UnknownReason::UnsupportedKeyword,
            );
        }
    }

    fn parse_dns_setting(&mut self, _line_no: u64, _raw: &str, rest: &str) {
        let tokens = split_args(rest);
        let mut captured = false;
        for idx in 0..tokens.len() {
            if tokens[idx].eq_ignore_ascii_case("servers") {
                if let Some(primary) = tokens.get(idx + 2) {
                    self.ensure_service(ServiceKind::Dns)
                        .servers
                        .insert(strip_quotes(primary));
                    captured = true;
                }
                if let Some(secondary) = tokens.get(idx + 4) {
                    self.ensure_service(ServiceKind::Dns)
                        .servers
                        .insert(strip_quotes(secondary));
                    captured = true;
                }
            }
        }
        if captured {
            self.parsed_line_count += 1;
        }
    }

    fn parse_ntp_servers(&mut self, _line_no: u64, _raw: &str, rest: &str) {
        let tokens = split_args(rest);
        let mut captured = false;
        for idx in 0..tokens.len() {
            if tokens[idx].eq_ignore_ascii_case("primary") || tokens[idx].eq_ignore_ascii_case("secondary")
            {
                if let Some(server) = tokens.get(idx + 1) {
                    self.ensure_service(ServiceKind::Ntp)
                        .servers
                        .insert(strip_quotes(server));
                    captured = true;
                }
            }
        }
        if captured {
            self.parsed_line_count += 1;
        }
    }

    fn parse_log_settings(&mut self, _line_no: u64, _raw: &str, rest: &str) {
        let tokens = split_args(rest);
        let mut captured = false;
        if tokens.iter().any(|t| t.eq_ignore_ascii_case("syslog")) {
            self.ensure_service(ServiceKind::Syslog);
            captured = true;
        }
        for idx in 0..tokens.len() {
            if tokens[idx].eq_ignore_ascii_case("server") || tokens[idx].eq_ignore_ascii_case("host") {
                if let Some(server) = tokens.get(idx + 1) {
                    self.ensure_service(ServiceKind::Syslog)
                        .servers
                        .insert(strip_quotes(server));
                    captured = true;
                }
            }
        }
        if captured {
            self.parsed_line_count += 1;
        }
    }

    fn parse_network_interface(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = split_args(rest);
        if tokens.len() < 2 {
            self.record_unknown(line_no, raw, Some("set network interface"), UnknownReason::ParseError);
            return;
        }

        let iface_type = tokens[0].clone();
        let iface_name = strip_quotes(&tokens[1]);

        let mut idx = 2usize;
        while idx < tokens.len() {
            match tokens[idx].as_str() {
                "layer3" => {
                    {
                        let buf = self.ensure_interface(&iface_name, &iface_type);
                        buf.l2_mode = Some(L2Mode::Routed);
                    }
                    idx += 1;
                    continue;
                }
                "layer2" => {
                    {
                        let buf = self.ensure_interface(&iface_name, &iface_type);
                        if buf.l2_mode.is_none() {
                            buf.l2_mode = Some(L2Mode::Access);
                        }
                    }
                    idx += 1;
                    continue;
                }
                "comment" | "description" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        let value = strip_quotes(value);
                        let buf = self.ensure_interface(&iface_name, &iface_type);
                        buf.description = Some(value);
                        idx += 2;
                        continue;
                    }
                }
                "ip" => {
                    if let Some((ip, consumed)) = parse_ip_spec(&tokens[idx + 1..]) {
                        {
                            let buf = self.ensure_interface(&iface_name, &iface_type);
                            match ip.family {
                                IpFamily::V4 => buf.ipv4_addresses.push(ip),
                                IpFamily::V6 => buf.ipv6_addresses.push(ip),
                            }
                        }
                        idx += consumed + 1;
                        continue;
                    }
                }
                "tag" => {
                    if let Some(value) = tokens.get(idx + 1).and_then(|v| v.parse::<u16>().ok()) {
                        {
                            let buf = self.ensure_interface(&iface_name, &iface_type);
                            buf.access_vlan = Some(value);
                            buf.notes.insert(format!("tag={value}"));
                        }
                        let vlan = self.ensure_vlan(value);
                        vlan.interfaces.insert(iface_name.clone());
                        idx += 2;
                        continue;
                    }
                }
                "interface" => {
                    if let Some(parent) = tokens.get(idx + 1) {
                        let parent = strip_quotes(parent);
                        {
                            let buf = self.ensure_interface(&iface_name, &iface_type);
                            buf.parent_interface = Some(parent.clone());
                        }
                        idx += 2;
                        continue;
                    }
                }
                "aggregate-group" => {
                    if let Some(group) = tokens.get(idx + 1) {
                        let group = strip_quotes(group);
                        {
                            let buf = self.ensure_interface(&iface_name, &iface_type);
                            buf.lag_membership = Some(group.clone());
                        }
                        self.ensure_lag(&group).members.insert(iface_name.clone());
                        idx += 2;
                        continue;
                    }
                }
                "lacp" => {
                    if tokens.get(idx + 1).map(|s| s.as_str()) == Some("mode") {
                        if let Some(mode) = tokens.get(idx + 2).and_then(|s| parse_lag_mode_panos(s)) {
                            {
                                let lag = self.ensure_lag(&iface_name);
                                lag.mode = Some(mode);
                            }
                            {
                                let buf = self.ensure_interface(&iface_name, &iface_type);
                                buf.kind = InterfaceKind::Lag;
                            }
                            idx += 3;
                            continue;
                        }
                    }
                }
                "mtu" => {
                    if let Some(value) = tokens.get(idx + 1).and_then(|v| v.parse::<u32>().ok()) {
                        let buf = self.ensure_interface(&iface_name, &iface_type);
                        buf.mtu = Some(value);
                        idx += 2;
                        continue;
                    }
                }
                "management-profile" | "interface-management-profile" => {
                    if let Some(profile) = tokens.get(idx + 1) {
                        let profile = strip_quotes(profile);
                        let buf = self.ensure_interface(&iface_name, &iface_type);
                        buf.notes.insert(format!("management_profile={profile}"));
                        idx += 2;
                        continue;
                    }
                }
                "virtual-router" => {
                    if let Some(vrf) = tokens.get(idx + 1) {
                        let vrf = strip_quotes(vrf);
                        {
                            let buf = self.ensure_interface(&iface_name, &iface_type);
                            buf.vrf = Some(vrf.clone());
                        }
                        self.ensure_vrf(&vrf).interfaces.insert(iface_name.clone());
                        idx += 2;
                        continue;
                    }
                }
                "disabled" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        let buf = self.ensure_interface(&iface_name, &iface_type);
                        buf.admin_state = if is_truthy(value) {
                            InterfaceAdminState::Down
                        } else {
                            InterfaceAdminState::Up
                        };
                        idx += 2;
                        continue;
                    }
                }
                other => {
                    let buf = self.ensure_interface(&iface_name, &iface_type);
                    buf.notes.insert(other.to_string());
                    idx += 1;
                    continue;
                }
            }
            idx += 1;
        }

        self.parsed_line_count += 1;
    }

    fn parse_virtual_router(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = split_args(rest);
        if tokens.len() < 2 {
            self.record_unknown(line_no, raw, Some("set network virtual-router"), UnknownReason::ParseError);
            return;
        }

        let vrf_name = strip_quotes(&tokens[0]);

        match tokens.get(1).map(|s| s.as_str()) {
            Some("interface") => {
                let mut captured = false;
                let members = bracket_list(&tokens[2..]);
                {
                    let vrf = self.ensure_vrf(&vrf_name);
                    for member in &members {
                        let member = strip_quotes(member);
                        vrf.interfaces.insert(member);
                    }
                }
                for member in members {
                    let member = strip_quotes(&member);
                    {
                        let buf = self.ensure_interface(&member, "ethernet");
                        buf.vrf = Some(vrf_name.clone());
                    }
                    captured = true;
                }
                if captured {
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(
                        line_no,
                        raw,
                        Some("set network virtual-router interface"),
                        UnknownReason::ParseError,
                    );
                }
            }
            Some("routing-table") => {
                if tokens.get(2).map(|s| s.as_str()) != Some("ip")
                    || tokens.get(3).map(|s| s.as_str()) != Some("static-route")
                {
                    self.record_unknown(line_no, raw, Some("set network virtual-router"), UnknownReason::UnsupportedKeyword);
                    return;
                }
                let route_name = tokens.get(4).map(|s| strip_quotes(s)).unwrap_or_else(|| "route".to_string());
                if let Some(route) = parse_static_route(&tokens[5..], Some(vrf_name.clone()), Some(route_name)) {
                    self.static_routes.push(route);
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("set network virtual-router static-route"), UnknownReason::ParseError);
                }
            }
            _ => {
                self.record_unknown(line_no, raw, Some("set network virtual-router"), UnknownReason::UnsupportedKeyword);
            }
        }
    }

    fn ensure_interface(&mut self, name: &str, iface_type: &str) -> &mut InterfaceBuf {
        self.interfaces
            .entry(name.to_string())
            .and_modify(|buf| {
                if buf.name.is_empty() {
                    buf.name = name.to_string();
                }
            })
            .or_insert_with(|| InterfaceBuf {
                name: name.to_string(),
                kind: classify_interface(iface_type, name),
                ..InterfaceBuf::default()
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

    fn take_interfaces(&mut self) -> Vec<InterfaceModel> {
        let mut out: Vec<InterfaceModel> = self
            .interfaces
            .values()
            .map(|b| b.to_model())
            .collect();

        let mut children: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
        for iface in &out {
            if let Some(parent) = iface.parent_interface.clone() {
                children.entry(parent).or_default().insert(iface.name.clone());
            }
        }
        for iface in &mut out {
            if let Some(kids) = children.get(&iface.name) {
                iface.child_interfaces = kids.iter().cloned().collect();
            }
        }
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    fn take_vlans(&self) -> Vec<VlanModel> {
        let mut out: Vec<VlanModel> = self
            .vlans
            .iter()
            .map(|(id, vlan)| {
                let mut interfaces: Vec<String> = vlan.interfaces.iter().cloned().collect();
                interfaces.sort();
                VlanModel {
                    id: *id,
                    name: vlan.name.clone(),
                    state: VlanState::Active,
                    interfaces,
                }
            })
            .collect();
        out.sort_by(|a, b| a.id.cmp(&b.id).then(a.name.cmp(&b.name)));
        out
    }

    fn take_vrfs(&self) -> Vec<VrfModel> {
        let mut out: Vec<VrfModel> = self
            .vrfs
            .iter()
            .map(|(name, vrf)| {
                let mut interfaces: Vec<String> = vrf.interfaces.iter().cloned().collect();
                interfaces.sort();
                VrfModel {
                    name: name.clone(),
                    route_distinguisher: None,
                    route_targets_import: Vec::new(),
                    route_targets_export: Vec::new(),
                    interfaces,
                    address_families: Vec::new(),
                }
            })
            .collect();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    fn take_lag_groups(&self) -> Vec<LagGroupModel> {
        let mut out: Vec<LagGroupModel> = self
            .lag_groups
            .iter()
            .map(|(name, lag)| {
                let mut members: Vec<String> = lag.members.iter().cloned().collect();
                members.sort();
                LagGroupModel {
                    name: name.clone(),
                    mode: lag.mode,
                    members,
                    hashing_mode: lag.hashing_mode.clone(),
                    min_links: lag.min_links,
                }
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

    fn take_services(&mut self) -> Vec<ServiceModel> {
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
                    source_interface: buf.source_interface.clone(),
                    vrf: buf.vrf.clone(),
                    authentication_mode: buf.authentication_mode.clone(),
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
            mtu: self.mtu,
            speed_mbps: self.speed_mbps,
            duplex: None,
            l2_mode: self.l2_mode.or_else(|| {
                if self.access_vlan.is_some() || self.vlan_like() {
                    Some(L2Mode::Access)
                } else {
                    None
                }
            }),
            access_vlan: self.access_vlan,
            allowed_vlans: self.allowed_vlans.iter().copied().collect(),
            native_vlan: self.native_vlan,
            vrf: self.vrf.clone(),
            ipv4_addresses: self.ipv4_addresses.clone(),
            ipv6_addresses: self.ipv6_addresses.clone(),
            parent_interface: self.parent_interface.clone(),
            child_interfaces: self.child_interfaces.iter().cloned().collect(),
            lag_membership: self.lag_membership.clone(),
            notes: if notes.is_empty() { None } else { Some(notes.join("; ")) },
        }
    }

    fn vlan_like(&self) -> bool {
        matches!(self.kind, InterfaceKind::Vlan)
    }
}

fn parse_system_ip_address(rest: &str) -> Option<IpAddressModel> {
    let tokens = split_args(rest);
    if tokens.is_empty() {
        return None;
    }
    let address_token = &tokens[0];
    if let Some((address, prefix)) = address_token.split_once('/') {
        let prefix_length = prefix.parse::<u8>().ok()?;
        let family = if address.contains(':') { IpFamily::V6 } else { IpFamily::V4 };
        return Some(IpAddressModel {
            family,
            address: address.to_string(),
            prefix_length,
            secondary: false,
            vrf: None,
        });
    }
    let prefix_length = tokens
        .windows(2)
        .find_map(|w| {
            if w[0].eq_ignore_ascii_case("netmask") {
                mask_to_prefix(&w[1])
            } else {
                None
            }
        })?;
    let family = if address_token.contains(':') { IpFamily::V6 } else { IpFamily::V4 };
    Some(IpAddressModel {
        family,
        address: strip_quotes(address_token),
        prefix_length,
        secondary: false,
        vrf: None,
    })
}

fn parse_ip_spec(tokens: &[String]) -> Option<(IpAddressModel, usize)> {
    let first = tokens.first()?;
    let family = if first.contains(':') { IpFamily::V6 } else { IpFamily::V4 };
    if let Some((address, prefix)) = first.split_once('/') {
        let prefix_length = prefix.parse::<u8>().ok()?;
        return Some((
            IpAddressModel {
                family,
                address: address.to_string(),
                prefix_length,
                secondary: false,
                vrf: None,
            },
            1,
        ));
    }
    if let Some(second) = tokens.get(1) {
        if second.eq_ignore_ascii_case("netmask") {
            let mask = tokens.get(2)?;
            let prefix_length = mask_to_prefix(mask)?;
            return Some((
                IpAddressModel {
                    family,
                    address: strip_quotes(first),
                    prefix_length,
                    secondary: false,
                    vrf: None,
                },
                3,
            ));
        }
        if let Some(prefix_length) = mask_to_prefix(second) {
            return Some((
                IpAddressModel {
                    family,
                    address: strip_quotes(first),
                    prefix_length,
                    secondary: false,
                    vrf: None,
                },
                2,
            ));
        }
    }
    None
}

fn parse_static_route(tokens: &[String], vrf: Option<String>, route_name: Option<String>) -> Option<StaticRouteModel> {
    let mut destination: Option<String> = None;
    let mut next_hops: Vec<String> = Vec::new();
    let mut admin_distance: Option<u32> = None;
    let mut metric: Option<u32> = None;
    let mut tag: Option<u32> = None;
    let mut i = 0usize;

    while i < tokens.len() {
        match tokens[i].as_str() {
            "destination" => {
                if let Some((prefix, consumed)) = parse_prefix_tokens(&tokens[i + 1..]) {
                    destination = Some(prefix);
                    i += consumed + 1;
                    continue;
                }
            }
            "nexthop" => {
                match tokens.get(i + 1).map(|s| s.as_str()) {
                    Some("ip-address") | Some("ipv6-address") => {
                        if let Some(value) = tokens.get(i + 2) {
                            next_hops.push(strip_quotes(value));
                            i += 3;
                            continue;
                        }
                    }
                    Some("interface") => {
                        if let Some(value) = tokens.get(i + 2) {
                            next_hops.push(strip_quotes(value));
                            i += 3;
                            continue;
                        }
                    }
                    _ => {}
                }
            }
            "distance" => {
                if let Some(value) = tokens.get(i + 1).and_then(|v| v.parse::<u32>().ok()) {
                    admin_distance = Some(value);
                    i += 2;
                    continue;
                }
            }
            "metric" => {
                if let Some(value) = tokens.get(i + 1).and_then(|v| v.parse::<u32>().ok()) {
                    metric = Some(value);
                    i += 2;
                    continue;
                }
            }
            "tag" => {
                if let Some(value) = tokens.get(i + 1).and_then(|v| v.parse::<u32>().ok()) {
                    tag = Some(value);
                    i += 2;
                    continue;
                }
            }
            _ => {}
        }
        i += 1;
    }

    let prefix = destination?;
    if next_hops.is_empty() {
        return None;
    }

    Some(StaticRouteModel {
        prefix,
        next_hops,
        admin_distance,
        metric,
        tag,
        vrf,
        name: route_name,
    })
}

fn parse_prefix_tokens(tokens: &[String]) -> Option<(String, usize)> {
    let value = tokens.first()?;
    if let Some((addr, prefix)) = value.split_once('/') {
        let prefix_length = prefix.parse::<u8>().ok()?;
        return Some((format!("{addr}/{prefix_length}"), 1));
    }
    if let Some(mask) = tokens.get(1) {
        if let Some(prefix_length) = mask_to_prefix(mask) {
            return Some((format!("{}/{}", value, prefix_length), 2));
        }
    }
    None
}

fn parse_lag_mode_panos(value: &str) -> Option<LagMode> {
    match value.to_ascii_lowercase().as_str() {
        "active" => Some(LagMode::Active),
        "passive" => Some(LagMode::Passive),
        "static" | "on" => Some(LagMode::Static),
        _ => None,
    }
}

fn service_kind_from_toggle(token: &str) -> Option<ServiceKind> {
    match token {
        "disable-ssh" | "enable-ssh" | "ssh" => Some(ServiceKind::Ssh),
        "disable-snmp" | "enable-snmp" | "snmp" => Some(ServiceKind::Snmp),
        "disable-ntp" | "enable-ntp" | "ntp" => Some(ServiceKind::Ntp),
        "disable-dns" | "enable-dns" | "dns" => Some(ServiceKind::Dns),
        "disable-syslog" | "enable-syslog" | "syslog" => Some(ServiceKind::Syslog),
        "disable-http" | "enable-http" | "http" => Some(ServiceKind::Http),
        "disable-https" | "enable-https" | "https" => Some(ServiceKind::Https),
        "disable-telnet" | "enable-telnet" | "telnet" => Some(ServiceKind::Telnet),
        _ => None,
    }
}

fn is_truthy(s: &str) -> bool {
    matches!(
        s.trim().to_ascii_lowercase().as_str(),
        "yes" | "true" | "on" | "enabled" | "disable" | "disabled" | "1"
    )
}

fn classify_interface(iface_type: &str, name: &str) -> InterfaceKind {
    match iface_type.to_ascii_lowercase().as_str() {
        "ethernet" => InterfaceKind::Physical,
        "aggregate-ethernet" => InterfaceKind::Lag,
        "loopback" => InterfaceKind::Loopback,
        "vlan" => InterfaceKind::Vlan,
        "tunnel" => InterfaceKind::Tunnel,
        "management" => InterfaceKind::Management,
        _ => {
            let lower = name.trim().to_ascii_lowercase();
            if lower.starts_with("ae") {
                InterfaceKind::Lag
            } else if lower.starts_with("vlan") {
                InterfaceKind::Vlan
            } else if lower.starts_with("loopback") {
                InterfaceKind::Loopback
            } else if lower.contains('.') {
                InterfaceKind::SubInterface
            } else {
                InterfaceKind::Unknown
            }
        }
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
            }
            '[' | ']' if !in_quotes => {
                if !buf.is_empty() {
                    out.push(std::mem::take(&mut buf));
                }
                out.push(ch.to_string());
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

fn bracket_list(tokens: &[String]) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut in_brackets = false;
    for token in tokens {
        if token == "[" {
            in_brackets = true;
            continue;
        }
        if token == "]" {
            break;
        }
        if in_brackets {
            out.push(token.clone());
        }
    }
    out
}

fn strip_quotes(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.len() >= 2 && trimmed.starts_with('"') && trimmed.ends_with('"') {
        trimmed[1..trimmed.len() - 1].to_string()
    } else {
        trimmed.trim_matches(['[', ']']).to_string()
    }
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

fn build_platform(mut platform_ref: PlatformRef) -> PlatformRef {
    platform_ref.platform_id = Some("paloalto-panos".to_string());
    if platform_ref.vendor.is_none() {
        platform_ref.vendor = Some("Palo Alto Networks".to_string());
    }
    if platform_ref.os_family.is_none() {
        platform_ref.os_family = Some("PAN-OS".to_string());
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
        let any_ip = state.interfaces.values().any(|b| {
            !b.ipv4_addresses.is_empty() || !b.ipv6_addresses.is_empty()
        });
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
    for kind in [
        ServiceKind::Ssh,
        ServiceKind::Snmp,
        ServiceKind::Ntp,
        ServiceKind::Dns,
        ServiceKind::Syslog,
    ] {
        if !state.services.contains_key(&kind) {
            warnings.push(format!("absent:{}", service_warning_name(kind)));
        }
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

fn service_warning_name(kind: ServiceKind) -> &'static str {
    match kind {
        ServiceKind::Ssh => "services_ssh",
        ServiceKind::Snmp => "services_snmp",
        ServiceKind::Ntp => "services_ntp",
        ServiceKind::Dns => "services_dns",
        ServiceKind::Syslog => "services_syslog",
        ServiceKind::Http => "services_http",
        ServiceKind::Https => "services_https",
        ServiceKind::Telnet => "services_telnet",
        _ => "services_unknown",
    }
}

fn service_rank(kind: ServiceKind) -> u8 {
    match kind {
        ServiceKind::Ssh => 0,
        ServiceKind::Snmp => 1,
        ServiceKind::Ntp => 2,
        ServiceKind::Dns => 3,
        ServiceKind::Syslog => 4,
        ServiceKind::Http => 5,
        ServiceKind::Https => 6,
        ServiceKind::Telnet => 7,
        _ => 99,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pref() -> PlatformRef {
        PlatformRef {
            platform_id: Some("paloalto-panos".to_string()),
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
        assert_eq!(m.platform.platform_id.as_deref(), Some("paloalto-panos"));
        assert!(m.identity.hostname.is_none());
        assert!(m.interfaces.is_empty());
        assert!(m.vrfs.is_empty());
        assert!(m.static_routes.is_empty());
    }

    #[test]
    fn set_format_inventory_is_captured() {
        let cfg = r#"
set deviceconfig system hostname pa-01
set deviceconfig system ip-address 198.51.100.10 netmask 255.255.255.0
set deviceconfig system service disable-ssh no
set deviceconfig system dns-setting servers primary 198.51.100.53 secondary 198.51.100.54
set deviceconfig system ntp-servers primary 198.51.100.100 secondary 198.51.100.101
set deviceconfig system log-settings syslog primary 198.51.100.200
set network interface ethernet ethernet1/1 layer3 ip 198.51.100.1/24
set network interface ethernet ethernet1/2 aggregate-group ae1
set network interface aggregate-ethernet ae1 lacp mode active
set network interface aggregate-ethernet ae1 layer3 ip 203.0.113.1/30
set network interface vlan vlan.10 interface ethernet1/1 tag 10 layer3 ip 192.0.2.10/24
set network virtual-router default interface [ ethernet1/1 ae1 vlan.10 ]
set network virtual-router default routing-table ip static-route default-route destination 0.0.0.0/0 nexthop ip-address 198.51.100.254
"#;
        let m = parse(pref(), cfg);
        assert_eq!(m.identity.hostname.as_deref(), Some("pa-01"));
        assert_eq!(m.identity.management_ips.len(), 1);
        assert!(m.interfaces.iter().any(|i| i.name == "ethernet1/1"));
        assert!(m.interfaces.iter().any(|i| i.name == "ae1"));
        assert!(m.interfaces.iter().any(|i| i.name == "vlan.10"));
        assert_eq!(m.vrfs.len(), 1);
        assert_eq!(m.vrfs[0].name, "default");
        assert_eq!(m.static_routes.len(), 1);
        assert_eq!(m.static_routes[0].prefix, "0.0.0.0/0");
        assert!(m.services.iter().any(|s| s.kind == ServiceKind::Ssh));
        assert!(m.services.iter().any(|s| s.kind == ServiceKind::Dns));
        assert!(m.services.iter().any(|s| s.kind == ServiceKind::Ntp));
        assert!(m.services.iter().any(|s| s.kind == ServiceKind::Syslog));
        assert!(m.unknown_lines.is_empty());
    }

    #[test]
    fn out_of_scope_policy_is_recorded_honestly() {
        let cfg = r#"
set rulebase security rules allow-web from trust to untrust
set network address addr1 ip-netmask 192.0.2.0/24
set shared address corp-net ip-netmask 198.51.100.0/24
"#;
        let m = parse(pref(), cfg);
        assert!(m
            .unknown_lines
            .iter()
            .any(|u| matches!(u.reason, Some(UnknownReason::OutOfScope))));
    }

    #[test]
    fn deterministic_repeated_parse() {
        let cfg = "set deviceconfig system hostname pa-repeat\n";
        let a = parse(pref(), cfg);
        let b = parse(pref(), cfg);
        assert_eq!(a, b);
    }

    #[test]
    fn bracket_lists_split_into_individual_members() {
        let tokens = split_args("default interface [ ethernet1/1 ae1 vlan.10 ]");
        assert_eq!(
            tokens,
            vec![
                "default".to_string(),
                "interface".to_string(),
                "[".to_string(),
                "ethernet1/1".to_string(),
                "ae1".to_string(),
                "vlan.10".to_string(),
                "]".to_string(),
            ]
        );
        let members = bracket_list(&tokens[2..]);
        assert_eq!(
            members,
            vec![
                "ethernet1/1".to_string(),
                "ae1".to_string(),
                "vlan.10".to_string(),
            ]
        );
    }

    #[test]
    fn virtual_router_interface_list_becomes_vrf_members() {
        let cfg = "set network virtual-router default interface [ ethernet1/1 ae1 vlan.10 ]\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.vrfs.len(), 1);
        assert_eq!(m.vrfs[0].name, "default");
        assert_eq!(
            m.vrfs[0].interfaces,
            vec![
                "ae1".to_string(),
                "ethernet1/1".to_string(),
                "vlan.10".to_string(),
            ]
        );
    }
}
