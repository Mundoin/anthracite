//! cisco-iosxe parser — V1K.
//!
//! Per V1K PROPOSAL §4.1/§4.2:
//!  - Three passes: lex → section dispatch → cross-link.
//!  - `ParserContext` stack tracks active config block.
//!  - All `Vec<T>` outputs sorted by documented keys.
//!  - No `HashMap` in output-producing paths (`BTreeMap` everywhere).
//!  - No float arithmetic except the single rounded `ParseConfidence.score`.
//!  - Never panics; malformed / truncated / mismatched input degrades
//!    gracefully into `unknown_lines[]` + `ParseConfidence.warnings`.

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
    DeviceIdentity, DeviceModel, EvidenceMetadata, EvidenceSourceKind, InterfaceAdminState,
    InterfaceKind, InterfaceModel, InterfaceOperState, IpAddressModel, L2Mode,
    LagGroupModel, LagMode, ParseConfidence, ParserMaturityObserved, PlatformRef, ServiceModel,
    StaticRouteModel, UnknownConfigLine, UnknownReason, VlanModel, VrfModel,
};

use super::context::ParserContext;
use super::normalize;

/// Monotonic parser version. Bump per [`PARSER_VERSIONING.md`](../../../../../docs/architecture/PARSER_VERSIONING.md).
pub const PARSER_VERSION: u32 = 1;

/// V1K coverage area list. Order matches
/// [`PARSER_COVERAGE_AREAS.md`](../../../../../docs/architecture/PARSER_COVERAGE_AREAS.md).
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
];

// =====================================================================
// Internal state
// =====================================================================

#[derive(Debug, Default)]
struct ParserState {
    identity: DeviceIdentity,
    platform: PlatformRef,
    evidence: EvidenceMetadata,
    interfaces: BTreeMap<String, IfaceBuilder>, // keyed by vendor-native name
    vlans: BTreeMap<u16, vlans::VlanBuilder>,
    vrfs: BTreeMap<String, vrfs::VrfBuilder>,
    static_routes: Vec<StaticRouteModel>,
    ssh: services::SshAccum,
    snmp: services::SnmpAccum,
    ntp: services::NtpAccum,
    dns: services::DnsAccum,
    syslog: services::SyslogAccum,
    unknown_lines: Vec<UnknownConfigLine>,
    parsed_line_count: u64,
    warnings: Vec<String>,
    truncated: bool,
    saw_end: bool,
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
    duplex: Option<crate::engines::network_model::DuplexMode>,
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
            child_interfaces: Vec::new(), // filled in cross-link pass
            lag_membership: self.lag_membership,
            notes: self.notes,
        }
    }
}

// =====================================================================
// Entry point
// =====================================================================

/// Parse a cisco-iosxe config blob. Returns a populated `DeviceModel`.
/// Never panics.
pub fn parse(platform_ref: PlatformRef, config_text: &str) -> DeviceModel {
    let mut st = ParserState::default();
    st.platform = platform_ref;

    // EvidenceMetadata first.
    st.evidence.parser_version = Some(PARSER_VERSION.to_string());
    st.evidence.byte_size = Some(config_text.len() as u64);
    st.evidence.source_kind = Some(EvidenceSourceKind::ConfigPaste);

    let trimmed_input = config_text.trim();
    if trimmed_input.is_empty() {
        // Proposal §3.3: empty/whitespace-only input returns an empty
        // shell with score = 0.0 and warnings = [empty_input].
        st.warnings.push("empty_input".to_string());
        for area in OUT_OF_SCOPE_AREAS {
            st.warnings.push(format!("not_in_scope:{area}"));
        }
        st.warnings.sort();
        st.warnings.dedup();
        st.evidence.line_count = Some(0);
        return DeviceModel {
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
        };
    }

    let lexed = lexer::lex(config_text);
    st.evidence.line_count = Some(lexed.len() as u64);

    let mut ctx = ParserContext::new();
    walk(&lexed, &mut ctx, &mut st);

    finalize(st)
}

// =====================================================================
// Walk + dispatch
// =====================================================================

