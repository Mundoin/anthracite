//! arista-eos parser — V1N.
//!
//! Distinct module from `cisco_iosxe` per V1N's "do not collapse EOS
//! into IOS/XE" rule. The line-oriented + indent-block architecture is
//! deliberately similar (EOS is Cisco-CLI-derived) but the dispatch
//! tables, vocabulary, and top-level keywords are EOS-specific. See
//! `docs/architecture/EOS_VS_IOSXE_DIVERGENCES.md` for the contract.
//!
//! Determinism guarantees match V1K/V1M:
//!  - `BTreeMap` everywhere in builder paths; `Vec<T>` outputs sorted
//!    by documented keys.
//!  - No floating-point arithmetic except the single rounded
//!    `ParseConfidence.score`.
//!  - No `HashMap` in output-producing paths. No timestamps.
//!  - Never panics; malformed input degrades into `unknown_lines[]` +
//!    `ParseConfidence.warnings`.

pub mod identity;
pub mod interfaces;
pub mod ip_addressing;
pub mod lag;
pub mod lexer;
pub mod services;
pub mod static_routes;
pub mod unknown;
pub mod vlans;
pub mod vrfs;

use std::collections::BTreeMap;

use crate::engines::network_model::{
    DeviceIdentity, DeviceModel, DuplexMode, EvidenceMetadata, EvidenceSourceKind,
    InterfaceAdminState, InterfaceKind, InterfaceModel, InterfaceOperState, IpAddressModel,
    L2Mode, LagGroupModel, LagMode, ParseConfidence, ParserMaturityObserved, PlatformRef,
    ServiceKind, ServiceModel, StaticRouteModel, UnknownConfigLine, UnknownReason, VlanModel,
    VrfModel,
};

use super::context::ParserContext;
use super::normalize;

/// Monotonic per-parser version. Bump per PARSER_VERSIONING.md.
///
/// V1 — V1N initial L1/L2 parser.
/// V2 — V1N-A: `ip virtual-router …` (VARP) and `ip access-list …`
///       blocks now emit `UnknownReason::OutOfScope` (was
///       `UnsupportedKeyword`).
/// V3 — V1Z-A: emits `ServiceKind::Telnet` when the top-level
///      `management telnet` block is present.
pub const PARSER_VERSION: u32 = 3;

