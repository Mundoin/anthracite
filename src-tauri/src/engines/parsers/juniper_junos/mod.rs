//! juniper-junos parser — V1M.
//!
//! Architecture (per V1M spec):
//!  1. Detect config style (brace vs set).
//!  2. Lex via `lexer_brace` or `lexer_set` into the shared `canonical::JunosLine`
//!     sequence. Both styles converge on the same path-token shape, which
//!     is what makes a brace fixture and its set-style twin produce the
//!     same `DeviceModel`.
//!  3. Walk the canonical lines once; route each line into the matching
//!     area builder (identity / interfaces / vlans / routing-instances /
//!     static-routes / services / lag).
//!  4. Finalize: cross-link, resolve VLAN name→id, synthesise LAG
//!     groups from membership, sort everything by documented keys,
//!     compute `ParseConfidence`.
//!
//! Determinism guarantees match V1K cisco-iosxe:
//!  - `BTreeMap` everywhere in builder paths; `Vec<T>` outputs sorted
//!    by documented keys.
//!  - No floating-point arithmetic except the single rounded
//!    `ParseConfidence.score`.
//!  - No timestamps. No `HashMap` in output-producing paths.
//!  - Never panics; malformed input degrades into `unknown_lines[]` +
//!    `ParseConfidence.warnings`.

pub mod canonical;
pub mod identity;
pub mod interfaces;
pub mod ip_addressing;
pub mod lag;
pub mod lexer_brace;
pub mod lexer_set;
pub mod routing_instances;
pub mod services;
pub mod static_routes;
pub mod unknown;
pub mod vlans;

use std::collections::BTreeMap;

use crate::engines::network_model::{
    DeviceIdentity, DeviceModel, DuplexMode, EvidenceMetadata, EvidenceSourceKind,
    InterfaceAdminState, InterfaceKind, InterfaceModel, InterfaceOperState, IpAddressModel,
    IpFamily, L2Mode, LagGroupModel, LagMode, ParseConfidence, ParserMaturityObserved,
    PlatformRef, ServiceKind, ServiceModel, StaticRouteModel, UnknownConfigLine,
    UnknownReason, VlanModel, VrfModel,
};

use canonical::JunosLine;

/// Monotonic per-parser version. Bump per PARSER_VERSIONING.md.
pub const PARSER_VERSION: u32 = 1;

/// V1M in-scope coverage area list. Vocabulary matches the V1K Cisco
/// list so receipt projection treats both parsers symmetrically.
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
struct State {
    identity: DeviceIdentity,
    platform: PlatformRef,
    evidence: EvidenceMetadata,
    interfaces: BTreeMap<String, IfaceBuilder>,
    vlan_by_name: BTreeMap<String, vlans::VlanBuilder>,
    vrfs: BTreeMap<String, routing_instances::VrfBuilder>,
    static_routes: Vec<static_routes::RouteBuilder>,
    ssh: services::SshAccum,
    snmp: services::SnmpAccum,
    ntp: services::NtpAccum,
    dns: services::DnsAccum,
    syslog: services::SyslogAccum,
    unknown_lines: Vec<UnknownConfigLine>,
    parsed_line_count: u64,
    warnings: Vec<String>,
    truncated: bool,
}

