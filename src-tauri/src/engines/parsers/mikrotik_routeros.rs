//! MikroTik RouterOS parser — bounded L1/L2 baseline.
//!
//! The first pass covers the RouterOS baseline corpus:
//! system identity, interface basics, bridge/VLAN membership, routed
//! interfaces, static routes, and basic management-plane hints.
//!
//! Comments are treated as comments. Note-only ACL/NAT/QoS/AAA/security/
//! routing markers remain out of the first parser pass and are not
//! converted into structured objects.

use std::collections::{BTreeMap, BTreeSet};

use crate::engines::network_model::{
    DeviceIdentity, DeviceModel, EvidenceMetadata, EvidenceSourceKind, InterfaceAdminState,
    InterfaceKind, InterfaceModel, IpAddressModel, IpFamily, L2Mode, ParseConfidence,
    ParserMaturityObserved, PlatformRef, ServiceKind, ServiceModel, StaticRouteModel,
    UnknownConfigLine, UnknownReason, VlanModel, VlanState,
};

/// Monotonic parser version. Bump when any existing fixture output changes.
pub const PARSER_VERSION: u32 = 1;

/// RouterOS baseline coverage for the first shipped slice.
#[allow(dead_code)]
pub const IN_SCOPE_AREAS: &[&str] = &[
    "identity",
    "platform",
    "interfaces",
    "ip_addressing",
    "vlans",
    "static_routes",
    "services_ssh",
    "services_snmp",
    "services_ntp",
];

const OUT_OF_SCOPE_AREAS: &[&str] = &[
    "aaa_detail",
    "firewall_address_objects",
    "firewall_policy",
    "firewall_service_objects",
    "nat_rules",
    "qos_policies",
    "routing_protocols_bgp",
    "routing_protocols_eigrp",
    "routing_protocols_isis",
    "routing_protocols_ospf",
    "sdwan",
    "services_dns",
    "services_syslog",
    "tunnels",
    "vpn_tunnels",
    "wireless",
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
        management_ips: Vec::new(),
        last_change_marker: None,
    };
    model.platform = platform;
    model.evidence = evidence;
    model.interfaces = state.take_interfaces();
    model.vlans = state.take_vlans();
    model.static_routes = state.take_static_routes();
    model.services = state.take_services();
    model.unknown_lines = state.take_unknown_lines();
    model.parse_confidence = parse_confidence;
    model
}

#[derive(Default)]
struct ParseState {
    hostname: Option<String>,
    interfaces: BTreeMap<String, InterfaceBuf>,
    vlans: BTreeMap<u16, VlanBuf>,
    static_routes: Vec<StaticRouteModel>,
    services: BTreeMap<String, ServiceBuf>,
    unknown_lines: Vec<UnknownConfigLine>,
    parsed_line_count: u64,
}

#[derive(Default)]
struct InterfaceBuf {
    name: String,
    kind: InterfaceKind,
    admin_state: InterfaceAdminState,
    description: Option<String>,
    mtu: Option<u32>,
    speed_mbps: Option<u32>,
    duplex: Option<crate::engines::network_model::DuplexMode>,
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

#[derive(Default)]
struct VlanBuf {
    name: Option<String>,
    interfaces: BTreeSet<String>,
}

#[derive(Default)]
struct ServiceBuf {
    kind: ServiceKind,
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