const IN_SCOPE_AREAS: &[&str] = &[
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

const OUT_OF_SCOPE_AREAS: &[&str] = &[
    "acls",
    "nat_rules",
    "firewall_zones",
    "tunnels",
    "qos_policies",
    "routing_protocols_ospf",
    "routing_protocols_isis",
    "routing_protocols_eigrp",
    "routing_protocols_bgp",
    "aaa_detail",
    "route_maps",
    "prefix_lists",
    "community_lists",
    "mpls",
    "vxlan",
    "evpn",
    "segment_routing",
    "mlag",
    "management_api",
    "event_handlers",
    "daemons",
    "varp",
];

// =====================================================================
// Internal state
// =====================================================================

#[derive(Debug, Default)]
struct State {
    identity: DeviceIdentity,
    platform: PlatformRef,
    evidence: EvidenceMetadata,
    interfaces: BTreeMap<String, IfaceBuilder>,
    vlans: BTreeMap<u16, vlans::VlanBuilder>,
    vrfs: BTreeMap<String, vrfs::VrfBuilder>,
    static_routes: Vec<StaticRouteModel>,
    ssh: services::SshAccum,
    snmp: services::SnmpAccum,
    ntp: services::NtpAccum,
    dns: services::DnsAccum,
    syslog: services::SyslogAccum,
    telnet: services::TelnetAccum,
    unknown_lines: Vec<UnknownConfigLine>,
    parsed_line_count: u64,
    warnings: Vec<String>,
    saw_end: bool,
    truncated: bool,
}

#[derive(Debug, Default)]
struct IfaceBuilder {
    name: String,
    normalized: String,
    kind: InterfaceKind,
    admin_state: InterfaceAdminState,
    description: Option<String>,
    mtu: Option<u32>,
    speed_mbps: Option<u32>,
    duplex: Option<DuplexMode>,
    l2_mode: Option<L2Mode>,
    access_vlan: Option<u16>,
    native_vlan: Option<u16>,
    allowed_vlans: Vec<u16>,
    vrf: Option<String>,
    ipv4_addresses: Vec<IpAddressModel>,
    ipv6_addresses: Vec<IpAddressModel>,
    parent_interface: Option<String>,
    lag_membership: Option<String>,
    lag_mode: Option<LagMode>,
    notes: Option<String>,
}

impl IfaceBuilder {
    fn new(name: &str) -> Self {
        let kind = interfaces::classify(name);
        let normalized =
            normalize::normalize_cisco(name).unwrap_or_else(|| name.to_string());
        let parent_interface = interfaces::parent_of(name);
        Self {
            name: name.to_string(),
            normalized,
            kind,
            parent_interface,
            ..Self::default()
        }
    }

    fn build(self) -> InterfaceModel {
        let mut allowed = self.allowed_vlans;
        allowed.sort();
        allowed.dedup();
        InterfaceModel {
            name: self.name,
            normalized_name: Some(self.normalized),
            kind: self.kind,
            admin_state: self.admin_state,
            oper_state: InterfaceOperState::Unknown,
            description: self.description,
            mtu: self.mtu,
            speed_mbps: self.speed_mbps,
            duplex: self.duplex,
            l2_mode: self.l2_mode,
            access_vlan: self.access_vlan,
            allowed_vlans: allowed,
            native_vlan: self.native_vlan,
            vrf: self.vrf,
            ipv4_addresses: self.ipv4_addresses,
            ipv6_addresses: self.ipv6_addresses,
            parent_interface: self.parent_interface,
            child_interfaces: Vec::new(),
            lag_membership: self.lag_membership,
            notes: self.notes,
        }
    }
}

// =====================================================================
// Entry point
// =====================================================================

pub fn parse(platform_ref: PlatformRef, config_text: &str) -> DeviceModel {
    let mut st = State::default();
    st.platform = platform_ref;
    st.evidence.parser_version = Some(PARSER_VERSION.to_string());
    st.evidence.byte_size = Some(config_text.len() as u64);
    st.evidence.source_kind = Some(EvidenceSourceKind::ConfigPaste);

    if config_text.trim().is_empty() {
        st.warnings.push("empty_input".to_string());
        for area in OUT_OF_SCOPE_AREAS {
            st.warnings.push(format!("not_in_scope:{area}"));
        }
        st.warnings.sort();
        st.warnings.dedup();
        st.evidence.line_count = Some(0);
        return empty_shell(st);
    }

    let lexed = lexer::lex(config_text);
    st.evidence.line_count = Some(lexed.len() as u64);
    let mut ctx = ParserContext::new();
    walk(&lexed, &mut ctx, &mut st);
    finalize(st)
}

fn empty_shell(st: State) -> DeviceModel {
    DeviceModel {
        identity: st.identity,
        platform: st.platform,
        evidence: st.evidence,
        interfaces: Vec::new(),
        vlans: Vec::new(),
        vrfs: Vec::new(),
        static_routes: Vec::new(),
        routing_protocols: Default::default(),
        acls: Vec::new(),
        firewall_zones: Vec::new(),
        nat_rules: Vec::new(),
        tunnels: Vec::new(),
        qos_policies: Vec::new(),
        lag_groups: Vec::new(),
        services: Vec::new(),
        topology_hints: Vec::new(),
        findings: Vec::new(),
        unknown_lines: Vec::new(),
        parse_confidence: ParseConfidence {
            maturity_observed: Some(ParserMaturityObserved::L2Topology),
            score: Some(0.0),
            parsed_line_count: 0,
            unknown_line_count: 0,
            warnings: st.warnings,
        },
    }
}

// =====================================================================
// Walk + dispatch
// =====================================================================

fn walk(lines: &[lexer::LexedLine], ctx: &mut ParserContext, st: &mut State) {
    for line in lines {
        if st.saw_end {
            if !line.is_skip {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    Some("after end"),
                    UnknownReason::OutOfScope,
                ));
            }
            continue;
        }
        if line.is_skip {
            if line.trimmed.starts_with('!') {
                if st.identity.chassis.is_none() {
                    if let Some(d) = identity::parse_device_marker(&line.trimmed) {
                        st.identity.chassis = Some(d);
                        st.parsed_line_count += 1;
                    }
                }
                if st.platform.os_version_raw.is_none() {
                    if let Some(v) = identity::parse_eos_version_marker(&line.trimmed) {
                        let n = v.clone();
                        st.platform.os_version_raw = Some(v);
                        st.platform.os_version_normalized = Some(n);
                        st.parsed_line_count += 1;
                    }
                }
            }
            continue;
        }

        if line.indent == 0 {
            ctx.clear();
        }

        let (cmd, args) = lexer::split_command(&line.trimmed);

        if line.indent == 0 {
            dispatch_top_level(line, cmd, args, ctx, st);
        } else {
            dispatch_in_block(line, cmd, args, ctx, st);
        }
    }
}

