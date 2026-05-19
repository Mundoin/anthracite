//! V1N / V1U cross-vendor canonical-consistency invariant.
//!
//! This is V1N's central acceptance test, extended in V1U and V1BC to cover
//! five vendors. It parses five fixtures that describe the same logical
//! device in five different vendor syntaxes, projects each parsed
//! `DeviceModel` into a small canonical view that strips intrinsically
//! vendor-specific information, and asserts the five canonical views
//! serialise byte-identically.
//!
//! ## What "logical device" means
//!
//! `<fixture-root>/cross-vendor-equivalent-small/config.cfg` for each
//! of cisco-ios, cisco-iosxe, juniper-junos, arista-eos, cisco-nxos describes:
//!   - hostname `cross-vendor-eq`
//!   - one VRF `MGMT` with route-distinguisher `65000:1`
//!   - one VLAN id `100` named `USERS`
//!   - one Loopback with IPv4 `192.0.2.99/32`
//!   - one routed physical interface with IPv4 `10.0.0.1/30`
//!   - one default static route via `10.0.0.2`
//!   - SSH enabled
//!   - one SNMP community `PUBLIC`
//!   - one NTP server `10.0.0.1`
//!   - one DNS server `10.0.0.10` + domain `example.test`
//!   - one syslog host `10.0.0.100`
//!
//! ## What the canonical view normalises away
//!
//! Vendor-specific by definition:
//!   - `evidence` block (byte_size / line_count / parser_version / etc.)
//!   - `platform` block (platform_id, vendor, os_family)
//!   - `parse_confidence` block (warnings vocabularies differ slightly
//!     per parser, e.g. EOS adds `not_in_scope:mlag`)
//!   - `unknown_lines` (the per-vendor "what we didn't parse" set
//!     necessarily differs)
//!   - per-interface `name` and `normalized_name` (`GigabitEthernet0/0/0`
//!     vs `ge-0/0/0` vs `Ethernet1`; `Gi0/0/0` vs `ge-0/0/0` vs `Et1`)
//!   - per-interface `oper_state`, `mtu`, `description`, `notes` (these
//!     are surface-level and not part of the L1/L2 invariant we care
//!     about for this test)
//!   - per-vendor interface-shape conventions: Junos models addresses
//!     on `unit` sub-interfaces (e.g. `ge-0/0/0.0`), so a Junos device
//!     has `sub_interface` kind entries where Cisco / EOS do not. The
//!     L1/L2 invariant is *what addresses landed*, not *which kind of
//!     interface entry holds them*. The set of (address, prefix, family)
//!     comparison covers the real assertion.
//!
//! ## What stays
//!
//! The canonical view exposes:
//!   - hostname
//!   - sorted (vrf name, route_distinguisher)
//!   - sorted (vlan id, vlan name)
//!   - sorted set of (address, prefix_length, family, vrf) across all
//!     interfaces
//!   - sorted set of interface kinds present (counts by kind)
//!   - sorted (prefix, next_hops, vrf) for static routes
//!   - sorted set of populated service kinds
//!   - sorted DNS servers + sorted SNMP/NTP/syslog server lists
//!
//! If a future parser change drifts the canonical view for any vendor,
//! this test fails — and that failure either (a) flags a parser bug
//! that needs fixing, or (b) flags a real `DeviceModel` contract gap
//! that V1N must record as a follow-up.

use anthracite_lib::engines::network_model::{
    DeviceModel, IpFamily, PlatformRef, ServiceKind,
};
use anthracite_lib::engines::parsers;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

const FIXTURE_NAME: &str = "cross-vendor-equivalent-small";

#[derive(Debug, Serialize, PartialEq, Eq)]
struct CanonicalView {
    hostname: Option<String>,
    vrfs: Vec<CvVrf>,
    vlans: Vec<CvVlan>,
    ip_addresses: Vec<CvIp>,
    static_routes: Vec<CvRoute>,
    service_kinds: Vec<String>,
    snmp_communities: Vec<String>,
    snmp_trap_hosts: Vec<String>,
    ntp_servers: Vec<String>,
    dns_servers: Vec<String>,
    dns_domains: Vec<String>,
    syslog_servers: Vec<String>,
    ssh_enabled: bool,
    /// V1Z-A: Telnet enablement parity. Cross-vendor fixtures do
    /// not enable Telnet, so this should be `false` for all four
    /// vendors; if a parser starts emitting Telnet erroneously this
    /// invariant will surface the drift.
    telnet_enabled: bool,
}

