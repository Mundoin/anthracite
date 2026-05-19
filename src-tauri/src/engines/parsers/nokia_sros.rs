//! Nokia SR OS parser — V1 first pass.
//!
//! Conservative coverage for the current common bar: identity,
//! interfaces, IP addressing, VLANs, VRFs, LAG groups, static routes,
//! and basic management-plane services. Policy / MPLS / VPN / routing
//! protocol content stays as honest evidence rather than being promoted
//! into structured objects.

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
    "policy_options",
    "qos_policies",
    "routing_protocols_bgp",
    "routing_protocols_isis",
    "routing_protocols_ospf",
    "tunnels",
    "vpn_tunnels",
    "mpls",
    "service_vpls",
    "service_epipe",
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
    name: Option<String>,
    route_distinguisher: Option<String>,
    route_targets_import: BTreeSet<String>,
    route_targets_export: BTreeSet<String>,
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
            if matches!(trimmed, "commit" | "exit" | "exit all" | "quit") {
                self.parsed_line_count += 1;
                continue;
            }

            let tokens = split_args(trimmed);
            if tokens.is_empty() {
                continue;
            }

            if is_out_of_scope(&tokens) {
                self.record_unknown(line_no, line, Some("nokia-sros out-of-scope"), UnknownReason::OutOfScope);
                continue;
            }

            if tokens[0] == "configure" {
                let handled = match tokens.get(1).map(|s| s.as_str()) {
                    Some("system") => self.handle_system(line_no, line, &tokens),
                    Some("port") => self.handle_port(line_no, line, &tokens),
                    Some("lag") => self.handle_lag(line_no, line, &tokens),
                    Some("vlan") => self.handle_vlan(line_no, line, &tokens),
                    Some("router") => self.handle_router(line_no, line, &tokens),
                    Some("service") => self.handle_service(line_no, line, &tokens),
                    Some("log") => self.handle_log(line_no, line, &tokens),
                    _ => false,
                };
                if handled {
                    continue;
                }
            }

            self.record_unknown(line_no, line, Some("nokia-sros"), UnknownReason::UnsupportedKeyword);
        }
    }

    fn handle_system(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 3 {
            self.record_unknown(line_no, raw, Some("configure system"), UnknownReason::ParseError);
            return true;
        }

        match tokens[2].as_str() {
            "name" => {
                if let Some(name) = tokens.get(3) {
                    self.hostname = Some(clean_token(name));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("configure system name"), UnknownReason::ParseError);
                }
                true
            }
            "version" => {
                if let Some(ver) = tokens.get(3) {
                    self.version = Some(clean_token(ver));
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("configure system version"), UnknownReason::ParseError);
                }
                true
            }
            "security" => {
                if tokens.iter().any(|t| t.eq_ignore_ascii_case("ssh")) {
                    self.ensure_service(ServiceKind::Ssh);
                    self.parsed_line_count += 1;
                    return true;
                }
                if tokens.iter().any(|t| t.eq_ignore_ascii_case("snmp")) {
                    self.ensure_service(ServiceKind::Snmp);
                    self.parsed_line_count += 1;
                    return true;
                }
                self.record_unknown(line_no, raw, Some("configure system security"), UnknownReason::UnsupportedKeyword);
                true
            }
            "snmp" => {
                self.ensure_service(ServiceKind::Snmp);
                self.parsed_line_count += 1;
                true
            }
            "time" => {
                if tokens.iter().any(|t| t.eq_ignore_ascii_case("ntp")) {
                    self.ensure_service(ServiceKind::Ntp);
                    if let Some(server) = tokens
                        .iter()
                        .position(|t| t.eq_ignore_ascii_case("server"))
                        .and_then(|idx| tokens.get(idx + 1))
                    {
                        self.ensure_service(ServiceKind::Ntp)
                            .servers
                            .insert(clean_token(server));
                    }
                    self.parsed_line_count += 1;
                    return true;
                }
                self.record_unknown(line_no, raw, Some("configure system time"), UnknownReason::UnsupportedKeyword);
                true
            }
            "name-server" | "dns" => {
                self.ensure_service(ServiceKind::Dns);
                if let Some(addr) = tokens.get(3) {
                    self.ensure_service(ServiceKind::Dns)
                        .servers
                        .insert(clean_token(addr));
                }
                self.parsed_line_count += 1;
                true
            }
            "management-interface" => {
                if tokens.iter().any(|t| t.eq_ignore_ascii_case("address")) {
                    if let Some((ip, _)) = parse_ip_address(&tokens[3..]) {
                        self.management_ips.push(ip);
                        self.parsed_line_count += 1;
                    } else {
                        self.record_unknown(line_no, raw, Some("configure system management-interface"), UnknownReason::ParseError);
                    }
                    return true;
                }
                self.record_unknown(line_no, raw, Some("configure system management-interface"), UnknownReason::UnsupportedKeyword);
                true
            }
            _ => false,
        }
    }

    fn handle_log(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.iter().any(|t| t.eq_ignore_ascii_case("syslog")) {
            self.ensure_service(ServiceKind::Syslog);
            if let Some(server) = tokens
                .iter()
                .position(|t| t.eq_ignore_ascii_case("server") || t.eq_ignore_ascii_case("host"))
                .and_then(|idx| tokens.get(idx + 1))
            {
                self.ensure_service(ServiceKind::Syslog)
                    .servers
                    .insert(clean_token(server));
            }
            self.parsed_line_count += 1;
            return true;
        }
        self.record_unknown(line_no, raw, Some("configure log"), UnknownReason::UnsupportedKeyword);
        true
    }

    fn handle_port(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 3 {
            self.record_unknown(line_no, raw, Some("configure port"), UnknownReason::ParseError);
            return true;
        }

        let iface_name = clean_token(&tokens[2]);
        let kind = classify_interface(&iface_name);
        let mut captured = false;
        let mut idx = 3usize;

        while idx < tokens.len() {
            match tokens[idx].as_str() {
                "description" | "comment" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        {
                            let buf = self.ensure_interface(&iface_name, kind);
                            buf.description = Some(clean_token(value));
                        }
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "admin-state" | "state" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        {
                            let buf = self.ensure_interface(&iface_name, kind);
                            buf.admin_state = match value.to_ascii_lowercase().as_str() {
                                "enable" | "enabled" | "up" => InterfaceAdminState::Up,
                                "disable" | "disabled" | "down" => InterfaceAdminState::Down,
                                _ => InterfaceAdminState::Unknown,
                            };
                        }
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "address" | "ip" => {
                    if let Some((ip, consumed)) = parse_ip_address(&tokens[idx + 1..]) {
                        let family = ip.family;
                        {
                            let buf = self.ensure_interface(&iface_name, kind);
                            match family {
                                IpFamily::V4 => buf.ipv4_addresses.push(ip),
                                IpFamily::V6 => buf.ipv6_addresses.push(ip),
                            }
                            buf.l2_mode = Some(L2Mode::Routed);
                        }
                        idx += consumed + 1;
                        captured = true;
                        continue;
                    }
                }
                "vrf" | "routing-instance" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        let vrf_name = clean_token(value);
                        {
                            let buf = self.ensure_interface(&iface_name, kind);
                            buf.vrf = Some(vrf_name.clone());
                        }
                        self.ensure_vrf(&vrf_name);
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "lag" | "aggregate-group" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        let lag_name = normalize_lag_name(&clean_token(value));
                        {
                            let buf = self.ensure_interface(&iface_name, kind);
                            buf.lag_membership = Some(lag_name.clone());
                        }
                        self.ensure_lag(&lag_name).members.insert(iface_name.clone());
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "mode" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        {
                            let buf = self.ensure_interface(&iface_name, kind);
                            match value.to_ascii_lowercase().as_str() {
                                "access" => buf.l2_mode = Some(L2Mode::Access),
                                "trunk" => buf.l2_mode = Some(L2Mode::Trunk),
                                "routed" => buf.l2_mode = Some(L2Mode::Routed),
                                other => {
                                    let _ = buf.notes.insert(format!("mode={other}"));
                                }
                            }
                        }
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "vlan" | "vlan-id" | "access-vlan" => {
                    if let Some(value) = tokens.get(idx + 1).and_then(|v| v.parse::<u16>().ok()) {
                        {
                            let buf = self.ensure_interface(&iface_name, kind);
                            buf.access_vlan = Some(value);
                            buf.l2_mode = Some(L2Mode::Access);
                        }
                        self.ensure_vlan(value).interfaces.insert(iface_name.clone());
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "allowed-vlans" | "tagged-vlans" => {
                    let vlans = parse_vlan_id_list(&tokens[idx + 1..]);
                    if !vlans.is_empty() {
                        for vlan_id in vlans {
                            {
                                let buf = self.ensure_interface(&iface_name, kind);
                                buf.allowed_vlans.insert(vlan_id);
                                buf.l2_mode = Some(L2Mode::Trunk);
                            }
                            self.ensure_vlan(vlan_id).interfaces.insert(iface_name.clone());
                        }
                        captured = true;
                    }
                    idx = tokens.len();
                    continue;
                }
                "mtu" => {
                    if let Some(value) = tokens.get(idx + 1).and_then(|v| v.parse::<u32>().ok()) {
                        {
                            let buf = self.ensure_interface(&iface_name, kind);
                            buf.notes.insert(format!("mtu={value}"));
                        }
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                other => {
                    {
                        let buf = self.ensure_interface(&iface_name, kind);
                        buf.notes.insert(other.to_string());
                    }
                    idx += 1;
                    continue;
                }
            }
            idx += 1;
        }

        {
            let buf = self.ensure_interface(&iface_name, kind);
            if buf.access_vlan.is_some() && buf.l2_mode.is_none() {
                buf.l2_mode = Some(L2Mode::Access);
            }
            if !buf.allowed_vlans.is_empty() && buf.l2_mode.is_none() {
                buf.l2_mode = Some(L2Mode::Trunk);
            }
        }

        if captured {
            self.parsed_line_count += 1;
        } else {
            self.record_unknown(line_no, raw, Some("configure port"), UnknownReason::UnsupportedKeyword);
        }
        true
    }

    fn handle_lag(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 3 {
            self.record_unknown(line_no, raw, Some("configure lag"), UnknownReason::ParseError);
            return true;
        }

        let lag_name = normalize_lag_name(&clean_token(&tokens[2]));
        let mut captured = false;
        let mut idx = 3usize;

        while idx < tokens.len() {
            match tokens[idx].as_str() {
                "mode" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        self.ensure_lag(&lag_name).mode = parse_lag_mode(value);
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "port" | "member" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        let member = clean_token(value);
                        self.ensure_lag(&lag_name).members.insert(member.clone());
                        self.ensure_interface(&member, classify_interface(&member))
                            .lag_membership = Some(lag_name.clone());
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "hash-mode" | "hash" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        self.ensure_lag(&lag_name).hashing_mode = Some(clean_token(value));
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "min-links" => {
                    if let Some(value) = tokens.get(idx + 1).and_then(|v| v.parse::<u16>().ok()) {
                        self.ensure_lag(&lag_name).min_links = Some(value);
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                _ => {
                    idx += 1;
                    continue;
                }
            }
            idx += 1;
        }

        if captured {
            self.parsed_line_count += 1;
        } else {
            self.record_unknown(line_no, raw, Some("configure lag"), UnknownReason::UnsupportedKeyword);
        }
        true
    }

    fn handle_vlan(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 3 {
            self.record_unknown(line_no, raw, Some("configure vlan"), UnknownReason::ParseError);
            return true;
        }

        let Ok(vlan_id) = tokens[2].parse::<u16>() else {
            self.record_unknown(line_no, raw, Some("configure vlan"), UnknownReason::ParseError);
            return true;
        };
        let mut captured = false;
        let mut idx = 3usize;

        while idx < tokens.len() {
            match tokens[idx].as_str() {
                "name" | "description" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        self.ensure_vlan(vlan_id).name = Some(clean_token(value));
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "port" | "interface" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        let iface_name = clean_token(value);
                        self.ensure_vlan(vlan_id).interfaces.insert(iface_name.clone());
                        {
                            let buf = self.ensure_interface(&iface_name, classify_interface(&iface_name));
                            if buf.access_vlan.is_none() {
                                buf.access_vlan = Some(vlan_id);
                            }
                            if buf.l2_mode.is_none() {
                                buf.l2_mode = Some(L2Mode::Access);
                            }
                        }
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                _ => {
                    idx += 1;
                    continue;
                }
            }
            idx += 1;
        }

        if captured {
            self.parsed_line_count += 1;
        } else {
            self.record_unknown(line_no, raw, Some("configure vlan"), UnknownReason::UnsupportedKeyword);
        }
        true
    }

    fn handle_router(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 4 {
            self.record_unknown(line_no, raw, Some("configure router"), UnknownReason::ParseError);
            return true;
        }

        let vrf_key = clean_token(&tokens[2]);
        let mut captured = false;
        let mut idx = 3usize;

        while idx < tokens.len() {
            match tokens[idx].as_str() {
                "name" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        self.ensure_vrf(&vrf_key).name = Some(clean_token(value));
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "interface" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        let iface_name = clean_token(value);
                        {
                            self.ensure_vrf(&vrf_key).interfaces.insert(iface_name.clone());
                        }
                        let vrf_label = self.vrf_label(&vrf_key);
                        {
                            let buf = self.ensure_interface(&iface_name, classify_interface(&iface_name));
                            buf.vrf = Some(vrf_label);
                        }
                        if tokens.get(idx + 2).map(|t| t.as_str()) == Some("address") {
                            if let Some((ip, consumed)) = parse_ip_address(&tokens[idx + 3..]) {
                                let family = ip.family;
                                {
                                    let buf = self.ensure_interface(&iface_name, classify_interface(&iface_name));
                                    match family {
                                        IpFamily::V4 => buf.ipv4_addresses.push(ip),
                                        IpFamily::V6 => buf.ipv6_addresses.push(ip),
                                    }
                                }
                                self.ensure_vrf(&vrf_key)
                                    .address_families
                                    .insert(match family {
                                        IpFamily::V4 => "ipv4-unicast",
                                        IpFamily::V6 => "ipv6-unicast",
                                    }
                                    .to_string());
                                idx += consumed + 3;
                                captured = true;
                                continue;
                            }
                        }
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "static-route" => {
                    let vrf_label = self.vrf_label(&vrf_key);
                    if let Some((route, consumed)) = parse_static_route(&tokens[idx + 1..], Some(vrf_label)) {
                        self.static_routes.push(route);
                        self.ensure_vrf(&vrf_key)
                            .address_families
                            .insert("ipv4-unicast".to_string());
                        idx += consumed + 1;
                        captured = true;
                        continue;
                    }
                }
                "route-distinguisher" | "rd" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        self.ensure_vrf(&vrf_key).route_distinguisher = Some(clean_token(value));
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                "route-target" => {
                    if let (Some(direction), Some(value)) = (tokens.get(idx + 1), tokens.get(idx + 2)) {
                        let target = clean_token(value);
                        let vrf = self.ensure_vrf(&vrf_key);
                        match direction.to_ascii_lowercase().as_str() {
                            "import" => {
                                let _ = vrf.route_targets_import.insert(target);
                            }
                            "export" => {
                                let _ = vrf.route_targets_export.insert(target);
                            }
                            _ => {}
                        }
                        idx += 3;
                        captured = true;
                        continue;
                    }
                }
                "address-family" => {
                    if let Some(value) = tokens.get(idx + 1) {
                        self.ensure_vrf(&vrf_key).address_families.insert(clean_token(value));
                        idx += 2;
                        captured = true;
                        continue;
                    }
                }
                _ => {
                    idx += 1;
                    continue;
                }
            }
            idx += 1;
        }

        if captured {
            self.parsed_line_count += 1;
        } else {
            self.record_unknown(line_no, raw, Some("configure router"), UnknownReason::UnsupportedKeyword);
        }
        true
    }

    fn handle_service(&mut self, line_no: u64, raw: &str, tokens: &[String]) -> bool {
        if tokens.len() < 3 {
            self.record_unknown(line_no, raw, Some("configure service"), UnknownReason::ParseError);
            return true;
        }

        match tokens[2].as_str() {
            "vprn" => {
                if tokens.len() < 4 {
                    self.record_unknown(line_no, raw, Some("configure service vprn"), UnknownReason::ParseError);
                    return true;
                }
                let vrf_key = format!("vprn-{}", clean_token(&tokens[3]));
                let mut captured = false;
                let mut idx = 4usize;
                self.ensure_vrf(&vrf_key)
                    .address_families
                    .insert("ipv4-unicast".to_string());
                while idx < tokens.len() {
                    match tokens[idx].as_str() {
                        "name" => {
                            if let Some(value) = tokens.get(idx + 1) {
                                self.ensure_vrf(&vrf_key).name = Some(clean_token(value));
                                idx += 2;
                                captured = true;
                                continue;
                            }
                        }
                        "interface" => {
                            if let Some(value) = tokens.get(idx + 1) {
                                let iface_name = clean_token(value);
                                {
                                    self.ensure_vrf(&vrf_key).interfaces.insert(iface_name.clone());
                                }
                                let vrf_label = self.vrf_label(&vrf_key);
                                {
                                    let buf = self.ensure_interface(&iface_name, classify_interface(&iface_name));
                                    buf.vrf = Some(vrf_label);
                                }
                                if tokens.get(idx + 2).map(|t| t.as_str()) == Some("address") {
                                    if let Some((ip, consumed)) = parse_ip_address(&tokens[idx + 3..]) {
                                        let family = ip.family;
                                        {
                                            let buf = self.ensure_interface(&iface_name, classify_interface(&iface_name));
                                            match family {
                                                IpFamily::V4 => buf.ipv4_addresses.push(ip),
                                                IpFamily::V6 => buf.ipv6_addresses.push(ip),
                                            }
                                        }
                                        idx += consumed + 3;
                                        captured = true;
                                        continue;
                                    }
                                }
                                idx += 2;
                                captured = true;
                                continue;
                            }
                        }
                        "static-route" => {
                            let vrf_label = self.vrf_label(&vrf_key);
                            if let Some((route, consumed)) = parse_static_route(&tokens[idx + 1..], Some(vrf_label)) {
                                self.static_routes.push(route);
                                idx += consumed + 1;
                                captured = true;
                                continue;
                            }
                        }
                        "route-distinguisher" | "rd" => {
                            if let Some(value) = tokens.get(idx + 1) {
                                self.ensure_vrf(&vrf_key).route_distinguisher = Some(clean_token(value));
                                idx += 2;
                                captured = true;
                                continue;
                            }
                        }
                        "route-target" => {
                            if let (Some(direction), Some(value)) = (tokens.get(idx + 1), tokens.get(idx + 2)) {
                                let target = clean_token(value);
                                let vrf = self.ensure_vrf(&vrf_key);
                                match direction.to_ascii_lowercase().as_str() {
                                    "import" => {
                                        let _ = vrf.route_targets_import.insert(target);
                                    }
                                    "export" => {
                                        let _ = vrf.route_targets_export.insert(target);
                                    }
                                    _ => {}
                                }
                                idx += 3;
                                captured = true;
                                continue;
                            }
                        }
                        _ => {
                            idx += 1;
                            continue;
                        }
                    }
                    idx += 1;
                }
                if captured {
                    self.parsed_line_count += 1;
                } else {
                    self.record_unknown(line_no, raw, Some("configure service vprn"), UnknownReason::UnsupportedKeyword);
                }
                true
            }
            "vpls" | "epipe" | "ies" => {
                self.record_unknown(line_no, raw, Some("configure service"), UnknownReason::OutOfScope);
                true
            }
            _ => false,
        }
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
            .map(|(id, buf)| VlanModel {
                id: *id,
                name: buf.name.clone(),
                state: VlanState::Active,
                interfaces: {
                    let mut interfaces: Vec<String> = buf.interfaces.iter().cloned().collect();
                    interfaces.sort();
                    interfaces
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
            .map(|(key, buf)| VrfModel {
                name: buf.name.clone().unwrap_or_else(|| key.clone()),
                route_distinguisher: buf.route_distinguisher.clone(),
                route_targets_import: {
                    let mut vals: Vec<String> = buf.route_targets_import.iter().cloned().collect();
                    vals.sort();
                    vals
                },
                route_targets_export: {
                    let mut vals: Vec<String> = buf.route_targets_export.iter().cloned().collect();
                    vals.sort();
                    vals
                },
                interfaces: {
                    let mut vals: Vec<String> = buf.interfaces.iter().cloned().collect();
                    vals.sort();
                    vals
                },
                address_families: {
                    let mut vals: Vec<String> = buf.address_families.iter().cloned().collect();
                    vals.sort();
                    vals
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
            .map(|(name, buf)| {
                let mut members: Vec<String> = buf.members.iter().cloned().collect();
                members.sort();
                LagGroupModel {
                    name: name.clone(),
                    mode: buf.mode,
                    members,
                    hashing_mode: buf.hashing_mode.clone(),
                    min_links: buf.min_links,
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

    fn ensure_vrf(&mut self, key: &str) -> &mut VrfBuf {
        self.vrfs.entry(key.to_string()).or_default()
    }

    fn ensure_lag(&mut self, name: &str) -> &mut LagBuf {
        self.lag_groups.entry(name.to_string()).or_default()
    }

    fn ensure_service(&mut self, kind: ServiceKind) -> &mut ServiceBuf {
        self.services.entry(kind).or_default()
    }

    fn vrf_label(&self, key: &str) -> String {
        self.vrfs
            .get(key)
            .and_then(|v| v.name.clone())
            .unwrap_or_else(|| key.to_string())
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

fn is_out_of_scope(tokens: &[String]) -> bool {
    let joined = tokens.join(" ").to_ascii_lowercase();
    let prefixes = [
        "configure router bgp",
        "configure router ospf",
        "configure router isis",
        "configure policy-options",
        "configure qos",
        "configure firewall",
        "configure nat",
        "configure vpn",
        "configure tunnel",
        "configure mpls",
        "configure service vpls",
        "configure service epipe",
        "configure service ies",
    ];
    prefixes.iter().any(|p| joined.starts_with(p))
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
    if lower.starts_with("lag-")
        || lower.starts_with("lag")
        || lower.starts_with("a-")
        || lower.starts_with("bond")
    {
        InterfaceKind::Lag
    } else if lower.starts_with("vlan") {
        InterfaceKind::Vlan
    } else if lower.starts_with("loopback") || lower.starts_with("lo") {
        InterfaceKind::Loopback
    } else if lower.starts_with("mgmt") || lower.starts_with("management") {
        InterfaceKind::Management
    } else if lower.starts_with("to-") {
        InterfaceKind::Virtual
    } else if lower.contains('.') {
        InterfaceKind::SubInterface
    } else if lower.contains('/') || lower.starts_with("eth") || lower.starts_with("port") {
        InterfaceKind::Physical
    } else {
        InterfaceKind::Unknown
    }
}

fn normalize_lag_name(name: &str) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        "lag-unknown".to_string()
    } else if trimmed.chars().all(|c| c.is_ascii_digit()) {
        format!("lag-{trimmed}")
    } else {
        trimmed.to_string()
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
            c if c.is_whitespace() && !in_quotes => {
                if !buf.is_empty() {
                    out.push(std::mem::take(&mut buf));
                }
            }
            ';' if !in_quotes => {
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
    token
        .trim()
        .trim_matches('"')
        .trim_matches(';')
        .to_string()
}

fn parse_ip_address(tokens: &[String]) -> Option<(IpAddressModel, usize)> {
    let first = tokens.first()?;
    let family = if first.contains(':') { IpFamily::V6 } else { IpFamily::V4 };
    if let Some((address, prefix)) = first.split_once('/') {
        let prefix_length = prefix.parse::<u8>().ok()?;
        return Some((
            IpAddressModel {
                family,
                address: clean_token(address),
                prefix_length,
                secondary: false,
                vrf: None,
            },
            1,
        ));
    }
    if let Some(mask) = tokens.get(1) {
        if let Some(prefix_length) = mask_to_prefix(mask) {
            return Some((
                IpAddressModel {
                    family,
                    address: clean_token(first),
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

fn parse_static_route(tokens: &[String], vrf: Option<String>) -> Option<(StaticRouteModel, usize)> {
    let prefix = parse_prefix(tokens)?;
    let consumed = prefix.1;
    let mut idx = consumed;
    let mut next_hops: Vec<String> = Vec::new();
    while idx < tokens.len() {
        match tokens[idx].as_str() {
            "next-hop" | "nexthop" => {
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
        return None;
    }
    Some((
        StaticRouteModel {
            prefix: prefix.0,
            next_hops,
            admin_distance: None,
            metric: None,
            tag: None,
            vrf,
            name: None,
        },
        idx,
    ))
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
    let mut out: Vec<u16> = Vec::new();
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

fn parse_lag_mode(value: &str) -> Option<LagMode> {
    match value.to_ascii_lowercase().as_str() {
        "active" | "dynamic" => Some(LagMode::Active),
        "passive" => Some(LagMode::Passive),
        "static" | "on" => Some(LagMode::Static),
        _ => None,
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
    platform_ref.platform_id = Some("nokia-sros".to_string());
    if platform_ref.vendor.is_none() {
        platform_ref.vendor = Some("Nokia".to_string());
    }
    if platform_ref.os_family.is_none() {
        platform_ref.os_family = Some("SR OS".to_string());
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
    if state.static_routes.is_empty() {
        warnings.push("absent:static_routes".to_string());
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
            platform_id: Some("nokia-sros".to_string()),
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
        assert_eq!(m.platform.platform_id.as_deref(), Some("nokia-sros"));
        assert!(m.identity.hostname.is_none());
        assert!(m.interfaces.is_empty());
        assert!(m.vrfs.is_empty());
        assert!(m.static_routes.is_empty());
    }

    #[test]
    fn hostname_and_services_parse() {
        let cfg = r#"
configure system name "sros-01"
configure system security ssh admin-state enable
configure system snmp admin-state enable
configure system time ntp server 192.0.2.100
configure system name-server 192.0.2.53
configure log log-id 99 destination syslog server 192.0.2.200
"#;
        let m = parse(pref(), cfg);
        assert_eq!(m.identity.hostname.as_deref(), Some("sros-01"));
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
configure port 1/1/1 description "uplink" admin-state enable address 198.51.100.2/30 lag lag-1
configure port 1/1/2 admin-state enable
configure port 1/1/3 admin-state enable
configure lag lag-1 mode active port 1/1/2 port 1/1/3 hash-mode src-dst-ip min-links 2
configure vlan 10 name "users" port 1/1/1
configure router Base interface to-core address 10.0.0.1/30
configure router Base static-route 0.0.0.0/0 next-hop 10.0.0.2
configure service vprn 100 name CUST-A route-distinguisher 65000:100
configure service vprn 100 interface to-cust address 192.0.2.1/30
configure service vprn 100 static-route 192.0.2.0/24 next-hop 192.0.2.2
"#;
        let m = parse(pref(), cfg);
        assert!(m.interfaces.iter().any(|i| i.name == "1/1/1"));
        assert_eq!(m.vlans.len(), 1);
        assert_eq!(m.vlans[0].id, 10);
        assert_eq!(m.vrfs.len(), 2);
        assert!(m.vrfs.iter().any(|v| v.name == "Base"));
        assert!(m.vrfs.iter().any(|v| v.name == "CUST-A"));
        assert_eq!(m.lag_groups.len(), 1);
        assert_eq!(m.static_routes.len(), 2);
        assert!(m.interfaces.iter().any(|i| i.lag_membership.as_deref() == Some("lag-1")));
    }

    #[test]
    fn out_of_scope_commands_are_recorded_honestly() {
        let cfg = r#"
configure router bgp 65000
configure service vpls 200
configure policy-options policy-statement EXPORT
"#;
        let m = parse(pref(), cfg);
        assert!(m
            .unknown_lines
            .iter()
            .any(|u| matches!(u.reason, Some(UnknownReason::OutOfScope))));
    }

    #[test]
    fn deterministic_repeated_parse() {
        let cfg = "configure system name sros-repeat\nconfigure port 1/1/1 admin-state enable\n";
        let a = parse(pref(), cfg);
        let b = parse(pref(), cfg);
        assert_eq!(a, b);
    }
}