fn dispatch_top_level(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    ctx: &mut ParserContext,
    st: &mut State,
) {
    match cmd {
        "hostname" => {
            if let Some(h) = identity::parse_hostname(args) {
                st.identity.hostname = Some(h);
                st.parsed_line_count += 1;
            }
        }
        "end" => {
            st.saw_end = true;
            st.parsed_line_count += 1;
        }
        "interface" => {
            let name = args.trim();
            if name.is_empty() {
                st.warnings.push("interface_block_no_name".to_string());
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    None,
                    UnknownReason::ParseError,
                ));
                return;
            }
            if !st.interfaces.contains_key(name) {
                st.interfaces
                    .insert(name.to_string(), IfaceBuilder::new(name));
            }
            if matches!(interfaces::classify(name), InterfaceKind::Unknown) {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    None,
                    UnknownReason::UnrecognizedInterfaceForm,
                ));
            }
            ctx.push(format!("interface {name}"), 1);
            st.parsed_line_count += 1;
        }
        "vlan" => {
            if let Some(id) = vlans::parse_vlan_opener(args) {
                if !st.vlans.contains_key(&id) {
                    st.vlans.insert(id, vlans::VlanBuilder::new(id));
                }
                ctx.push(format!("vlan {id}"), 1);
                st.parsed_line_count += 1;
            } else {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    None,
                    UnknownReason::ParseError,
                ));
            }
        }
        "vrf" => {
            // EOS uses `vrf instance NAME`. Anything else is unknown.
            if let Some(name) = vrfs::parse_vrf_instance_opener(args) {
                if !st.vrfs.contains_key(&name) {
                    st.vrfs
                        .insert(name.clone(), vrfs::VrfBuilder::new(name.clone()));
                }
                ctx.push(format!("vrf instance {name}"), 1);
                st.parsed_line_count += 1;
            } else {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    None,
                    UnknownReason::UnsupportedKeyword,
                ));
            }
        }
        "management" => dispatch_management(line, args, ctx, st),
        "ip" => dispatch_ip_top(line, args, ctx, st),
        "ipv6" => dispatch_ipv6_top(line, args, ctx, st),
        "snmp-server" => dispatch_snmp(line, args, st),
        "ntp" => dispatch_ntp(args, st),
        "logging" => dispatch_logging(args, st),
        "no" => {
            st.parsed_line_count += 1;
        }
        "spanning-tree" => {
            // L2 helper, not modelled at L1/L2 maturity. Record and move on.
            st.parsed_line_count += 1;
        }
        other => {
            // Out-of-scope EOS top-level blocks push a sentinel frame so
            // child lines emit `OutOfScope` with the right context.
            if unknown::EOS_OUT_OF_SCOPE_TOP_LEVEL.contains(&other) {
                ctx.push(format!("{other} {args}").trim().to_string(), 1);
                let warn = match other {
                    "mlag" => "not_in_scope:mlag",
                    "daemon" => "not_in_scope:daemons",
                    "event-handler" => "not_in_scope:event_handlers",
                    "router" => "not_in_scope:routing_protocols_block",
                    _ => "",
                };
                if !warn.is_empty() && !st.warnings.iter().any(|w| w == warn) {
                    st.warnings.push(warn.to_string());
                }
                return;
            }
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                unknown::default_reason(),
            ));
        }
    }
}

fn dispatch_management(
    line: &lexer::LexedLine,
    args: &str,
    ctx: &mut ParserContext,
    st: &mut State,
) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
        "ssh" => {
            st.ssh.enabled = true;
            ctx.push("management ssh".to_string(), 1);
            st.parsed_line_count += 1;
        }
        "telnet" => {
            // V1Z-A: `management telnet` enables Telnet management access.
            st.telnet.enabled = true;
            ctx.push("management telnet".to_string(), 1);
            st.parsed_line_count += 1;
        }
        "api" => {
            // `management api http-commands` and friends are out-of-scope.
            ctx.push(format!("management api {rest}").trim().to_string(), 1);
            let w = "not_in_scope:management_api".to_string();
            if !st.warnings.contains(&w) {
                st.warnings.push(w);
            }
        }
        _ => {
            // Other `management <thing>` blocks — record opener, push frame.
            ctx.push(format!("management {args}"), 1);
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                None,
                UnknownReason::UnsupportedKeyword,
            ));
        }
    }
}

fn dispatch_ip_top(
    line: &lexer::LexedLine,
    args: &str,
    ctx: &ParserContext,
    st: &mut State,
) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
        "virtual-router" => {
            // V1N-A: EOS VARP — `ip virtual-router mac-address …` and
            // friends. Classified as out-of-scope at L1/L2.
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                UnknownReason::OutOfScope,
            ));
        }
        "access-list" => {
            // EOS top-level `ip access-list NAME` ACL block opener.
            // Out-of-scope; push a frame so child rules also classify.
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                UnknownReason::OutOfScope,
            ));
        }
        "route" => {
            if let Some(r) = static_routes::parse_ip_route(rest) {
                st.static_routes.push(r);
                st.parsed_line_count += 1;
            } else {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    ctx.path().as_deref(),
                    UnknownReason::ParseError,
                ));
            }
        }
        "name-server" => {
            // `ip name-server vrf NAME ADDR [ADDR ...]` or plain
            let mut toks: Vec<&str> = rest.split_whitespace().collect();
            if toks.first().map(|s| s.eq_ignore_ascii_case("vrf")).unwrap_or(false)
                && toks.len() >= 2
            {
                toks.drain(0..2);
            }
            for srv in toks {
                st.dns.servers.push(srv.to_string());
            }
            st.parsed_line_count += 1;
        }
        "domain-name" => {
            st.dns.domains.push(rest.trim().to_string());
            st.parsed_line_count += 1;
        }
        "domain" => {
            let (sub2, rest2) = lexer::split_command(rest);
            if sub2.eq_ignore_ascii_case("name") || sub2.eq_ignore_ascii_case("list") {
                st.dns.domains.push(rest2.trim().to_string());
                st.parsed_line_count += 1;
            }
        }
        _ => {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                unknown::default_reason(),
            ));
        }
    }
}