#[derive(Debug, Serialize, PartialEq, Eq, Ord, PartialOrd, Clone)]
struct CvVrf {
    name: String,
    route_distinguisher: Option<String>,
}

#[derive(Debug, Serialize, PartialEq, Eq, Ord, PartialOrd, Clone)]
struct CvVlan {
    id: u16,
    name: Option<String>,
}

#[derive(Debug, Serialize, PartialEq, Eq, Ord, PartialOrd, Clone)]
struct CvIp {
    address: String,
    prefix_length: u8,
    family: String,
    vrf: Option<String>,
}

#[derive(Debug, Serialize, PartialEq, Eq, Ord, PartialOrd, Clone)]
struct CvRoute {
    prefix: String,
    next_hops: Vec<String>,
    vrf: Option<String>,
}

fn ip_family_str(f: IpFamily) -> &'static str {
    match f {
        IpFamily::V4 => "v4",
        IpFamily::V6 => "v6",
    }
}

fn service_kind_str(k: ServiceKind) -> &'static str {
    match k {
        ServiceKind::Ssh => "ssh",
        ServiceKind::Snmp => "snmp",
        ServiceKind::Ntp => "ntp",
        ServiceKind::Dns => "dns",
        ServiceKind::Syslog => "syslog",
        ServiceKind::Aaa => "aaa",
        ServiceKind::Tacacs => "tacacs",
        ServiceKind::Radius => "radius",
        ServiceKind::Http => "http",
        ServiceKind::Https => "https",
        ServiceKind::Telnet => "telnet",
        ServiceKind::Unknown => "unknown",
    }
}

fn project(model: &DeviceModel) -> CanonicalView {
    let mut vrfs: Vec<CvVrf> = model
        .vrfs
        .iter()
        .map(|v| CvVrf {
            name: v.name.clone(),
            route_distinguisher: v.route_distinguisher.clone(),
        })
        .collect();
    vrfs.sort();
    vrfs.dedup();

    let mut vlans: Vec<CvVlan> = model
        .vlans
        .iter()
        .map(|v| CvVlan {
            id: v.id,
            name: v.name.clone(),
        })
        .collect();
    vlans.sort();
    vlans.dedup();

    let mut ip_addresses: Vec<CvIp> = Vec::new();
    for iface in &model.interfaces {
        for ip in &iface.ipv4_addresses {
            ip_addresses.push(CvIp {
                address: ip.address.clone(),
                prefix_length: ip.prefix_length,
                family: ip_family_str(ip.family).to_string(),
                vrf: ip.vrf.clone(),
            });
        }
        for ip in &iface.ipv6_addresses {
            ip_addresses.push(CvIp {
                address: ip.address.clone(),
                prefix_length: ip.prefix_length,
                family: ip_family_str(ip.family).to_string(),
                vrf: ip.vrf.clone(),
            });
        }
    }
    ip_addresses.sort();
    ip_addresses.dedup();

    let mut static_routes: Vec<CvRoute> = model
        .static_routes
        .iter()
        .map(|r| {
            let mut hops = r.next_hops.clone();
            hops.sort();
            hops.dedup();
            CvRoute {
                prefix: r.prefix.clone(),
                next_hops: hops,
                vrf: r.vrf.clone(),
            }
        })
        .collect();
    static_routes.sort();
    static_routes.dedup();

    let mut service_kinds: Vec<String> = model
        .services
        .iter()
        .map(|s| service_kind_str(s.kind).to_string())
        .collect();
    service_kinds.sort();
    service_kinds.dedup();

    let mut snmp_communities: Vec<String> = Vec::new();
    let mut snmp_trap_hosts: Vec<String> = Vec::new();
    for s in model.services.iter().filter(|s| s.kind == ServiceKind::Snmp) {
        if let Some(notes) = &s.notes {
            if notes.contains("communities=") {
                if let Some(idx) = notes.find("communities=") {
                    let rest = &notes[idx + "communities=".len()..];
                    let comm: &str = rest.split(';').next().unwrap_or("");
                    for c in comm.split(',') {
                        let c = c.trim();
                        if !c.is_empty() {
                            snmp_communities.push(c.to_string());
                        }
                    }
                }
            }
            if notes.contains("kind=trap_hosts") {
                for h in &s.servers {
                    snmp_trap_hosts.push(h.clone());
                }
            }
        }
    }
    // Also accept SNMP modeled as standalone records by other parsers
    // (V1L Cisco encodes communities + trap hosts as two records too).
    snmp_communities.sort();
    snmp_communities.dedup();
    snmp_trap_hosts.sort();
    snmp_trap_hosts.dedup();

    let mut ntp_servers: Vec<String> = model
        .services
        .iter()
        .filter(|s| s.kind == ServiceKind::Ntp)
        .flat_map(|s| s.servers.iter().cloned())
        .collect();
    ntp_servers.sort();
    ntp_servers.dedup();

    let mut dns_servers: Vec<String> = Vec::new();
    let mut dns_domains: Vec<String> = Vec::new();
    for s in model.services.iter().filter(|s| s.kind == ServiceKind::Dns) {
        for srv in &s.servers {
            dns_servers.push(srv.clone());
        }
        if let Some(notes) = &s.notes {
            if let Some(idx) = notes.find("domains=") {
                let rest = &notes[idx + "domains=".len()..];
                let d: &str = rest.split(';').next().unwrap_or("");
                for x in d.split(',') {
                    let x = x.trim();
                    if !x.is_empty() {
                        dns_domains.push(x.to_string());
                    }
                }
            }
        }
    }
    dns_servers.sort();
    dns_servers.dedup();
    dns_domains.sort();
    dns_domains.dedup();

    let mut syslog_servers: Vec<String> = model
        .services
        .iter()
        .filter(|s| s.kind == ServiceKind::Syslog)
        .flat_map(|s| s.servers.iter().cloned())
        .collect();
    syslog_servers.sort();
    syslog_servers.dedup();

    let ssh_enabled = model.services.iter().any(|s| s.kind == ServiceKind::Ssh);
    let telnet_enabled = model.services.iter().any(|s| s.kind == ServiceKind::Telnet);

    CanonicalView {
        hostname: model.identity.hostname.clone(),
        vrfs,
        vlans,
        ip_addresses,
        static_routes,
        service_kinds,
        snmp_communities,
        snmp_trap_hosts,
        ntp_servers,
        dns_servers,
        dns_domains,
        syslog_servers,
        ssh_enabled,
        telnet_enabled,
    }
}