            if let Some(rest) = trimmed.strip_prefix("/system identity set ") {
                self.parse_system_identity(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("/interface bridge add ") {
                self.parse_interface_bridge_add(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("/interface ethernet set ") {
                self.parse_interface_ethernet_set(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("/interface vlan add ") {
                self.parse_interface_vlan_add(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("/interface bridge port add ") {
                self.parse_bridge_port_add(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("/interface bridge vlan add ") {
                self.parse_bridge_vlan_add(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("/ip address add ") {
                self.parse_ip_address_add(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("/ip route add ") {
                self.parse_ip_route_add(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("/ip service set ") {
                self.parse_ip_service_set(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("/snmp set ") {
                self.parse_snmp_set(line_no, line, rest);
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("/system ntp client set ") {
                self.parse_ntp_client_set(line_no, line, rest);
                continue;
            }

            if is_out_of_scope_top_level(trimmed) {
                self.unknown_lines.push(UnknownConfigLine {
                    source: None,
                    line_number: Some(line_no),
                    raw: line.to_string(),
                    context_path: None,
                    reason: Some(UnknownReason::OutOfScope),
                });
            } else {
                self.unknown_lines.push(UnknownConfigLine {
                    source: None,
                    line_number: Some(line_no),
                    raw: line.to_string(),
                    context_path: None,
                    reason: Some(UnknownReason::UnsupportedKeyword),
                });
            }
        }
    }

    fn parse_system_identity(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = tokenize_routeros(rest);
        if let Some(name) = arg_value(&tokens, "name") {
            self.hostname = Some(name);
            self.parsed_line_count += 1;
        } else {
            self.record_unknown(line_no, raw, Some("/system identity"), UnknownReason::ParseError);
        }
    }

    fn parse_interface_bridge_add(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = tokenize_routeros(rest);
        let Some(name) = arg_value(&tokens, "name") else {
            self.record_unknown(line_no, raw, Some("/interface bridge"), UnknownReason::ParseError);
            return;
        };
        let buf = self.ensure_interface(&name);
        buf.kind = InterfaceKind::Virtual;
        if let Some(vlan_filtering) = arg_value(&tokens, "vlan-filtering") {
            buf.notes.insert(format!("vlan_filtering={vlan_filtering}"));
        }
        if let Some(comment) = arg_value(&tokens, "comment") {
            buf.description = Some(comment);
        }
        self.parsed_line_count += 1;
    }

    fn parse_interface_ethernet_set(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = tokenize_routeros(rest);
        let Some(new_name) = arg_value(&tokens, "name") else {
            self.record_unknown(line_no, raw, Some("/interface ethernet"), UnknownReason::ParseError);
            return;
        };
        let default_name = extract_selector_value(&tokens, "default-name");
        let mut buf = if let Some(old_name) = default_name.as_deref() {
            if old_name != new_name {
                self.interfaces.remove(old_name)
            } else {
                None
            }
        } else {
            None
        }
        .unwrap_or_default();
        buf.name = new_name.clone();
        buf.kind = InterfaceKind::Physical;
        if let Some(old_name) = default_name {
            buf.notes.insert(format!("default_name={old_name}"));
        }
        self.interfaces.insert(new_name, buf);
        self.parsed_line_count += 1;
    }

    fn parse_interface_vlan_add(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = tokenize_routeros(rest);
        let Some(name) = arg_value(&tokens, "name") else {
            self.record_unknown(line_no, raw, Some("/interface vlan"), UnknownReason::ParseError);
            return;
        };
        let Some(parent) = arg_value(&tokens, "interface") else {
            self.record_unknown(line_no, raw, Some("/interface vlan"), UnknownReason::ParseError);
            return;
        };
        let Some(vlan_id) = arg_value(&tokens, "vlan-id").and_then(|v| v.parse::<u16>().ok()) else {
            self.record_unknown(line_no, raw, Some("/interface vlan"), UnknownReason::ParseError);
            return;
        };
        let buf = self.ensure_interface(&name);
        buf.kind = InterfaceKind::Vlan;
        buf.parent_interface = Some(parent.clone());
        buf.l2_mode = Some(L2Mode::Routed);
        buf.access_vlan = Some(vlan_id);
        buf.notes.insert(format!("interface={parent}"));
        buf.notes.insert(format!("vlan_id={vlan_id}"));
        self.ensure_vlan(vlan_id).name = Some(name.clone());
        self.link_vlan_interface(vlan_id, &name);
        self.link_vlan_interface(vlan_id, &parent);
        self.parsed_line_count += 1;
    }

    fn parse_bridge_port_add(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = tokenize_routeros(rest);
        let Some(bridge) = arg_value(&tokens, "bridge") else {
            self.record_unknown(line_no, raw, Some("/interface bridge port"), UnknownReason::ParseError);
            return;
        };
        let Some(member) = arg_value(&tokens, "interface") else {
            self.record_unknown(line_no, raw, Some("/interface bridge port"), UnknownReason::ParseError);
            return;
        };
        let buf = self.ensure_interface(&member);
        buf.parent_interface = Some(bridge.clone());
        buf.notes.insert(format!("bridge={bridge}"));
        if let Some(frame_types) = arg_value(&tokens, "frame-types") {
            buf.notes.insert(format!("frame_types={frame_types}"));
            if frame_types.contains("vlan-tagged") {
                buf.l2_mode = Some(L2Mode::Trunk);
            }
        }
        if let Some(ingress_filtering) = arg_value(&tokens, "ingress-filtering") {
            buf.notes
                .insert(format!("ingress_filtering={ingress_filtering}"));
        }
        if let Some(pvid) = arg_value(&tokens, "pvid").and_then(|v| v.parse::<u16>().ok()) {
            buf.access_vlan = Some(pvid);
            if buf.l2_mode.is_none() {
                buf.l2_mode = Some(L2Mode::Access);
            }
        }
        self.ensure_interface(&bridge);
        self.parsed_line_count += 1;
    }

    fn parse_bridge_vlan_add(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = tokenize_routeros(rest);
        let Some(bridge) = arg_value(&tokens, "bridge") else {
            self.record_unknown(line_no, raw, Some("/interface bridge vlan"), UnknownReason::ParseError);
            return;
        };
        let Some(vlan_ids) = split_csv_u16(arg_value(&tokens, "vlan-ids").as_deref()) else {
            self.record_unknown(line_no, raw, Some("/interface bridge vlan"), UnknownReason::ParseError);
            return;
        };
        let tagged = split_csv(arg_value(&tokens, "tagged").as_deref());
        let untagged = split_csv(arg_value(&tokens, "untagged").as_deref());

        self.ensure_interface(&bridge);

        for vlan_id in vlan_ids {
            self.ensure_vlan(vlan_id).interfaces.insert(bridge.clone());
            for iface in &tagged {
                self.ensure_vlan(vlan_id).interfaces.insert(iface.clone());
                let buf = self.ensure_interface(iface);
                buf.allowed_vlans.insert(vlan_id);
                if buf.l2_mode.is_none() && iface != &bridge {
                    buf.l2_mode = Some(L2Mode::Trunk);
                }
            }
            for iface in &untagged {
                self.ensure_vlan(vlan_id).interfaces.insert(iface.clone());
                let buf = self.ensure_interface(iface);
                if buf.access_vlan.is_none() {
                    buf.access_vlan = Some(vlan_id);
                }
                if buf.l2_mode.is_none() {
                    buf.l2_mode = Some(L2Mode::Access);
                }
            }
        }
        self.parsed_line_count += 1;
    }

    fn parse_ip_address_add(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = tokenize_routeros(rest);
        let Some(address_value) = arg_value(&tokens, "address") else {
            self.record_unknown(line_no, raw, Some("/ip address"), UnknownReason::ParseError);
            return;
        };
        let Some(iface_name) = arg_value(&tokens, "interface") else {
            self.record_unknown(line_no, raw, Some("/ip address"), UnknownReason::ParseError);
            return;
        };
        let Some((address, prefix_length)) = parse_address_and_prefix(&address_value) else {
            self.record_unknown(line_no, raw, Some("/ip address"), UnknownReason::ParseError);
            return;
        };
        let buf = self.ensure_interface(&iface_name);
        if buf.l2_mode.is_none() {
            buf.l2_mode = Some(L2Mode::Routed);
        }
        buf.ipv4_addresses.push(IpAddressModel {
            family: IpFamily::V4,
            address,
            prefix_length,
            secondary: false,
            vrf: None,
        });
        self.parsed_line_count += 1;
    }

    fn parse_ip_route_add(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = tokenize_routeros(rest);
        let Some(dst) = arg_value(&tokens, "dst-address") else {
            self.record_unknown(line_no, raw, Some("/ip route"), UnknownReason::ParseError);
            return;
        };
        let Some(prefix) = parse_prefix(&dst) else {
            self.record_unknown(line_no, raw, Some("/ip route"), UnknownReason::ParseError);
            return;
        };
        let Some(gateway) = arg_value(&tokens, "gateway") else {
            self.record_unknown(line_no, raw, Some("/ip route"), UnknownReason::ParseError);
            return;
        };
        let route = StaticRouteModel {
            prefix,
            next_hops: vec![gateway],
            admin_distance: arg_value(&tokens, "distance").and_then(|v| v.parse::<u32>().ok()),
            metric: arg_value(&tokens, "routing-mark")
                .and_then(|_| None),
            tag: None,
            vrf: None,
            name: None,
        };
        self.static_routes.push(route);
        self.parsed_line_count += 1;
    }

    fn parse_ip_service_set(&mut self, line_no: u64, raw: &str, rest: &str) {
        let tokens = tokenize_routeros(rest);
        if tokens.is_empty() {
            self.record_unknown(line_no, raw, Some("/ip service"), UnknownReason::ParseError);
            return;
        }
        let service_name = tokens[0].as_str();
        match service_name {
            "ssh" => {
                let disabled = arg_value(&tokens[1..], "disabled");
                if disabled.as_deref() == Some("yes") || disabled.as_deref() == Some("true") {
                    self.parsed_line_count += 1;
                    return;
                }
                let service = self.ensure_service("ssh", ServiceKind::Ssh);
                service.notes.insert(
                    arg_value(&tokens[1..], "disabled")
                        .map(|v| format!("disabled={v}"))
                        .unwrap_or_else(|| "disabled=no".to_string()),
                );
                if let Some(port) = arg_value(&tokens[1..], "port") {
                    service.notes.insert(format!("port={port}"));
                }
                self.parsed_line_count += 1;
            }
            "telnet" => {
                let disabled = arg_value(&tokens[1..], "disabled");
                if disabled.as_deref() != Some("yes") && disabled.as_deref() != Some("true") {
                    let service = self.ensure_service("telnet", ServiceKind::Telnet);
                    service.notes.insert(
                        arg_value(&tokens[1..], "disabled")
                            .map(|v| format!("disabled={v}"))
                            .unwrap_or_else(|| "disabled=no".to_string()),
                    );
                }
                self.parsed_line_count += 1;
            }
            other => {
                self.record_unknown(
                    line_no,
                    raw,
                    Some("/ip service"),
                    if other == "api" {
                        UnknownReason::UnsupportedKeyword
                    } else {
                        UnknownReason::OutOfScope
                    },
                );
            }
        }
    }

    fn parse_snmp_set(&mut self, _line_no: u64, _raw: &str, rest: &str) {
        let tokens = tokenize_routeros(rest);
        let enabled = arg_value(&tokens, "enabled").unwrap_or_else(|| "yes".to_string());
        let service = self.ensure_service("snmp", ServiceKind::Snmp);
        service.notes.insert(format!("enabled={enabled}"));
        self.parsed_line_count += 1;
    }

    fn parse_ntp_client_set(&mut self, _line_no: u64, _raw: &str, rest: &str) {
        let tokens = tokenize_routeros(rest);
        let enabled = arg_value(&tokens, "enabled").unwrap_or_else(|| "yes".to_string());
        let service = self.ensure_service("ntp", ServiceKind::Ntp);
        service.notes.insert(format!("enabled={enabled}"));
        if let Some(server) = arg_value(&tokens, "primary-ntp") {
            service.servers.insert(server);
        }
        if let Some(server) = arg_value(&tokens, "secondary-ntp") {
            service.servers.insert(server);
        }
        self.parsed_line_count += 1;
    }

    fn ensure_interface(&mut self, name: &str) -> &mut InterfaceBuf {
        self.interfaces
            .entry(name.to_string())
            .and_modify(|buf| {
                if buf.name.is_empty() {
                    buf.name = name.to_string();
                }
            })
            .or_insert_with(|| InterfaceBuf {
                name: name.to_string(),
                kind: classify_interface(name),
                ..InterfaceBuf::default()
            })
    }

    fn ensure_vlan(&mut self, id: u16) -> &mut VlanBuf {
        self.vlans.entry(id).or_default()
    }

    fn link_vlan_interface(&mut self, id: u16, iface_name: &str) {
        self.vlans
            .entry(id)
            .or_default()
            .interfaces
            .insert(iface_name.to_string());
    }

    fn ensure_service(&mut self, key: &str, kind: ServiceKind) -> &mut ServiceBuf {
        self.services
            .entry(key.to_string())
            .and_modify(|buf| {
                buf.kind = kind;
            })
            .or_insert_with(|| ServiceBuf {
                kind,
                ..ServiceBuf::default()
            })
    }

    fn take_interfaces(&mut self) -> Vec<InterfaceModel> {
        let mut out: Vec<InterfaceModel> = self
            .interfaces
            .values()
            .map(|b| {
                let mut notes: Vec<String> = b.notes.iter().cloned().collect();
                notes.sort();
                InterfaceModel {
                    name: b.name.clone(),
                    normalized_name: None,
                    kind: b.kind,
                    admin_state: b.admin_state,
                    oper_state: Default::default(),
                    description: b.description.clone(),
                    mtu: b.mtu,
                    speed_mbps: b.speed_mbps,
                    duplex: b.duplex,
                    l2_mode: b.l2_mode,
                    access_vlan: b.access_vlan,
                    allowed_vlans: b.allowed_vlans.iter().copied().collect(),
                    native_vlan: b.native_vlan,
                    vrf: b.vrf.clone(),
                    ipv4_addresses: b.ipv4_addresses.clone(),
                    ipv6_addresses: b.ipv6_addresses.clone(),
                    parent_interface: b.parent_interface.clone(),
                    child_interfaces: b.child_interfaces.iter().cloned().collect(),
                    lag_membership: b.lag_membership.clone(),
                    notes: if notes.is_empty() {
                        None
                    } else {
                        Some(notes.join("; "))
                    },
                }
            })
            .collect();

        let mut child_map: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
        for iface in &out {
            if let Some(parent) = &iface.parent_interface {
                child_map
                    .entry(parent.clone())
                    .or_default()
                    .insert(iface.name.clone());
            }
        }
        for iface in &mut out {
            if let Some(children) = child_map.get(&iface.name) {
                iface.child_interfaces = children.iter().cloned().collect();
            }
        }
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    fn take_vlans(&mut self) -> Vec<VlanModel> {
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

    fn take_static_routes(&mut self) -> Vec<StaticRouteModel> {
        let mut out = std::mem::take(&mut self.static_routes);
        out.sort_by(|a, b| a.prefix.cmp(&b.prefix).then_with(|| a.next_hops.cmp(&b.next_hops)));
        out
    }

    fn take_services(&mut self) -> Vec<ServiceModel> {
        let mut out: Vec<ServiceModel> = self
            .services
            .iter()
            .map(|(_, buf)| {
                let mut notes: Vec<String> = buf.notes.iter().cloned().collect();
                notes.sort();
                ServiceModel {
                    kind: buf.kind,
                    servers: buf.servers.iter().cloned().collect(),
                    source_interface: buf.source_interface.clone(),
                    vrf: buf.vrf.clone(),
                    authentication_mode: buf.authentication_mode.clone(),
                    notes: if notes.is_empty() {
                        None
                    } else {
                        Some(notes.join("; "))
                    },
                }
            })
            .collect();
        out.sort_by(|a, b| service_sort_key(a.kind).cmp(&service_sort_key(b.kind)));
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

fn service_sort_key(kind: ServiceKind) -> u8 {
    match kind {
        ServiceKind::Ssh => 0,
        ServiceKind::Snmp => 1,
        ServiceKind::Ntp => 2,
        ServiceKind::Dns => 3,
        ServiceKind::Telnet => 4,
        ServiceKind::Http => 5,
        ServiceKind::Https => 6,
        ServiceKind::Aaa => 7,
        ServiceKind::Tacacs => 8,
        ServiceKind::Radius => 9,
        ServiceKind::Syslog => 10,
        ServiceKind::Unknown => 99,
    }
}

fn classify_interface(name: &str) -> InterfaceKind {
    let lower = name.trim().to_ascii_lowercase();
    if lower.starts_with("vlan") {
        InterfaceKind::Vlan
    } else if lower.starts_with("bridge")
        || lower.starts_with("br-")
        || lower == "br"
        || lower.starts_with("br")
    {
        InterfaceKind::Virtual
    } else if lower.starts_with("loopback") {
        InterfaceKind::Loopback
    } else if lower.starts_with("ether")
        || lower.starts_with("wan")
        || lower.starts_with("lan")
    {
        InterfaceKind::Physical
    } else {
        InterfaceKind::Unknown
    }
}

fn tokenize_routeros(input: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut buf = String::new();
    let mut in_quotes = false;
    let mut bracket_depth = 0usize;

    for ch in input.chars() {
        match ch {
            '"' => {
                in_quotes = !in_quotes;
            }
            '[' if !in_quotes => {
                bracket_depth += 1;
                buf.push(ch);
            }
            ']' if !in_quotes => {
                if bracket_depth > 0 {
                    bracket_depth -= 1;
                }
                buf.push(ch);
            }
            c if c.is_whitespace() && !in_quotes && bracket_depth == 0 => {
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

fn strip_quotes(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.len() >= 2 && trimmed.starts_with('"') && trimmed.ends_with('"') {
        trimmed[1..trimmed.len() - 1].to_string()
    } else {
        trimmed.trim_matches(['[', ']']).to_string()
    }
}

fn arg_value(tokens: &[String], key: &str) -> Option<String> {
    let prefix = format!("{key}=");
    tokens.iter().find_map(|token| {
        token
            .strip_prefix(&prefix)
            .map(strip_quotes)
            .or_else(|| {
                if token.starts_with(&prefix) {
                    Some(strip_quotes(token.strip_prefix(&prefix).unwrap_or("")))
                } else {
                    None
                }
            })
    })
}

fn extract_selector_value(tokens: &[String], key: &str) -> Option<String> {
    let prefix = format!("{key}=");
    tokens.iter().find_map(|token| {
        if let Some(rest) = token.split_whitespace().find_map(|part| part.strip_prefix(&prefix)) {
            Some(strip_quotes(rest))
        } else if let Some(rest) = token.strip_prefix(&prefix) {
            Some(strip_quotes(rest))
        } else {
            None
        }
    })
}

fn split_csv(input: Option<&str>) -> Vec<String> {
    input
        .map(|s| {
            s.split(',')
                .map(strip_quotes)
                .filter(|s| !s.is_empty())
                .collect::<Vec<String>>()
        })
        .unwrap_or_default()
}

fn split_csv_u16(input: Option<&str>) -> Option<Vec<u16>> {
    let values = input?;
    let mut out: Vec<u16> = Vec::new();
    for part in values.split(',') {
        let parsed = strip_quotes(part).parse::<u16>().ok()?;
        out.push(parsed);
    }
    Some(out)
}

fn parse_address_and_prefix(value: &str) -> Option<(String, u8)> {
    let (addr, prefix) = value.split_once('/')?;
    let prefix_length = prefix.parse::<u8>().ok()?;
    Some((addr.to_string(), prefix_length))
}

fn parse_prefix(value: &str) -> Option<String> {
    if let Some((addr, prefix)) = value.split_once('/') {
        let prefix_length = prefix.parse::<u8>().ok()?;
        Some(format!("{addr}/{prefix_length}"))
    } else {
        None
    }
}

fn is_out_of_scope_top_level(line: &str) -> bool {
    const PREFIXES: &[&str] = &[
        "/ip firewall",
        "/queue",
        "/user",
        "/radius",
        "/routing ospf",
        "/routing bgp",
        "/routing filter",
        "/routing rip",
        "/routing ospf instance",
        "/routing id",
        "/routing rule",
        "/routing table",
        "/ipv6",
        "/interface wireless",
        "/interface lte",
        "/interface pppoe-client",
        "/interface pptp-client",
        "/interface l2tp-client",
        "/interface gre",
        "/interface vlan add" /* handled above */,
    ];

    PREFIXES.iter().any(|prefix| {
        if *prefix == "/interface vlan add" {
            false
        } else {
            line.starts_with(prefix)
        }
    })
}

fn build_platform(mut platform_ref: PlatformRef) -> PlatformRef {
    platform_ref.platform_id = Some("mikrotik-routeros".to_string());
    if platform_ref.vendor.is_none() {
        platform_ref.vendor = Some("MikroTik".to_string());
    }
    if platform_ref.os_family.is_none() {
        platform_ref.os_family = Some("RouterOS".to_string());
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
        let any_ipv4 = state.interfaces.values().any(|b| !b.ipv4_addresses.is_empty());
        if !any_ipv4 {
            warnings.push("absent:ip_addressing".to_string());
        }
    }
    if state.vlans.is_empty() {
        warnings.push("absent:vlans".to_string());
    }
    if state.static_routes.is_empty() {
        warnings.push("absent:static_routes".to_string());
    }
    if !state.services.contains_key("ssh") {
        warnings.push("absent:services_ssh".to_string());
    }
    if !state.services.contains_key("snmp") {
        warnings.push("absent:services_snmp".to_string());
    }
    if !state.services.contains_key("ntp") {
        warnings.push("absent:services_ntp".to_string());
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

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn pref() -> PlatformRef {
        PlatformRef {
            platform_id: Some("mikrotik-routeros".to_string()),
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
        assert_eq!(m.platform.platform_id.as_deref(), Some("mikrotik-routeros"));
        assert_eq!(m.platform.vendor.as_deref(), Some("MikroTik"));
        assert!(m.interfaces.is_empty());
        assert!(m.vlans.is_empty());
        assert!(m.static_routes.is_empty());
        assert!(m.services.is_empty());
        assert!(m.unknown_lines.is_empty());
    }

    #[test]
    fn system_identity_is_captured() {
        let cfg = "/system identity set name=ros-core-001\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.identity.hostname.as_deref(), Some("ros-core-001"));
    }

    #[test]
    fn ethernet_renames_become_physical_interfaces() {
        let cfg = "/interface ethernet set [ find default-name=ether1 ] name=wan1\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.interfaces.len(), 1);
        let iface = &m.interfaces[0];
        assert_eq!(iface.name, "wan1");
        assert_eq!(iface.kind, InterfaceKind::Physical);
        assert!(iface.notes.as_deref().unwrap_or("").contains("default_name=ether1"));
    }

    #[test]
    fn bridge_and_vlan_interfaces_are_modelled() {
        let cfg = "/interface bridge add name=bridge-lan vlan-filtering=yes\n/interface vlan add name=vlan10 interface=bridge-lan vlan-id=10\n";
        let m = parse(pref(), cfg);
        let bridge = m.interfaces.iter().find(|iface| iface.name == "bridge-lan").unwrap();
        assert_eq!(bridge.kind, InterfaceKind::Virtual);
        assert!(bridge.notes.as_deref().unwrap_or("").contains("vlan_filtering=yes"));
        let vlan = m.interfaces.iter().find(|iface| iface.name == "vlan10").unwrap();
        assert_eq!(vlan.kind, InterfaceKind::Vlan);
        assert_eq!(vlan.parent_interface.as_deref(), Some("bridge-lan"));
        assert_eq!(vlan.access_vlan, Some(10));
        assert_eq!(m.vlans.len(), 1);
        assert_eq!(m.vlans[0].id, 10);
        assert!(m.vlans[0].interfaces.contains(&"bridge-lan".to_string()));
        assert!(m.vlans[0].interfaces.contains(&"vlan10".to_string()));
    }

    #[test]
    fn bridge_port_membership_sets_access_and_trunk_modes() {
        let cfg = "/interface bridge add name=br-core vlan-filtering=yes\n/interface ethernet set [ find default-name=ether1 ] name=trunk1\n/interface ethernet set [ find default-name=ether2 ] name=access1\n/interface bridge port add bridge=br-core interface=trunk1 frame-types=admit-only-vlan-tagged ingress-filtering=yes\n/interface bridge port add bridge=br-core interface=access1 pvid=10\n/interface bridge vlan add bridge=br-core tagged=br-core,trunk1 vlan-ids=10,20,30\n/interface bridge vlan add bridge=br-core untagged=access1 vlan-ids=10\n";
        let m = parse(pref(), cfg);
        let trunk = m.interfaces.iter().find(|iface| iface.name == "trunk1").unwrap();
        assert_eq!(trunk.l2_mode, Some(L2Mode::Trunk));
        assert!(trunk.allowed_vlans.contains(&10));
        assert!(trunk.allowed_vlans.contains(&20));
        assert!(trunk.allowed_vlans.contains(&30));
        let access = m.interfaces.iter().find(|iface| iface.name == "access1").unwrap();
        assert_eq!(access.l2_mode, Some(L2Mode::Access));
        assert_eq!(access.access_vlan, Some(10));
        let bridge = m.interfaces.iter().find(|iface| iface.name == "br-core").unwrap();
        assert!(bridge.allowed_vlans.contains(&10));
        assert!(bridge.allowed_vlans.contains(&20));
        assert!(bridge.allowed_vlans.contains(&30));
        assert!(bridge.child_interfaces.contains(&"trunk1".to_string()));
        assert!(bridge.child_interfaces.contains(&"access1".to_string()));
    }

    #[test]
    fn ip_addresses_and_static_routes_parse() {
        let cfg = "/interface ethernet set [ find default-name=ether1 ] name=wan1\n/ip address add address=198.51.100.2/30 interface=wan1\n/ip route add dst-address=0.0.0.0/0 gateway=198.51.100.1 distance=10\n";
        let m = parse(pref(), cfg);
        let iface = m.interfaces.iter().find(|iface| iface.name == "wan1").unwrap();
        assert_eq!(iface.ipv4_addresses.len(), 1);
        assert_eq!(iface.ipv4_addresses[0].address, "198.51.100.2");
        assert_eq!(iface.ipv4_addresses[0].prefix_length, 30);
        assert_eq!(m.static_routes.len(), 1);
        assert_eq!(m.static_routes[0].prefix, "0.0.0.0/0");
        assert_eq!(m.static_routes[0].next_hops, vec!["198.51.100.1".to_string()]);
        assert_eq!(m.static_routes[0].admin_distance, Some(10));
    }

    #[test]
    fn services_are_captured() {
        let cfg = "/ip service set ssh disabled=no port=22\n/snmp set enabled=yes\n/system ntp client set enabled=yes primary-ntp=192.0.2.53\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.services.len(), 3);
        assert!(m.services.iter().any(|s| s.kind == ServiceKind::Ssh));
        assert!(m.services.iter().any(|s| s.kind == ServiceKind::Snmp));
        assert!(m.services.iter().any(|s| s.kind == ServiceKind::Ntp));
    }

    #[test]
    fn api_line_is_kept_as_evidence() {
        let cfg = "/ip service set api disabled=yes\n";
        let m = parse(pref(), cfg);
        assert_eq!(m.unknown_lines.len(), 1);
        assert_eq!(m.unknown_lines[0].reason, Some(UnknownReason::UnsupportedKeyword));
    }

    #[test]
    fn note_only_comments_do_not_create_evidence() {
        let cfg = "# note-only: acl markers would include /ip firewall filter.\n# note-only: nat markers would include /ip firewall nat.\n";
        let m = parse(pref(), cfg);
        assert!(m.unknown_lines.is_empty());
        assert!(m.interfaces.is_empty());
        assert!(m.vlans.is_empty());
    }

    #[test]
    fn warnings_are_sorted_and_deduped() {
        let m = parse(pref(), "/system identity set name=x\n");
        let mut sorted = m.parse_confidence.warnings.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(m.parse_confidence.warnings, sorted);
    }

    #[test]
    fn deterministic_repeated_parse() {
        let cfg = "/system identity set name=ros-core-001\n/interface bridge add name=bridge-lan vlan-filtering=yes\n/interface ethernet set [ find default-name=ether1 ] name=wan1\n/interface vlan add name=vlan10 interface=bridge-lan vlan-id=10\n/ip address add address=198.51.100.2/30 interface=wan1\n/ip route add dst-address=0.0.0.0/0 gateway=198.51.100.1\n/ip service set ssh disabled=no port=22\n/snmp set enabled=yes\n/system ntp client set enabled=yes primary-ntp=192.0.2.53\n";
        let a = parse(pref(), cfg);
        let b = parse(pref(), cfg);
        assert_eq!(a, b);
    }
}