fn dispatch_ipv6_top(
    line: &lexer::LexedLine,
    args: &str,
    ctx: &ParserContext,
    st: &mut State,
) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
        "route" => {
            if let Some(r) = static_routes::parse_ipv6_route(rest) {
                st.static_routes.push(r);
                st.parsed_line_count += 1;
            } else {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    ctx.path().as_deref(),
                    UnknownReason::ParseError,
                ));
            }
        }
        _ => {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                unknown::default_reason(),
            ));
        }
    }
}

fn dispatch_snmp(line: &lexer::LexedLine, args: &str, st: &mut State) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
        "community" => {
            if let Some(c) = rest.split_whitespace().next() {
                st.snmp.communities.push(c.to_string());
                st.parsed_line_count += 1;
            }
        }
        "location" => {
            st.snmp.location = Some(rest.trim().to_string());
            st.parsed_line_count += 1;
        }
        "contact" => {
            st.snmp.contact = Some(rest.trim().to_string());
            st.parsed_line_count += 1;
        }
        "host" => {
            if let Some(h) = rest.split_whitespace().next() {
                st.snmp.trap_hosts.push(h.to_string());
                st.parsed_line_count += 1;
            }
        }
        "source-interface" => {
            st.snmp.source_interface = Some(rest.trim().to_string());
            st.parsed_line_count += 1;
        }
        _ => {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                None,
                unknown::default_reason(),
            ));
        }
    }
}

fn dispatch_ntp(args: &str, st: &mut State) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
        "server" => {
            // EOS: `ntp server [vrf NAME] ADDR [...]`
            let mut toks: Vec<&str> = rest.split_whitespace().collect();
            if toks.first().map(|s| s.eq_ignore_ascii_case("vrf")).unwrap_or(false)
                && toks.len() >= 2
            {
                toks.drain(0..2);
            }
            if let Some(s) = toks.first() {
                st.ntp.servers.push(s.to_string());
                st.parsed_line_count += 1;
            }
        }
        "source" => {
            st.ntp.source_interface = Some(rest.trim().to_string());
            st.parsed_line_count += 1;
        }
        _ => {}
    }
}

fn dispatch_logging(args: &str, st: &mut State) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
        "host" => {
            // EOS: `logging host [vrf NAME] ADDR`
            let mut toks: Vec<&str> = rest.split_whitespace().collect();
            if toks.first().map(|s| s.eq_ignore_ascii_case("vrf")).unwrap_or(false)
                && toks.len() >= 2
            {
                toks.drain(0..2);
            }
            if let Some(h) = toks.first() {
                st.syslog.servers.push(h.to_string());
                st.parsed_line_count += 1;
            }
        }
        "trap" => {
            st.syslog.severity = Some(rest.trim().to_string());
            st.parsed_line_count += 1;
        }
        "source-interface" => {
            st.syslog.source_interface = Some(rest.trim().to_string());
            st.parsed_line_count += 1;
        }
        "facility" => {
            st.syslog.facility = Some(rest.trim().to_string());
            st.parsed_line_count += 1;
        }
        _ => {}
    }
}

// =====================================================================
// Block-internal dispatch
// =====================================================================

fn dispatch_in_block(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    ctx: &mut ParserContext,
    st: &mut State,
) {
    let label = ctx.current_label().unwrap_or("").to_string();
    if label.starts_with("interface ") {
        let iface_name = label.trim_start_matches("interface ").to_string();
        handle_interface_line(line, cmd, args, &iface_name, ctx, st);
    } else if label.starts_with("vlan ") {
        let id: u16 = label.trim_start_matches("vlan ").parse().unwrap_or(0);
        handle_vlan_line(line, cmd, args, id, ctx, st);
    } else if label.starts_with("vrf instance ") {
        let vname = label.trim_start_matches("vrf instance ").to_string();
        handle_vrf_line(line, cmd, args, &vname, ctx, st);
    } else if label == "management ssh" {
        handle_management_ssh_line(line, cmd, args, ctx, st);
    } else if label == "management telnet" {
        // V1Z-A: Telnet sub-knobs (idle-timeout, vrf, ip access-group)
        // are not modelled at L1/L2 maturity. Count the line as parsed
        // so the block does not pollute unknown_lines.
        let _ = (cmd, args);
        st.parsed_line_count += 1;
    } else if label.starts_with("management api") {
        // Everything inside `management api …` is out of scope.
        st.unknown_lines.push(unknown::emit(
            line.line_number,
            &line.raw,
            Some(&label),
            UnknownReason::OutOfScope,
        ));
    } else if label.starts_with("router ")
        || label.starts_with("mlag ")
        || label == "mlag configuration"
        || label.starts_with("event-handler ")
        || label.starts_with("daemon ")
    {
        st.unknown_lines.push(unknown::emit(
            line.line_number,
            &line.raw,
            Some(&label),
            UnknownReason::OutOfScope,
        ));
    } else {
        st.unknown_lines.push(unknown::emit(
            line.line_number,
            &line.raw,
            ctx.path().as_deref(),
            unknown::default_reason(),
        ));
    }
}