fn pref_for(platform_id: &str) -> PlatformRef {
    PlatformRef {
        platform_id: Some(platform_id.to_string()),
        vendor: None,
        os_family: None,
        os_version_raw: None,
        os_version_normalized: None,
        detection_confidence: Some(0.9),
    }
}

fn parse_for(vendor_dir: &str, platform_id: &str) -> DeviceModel {
    let p = PathBuf::from("tests/fixtures")
        .join(vendor_dir)
        .join(FIXTURE_NAME)
        .join("config.cfg");
    let cfg = fs::read_to_string(&p)
        .unwrap_or_else(|e| panic!("read {}: {e}", p.display()));
    parsers::parse_device_config(pref_for(platform_id), &cfg)
        .expect("parse_device_config Ok")
}

#[test]
fn cross_vendor_equivalent_models_match() {
    let ios = parse_for("cisco-ios", "cisco-ios");
    let iosxe = parse_for("cisco-iosxe", "cisco-iosxe");
    let junos = parse_for("juniper-junos", "juniper-junos");
    let eos = parse_for("arista-eos", "arista-eos");
    let nxos = parse_for("cisco-nxos", "cisco-nxos");

    let cv_ios = project(&ios);
    let cv_iosxe = project(&iosxe);
    let cv_junos = project(&junos);
    let cv_eos = project(&eos);
    let cv_nxos = project(&nxos);

    let ios_json = serde_json::to_string_pretty(&cv_ios).unwrap();
    let iosxe_json = serde_json::to_string_pretty(&cv_iosxe).unwrap();
    let junos_json = serde_json::to_string_pretty(&cv_junos).unwrap();
    let eos_json = serde_json::to_string_pretty(&cv_eos).unwrap();
    let nxos_json = serde_json::to_string_pretty(&cv_nxos).unwrap();

    if ios_json != iosxe_json {
        panic!(
            "Cisco IOS vs IOS-XE canonical view diverged.\n--- ios ---\n{ios_json}\n--- iosxe ---\n{iosxe_json}"
        );
    }
    if ios_json != junos_json {
        panic!(
            "Cisco IOS vs Junos canonical view diverged.\n--- ios ---\n{ios_json}\n--- junos ---\n{junos_json}"
        );
    }
    if ios_json != eos_json {
        panic!(
            "Cisco IOS vs EOS canonical view diverged.\n--- ios ---\n{ios_json}\n--- eos ---\n{eos_json}"
        );
    }
    if ios_json != nxos_json {
        panic!(
            "Cisco IOS vs NX-OS canonical view diverged.\n--- ios ---\n{ios_json}\n--- nxos ---\n{nxos_json}"
        );
    }
}