fn walk(lines: &[lexer::LexedLine], ctx: &mut ParserContext, st: &mut ParserState) {
    let mut last_block_indent: Option<usize> = None;
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

        // Identity/chassis/serial/last-change from comment lines BEFORE skip.
        if line.is_skip {
            if line.trimmed.starts_with('!') {
                if st.identity.chassis.is_none() {
                    if let Some(c) = identity::parse_chassis_marker(&line.trimmed) {
                        st.identity.chassis = Some(c);
                        st.parsed_line_count += 1;
                    }
                }
                if let Some(s) = identity::parse_serial_marker(&line.trimmed) {
                    if !st.identity.serial_numbers.contains(&s) {
                        st.identity.serial_numbers.push(s);
                        st.parsed_line_count += 1;
                    }
                }
                if st.identity.last_change_marker.is_none() {
                    if let Some(m) = identity::parse_last_change_marker(&line.trimmed) {
                        st.identity.last_change_marker = Some(m);
                        st.parsed_line_count += 1;
                    }
                }
            }
            continue;
        }

        // De-indent: pop frames whose indent >= current line's indent.
        if line.indent == 0 {
            ctx.clear();
            last_block_indent = None;
        } else if let Some(bi) = last_block_indent {
            if line.indent <= bi {
                // Same-level lines in the block are still inside it.
                // Don't pop on equal indent for the first child level.
            }
        }

        let (cmd, args) = lexer::split_command(&line.trimmed);

        if line.indent == 0 {
            // Top-level dispatch.
            dispatch_top_level(line, cmd, args, ctx, st);
            if ctx.depth() > 0 {
                last_block_indent = Some(ctx.current().map(|f| f.indent).unwrap_or(0));
            } else {
                last_block_indent = None;
            }
        } else {
            // Block-internal dispatch by current frame.
            dispatch_in_block(line, cmd, args, ctx, st);
        }
    }
}

fn dispatch_top_level(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    ctx: &mut ParserContext,
    st: &mut ParserState,
) {
    let trimmed = line.trimmed.as_str();
    match cmd {
        "hostname" => {
            if let Some(h) = identity::parse_hostname(args) {
                st.identity.hostname = Some(h);
                st.parsed_line_count += 1;
            }
        }
        "version" => {
            if let Some(v) = identity::parse_version(args) {
                let normalized = v.clone();
                st.platform.os_version_raw = Some(v);
                st.platform.os_version_normalized = Some(normalized);
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
            // Create or reuse interface entry.
            if !st.interfaces.contains_key(name) {
                st.interfaces
                    .insert(name.to_string(), IfaceBuilder::new(name));
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
            // `vrf definition NAME`
            let mut toks = args.split_whitespace();
            let head = toks.next().unwrap_or("").to_ascii_lowercase();
            if head == "definition" {
                let name = toks.collect::<Vec<_>>().join(" ");
                if let Some(n) = vrfs::parse_vrf_opener(&name) {
                    if !st.vrfs.contains_key(&n) {
                        st.vrfs.insert(n.clone(), vrfs::VrfBuilder::new(n.clone()));
                    }
                    ctx.push(format!("vrf definition {n}"), 1);
                    st.parsed_line_count += 1;
                    return;
                }
            }
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                None,
                UnknownReason::UnsupportedKeyword,
            ));
        }
        "line" => {
            // `line vty 0 4` → push frame; we only care about exec-timeout inside.
            ctx.push(format!("line {args}"), 1);
            st.parsed_line_count += 1;
        }
        "ip" => dispatch_ip_top(line, args, ctx, st),
        "ipv6" => dispatch_ipv6_top(line, args, ctx, st),
        "snmp-server" => dispatch_snmp(line, args, st),
        "ntp" => dispatch_ntp(args, st),
        "logging" => dispatch_logging(args, st),
        "no" => {
            // `no ip domain lookup` etc. — treat as parsed acknowledgement.
            st.parsed_line_count += 1;
        }
        "router" => {
            // Out-of-scope routing-protocol block. Push a sentinel frame
            // so child lines fall through cleanly.
            ctx.push(format!("router {args}"), 1);
            st.warnings
                .push(format!("not_in_scope:routing_protocols_block"));
        }
        _ => {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                ctx.path().as_deref(),
                unknown::default_reason(),
            ));
            let _ = trimmed;
        }
    }
}