fn handle_interface_line(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    iface_name: &str,
    ctx: &ParserContext,
    st: &mut State,
) {
    let trimmed = line.trimmed.as_str();
    st.interfaces
        .entry(iface_name.to_string())
        .or_insert_with(|| IfaceBuilder::new(iface_name));

    if let Some(state) = interfaces::admin_state_from_line(trimmed) {
        if let Some(e) = st.interfaces.get_mut(iface_name) {
            e.admin_state = state;
        }
        st.parsed_line_count += 1;
        return;
    }

    match cmd {
        "description" => {
            if let Some(e) = st.interfaces.get_mut(iface_name) {
                e.description = Some(args.to_string());
            }
            st.parsed_line_count += 1;
        }
        "mtu" => {
            let v = interfaces::parse_mtu(args);
            if let Some(e) = st.interfaces.get_mut(iface_name) {
                e.mtu = v;
            }
            st.parsed_line_count += 1;
        }
        "speed" => {
            let v = interfaces::parse_speed(args);
            if let Some(e) = st.interfaces.get_mut(iface_name) {
                e.speed_mbps = v;
            }
            st.parsed_line_count += 1;
        }
        "duplex" => {
            let v = interfaces::parse_duplex(args);
            if let Some(e) = st.interfaces.get_mut(iface_name) {
                e.duplex = v;
            }
            st.parsed_line_count += 1;
        }
        "ip" => handle_iface_ip(line, args, iface_name, ctx, st),
        "ipv6" => handle_iface_ipv6(line, args, iface_name, ctx, st),
        "vrf" => {
            // EOS: `vrf forwarding NAME` (legacy) or `vrf NAME`.
            let (sub, rest) = lexer::split_command(args);
            let n = if sub.eq_ignore_ascii_case("forwarding") {
                rest.trim().to_string()
            } else {
                args.trim().to_string()
            };
            if !n.is_empty() {
                let normalized = st
                    .interfaces
                    .get(iface_name)
                    .map(|e| e.normalized.clone())
                    .unwrap_or_else(|| iface_name.to_string());
                if let Some(e) = st.interfaces.get_mut(iface_name) {
                    e.vrf = Some(n.clone());
                }
                st.vrfs
                    .entry(n.clone())
                    .or_insert_with(|| vrfs::VrfBuilder::new(n.clone()))
                    .interfaces
                    .push(normalized);
                st.parsed_line_count += 1;
            }
        }
        "switchport" => handle_switchport(line, args, iface_name, ctx, st),
        "no" => {
            if args.trim().eq_ignore_ascii_case("switchport") {
                if let Some(e) = st.interfaces.get_mut(iface_name) {
                    e.l2_mode = Some(L2Mode::Routed);
                }
            }
            st.parsed_line_count += 1;
        }
        "channel-group" => {
            if let Some((id, mode)) = lag::parse_channel_group(args) {
                let lname = lag::lag_name(id);
                if let Some(e) = st.interfaces.get_mut(iface_name) {
                    e.lag_membership = Some(lname);
                    e.lag_mode = mode;
                }
                st.parsed_line_count += 1;
            } else {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    ctx.path().as_deref(),
                    UnknownReason::ParseError,
                ));
            }
        }
        _ => {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                unknown::default_reason(),
            ));
        }
    }
}

fn iface_vrf(st: &State, iface_name: &str) -> Option<String> {
    st.interfaces.get(iface_name).and_then(|e| e.vrf.clone())
}

fn iface_normalized(st: &State, iface_name: &str) -> String {
    st.interfaces
        .get(iface_name)
        .map(|e| e.normalized.clone())
        .unwrap_or_else(|| iface_name.to_string())
}

fn handle_iface_ip(
    line: &lexer::LexedLine,
    args: &str,
    iface_name: &str,
    ctx: &ParserContext,
    st: &mut State,
) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
        "virtual-router" => {
            // V1N-A: EOS VARP per-interface — `ip virtual-router
            // address …` etc. Out-of-scope at L1/L2.
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                UnknownReason::OutOfScope,
            ));
        }
        "address" => {
            let vrf = iface_vrf(st, iface_name);
            if let Some(ip) = ip_addressing::parse_ipv4_address_line(rest, vrf.as_deref()) {
                if let Some(e) = st.interfaces.get_mut(iface_name) {
                    e.ipv4_addresses.push(ip);
                }
                st.parsed_line_count += 1;
            } else {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    ctx.path().as_deref(),
                    UnknownReason::ParseError,
                ));
            }
        }
        _ => {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                unknown::default_reason(),
            ));
        }
    }
}

fn handle_iface_ipv6(
    line: &lexer::LexedLine,
    args: &str,
    iface_name: &str,
    ctx: &ParserContext,
    st: &mut State,
) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
        "address" => {
            let vrf = iface_vrf(st, iface_name);
            if let Some(ip) = ip_addressing::parse_ipv6_address_line(rest, vrf.as_deref()) {
                if let Some(e) = st.interfaces.get_mut(iface_name) {
                    e.ipv6_addresses.push(ip);
                }
                st.parsed_line_count += 1;
            } else {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    ctx.path().as_deref(),
                    UnknownReason::ParseError,
                ));
            }
        }
        _ => {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                unknown::default_reason(),
            ));
        }
    }
}

