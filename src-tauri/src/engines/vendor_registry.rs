//! Vendor Registry Engine — V1H.
//!
//! Deterministic, static knowledge of the vendor / platform / OS targets
//! Anthracite claims to support. This is the first motor-room engine after
//! the V1G pivot.
//!
//! Boundary (per `ENGINE_AND_API_BOUNDARIES.md`):
//!   - Owns:    platform identity, vendor metadata, capability families,
//!              initial parser maturity targets.
//!   - Does NOT own: parsing, detection, live device access, topology, state.
//!
//! Source-of-truth pairing:
//!   - `docs/architecture/VENDOR_PLATFORM_REGISTRY.md` (operator-facing)
//!   - `docs/architecture/VENDOR_ENGINE_PLAN.md` (maturity ladder)
//!   - `docs/architecture/CANONICAL_NETWORK_MODEL.md` (capability families)
//!
//! No parser behaviour is implemented here. Future stages bind parsers to
//! the platform ids declared below; renaming an id post-ship is forbidden.

use serde::{Deserialize, Serialize};

/// Operator-facing platform record. Mirrored in TS as `VendorPlatform`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VendorPlatform {
    pub id: String,
    pub vendor: String,
    pub os_family: String,
    pub primary_role: String,
    pub config_style: String,
    pub priority_tier: PriorityTier,
    pub initial_parser_target_level: ParserMaturity,
    pub capability_families: Vec<CapabilityFamily>,
    pub notes: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PriorityTier {
    T1,
    T2,
    T3,
}

/// Parser maturity ladder. See `VENDOR_ENGINE_PLAN.md`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum ParserMaturity {
    /// L0 — identify the platform only, no model extraction.
    L0Identify,
    /// L1 — inventory: identity, interfaces, IPs, basic services.
    L1Inventory,
    /// L2 — topology: VLANs, VRFs, LAG, static routes, neighbour hints.
    L2Topology,
    /// L3 — policy: ACLs, NAT, firewall rules, QoS, AAA.
    L3Policy,
    /// L4 — intent inference: routing protocols, VPN, services consolidated.
    L4Intent,
    /// L5 — validation / findings emitted from the canonical model.
    L5Validation,
    /// L6 — render / change generation back to vendor config.
    L6Render,
}

/// Canonical-model capability families. Match `CANONICAL_NETWORK_MODEL.md`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum CapabilityFamily {
    Interfaces,
    IpAddressing,
    Vlans,
    Vrfs,
    StaticRouting,
    Ospf,
    Isis,
    Eigrp,
    Bgp,
    AclFirewall,
    Nat,
    VpnTunnels,
    Qos,
    LagLacp,
    Services,
    TopologyHints,
}

/// Controlled lookup error. Surface-safe: no panic on unknown id.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum VendorRegistryError {
    UnknownPlatform { id: String },
}

impl std::fmt::Display for VendorRegistryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VendorRegistryError::UnknownPlatform { id } => {
                write!(f, "unknown vendor platform id: {id}")
            }
        }
    }
}

impl std::error::Error for VendorRegistryError {}

/// Return every supported platform in deterministic order.
pub fn list_platforms() -> Vec<VendorPlatform> {
    build_registry()
}

/// Look up a single platform by stable id.
pub fn get_platform(id: &str) -> Result<VendorPlatform, VendorRegistryError> {
    build_registry()
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| VendorRegistryError::UnknownPlatform { id: id.to_string() })
}

fn p(
    id: &str,
    vendor: &str,
    os_family: &str,
    primary_role: &str,
    config_style: &str,
    tier: PriorityTier,
    target: ParserMaturity,
    caps: &[CapabilityFamily],
    notes: &str,
) -> VendorPlatform {
    VendorPlatform {
        id: id.to_string(),
        vendor: vendor.to_string(),
        os_family: os_family.to_string(),
        primary_role: primary_role.to_string(),
        config_style: config_style.to_string(),
        priority_tier: tier,
        initial_parser_target_level: target,
        capability_families: caps.to_vec(),
        notes: notes.to_string(),
    }
}