fn dispatch_ip_top(
    line: &lexer::LexedLine,
    args: &str,
    ctx: &ParserContext,
    st: &mut ParserState,
) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
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
            for srv in rest.split_whitespace() {
                st.dns.servers.push(srv.to_string());
            }
            st.parsed_line_count += 1;
        }
        "domain-name" => {
            st.dns.domains.push(rest.trim().to_string());
            st.parsed_line_count += 1;
        }
        "domain" => {
            // `ip domain name X` or `ip domain list X`
            let (sub2, rest2) = lexer::split_command(rest);
            if sub2.eq_ignore_ascii_case("name") || sub2.eq_ignore_ascii_case("list") {
                st.dns.domains.push(rest2.trim().to_string());
                st.parsed_line_count += 1;
            }
        }
        "ssh" => {
            let (sub2, rest2) = lexer::split_command(rest);
            match sub2.to_ascii_lowercase().as_str() {
                "version" => {
                    st.ssh.version = Some(rest2.trim().to_string());
                    st.parsed_line_count += 1;
                }
                "time-out" => {
                    if let Ok(n) = rest2.trim().parse::<u32>() {
                        st.ssh.idle_timeout_seconds = Some(n);
                        st.parsed_line_count += 1;
                    }
                }
                "source-interface" => {
                    st.ssh.source_interface = Some(rest2.trim().to_string());
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
        "default-gateway" => {
            // Silent-decision V1K: ip default-gateway recorded as a
            // parsed acknowledgement only; mgmt IPs come from the
            // Management interface block.
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

fn dispatch_ipv6_top(
    line: &lexer::LexedLine,
    args: &str,
    ctx: &ParserContext,
    st: &mut ParserState,
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

fn dispatch_snmp(line: &lexer::LexedLine, args: &str, st: &mut ParserState) {
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
            // Form: `snmp-server source-interface IFACE`
            st.snmp.source_interface = Some(rest.trim().to_string());
            st.parsed_line_count += 1;
        }
        _ => {
            // Unknown snmp-server subcommand — record as unknown,
            // service area still considered touched if any prior subcommand fired.
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                None,
                unknown::default_reason(),
            ));
        }
    }
}

fn dispatch_ntp(args: &str, st: &mut ParserState) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
        "server" => {
            if let Some(s) = rest.split_whitespace().next() {
                st.ntp.servers.push(s.to_string());
                st.parsed_line_count += 1;
            }
        }
        "source" => {
            st.ntp.source_interface = Some(rest.trim().to_string());
            st.parsed_line_count += 1;
        }
        _ => {
            // ignored / unknown
        }
    }
}