fn handle_switchport(
    line: &lexer::LexedLine,
    args: &str,
    iface_name: &str,
    ctx: &ParserContext,
    st: &mut State,
) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
        "mode" => {
            let mode = interfaces::parse_switchport_mode(rest);
            if let Some(e) = st.interfaces.get_mut(iface_name) {
                e.l2_mode = mode;
            }
            st.parsed_line_count += 1;
        }
        "access" => {
            let (sub2, rest2) = lexer::split_command(rest);
            if sub2.eq_ignore_ascii_case("vlan") {
                let vid_opt = rest2.trim().parse::<u16>().ok();
                let normalized = iface_normalized(st, iface_name);
                if let Some(e) = st.interfaces.get_mut(iface_name) {
                    e.access_vlan = vid_opt;
                }
                if let Some(vid) = vid_opt {
                    st.vlans
                        .entry(vid)
                        .or_insert_with(|| vlans::VlanBuilder::new(vid))
                        .interfaces
                        .push(normalized);
                }
                st.parsed_line_count += 1;
            }
        }
        "trunk" => {
            let (sub2, rest2) = lexer::split_command(rest);
            match sub2.to_ascii_lowercase().as_str() {
                "native" => {
                    let (sub3, rest3) = lexer::split_command(rest2);
                    if sub3.eq_ignore_ascii_case("vlan") {
                        let nv = rest3.trim().parse::<u16>().ok();
                        if let Some(e) = st.interfaces.get_mut(iface_name) {
                            e.native_vlan = nv;
                        }
                        st.parsed_line_count += 1;
                    }
                }
                "allowed" => {
                    let (sub3, rest3) = lexer::split_command(rest2);
                    if sub3.eq_ignore_ascii_case("vlan") {
                        match interfaces::parse_vlan_list(rest3) {
                            Some(vs) => {
                                let normalized = iface_normalized(st, iface_name);
                                for vid in &vs {
                                    st.vlans
                                        .entry(*vid)
                                        .or_insert_with(|| vlans::VlanBuilder::new(*vid))
                                        .interfaces
                                        .push(normalized.clone());
                                }
                                if let Some(e) = st.interfaces.get_mut(iface_name) {
                                    e.allowed_vlans.extend(vs);
                                }
                                st.parsed_line_count += 1;
                            }
                            None => {
                                st.warnings.push(format!(
                                    "trunk_allowed_range_or_modifier_out_of_scope:{}",
                                    rest3.trim()
                                ));
                                st.unknown_lines.push(unknown::emit(
                                    line.line_number,
                                    &line.raw,
                                    ctx.path().as_deref(),
                                    UnknownReason::OutOfScope,
                                ));
                            }
                        }
                    }
                }
                "group" => {
                    // EOS-specific `switchport trunk group NAME` — not modelled at L1/L2.
                    st.warnings
                        .push("eos_trunk_group_out_of_scope".to_string());
                    st.unknown_lines.push(unknown::emit(
                        line.line_number,
                        &line.raw,
                        ctx.path().as_deref(),
                        UnknownReason::OutOfScope,
                    ));
                }
                _ => {
                    st.unknown_lines.push(unknown::emit(
                        line.line_number,
                        &line.raw,
                        ctx.path().as_deref(),
                        unknown::default_reason(),
                    ));
                }
            }
        }
        _ => {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                unknown::default_reason(),
            ));
        }
    }
}

fn handle_vlan_line(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    id: u16,
    ctx: &ParserContext,
    st: &mut State,
) {
    let entry = st
        .vlans
        .entry(id)
        .or_insert_with(|| vlans::VlanBuilder::new(id));
    match cmd {
        "name" => {
            entry.name = vlans::parse_name_line(args);
            st.parsed_line_count += 1;
        }
        "state" => {
            if let Some(s) = vlans::parse_state_line(args) {
                entry.state = s;
                st.parsed_line_count += 1;
            }
        }
        _ => {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                unknown::default_reason(),
            ));
        }
    }
}

fn handle_vrf_line(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    name: &str,
    ctx: &ParserContext,
    st: &mut State,
) {
    let entry = st
        .vrfs
        .entry(name.to_string())
        .or_insert_with(|| vrfs::VrfBuilder::new(name.to_string()));
    match cmd {
        "rd" => {
            entry.route_distinguisher = vrfs::parse_rd(args);
            st.parsed_line_count += 1;
        }
        "route-target" => {
            if let Some((dir, val)) = vrfs::parse_route_target(args) {
                match dir {
                    "import" => entry.route_targets_import.push(val),
                    "export" => entry.route_targets_export.push(val),
                    _ => {}
                }
                st.parsed_line_count += 1;
            } else {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    ctx.path().as_deref(),
                    UnknownReason::ParseError,
                ));
            }
        }
        "description" => {
            // Captured implicitly via builder name; no VrfModel field.
            st.parsed_line_count += 1;
        }
        _ => {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                unknown::default_reason(),
            ));
        }
    }
}