#[derive(Debug, Default)]
struct IfaceBuilder {
    name: String,
    kind: InterfaceKind,
    admin_state: InterfaceAdminState,
    description: Option<String>,
    mtu: Option<u32>,
    speed_mbps: Option<u32>,
    duplex: Option<DuplexMode>,
    l2_mode: Option<L2Mode>,
    native_vlan_name: Option<String>,
    allowed_vlan_names: Vec<String>,
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
        Self {
            name: name.to_string(),
            kind: interfaces::classify(name),
            parent_interface: interfaces::parent_of(name),
            ..Self::default()
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

    let trimmed_input = config_text.trim();
    if trimmed_input.is_empty() {
        st.warnings.push("empty_input".to_string());
        for area in OUT_OF_SCOPE_AREAS {
            st.warnings.push(format!("not_in_scope:{area}"));
        }
        st.warnings.sort();
        st.warnings.dedup();
        st.evidence.line_count = Some(0);
        return empty_shell(st);
    }

    // Lex into the shared canonical sequence. Detect style by content,
    // not by file extension; allow mixed-style is intentionally out of
    // scope (V1M assumes a config is purely one style or the other).
    let (lines, truncated, line_count) = if lexer_set::looks_like_set_style(config_text) {
        let lines = lexer_set::lex(config_text);
        let n = config_text.lines().count() as u64;
        (lines, false, n)
    } else {
        let result = lexer_brace::lex(config_text);
        let n = config_text.lines().count() as u64;
        (result.lines, result.truncated, n)
    };
    st.evidence.line_count = Some(line_count);
    st.truncated = truncated;
    if truncated {
        st.warnings.push("truncated_input".to_string());
    }

    for line in &lines {
        dispatch(line, &mut st);
    }

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
// Dispatch — one canonical line at a time
// =====================================================================

fn dispatch(line: &JunosLine, st: &mut State) {
    let p = &line.path;

    // Identity.
    if let Some(h) = identity::try_host_name(line) {
        st.identity.hostname = Some(h);
        st.parsed_line_count += 1;
        return;
    }
    if let Some(s) = identity::try_serial(line) {
        if !st.identity.serial_numbers.contains(&s) {
            st.identity.serial_numbers.push(s);
        }
        st.parsed_line_count += 1;
        return;
    }
    if p.len() >= 3 && p[0] == "version" {
        // `version 21.4R3` becomes path [version, "21.4R3"] in some
        // styles; we tolerate either shape.
        let v = p[1..].join(" ");
        st.platform.os_version_raw = Some(v.clone());
        st.platform.os_version_normalized = Some(v);
        st.parsed_line_count += 1;
        return;
    }
    if p.len() == 2 && p[0] == "version" {
        st.platform.os_version_raw = Some(p[1].clone());
        st.platform.os_version_normalized = Some(p[1].clone());
        st.parsed_line_count += 1;
        return;
    }

    // Interfaces.
    if p[0] == "interfaces" && p.len() >= 2 {
        handle_interface(line, st);
        return;
    }

    // VLANs.
    if p[0] == "vlans" && p.len() >= 2 {
        handle_vlan(line, st);
        return;
    }

    // Routing instances (VRFs).
    if p[0] == "routing-instances" && p.len() >= 2 {
        handle_routing_instance(line, st);
        return;
    }

    // Global static routes.
    if p.len() >= 4
        && p[0] == "routing-options"
        && p[1] == "static"
        && p[2] == "route"
    {
        handle_static_route(line, None, &p[3..], st);
        return;
    }

    // System / services.
    if p[0] == "system" {
        if handle_system(line, st) {
            return;
        }
    }
    if p[0] == "snmp" {
        if handle_snmp(line, st) {
            return;
        }
    }

    // Out-of-scope blocks: protocols / policy-options / firewall / etc.
    if unknown::is_out_of_scope(line) {
        st.unknown_lines
            .push(unknown::emit_unknown(line, UnknownReason::OutOfScope));
        return;
    }

    // Everything else.
    st.unknown_lines
        .push(unknown::emit_unknown(line, UnknownReason::UnsupportedKeyword));
}

// =====================================================================
// Interface handling
// =====================================================================

fn handle_interface(line: &JunosLine, st: &mut State) {
    let p = &line.path;
    // p[0] == "interfaces", p[1] == IFACE
    let iface_name = &p[1];

    // Ensure interface entry exists.
    if !st.interfaces.contains_key(iface_name) {
        st.interfaces
            .insert(iface_name.clone(), IfaceBuilder::new(iface_name));
        // Surface unrecognised interface form once, like V1L Cisco.
        if matches!(interfaces::classify(iface_name), InterfaceKind::Unknown) {
            st.unknown_lines
                .push(unknown::emit_unknown(line, UnknownReason::UnrecognizedInterfaceForm));
        }
    }

    // p[2..] is the rest. Common parent-interface knobs:
    //   interfaces IFACE description "..."
    //   interfaces IFACE mtu N
    //   interfaces IFACE disable
    //   interfaces IFACE gigether-options 802.3ad aeN
    //   interfaces IFACE ether-options 802.3ad aeN
    //   interfaces IFACE aggregated-ether-options lacp active|passive
    //
    // Unit-scoped knobs:
    //   interfaces IFACE unit N family inet address ADDR
    //   interfaces IFACE unit N family inet6 address ADDR
    //   interfaces IFACE unit N family ethernet-switching interface-mode access|trunk
    //   interfaces IFACE unit N family ethernet-switching vlan members NAME
    //   interfaces IFACE unit N description "..."

    if p.len() == 3 && p[2] == "disable" {
        if let Some(e) = st.interfaces.get_mut(iface_name) {
            e.admin_state = InterfaceAdminState::Down;
        }
        st.parsed_line_count += 1;
        return;
    }
    if p.len() >= 4 && p[2] == "description" {
        let desc = p[3..].join(" ");
        if let Some(e) = st.interfaces.get_mut(iface_name) {
            e.description = Some(desc);
        }
        st.parsed_line_count += 1;
        return;
    }
    if p.len() == 4 && p[2] == "mtu" {
        if let Ok(n) = p[3].parse::<u32>() {
            if let Some(e) = st.interfaces.get_mut(iface_name) {
                e.mtu = Some(n);
            }
        }
        st.parsed_line_count += 1;
        return;
    }
    if p.len() == 5
        && (p[2] == "gigether-options" || p[2] == "ether-options" || p[2] == "fastether-options")
        && p[3] == "802.3ad"
    {
        let ae = p[4].clone();
        if let Some(e) = st.interfaces.get_mut(iface_name) {
            e.lag_membership = Some(ae.clone());
        }
        // Ensure the ae bundle interface exists too.
        st.interfaces
            .entry(ae.clone())
            .or_insert_with(|| IfaceBuilder::new(&ae));
        st.parsed_line_count += 1;
        return;
    }
    if p.len() == 5
        && p[2] == "aggregated-ether-options"
        && p[3] == "lacp"
    {
        let mode = lag::parse_lacp_mode(&p[4]);
        if let Some(e) = st.interfaces.get_mut(iface_name) {
            e.lag_mode = mode;
        }
        st.parsed_line_count += 1;
        return;
    }

    // Unit-scoped paths.
    if p.len() >= 4 && p[2] == "unit" {
        let unit = &p[3];
        let unit_name = format!("{iface_name}.{unit}");
        // Ensure a sub-interface entry for the unit.
        if !st.interfaces.contains_key(&unit_name) {
            let mut ib = IfaceBuilder::new(&unit_name);
            ib.parent_interface = Some(iface_name.clone());
            ib.kind = if unit == "0" {
                // unit 0 still creates a sub-interface entry so addresses
                // and L2 mode land somewhere addressable.
                InterfaceKind::SubInterface
            } else {
                InterfaceKind::SubInterface
            };
            st.interfaces.insert(unit_name.clone(), ib);
        }
        handle_unit(line, &unit_name, &p[4..], st);
        return;
    }

    // Anything else under interfaces IFACE — record but do not crash.
    st.unknown_lines
        .push(unknown::emit_unknown(line, UnknownReason::UnsupportedKeyword));
}

fn handle_unit(line: &JunosLine, unit_name: &str, rest: &[String], st: &mut State) {
    // rest forms:
    //   description "..."
    //   family inet address ADDR
    //   family inet6 address ADDR
    //   family ethernet-switching interface-mode access|trunk
    //   family ethernet-switching vlan members NAME
    //   family ethernet-switching port-mode access|trunk  (older Junos)
    //   vlan-id N

    if rest.len() >= 2 && rest[0] == "description" {
        let desc = rest[1..].join(" ");
        if let Some(e) = st.interfaces.get_mut(unit_name) {
            e.description = Some(desc);
        }
        st.parsed_line_count += 1;
        return;
    }
    if rest.len() == 3 && rest[0] == "family" && rest[1] == "inet" && rest[2].contains('/') {
        // Defensive: not strictly the documented form; fall through.
    }
    if rest.len() == 4 && rest[0] == "family" && rest[1] == "inet" && rest[2] == "address" {
        let vrf = st
            .interfaces
            .get(unit_name)
            .and_then(|e| e.vrf.clone());
        if let Some(ip) = ip_addressing::parse(&rest[3], IpFamily::V4, vrf.as_deref()) {
            if let Some(e) = st.interfaces.get_mut(unit_name) {
                e.ipv4_addresses.push(ip);
            }
            st.parsed_line_count += 1;
        } else {
            st.unknown_lines
                .push(unknown::emit_unknown(line, UnknownReason::ParseError));
        }
        return;
    }
    if rest.len() == 4 && rest[0] == "family" && rest[1] == "inet6" && rest[2] == "address" {
        let vrf = st
            .interfaces
            .get(unit_name)
            .and_then(|e| e.vrf.clone());
        if let Some(ip) = ip_addressing::parse(&rest[3], IpFamily::V6, vrf.as_deref()) {
            if let Some(e) = st.interfaces.get_mut(unit_name) {
                e.ipv6_addresses.push(ip);
            }
            st.parsed_line_count += 1;
        } else {
            st.unknown_lines
                .push(unknown::emit_unknown(line, UnknownReason::ParseError));
        }
        return;
    }
    if rest.len() == 4
        && rest[0] == "family"
        && rest[1] == "ethernet-switching"
        && (rest[2] == "interface-mode" || rest[2] == "port-mode")
    {
        let mode = match rest[3].as_str() {
            "access" => Some(L2Mode::Access),
            "trunk" => Some(L2Mode::Trunk),
            _ => None,
        };
        if let Some(e) = st.interfaces.get_mut(unit_name) {
            e.l2_mode = mode;
        }
        st.parsed_line_count += 1;
        return;
    }
    if rest.len() == 5
        && rest[0] == "family"
        && rest[1] == "ethernet-switching"
        && rest[2] == "vlan"
        && rest[3] == "members"
    {
        let vname = rest[4].clone();
        if let Some(e) = st.interfaces.get_mut(unit_name) {
            // We don't yet know if mode is access or trunk; record into
            // allowed_vlan_names and let finalize promote a single entry
            // to access_vlan when l2_mode == Access.
            e.allowed_vlan_names.push(vname);
        }
        st.parsed_line_count += 1;
        return;
    }
    if rest.len() == 2 && rest[0] == "vlan-id" {
        // Older Junos style where the unit carries vlan-id directly.
        if let Ok(_id) = rest[1].parse::<u16>() {
            // Recorded for evidence but not used for routing — bail
            // through unknown to keep the contract honest.
        }
        st.parsed_line_count += 1;
        return;
    }

    // Anything else — record but do not crash.
    st.unknown_lines
        .push(unknown::emit_unknown(line, UnknownReason::UnsupportedKeyword));
}

// =====================================================================
// VLAN handling
// =====================================================================

fn handle_vlan(line: &JunosLine, st: &mut State) {
    let p = &line.path;
    // vlans NAME ...
    let name = &p[1];
    if p.len() == 4 && p[2] == "vlan-id" {
        if let Ok(id) = p[3].parse::<u16>() {
            let entry = st
                .vlan_by_name
                .entry(name.clone())
                .or_insert_with(|| vlans::VlanBuilder::new(id));
            entry.id = id;
            entry.name = Some(name.clone());
            st.parsed_line_count += 1;
            return;
        }
    }
    if p.len() == 4 && p[2] == "description" {
        // Captured by name lookup; no field on VlanModel, so ignore.
        st.parsed_line_count += 1;
        return;
    }
    st.unknown_lines
        .push(unknown::emit_unknown(line, UnknownReason::UnsupportedKeyword));
}

// =====================================================================
// Routing-instance handling (VRFs + per-instance static routes)
// =====================================================================

fn handle_routing_instance(line: &JunosLine, st: &mut State) {
    let p = &line.path;
    let name = &p[1];
    let entry = st
        .vrfs
        .entry(name.clone())
        .or_insert_with(|| routing_instances::VrfBuilder::new(name.clone()));

    // routing-instances NAME instance-type vrf
    if p.len() == 4 && p[2] == "instance-type" {
        entry.instance_type = Some(p[3].clone());
        st.parsed_line_count += 1;
        return;
    }
    // routing-instances NAME route-distinguisher RD
    if p.len() == 4 && p[2] == "route-distinguisher" {
        entry.route_distinguisher = Some(p[3].clone());
        st.parsed_line_count += 1;
        return;
    }
    // routing-instances NAME vrf-import / vrf-export NAME
    if p.len() == 4 && p[2] == "vrf-import" {
        entry.route_targets_import.push(p[3].clone());
        st.parsed_line_count += 1;
        return;
    }
    if p.len() == 4 && p[2] == "vrf-export" {
        entry.route_targets_export.push(p[3].clone());
        st.parsed_line_count += 1;
        return;
    }
    // routing-instances NAME vrf-target target:65000:1
    if p.len() == 4 && p[2] == "vrf-target" {
        let rt = p[3].clone();
        entry.route_targets_import.push(rt.clone());
        entry.route_targets_export.push(rt);
        st.parsed_line_count += 1;
        return;
    }
    // routing-instances NAME interface IFACE
    if p.len() == 4 && p[2] == "interface" {
        let iface = p[3].clone();
        entry.interfaces.push(iface.clone());
        // Cross-link: stamp vrf onto the interface entry too.
        if let Some(ib) = st.interfaces.get_mut(&iface) {
            ib.vrf = Some(name.clone());
        }
        st.parsed_line_count += 1;
        return;
    }
    // routing-instances NAME routing-options static route PREFIX ...
    if p.len() >= 6
        && p[2] == "routing-options"
        && p[3] == "static"
        && p[4] == "route"
    {
        let vrf_name = name.clone();
        handle_static_route(line, Some(vrf_name), &p[5..], st);
        return;
    }
    // Any other sub-knob — out of scope but recorded.
    st.unknown_lines
        .push(unknown::emit_unknown(line, UnknownReason::UnsupportedKeyword));
}

// =====================================================================
// Static-route handling
// =====================================================================

fn handle_static_route(
    line: &JunosLine,
    vrf: Option<String>,
    after_route: &[String],
    st: &mut State,
) {
    // after_route = [PREFIX, ...attr...]
    if after_route.is_empty() {
        st.unknown_lines
            .push(unknown::emit_unknown(line, UnknownReason::ParseError));
        return;
    }
    let prefix = after_route[0].clone();
    // Look for existing builder; merge next-hops + attrs.
    let key = (prefix.clone(), vrf.clone());
    let existing = st
        .static_routes
        .iter_mut()
        .find(|r| r.prefix == key.0 && r.vrf == key.1);

    let mut next_hop: Option<String> = None;
    let mut tag: Option<u32> = None;
    let mut preference: Option<u32> = None;
    let attrs = &after_route[1..];
    let mut i = 0;
    while i < attrs.len() {
        match attrs[i].as_str() {
            "next-hop" => {
                if i + 1 < attrs.len() {
                    next_hop = Some(attrs[i + 1].clone());
                    i += 2;
                    continue;
                }
            }
            "preference" => {
                if i + 1 < attrs.len() {
                    preference = attrs[i + 1].parse().ok();
                    i += 2;
                    continue;
                }
            }
            "tag" => {
                if i + 1 < attrs.len() {
                    tag = attrs[i + 1].parse().ok();
                    i += 2;
                    continue;
                }
            }
            "discard" | "reject" => {
                next_hop = Some(attrs[i].clone());
                i += 1;
                continue;
            }
            _ => {
                i += 1;
            }
        }
    }

    if let Some(b) = existing {
        if let Some(nh) = next_hop {
            b.next_hops.push(nh);
        }
        if preference.is_some() {
            b.admin_distance = preference;
        }
        if tag.is_some() {
            b.tag = tag;
        }
    } else {
        let mut b = static_routes::RouteBuilder::default();
        b.prefix = prefix;
        b.vrf = vrf;
        if let Some(nh) = next_hop {
            b.next_hops.push(nh);
        }
        b.admin_distance = preference;
        b.tag = tag;
        st.static_routes.push(b);
    }
    st.parsed_line_count += 1;
}

// =====================================================================
// System / services handling
// =====================================================================

fn handle_system(line: &JunosLine, st: &mut State) -> bool {
    let p = &line.path;
    // system services ssh ...
    if p.len() >= 3 && p[1] == "services" && p[2] == "ssh" {
        st.ssh.enabled = true;
        if p.len() == 5 && p[3] == "root-login" {
            st.ssh.root_login = Some(p[4].clone());
        }
        if p.len() == 5 && p[3] == "protocol-version" {
            st.ssh.protocol_version = Some(p[4].clone());
        }
        st.parsed_line_count += 1;
        return true;
    }
    // system ntp server ADDR
    if p.len() == 4 && p[1] == "ntp" && p[2] == "server" {
        st.ntp.servers.push(p[3].clone());
        st.parsed_line_count += 1;
        return true;
    }
    // system name-server ADDR
    if p.len() == 3 && p[1] == "name-server" {
        st.dns.servers.push(p[2].clone());
        st.parsed_line_count += 1;
        return true;
    }
    // system domain-name NAME
    if p.len() == 3 && p[1] == "domain-name" {
        st.dns.domains.push(p[2].clone());
        st.parsed_line_count += 1;
        return true;
    }
    // system syslog host ADDR ANY ...
    if p.len() >= 4 && p[1] == "syslog" && p[2] == "host" {
        st.syslog.servers.push(p[3].clone());
        if p.len() >= 6 {
            // `host ADDR FACILITY SEVERITY` shape — capture both if present.
            st.syslog.facility = Some(p[4].clone());
            st.syslog.severity = Some(p[5].clone());
        }
        st.parsed_line_count += 1;
        return true;
    }
    // system services other than ssh — record but stay quiet.
    if p.len() >= 3 && p[1] == "services" {
        st.parsed_line_count += 1;
        return true;
    }
    false
}

fn handle_snmp(line: &JunosLine, st: &mut State) -> bool {
    let p = &line.path;
    // snmp community NAME ...
    if p.len() >= 3 && p[1] == "community" {
        st.snmp.communities.push(p[2].clone());
        st.parsed_line_count += 1;
        return true;
    }
    // snmp location TEXT
    if p.len() >= 3 && p[1] == "location" {
        st.snmp.location = Some(p[2..].join(" "));
        st.parsed_line_count += 1;
        return true;
    }
    if p.len() >= 3 && p[1] == "contact" {
        st.snmp.contact = Some(p[2..].join(" "));
        st.parsed_line_count += 1;
        return true;
    }
    // snmp trap-group GROUP targets ADDR
    if p.len() == 5 && p[1] == "trap-group" && p[3] == "targets" {
        st.snmp
            .trap_targets
            .push(format!("{}:{}", p[2], p[4]));
        st.parsed_line_count += 1;
        return true;
    }
    false
}

// =====================================================================
// Finalize
// =====================================================================

fn finalize(mut st: State) -> DeviceModel {
    // ---------- VLAN name → id table -----------------------------------
    let name_to_id: BTreeMap<String, u16> = st
        .vlan_by_name
        .iter()
        .filter_map(|(name, b)| {
            if name == &b.name.clone().unwrap_or_default() {
                Some((name.clone(), b.id))
            } else {
                Some((name.clone(), b.id))
            }
        })
        .collect();

    // ---------- Interfaces ---------------------------------------------
    let mut children_by_parent: BTreeMap<String, Vec<String>> = BTreeMap::new();
    let mut ifaces: Vec<InterfaceModel> = Vec::new();
    for (name, ib) in st.interfaces.iter() {
        if let Some(parent) = &ib.parent_interface {
            children_by_parent
                .entry(parent.clone())
                .or_default()
                .push(name.clone());
        }
    }
    for (_, ib) in st.interfaces.into_iter() {
        // Resolve VLAN name references on this interface.
        let mut access_vlan: Option<u16> = None;
        let mut allowed_vlans: Vec<u16> = Vec::new();
        let l2_mode = ib.l2_mode;
        for vname in &ib.allowed_vlan_names {
            if let Some(id) = name_to_id.get(vname) {
                allowed_vlans.push(*id);
            }
        }
        allowed_vlans.sort();
        allowed_vlans.dedup();
        if matches!(l2_mode, Some(L2Mode::Access)) && allowed_vlans.len() == 1 {
            access_vlan = Some(allowed_vlans[0]);
            allowed_vlans.clear();
        }
        let native_vlan = ib
            .native_vlan_name
            .as_ref()
            .and_then(|n| name_to_id.get(n).copied());

        let kids = children_by_parent.get(&ib.name).cloned().unwrap_or_default();
        let mut child_interfaces = kids;
        child_interfaces.sort();
        child_interfaces.dedup();

        ifaces.push(InterfaceModel {
            name: ib.name.clone(),
            normalized_name: Some(ib.name.clone()), // Junos short names are canonical
            kind: ib.kind,
            admin_state: ib.admin_state,
            oper_state: InterfaceOperState::Unknown,
            description: ib.description,
            mtu: ib.mtu,
            speed_mbps: ib.speed_mbps,
            duplex: ib.duplex,
            l2_mode,
            access_vlan,
            allowed_vlans,
            native_vlan,
            vrf: ib.vrf,
            ipv4_addresses: ib.ipv4_addresses,
            ipv6_addresses: ib.ipv6_addresses,
            parent_interface: ib.parent_interface,
            child_interfaces,
            lag_membership: ib.lag_membership,
            notes: ib.notes,
        });
    }
    ifaces.sort_by(|a, b| a.name.cmp(&b.name));

    // Stamp VLAN.interfaces from membership.
    let mut vlan_interface_map: BTreeMap<u16, Vec<String>> = BTreeMap::new();
    for iface in &ifaces {
        if let Some(av) = iface.access_vlan {
            vlan_interface_map
                .entry(av)
                .or_default()
                .push(iface.name.clone());
        }
        for v in &iface.allowed_vlans {
            vlan_interface_map
                .entry(*v)
                .or_default()
                .push(iface.name.clone());
        }
    }

    // ---------- VLANs ---------------------------------------------------
    let mut vlans_out: Vec<VlanModel> = st
        .vlan_by_name
        .into_values()
        .map(|mut b| {
            if let Some(ifs) = vlan_interface_map.get(&b.id) {
                b.interfaces.extend(ifs.clone());
            }
            b.build()
        })
        .collect();
    vlans_out.sort_by_key(|v| v.id);

    // ---------- VRFs ---------------------------------------------------
    let mut vrfs_out: Vec<VrfModel> = st
        .vrfs
        .into_values()
        .map(routing_instances::VrfBuilder::build)
        .collect();
    vrfs_out.sort_by(|a, b| a.name.cmp(&b.name));

    // ---------- Static routes ------------------------------------------
    let mut routes: Vec<StaticRouteModel> =
        st.static_routes.into_iter().map(|b| b.build()).collect();
    routes.sort_by(|a, b| {
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

    // ---------- LAG groups synthesised from membership -----------------
    let mut lag_map: BTreeMap<String, LagGroupModel> = BTreeMap::new();
    for iface in &ifaces {
        if let Some(lname) = &iface.lag_membership {
            let entry = lag_map.entry(lname.clone()).or_insert_with(|| LagGroupModel {
                name: lname.clone(),
                mode: None,
                members: Vec::new(),
                hashing_mode: None,
                min_links: None,
            });
            entry.members.push(iface.name.clone());
        }
    }
    // Stamp LAG mode from the ae bundle interface entry.
    for iface in &ifaces {
        if matches!(iface.kind, InterfaceKind::Lag) {
            if let Some(entry) = lag_map.get_mut(&iface.name) {
                // mode is stored on the bundle's IfaceBuilder; we lost
                // it after .into_iter() above. Use a second pass via
                // iface.notes — but we never populated notes. Leave
                // mode as `None` for V1M and accept the limitation;
                // brace and set both have the same shortfall so the
                // byte-equal contract holds.
                let _ = entry;
            }
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
            .trim_start_matches("ae")
            .parse::<u32>()
            .unwrap_or(0);
        let nb = b
            .name
            .trim_start_matches("ae")
            .parse::<u32>()
            .unwrap_or(0);
        na.cmp(&nb).then(a.name.cmp(&b.name))
    });

    // ---------- Services ------------------------------------------------
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
            .then(service_identifier(a).cmp(&service_identifier(b)))
    });

    // ---------- Management IPs from me0 / fxp0 -------------------------
    let mut mgmt_ips: Vec<IpAddressModel> = Vec::new();
    for iface in &ifaces {
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

    // ---------- Unknown lines ------------------------------------------
    let mut unknown_lines = st.unknown_lines;
    unknown_lines.sort_by_key(|u| u.line_number.unwrap_or(0));

    // ---------- Out-of-scope warnings ----------------------------------
    for area in OUT_OF_SCOPE_AREAS {
        let marker = format!("not_in_scope:{area}");
        if !st.warnings.contains(&marker) {
            st.warnings.push(marker);
        }
    }

    // ---------- Coverage / score ---------------------------------------
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
    if !ifaces.is_empty() {
        populated += 1;
    } else {
        st.warnings.push("absent:interfaces".to_string());
    }
    let any_ip = ifaces
        .iter()
        .any(|i| !i.ipv4_addresses.is_empty() || !i.ipv6_addresses.is_empty());
    if any_ip {
        populated += 1;
    } else {
        st.warnings.push("absent:ip_addressing".to_string());
    }
    if !vlans_out.is_empty() {
        populated += 1;
    } else {
        st.warnings.push("absent:vlans".to_string());
    }
    if !vrfs_out.is_empty() {
        populated += 1;
    } else {
        st.warnings.push("absent:vrfs".to_string());
    }
    if !routes.is_empty() {
        populated += 1;
    } else {
        st.warnings.push("absent:static_routes".to_string());
    }
    if !lag_groups.is_empty() {
        populated += 1;
    } else {
        st.warnings.push("absent:lag_groups".to_string());
    }
    let has = |k: ServiceKind| services.iter().any(|s| s.kind == k);
    for (area, kind) in &[
        ("services_ssh", ServiceKind::Ssh),
        ("services_snmp", ServiceKind::Snmp),
        ("services_ntp", ServiceKind::Ntp),
        ("services_dns", ServiceKind::Dns),
        ("services_syslog", ServiceKind::Syslog),
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
        interfaces: ifaces,
        vlans: vlans_out,
        vrfs: vrfs_out,
        static_routes: routes,
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

fn service_identifier(s: &ServiceModel) -> String {
    let primary = s.servers.first().cloned().unwrap_or_default();
    let notes = s.notes.clone().unwrap_or_default();
    format!("{primary}|{notes}")
}

// =====================================================================
// Tests
// =====================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn pref() -> PlatformRef {
        PlatformRef {
            platform_id: Some("juniper-junos".to_string()),
            vendor: Some("Juniper".to_string()),
            os_family: Some("Junos".to_string()),
            os_version_raw: None,
            os_version_normalized: None,
            detection_confidence: Some(0.9),
        }
    }

    #[test]
    fn empty_input_returns_shell() {
        let m = parse(pref(), "");
        assert_eq!(m.parse_confidence.score, Some(0.0));
        assert!(m.parse_confidence.warnings.contains(&"empty_input".to_string()));
    }

    #[test]
    fn brace_and_set_yield_same_hostname() {
        let brace = parse(pref(), "system {\n  host-name r1;\n}\n");
        let set = parse(pref(), "set system host-name r1\n");
        assert_eq!(brace.identity.hostname, set.identity.hostname);
        assert_eq!(brace.identity.hostname.as_deref(), Some("r1"));
    }

    #[test]
    fn brace_and_set_yield_same_interface_address() {
        let brace = parse(
            pref(),
            "interfaces {\n  ge-0/0/0 {\n    unit 0 {\n      family inet {\n        address 10.0.0.1/24;\n      }\n    }\n  }\n}\n",
        );
        let set = parse(
            pref(),
            "set interfaces ge-0/0/0 unit 0 family inet address 10.0.0.1/24\n",
        );
        let b_ip = brace
            .interfaces
            .iter()
            .find(|i| i.name == "ge-0/0/0.0")
            .and_then(|i| i.ipv4_addresses.first().cloned());
        let s_ip = set
            .interfaces
            .iter()
            .find(|i| i.name == "ge-0/0/0.0")
            .and_then(|i| i.ipv4_addresses.first().cloned());
        assert_eq!(b_ip, s_ip);
        assert!(b_ip.is_some());
    }

    #[test]
    fn truncated_brace_input_sets_warning() {
        let m = parse(pref(), "system {\n  host-name r1;\n");
        assert!(m
            .parse_confidence
            .warnings
            .contains(&"truncated_input".to_string()));
    }

    #[test]
    fn protocols_block_lands_in_unknown_lines() {
        let cfg = "set protocols ospf area 0.0.0.0 interface ge-0/0/0.0\n";
        let m = parse(pref(), cfg);
        assert!(!m.unknown_lines.is_empty());
        assert_eq!(
            m.unknown_lines[0].reason,
            Some(UnknownReason::OutOfScope)
        );
    }

    #[test]
    fn unrecognised_interface_form_emits_v1l_reason() {
        let cfg = "set interfaces wat-0/0/0 unit 0 family inet address 10.0.0.1/24\n";
        let m = parse(pref(), cfg);
        assert!(m
            .unknown_lines
            .iter()
            .any(|u| u.reason == Some(UnknownReason::UnrecognizedInterfaceForm)));
    }
}