fn dispatch_logging(args: &str, st: &mut ParserState) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
        "host" => {
            if let Some(h) = rest.split_whitespace().next() {
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
        _ => {
            // ignored / unknown
        }
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
    st: &mut ParserState,
) {
    let label = ctx.current_label().unwrap_or("").to_string();
    if label.starts_with("interface ") {
        let iface_name = label.trim_start_matches("interface ").to_string();
        handle_interface_line(line, cmd, args, &iface_name, ctx, st);
    } else if label.starts_with("vlan ") {
        let id: u16 = label
            .trim_start_matches("vlan ")
            .parse()
            .unwrap_or(0);
        handle_vlan_line(line, cmd, args, id, ctx, st);
    } else if label.starts_with("vrf definition ") {
        let vname = label.trim_start_matches("vrf definition ").to_string();
        handle_vrf_line(line, cmd, args, &vname, ctx, st);
    } else if label.starts_with("address-family ") {
        // Nested under vrf definition. Find parent vrf in context.
        let af = label.trim_start_matches("address-family ").to_string();
        // Parent frame should be a vrf definition.
        let parent_vrf = ctx
            .parent()
            .and_then(|p| p.label.strip_prefix("vrf definition ").map(|s| s.to_string()));
        if let Some(vname) = parent_vrf {
            handle_vrf_af_line(line, cmd, args, &vname, &af, ctx, st);
        } else {
            st.unknown_lines.push(unknown::emit(
                line.line_number,
                &line.raw,
                Some(&label),
                unknown::default_reason(),
            ));
        }
    } else if label.starts_with("line ") {
        handle_line_block(line, cmd, args, ctx, st);
    } else if label.starts_with("router ") {
        // Out-of-scope routing-protocol block content.
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

// =====================================================================
// Interface block
// =====================================================================

fn handle_interface_line(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    iface_name: &str,
    ctx: &ParserContext,
    st: &mut ParserState,
) {
    let trimmed = line.trimmed.as_str();
    // Ensure entry exists once; subsequent operations re-borrow.
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
            // `vrf forwarding NAME`
            let (sub, rest) = lexer::split_command(args);
            if sub.eq_ignore_ascii_case("forwarding") {
                let n = rest.trim().to_string();
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
            } else {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    ctx.path().as_deref(),
                    unknown::default_reason(),
                ));
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

fn iface_vrf(st: &ParserState, iface_name: &str) -> Option<String> {
    st.interfaces.get(iface_name).and_then(|e| e.vrf.clone())
}

fn iface_normalized(st: &ParserState, iface_name: &str) -> String {
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
    st: &mut ParserState,
) {
    let (sub, rest) = lexer::split_command(args);
    match sub.to_ascii_lowercase().as_str() {
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
        "vrf" => {
            // `ip vrf forwarding NAME`
            let (sub2, rest2) = lexer::split_command(rest);
            if sub2.eq_ignore_ascii_case("forwarding") {
                let n = rest2.trim().to_string();
                if !n.is_empty() {
                    let normalized = iface_normalized(st, iface_name);
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
    st: &mut ParserState,
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
    st: &mut ParserState,
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
            // `access vlan N`
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

// =====================================================================
// VLAN block
// =====================================================================

fn handle_vlan_line(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    id: u16,
    ctx: &ParserContext,
    st: &mut ParserState,
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

// =====================================================================
// VRF blocks
// =====================================================================

fn handle_vrf_line(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    name: &str,
    ctx: &mut ParserContext,
    st: &mut ParserState,
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
        "address-family" => {
            if let Some(af) = vrfs::parse_address_family(args) {
                entry.address_families.push(af.clone());
                ctx.push(format!("address-family {af}"), 2);
                st.parsed_line_count += 1;
            } else {
                st.unknown_lines.push(unknown::emit(
                    line.line_number,
                    &line.raw,
                    ctx.path().as_deref(),
                    UnknownReason::OutOfScope,
                ));
            }
        }
        "route-target" => {
            // Some IOS configs allow route-target directly under vrf definition
            // (legacy `ip vrf` style). Capture under default ipv4-unicast.
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

fn handle_vrf_af_line(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    vrf_name: &str,
    _af: &str,
    ctx: &ParserContext,
    st: &mut ParserState,
) {
    let entry = st
        .vrfs
        .entry(vrf_name.to_string())
        .or_insert_with(|| vrfs::VrfBuilder::new(vrf_name.to_string()));
    match cmd {
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
// line vty block (for SSH idle-timeout)
// =====================================================================

fn handle_line_block(
    line: &lexer::LexedLine,
    cmd: &str,
    args: &str,
    ctx: &ParserContext,
    st: &mut ParserState,
) {
    match cmd {
        "exec-timeout" => {
            // `exec-timeout MIN SEC` — convert to seconds, only set if unset.
            let mut toks = args.split_whitespace();
            let mins: u32 = toks.next().and_then(|t| t.parse().ok()).unwrap_or(0);
            let secs: u32 = toks.next().and_then(|t| t.parse().ok()).unwrap_or(0);
            let total = mins.saturating_mul(60).saturating_add(secs);
            if st.ssh.idle_timeout_seconds.is_none() {
                st.ssh.idle_timeout_seconds = Some(total);
            }
            st.parsed_line_count += 1;
        }
        "transport" => {
            // `transport input ssh` — informational only
            st.parsed_line_count += 1;
        }
        "login" => {
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

// =====================================================================
// Finalization: cross-link + sort + ParseConfidence
// =====================================================================

fn finalize(mut st: ParserState) -> DeviceModel {
    // Detect truncated input: parsed lines but no `end` seen.
    if !st.saw_end && st.parsed_line_count > 0 {
        st.truncated = true;
        st.warnings.push("truncated_input".to_string());
    }

    // Cross-link: child interfaces from parent_interface backrefs.
    let mut children_by_parent: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for ib in st.interfaces.values() {
        if let Some(parent) = &ib.parent_interface {
            children_by_parent
                .entry(parent.clone())
                .or_default()
                .push(ib.normalized.clone());
        }
    }

    // Build interfaces vec, sorted by normalized_name.
    let mut interfaces: Vec<InterfaceModel> = st
        .interfaces
        .into_values()
        .map(|ib| {
            let parent_native = ib.parent_interface.clone();
            let normalized = ib.normalized.clone();
            let _ = parent_native;
            let _ = normalized;
            ib.build()
        })
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

    // Vlans, sorted by id.
    let mut vlans: Vec<VlanModel> = st.vlans.into_values().map(|b| b.build()).collect();
    vlans.sort_by_key(|v| v.id);

    // Vrfs, sorted by name.
    let mut vrfs: Vec<VrfModel> = st.vrfs.into_values().map(|b| b.build()).collect();
    vrfs.sort_by(|a, b| a.name.cmp(&b.name));

    // Static routes: sort by (prefix, vrf, first next_hop).
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

    // LAG groups: built from interfaces with non-None lag_membership.
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
            entry.members.push(iface.normalized_name.clone().unwrap_or(iface.name.clone()));
        }
    }
    let mut lag_groups: Vec<LagGroupModel> = lag_map.into_values().collect();
    for lg in lag_groups.iter_mut() {
        lg.members.sort();
        lg.members.dedup();
    }
    lag_groups.sort_by(|a, b| {
        // bundle id from name `Port-channelN`
        let na = a.name.trim_start_matches("Port-channel").parse::<u32>().unwrap_or(0);
        let nb = b.name.trim_start_matches("Port-channel").parse::<u32>().unwrap_or(0);
        na.cmp(&nb).then(a.name.cmp(&b.name))
    });

    // Services: build from accumulators, sorted by (kind, identifier).
    let mut services: Vec<ServiceModel> = Vec::new();
    if let Some(s) = st.ssh.build() {
        services.push(s);
    }
    services.extend(st.snmp.build());
    if let Some(s) = st.ntp.build() {
        services.push(s);
    }
    if let Some(s) = st.dns.build() {
        services.push(s);
    }
    if let Some(s) = st.syslog.build() {
        services.push(s);
    }
    services.sort_by(|a, b| {
        format!("{:?}", a.kind)
            .cmp(&format!("{:?}", b.kind))
            .then(services::service_identifier(a).cmp(&services::service_identifier(b)))
    });

    // Management IPs: pull from Management* interface ipv4 addresses.
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

    // Unknown lines: sort by line_number.
    let mut unknown_lines = st.unknown_lines;
    unknown_lines.sort_by_key(|u| u.line_number.unwrap_or(0));

    // Out-of-scope warnings (always emitted at L1/L2 for the V1K parser).
    for area in OUT_OF_SCOPE_AREAS {
        let marker = format!("not_in_scope:{area}");
        if !st.warnings.contains(&marker) {
            st.warnings.push(marker);
        }
    }

    // Coverage areas: count populated.
    let mut populated_areas = 0u32;
    if identity.hostname.is_some()
        || identity.chassis.is_some()
        || !identity.serial_numbers.is_empty()
        || !identity.management_ips.is_empty()
        || identity.last_change_marker.is_some()
    {
        populated_areas += 1;
    } else {
        st.warnings.push("absent:identity".to_string());
    }
    if st.platform.platform_id.is_some() {
        populated_areas += 1;
    } else {
        st.warnings.push("absent:platform".to_string());
    }
    if !interfaces.is_empty() {
        populated_areas += 1;
    } else {
        st.warnings.push("absent:interfaces".to_string());
    }
    let any_ip = interfaces
        .iter()
        .any(|i| !i.ipv4_addresses.is_empty() || !i.ipv6_addresses.is_empty());
    if any_ip {
        populated_areas += 1;
    } else {
        st.warnings.push("absent:ip_addressing".to_string());
    }
    if !vlans.is_empty() {
        populated_areas += 1;
    } else {
        st.warnings.push("absent:vlans".to_string());
    }
    if !vrfs.is_empty() {
        populated_areas += 1;
    } else {
        st.warnings.push("absent:vrfs".to_string());
    }
    if !static_routes.is_empty() {
        populated_areas += 1;
    } else {
        st.warnings.push("absent:static_routes".to_string());
    }
    if !lag_groups.is_empty() {
        populated_areas += 1;
    } else {
        st.warnings.push("absent:lag_groups".to_string());
    }
    use crate::engines::network_model::ServiceKind;
    let has = |k: ServiceKind| services.iter().any(|s| s.kind == k);
    for (area, kind) in &[
        ("services_ssh", ServiceKind::Ssh),
        ("services_snmp", ServiceKind::Snmp),
        ("services_ntp", ServiceKind::Ntp),
        ("services_dns", ServiceKind::Dns),
        ("services_syslog", ServiceKind::Syslog),
    ] {
        if has(*kind) {
            populated_areas += 1;
        } else {
            st.warnings.push(format!("absent:{area}"));
        }
    }

    // Score = populated / total in-scope, rounded to 4 dp.
    let total = IN_SCOPE_AREAS.len() as u32;
    let raw_score = (populated_areas as f32) / (total as f32);
    let score_4dp = (raw_score * 10_000.0).round() / 10_000.0;

    // Sort warnings deterministically.
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
        services,
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engines::vendor_registry;

    fn pref_iosxe() -> PlatformRef {
        PlatformRef {
            platform_id: Some("cisco-iosxe".to_string()),
            vendor: Some("Cisco".to_string()),
            os_family: Some("IOS / IOS XE".to_string()),
            os_version_raw: None,
            os_version_normalized: None,
            detection_confidence: Some(0.9),
        }
    }

    #[test]
    fn empty_input_returns_shell_with_empty_input_warning() {
        let m = parse(pref_iosxe(), "");
        assert!(m.identity.hostname.is_none());
        assert!(m.interfaces.is_empty());
        assert!(m.parse_confidence.warnings.contains(&"empty_input".to_string()));
        assert_eq!(m.parse_confidence.score, Some(0.0));
    }

    #[test]
    fn whitespace_only_input_same_as_empty() {
        let m = parse(pref_iosxe(), "   \n\n\t\n");
        assert!(m.parse_confidence.warnings.contains(&"empty_input".to_string()));
    }

    #[test]
    fn hostname_and_end_populate_identity_only() {
        let cfg = "hostname foo\nend\n";
        let m = parse(pref_iosxe(), cfg);
        assert_eq!(m.identity.hostname.as_deref(), Some("foo"));
        assert!(m.interfaces.is_empty());
    }

    #[test]
    fn single_garbage_line_lands_in_unknown_lines() {
        let m = parse(pref_iosxe(), "blarp glonk floof\n");
        assert_eq!(m.unknown_lines.len(), 1);
        assert!(m.identity.hostname.is_none());
    }

    #[test]
    fn vendor_registry_resolves_cisco_iosxe() {
        assert!(vendor_registry::get_platform("cisco-iosxe").is_ok());
    }

    #[test]
    fn end_marker_stops_consuming_real_lines() {
        let cfg = "hostname x\nend\nhostname y\n";
        let m = parse(pref_iosxe(), cfg);
        assert_eq!(m.identity.hostname.as_deref(), Some("x"));
        assert!(!m.unknown_lines.is_empty());
    }
}