fn handle_management_ssh_line(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    ctx: &ParserContext,
    st: &mut State,
) {
    match cmd {
        "idle-timeout" => {
            if let Ok(n) = args.trim().parse::<u32>() {
                st.ssh.idle_timeout_minutes = Some(n);
                st.parsed_line_count += 1;
            }
        }
        "vrf" => {
            // `vrf MGMT` inside management ssh — VRF that SSH listens on.
            st.ssh.vrf = Some(args.trim().to_string());
            st.parsed_line_count += 1;
        }
        "ip" => {
            // `ip access-group NAME` etc. — out of L1/L2 scope.
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                UnknownReason::OutOfScope,
            ));
        }
        _ => {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                unknown::default_reason(),
            ));
        }
    }
}

// =====================================================================
// Finalize
// =====================================================================

fn finalize(mut st: State) -> DeviceModel {
    if !st.saw_end && st.parsed_line_count > 0 {
        st.truncated = true;
        st.warnings.push("truncated_input".to_string());
    }

    let mut children_by_parent: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for ib in st.interfaces.values() {
        if let Some(parent) = &ib.parent_interface {
            children_by_parent
                .entry(parent.clone())
                .or_default()
                .push(ib.normalized.clone());
        }
    }
    let mut interfaces: Vec<InterfaceModel> = st
        .interfaces
        .into_values()
        .map(IfaceBuilder::build)
        .collect();
    for iface in interfaces.iter_mut() {
        if let Some(kids) = children_by_parent.get(&iface.name) {
            let mut k = kids.clone();
            k.sort();
            k.dedup();
            iface.child_interfaces = k;
        }
    }
    interfaces.sort_by(|a, b| {
        a.normalized_name
            .as_deref()
            .unwrap_or(&a.name)
            .cmp(b.normalized_name.as_deref().unwrap_or(&b.name))
    });

    let mut vlans: Vec<VlanModel> = st.vlans.into_values().map(|b| b.build()).collect();
    vlans.sort_by_key(|v| v.id);

    let mut vrfs: Vec<VrfModel> = st.vrfs.into_values().map(|b| b.build()).collect();
    vrfs.sort_by(|a, b| a.name.cmp(&b.name));

    let mut static_routes = st.static_routes;
    static_routes.sort_by(|a, b| {
        a.prefix
            .cmp(&b.prefix)
            .then(a.vrf.cmp(&b.vrf))
            .then(
                a.next_hops
                    .first()
                    .cloned()
                    .unwrap_or_default()
                    .cmp(&b.next_hops.first().cloned().unwrap_or_default()),
            )
    });

    let mut lag_map: BTreeMap<String, LagGroupModel> = BTreeMap::new();
    for iface in &interfaces {
        if let Some(lname) = &iface.lag_membership {
            let entry = lag_map.entry(lname.clone()).or_insert_with(|| LagGroupModel {
                name: lname.clone(),
                mode: None,
                members: Vec::new(),
                hashing_mode: None,
                min_links: None,
            });
            entry
                .members
                .push(iface.normalized_name.clone().unwrap_or(iface.name.clone()));
        }
    }
    let mut lag_groups: Vec<LagGroupModel> = lag_map.into_values().collect();
    for lg in lag_groups.iter_mut() {
        lg.members.sort();
        lg.members.dedup();
    }
    lag_groups.sort_by(|a, b| {
        let na = a
            .name
            .trim_start_matches("Port-Channel")
            .parse::<u32>()
            .unwrap_or(0);
        let nb = b
            .name
            .trim_start_matches("Port-Channel")
            .parse::<u32>()
            .unwrap_or(0);
        na.cmp(&nb).then(a.name.cmp(&b.name))
    });

    let mut services_out: Vec<ServiceModel> = Vec::new();
    if let Some(s) = st.ssh.build() {
        services_out.push(s);
    }
    services_out.extend(st.snmp.build());
    if let Some(s) = st.ntp.build() {
        services_out.push(s);
    }
    if let Some(s) = st.dns.build() {
        services_out.push(s);
    }
    if let Some(s) = st.syslog.build() {
        services_out.push(s);
    }
    if let Some(s) = st.telnet.build() {
        services_out.push(s);
    }
    services_out.sort_by(|a, b| {
        format!("{:?}", a.kind)
            .cmp(&format!("{:?}", b.kind))
            .then(services::service_identifier(a).cmp(&services::service_identifier(b)))
    });

    let mut mgmt_ips: Vec<IpAddressModel> = Vec::new();
    for iface in &interfaces {
        if matches!(iface.kind, InterfaceKind::Management) {
            for ip in &iface.ipv4_addresses {
                mgmt_ips.push(ip.clone());
            }
        }
    }
    let mut identity = st.identity;
    if identity.management_ips.is_empty() {
        identity.management_ips = mgmt_ips;
    }

    let mut unknown_lines = st.unknown_lines;
    unknown_lines.sort_by_key(|u| u.line_number.unwrap_or(0));

    for area in OUT_OF_SCOPE_AREAS {
        let marker = format!("not_in_scope:{area}");
        if !st.warnings.contains(&marker) {
            st.warnings.push(marker);
        }
    }

    let mut populated = 0u32;
    if identity.hostname.is_some()
        || identity.chassis.is_some()
        || !identity.serial_numbers.is_empty()
        || !identity.management_ips.is_empty()
        || identity.last_change_marker.is_some()
    {
        populated += 1;
    } else {
        st.warnings.push("absent:identity".to_string());
    }
    if st.platform.platform_id.is_some() {
        populated += 1;
    } else {
        st.warnings.push("absent:platform".to_string());
    }
    if !interfaces.is_empty() {
        populated += 1;
    } else {
        st.warnings.push("absent:interfaces".to_string());
    }
    let any_ip = interfaces
        .iter()
        .any(|i| !i.ipv4_addresses.is_empty() || !i.ipv6_addresses.is_empty());
    if any_ip {
        populated += 1;
    } else {
        st.warnings.push("absent:ip_addressing".to_string());
    }
    if !vlans.is_empty() {
        populated += 1;
    } else {
        st.warnings.push("absent:vlans".to_string());
    }
    if !vrfs.is_empty() {
        populated += 1;
    } else {
        st.warnings.push("absent:vrfs".to_string());
    }
    if !static_routes.is_empty() {
        populated += 1;
    } else {
        st.warnings.push("absent:static_routes".to_string());
    }
    if !lag_groups.is_empty() {
        populated += 1;
    } else {
        st.warnings.push("absent:lag_groups".to_string());
    }
    let has = |k: ServiceKind| services_out.iter().any(|s| s.kind == k);
    for (area, kind) in &[
        ("services_ssh", ServiceKind::Ssh),
        ("services_snmp", ServiceKind::Snmp),
        ("services_ntp", ServiceKind::Ntp),
        ("services_dns", ServiceKind::Dns),
        ("services_syslog", ServiceKind::Syslog),
        ("services_telnet", ServiceKind::Telnet),
    ] {
        if has(*kind) {
            populated += 1;
        } else {
            st.warnings.push(format!("absent:{area}"));
        }
    }

    let total = IN_SCOPE_AREAS.len() as u32;
    let raw = (populated as f32) / (total as f32);
    let score_4dp = (raw * 10_000.0).round() / 10_000.0;

    st.warnings.sort();
    st.warnings.dedup();
    let unknown_line_count = unknown_lines.len() as u64;

    DeviceModel {
        identity,
        platform: st.platform,
        evidence: st.evidence,
        interfaces,
        vlans,
        vrfs,
        static_routes,
        routing_protocols: Default::default(),
        acls: Vec::new(),
        firewall_zones: Vec::new(),
        nat_rules: Vec::new(),
        tunnels: Vec::new(),
        qos_policies: Vec::new(),
        lag_groups,
        services: services_out,
        topology_hints: Vec::new(),
        findings: Vec::new(),
        unknown_lines,
        parse_confidence: ParseConfidence {
            maturity_observed: Some(ParserMaturityObserved::L2Topology),
            score: Some(score_4dp),
            parsed_line_count: st.parsed_line_count,
            unknown_line_count,
            warnings: st.warnings,
        },
    }
}