fn build_registry() -> Vec<VendorPlatform> {
    use CapabilityFamily::*;
    use ParserMaturity::*;
    use PriorityTier::*;

    let l1_l2_router_switch: &[CapabilityFamily] = &[
        Interfaces,
        IpAddressing,
        Vlans,
        Vrfs,
        StaticRouting,
        LagLacp,
        Services,
        TopologyHints,
    ];

    let l1_firewall: &[CapabilityFamily] = &[
        Interfaces,
        IpAddressing,
        AclFirewall,
        Nat,
        VpnTunnels,
        Services,
    ];

    let l1_inventory_only: &[CapabilityFamily] =
        &[Interfaces, IpAddressing, Services];

    let l1_identify_only: &[CapabilityFamily] = &[Interfaces, IpAddressing];

    vec![
        p(
            "cisco-iosxe",
            "Cisco",
            "IOS / IOS XE",
            "enterprise router / switch",
            "IOS-classic, indented",
            T1,
            L2Topology,
            l1_l2_router_switch,
            "XE shares syntax with classic IOS; XE-specific features flagged in capability matrix.",
        ),
        p(
            "cisco-iosxr",
            "Cisco",
            "IOS XR",
            "service-provider edge / core router",
            "hierarchical, commit-based",
            T2,
            L2Topology,
            l1_l2_router_switch,
            "Distinct grammar (admin/conf-t). Commit model differs from IOS.",
        ),
        p(
            "cisco-nxos",
            "Cisco",
            "NX-OS",
            "data-centre switch",
            "IOS-like with feature toggles",
            T1,
            L2Topology,
            l1_l2_router_switch,
            "`feature` gating + VPC / VXLAN concepts unique to NX-OS.",
        ),
        p(
            "juniper-junos",
            "Juniper",
            "Junos",
            "router / switch / firewall",
            "hierarchical set / curly braces",
            T1,
            L2Topology,
            l1_l2_router_switch,
            "Two render forms (set vs display). Commit-based.",
        ),
        p(
            "arista-eos",
            "Arista",
            "EOS",
            "data-centre switch",
            "IOS-like",
            T1,
            L2Topology,
            l1_l2_router_switch,
            "High syntactic overlap with cisco-iosxe; semantics diverge on MLAG / EVPN.",
        ),
        p(
            "mikrotik-routeros",
            "MikroTik",
            "RouterOS",
            "SMB router / wireless",
            "flat command list with paths",
            T2,
            L1Inventory,
            l1_inventory_only,
            "Export format very different from CLI live config.",
        ),
        p(
            "fortinet-fortios",
            "Fortinet",
            "FortiOS",
            "firewall / SD-WAN",
            "config block / edit / next",
            T1,
            L1Inventory,
            l1_firewall,
            "Vdoms add scoping layer. Policy-heavy.",
        ),
        p(
            "paloalto-panos",
            "Palo Alto Networks",
            "PAN-OS",
            "firewall",
            "XML (configd) or set-format",
            T1,
            L1Inventory,
            l1_firewall,
            "XML is authoritative; set-format is operator-friendly view.",
        ),
        p(
            "huawei-vrp",
            "Huawei",
            "VRP",
            "router / switch",
            "IOS-like, distinct keywords",
            T2,
            L1Inventory,
            l1_inventory_only,
            "Keyword divergence from Cisco (e.g. `display` vs `show`).",
        ),
        p(
            "nokia-sros",
            "Nokia",
            "SR OS",
            "service-provider router",
            "hierarchical, model-driven",
            T2,
            L1Inventory,
            l1_inventory_only,
            "Classic vs MD-CLI variants.",
        ),
        p(
            "aruba-aoscx",
            "HPE Aruba",
            "AOS-CX / ArubaOS",
            "data-centre / campus switch + wireless",
            "YANG-aligned hierarchical (CX) and stanza-based (ArubaOS)",
            T2,
            L1Inventory,
            l1_inventory_only,
            "AOS-CX is the modern target; ArubaOS controller config tracked under the same id for V1.",
        ),
        p(
            "dell-os10",
            "Dell Technologies",
            "OS10",
            "data-centre switch",
            "IOS-like (SONiC-adjacent)",
            T2,
            L1Inventory,
            l1_inventory_only,
            "OS6 / OS9 legacy out of scope for V1.",
        ),
        p(
            "extreme-exos-voss",
            "Extreme Networks",
            "EXOS / VOSS",
            "campus / data-centre / fabric switch",
            "flat command list (EXOS) and hierarchical (VOSS)",
            T3,
            L0Identify,
            l1_identify_only,
            "EXOS stanza-less parsing relies on command verbs; VOSS adds SPB / fabric-attach concepts.",
        ),
        p(
            "nvidia-cumulus",
            "NVIDIA",
            "Cumulus Linux",
            "data-centre switch (Linux)",
            "NCLU / NVUE / file-based",
            T2,
            L1Inventory,
            l1_inventory_only,
            "Multi-format: /etc/network/interfaces, FRR, NVUE YAML.",
        ),
        p(
            "vyos",
            "VyOS",
            "VyOS",
            "open-source router",
            "hierarchical set",
            T3,
            L1Inventory,
            l1_inventory_only,
            "Junos-like set format.",
        ),
        p(
            "ubiquiti-edgeos-unifi",
            "Ubiquiti",
            "EdgeOS / UniFi Network",
            "SMB / prosumer router and controller-managed gear",
            "hierarchical set (EdgeOS) and controller-managed JSON (UniFi)",
            T3,
            L0Identify,
            l1_identify_only,
            "EdgeOS is Vyatta-derived; UniFi per-device config derives from controller templates.",
        ),
        p(
            "checkpoint-gaia",
            "Check Point",
            "Gaia",
            "firewall",
            "clish + dbedit + policy DB",
            T3,
            L0Identify,
            l1_identify_only,
            "Policy lives in management server, not gateway config. V1 scope = gateway clish only.",
        ),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    const REQUIRED_IDS: &[&str] = &[
        "cisco-iosxe",
        "cisco-iosxr",
        "cisco-nxos",
        "juniper-junos",
        "arista-eos",
        "mikrotik-routeros",
        "fortinet-fortios",
        "paloalto-panos",
        "huawei-vrp",
        "nokia-sros",
        "aruba-aoscx",
        "dell-os10",
        "extreme-exos-voss",
        "nvidia-cumulus",
        "vyos",
        "ubiquiti-edgeos-unifi",
        "checkpoint-gaia",
    ];

    #[test]
    fn registry_is_non_empty() {
        assert!(!list_platforms().is_empty());
    }

    #[test]
    fn platform_ids_are_unique() {
        let platforms = list_platforms();
        let mut seen: HashSet<&str> = HashSet::new();
        for p in &platforms {
            assert!(
                seen.insert(p.id.as_str()),
                "duplicate platform id: {}",
                p.id
            );
        }
        assert_eq!(seen.len(), platforms.len());
    }

    #[test]
    fn required_v1g_platforms_are_present() {
        let platforms = list_platforms();
        let ids: HashSet<&str> = platforms.iter().map(|p| p.id.as_str()).collect();
        for required in REQUIRED_IDS {
            assert!(
                ids.contains(required),
                "missing required V1G platform: {required}"
            );
        }
    }

    #[test]
    fn get_by_valid_id_returns_platform() {
        let p = get_platform("cisco-iosxe").expect("cisco-iosxe must exist");
        assert_eq!(p.id, "cisco-iosxe");
        assert_eq!(p.vendor, "Cisco");
    }

    #[test]
    fn get_by_invalid_id_returns_controlled_error() {
        let err = get_platform("not-a-real-platform").expect_err("must error");
        match err {
            VendorRegistryError::UnknownPlatform { id } => {
                assert_eq!(id, "not-a-real-platform");
            }
        }
    }

    #[test]
    fn flagship_platforms_have_sensible_capability_families() {
        use CapabilityFamily::*;
        let must_have_routerish = [Interfaces, IpAddressing, Vlans, Vrfs];
        for id in ["cisco-iosxe", "juniper-junos", "arista-eos"] {
            let p = get_platform(id).unwrap();
            for cap in &must_have_routerish {
                assert!(
                    p.capability_families.contains(cap),
                    "{id} missing capability {cap:?}"
                );
            }
        }

        let routeros = get_platform("mikrotik-routeros").unwrap();
        assert!(routeros.capability_families.contains(&Interfaces));
        assert!(routeros.capability_families.contains(&IpAddressing));

        let forti = get_platform("fortinet-fortios").unwrap();
        for cap in [Interfaces, IpAddressing, AclFirewall, Nat, VpnTunnels] {
            assert!(
                forti.capability_families.contains(&cap),
                "fortinet-fortios missing capability {cap:?}"
            );
        }
    }

    #[test]
    fn no_platform_has_empty_required_text_fields() {
        for p in list_platforms() {
            assert!(!p.id.is_empty(), "platform has empty id");
            assert!(!p.vendor.is_empty(), "{} has empty vendor", p.id);
            assert!(!p.os_family.is_empty(), "{} has empty os_family", p.id);
            assert!(
                !p.config_style.is_empty(),
                "{} has empty config_style",
                p.id
            );
            assert!(
                !p.primary_role.is_empty(),
                "{} has empty primary_role",
                p.id
            );
        }
    }

    #[test]
    fn parser_maturity_targets_are_at_least_l0() {
        for p in list_platforms() {
            assert!(
                p.initial_parser_target_level >= ParserMaturity::L0Identify,
                "{} below L0",
                p.id
            );
        }
    }
}