// =====================================================================
// Tests
// =====================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn pref() -> PlatformRef {
        PlatformRef {
            platform_id: Some("arista-eos".to_string()),
            vendor: Some("Arista".to_string()),
            os_family: Some("EOS".to_string()),
            os_version_raw: None,
            os_version_normalized: None,
            detection_confidence: Some(0.9),
        }
    }

    #[test]
    fn empty_input_returns_shell() {
        let m = parse(pref(), "");
        assert_eq!(m.parse_confidence.score, Some(0.0));
        assert!(m
            .parse_confidence
            .warnings
            .contains(&"empty_input".to_string()));
    }

    #[test]
    fn hostname_populates_identity() {
        let m = parse(pref(), "hostname eos-x\nend\n");
        assert_eq!(m.identity.hostname.as_deref(), Some("eos-x"));
    }

    #[test]
    fn vrf_instance_creates_vrf_entry() {
        let m = parse(pref(), "vrf instance MGMT\n   rd 65000:1\nend\n");
        assert_eq!(m.vrfs.len(), 1);
        assert_eq!(m.vrfs[0].name, "MGMT");
        assert_eq!(m.vrfs[0].route_distinguisher.as_deref(), Some("65000:1"));
    }

    #[test]
    fn management_ssh_enables_ssh_service() {
        let m = parse(pref(), "management ssh\n   idle-timeout 30\nend\n");
        assert!(m.services.iter().any(|s| s.kind == ServiceKind::Ssh));
    }

    #[test]
    fn mlag_block_lands_in_unknown_with_out_of_scope_reason() {
        let m = parse(
            pref(),
            "mlag configuration\n   domain-id DC1\n   local-interface Vlan4094\nend\n",
        );
        assert!(m
            .unknown_lines
            .iter()
            .any(|u| u.reason == Some(UnknownReason::OutOfScope)));
        assert!(m
            .parse_confidence
            .warnings
            .iter()
            .any(|w| w == "not_in_scope:mlag"));
    }
}
