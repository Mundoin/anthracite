//! Config Detection Engine — V1J.
//!
//! Deterministic vendor / platform / OS family detection from raw config
//! text. Runs before any parser; the answer is keyed against the V1H
//! Vendor Registry so downstream parsers (V1K+) can bind on a stable
//! platform id.
//!
//! Boundary (per `ENGINE_AND_API_BOUNDARIES.md`):
//!   - Owns:    signature table, weighted scoring, ranked candidates,
//!              evidence trail, controlled error handling.
//!   - Does NOT own: parsing, model population beyond PlatformRef,
//!                   live collection, topology.
//!
//! Doctrine: deterministic, no LLM, no heuristics that depend on input
//! ordering past line numbers. Same bytes in → same result out.

use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};

use crate::engines::network_model::PlatformRef;
use crate::engines::vendor_registry;

/// Maximum length of a captured evidence preview. Long enough to be
/// useful, short enough that detection results never bloat with config.
const PREVIEW_MAX_CHARS: usize = 120;

/// Cap on lines scanned. Above this, detection scans the head; full
/// parsing comes later. Keeps detection bounded on huge archives.
const MAX_LINES_SCANNED: usize = 20_000;

/// Below this score, the best candidate is not promoted to a match.
const MIN_CONFIDENCE_FOR_MATCH: f32 = 0.45;

/// Minimum total weighted evidence required to consider the input
/// non-trivial. Below this we emit a low-confidence warning.
const LOW_CONFIDENCE_WEIGHT_THRESHOLD: f32 = 3.0;

// =====================================================================
// Public result types
// =====================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct ConfigDetectionResult {
    pub best_match: Option<PlatformRef>,
    pub candidates: Vec<DetectionCandidate>,
    pub evidence: Vec<DetectionEvidence>,
    pub confidence: f32,
    pub warnings: Vec<DetectionWarning>,
    pub scanned_line_count: u64,
    pub total_line_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct DetectionCandidate {
    pub platform_id: String,
    pub score: f32,
    pub normalized_score: f32,
    pub match_count: u32,
    pub distinct_signature_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct DetectionEvidence {
    pub platform_id: String,
    pub signature_id: String,
    pub category: SignatureCategory,
    pub weight: f32,
    pub line_number: u64,
    pub preview: String,
    pub reason: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SignatureCategory {
    /// Generic, vendor-overlapping markers (e.g. `hostname `).
    Generic,
    /// Strong vendor markers (e.g. `feature interface-vlan`).
    Distinctive,
    /// Headers or banners that nearly uniquely identify a platform.
    Header,
    /// Block / stanza shape unique to a config style.
    Structural,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum DetectionWarning {
    EmptyInput,
    InputTruncated { scanned: u64, total: u64 },
    LowConfidence { best_score: f32 },
    Ambiguous { top_score: f32, runner_up_score: f32 },
    NoSignaturesMatched,
}

// =====================================================================
// Signature table
// =====================================================================

#[derive(Debug, Clone, Copy)]
struct Signature {
    platform_id: &'static str,
    signature_id: &'static str,
    pattern: SignaturePattern,
    category: SignatureCategory,
    weight: f32,
}

#[derive(Debug, Clone, Copy)]
enum SignaturePattern {
    /// Line starts with this literal (after trimming leading whitespace).
    StartsWith(&'static str),
    /// Substring appears anywhere in the line.
    Contains(&'static str),
    /// Line trimmed equals this exact literal.
    Equals(&'static str),
}

fn signatures() -> &'static [Signature] {
    use SignatureCategory::*;
    use SignaturePattern::*;

    // Weight conventions:
    //   3.5  Header / near-unique identifier.
    //   2.5  Strong distinctive vendor keyword.
    //   1.5  Moderately distinctive.
    //   0.5  Generic / shared across vendors.
    &[
        // ---------- cisco-ios ----------
        S { platform_id: "cisco-ios", signature_id: "ios.classic-boot-system", pattern: StartsWith("boot system "), category: Header, weight: 3.5 },
        S { platform_id: "cisco-ios", signature_id: "ios.classic-service-pad", pattern: Equals("service pad"), category: Header, weight: 3.5 },
        S { platform_id: "cisco-ios", signature_id: "ios.classic-interface-fastethernet", pattern: StartsWith("interface FastEthernet"), category: Distinctive, weight: 2.5 },
        S { platform_id: "cisco-ios", signature_id: "ios.classic-interface-serial", pattern: StartsWith("interface Serial"), category: Distinctive, weight: 2.5 },
        S { platform_id: "cisco-ios", signature_id: "ios.classic-line-aux", pattern: StartsWith("line aux "), category: Distinctive, weight: 2.5 },
        S { platform_id: "cisco-ios", signature_id: "ios.classic-ip-classless", pattern: Equals("ip classless"), category: Generic, weight: 0.5 },

        // ---------- cisco-iosxe ----------
        S { platform_id: "cisco-iosxe", signature_id: "iosxe.service-timestamps", pattern: StartsWith("service timestamps "), category: Distinctive, weight: 2.5 },
        S { platform_id: "cisco-iosxe", signature_id: "iosxe.boot-start-marker", pattern: Equals("boot-start-marker"), category: Header, weight: 3.5 },
        S { platform_id: "cisco-iosxe", signature_id: "iosxe.boot-end-marker", pattern: Equals("boot-end-marker"), category: Header, weight: 3.5 },
        S { platform_id: "cisco-iosxe", signature_id: "iosxe.line-vty", pattern: StartsWith("line vty "), category: Distinctive, weight: 1.5 },
        S { platform_id: "cisco-iosxe", signature_id: "iosxe.interface-gig", pattern: StartsWith("interface GigabitEthernet"), category: Distinctive, weight: 1.5 },
        S { platform_id: "cisco-iosxe", signature_id: "iosxe.ip-route", pattern: StartsWith("ip route "), category: Distinctive, weight: 1.5 },
        S { platform_id: "cisco-iosxe", signature_id: "iosxe.router-ospf", pattern: StartsWith("router ospf "), category: Distinctive, weight: 1.5 },
        S { platform_id: "cisco-iosxe", signature_id: "iosxe.router-bgp", pattern: StartsWith("router bgp "), category: Distinctive, weight: 1.5 },
        S { platform_id: "cisco-iosxe", signature_id: "iosxe.no-ip-domain-lookup", pattern: Equals("no ip domain lookup"), category: Distinctive, weight: 1.5 },

        // ---------- cisco-iosxr ----------
        S { platform_id: "cisco-iosxr", signature_id: "iosxr.banner", pattern: Contains("!! IOS XR Configuration"), category: Header, weight: 3.5 },
        S { platform_id: "cisco-iosxr", signature_id: "iosxr.rp-prompt", pattern: Contains("RP/0/"), category: Header, weight: 3.5 },
        S { platform_id: "cisco-iosxr", signature_id: "iosxr.interface-100ge", pattern: StartsWith("interface HundredGigE"), category: Distinctive, weight: 2.5 },
        S { platform_id: "cisco-iosxr", signature_id: "iosxr.route-policy", pattern: StartsWith("route-policy "), category: Distinctive, weight: 2.5 },
        S { platform_id: "cisco-iosxr", signature_id: "iosxr.prefix-set", pattern: StartsWith("prefix-set "), category: Distinctive, weight: 2.5 },
        S { platform_id: "cisco-iosxr", signature_id: "iosxr.commit-bare", pattern: Equals("commit"), category: Generic, weight: 0.5 },
        S { platform_id: "cisco-iosxr", signature_id: "iosxr.router-bgp", pattern: StartsWith("router bgp "), category: Generic, weight: 0.5 },

        // ---------- cisco-nxos ----------
        S { platform_id: "cisco-nxos", signature_id: "nxos.feature-ivlan", pattern: Equals("feature interface-vlan"), category: Header, weight: 3.5 },
        S { platform_id: "cisco-nxos", signature_id: "nxos.feature-bgp", pattern: Equals("feature bgp"), category: Distinctive, weight: 2.5 },
        S { platform_id: "cisco-nxos", signature_id: "nxos.feature-lacp", pattern: Equals("feature lacp"), category: Distinctive, weight: 2.5 },
        S { platform_id: "cisco-nxos", signature_id: "nxos.vrf-context", pattern: StartsWith("vrf context "), category: Distinctive, weight: 2.5 },
        S { platform_id: "cisco-nxos", signature_id: "nxos.boot-nxos", pattern: StartsWith("boot nxos "), category: Header, weight: 3.5 },
        S { platform_id: "cisco-nxos", signature_id: "nxos.interface-eth", pattern: StartsWith("interface Ethernet"), category: Generic, weight: 0.5 },
        S { platform_id: "cisco-nxos", signature_id: "nxos.switchport-trunk", pattern: Contains("switchport mode trunk"), category: Generic, weight: 0.5 },

        // ---------- juniper-junos ----------
        S { platform_id: "juniper-junos", signature_id: "junos.set-system-hostname", pattern: StartsWith("set system host-name "), category: Header, weight: 3.5 },
        S { platform_id: "juniper-junos", signature_id: "junos.set-interfaces", pattern: StartsWith("set interfaces "), category: Distinctive, weight: 2.5 },
        S { platform_id: "juniper-junos", signature_id: "junos.set-protocols", pattern: StartsWith("set protocols "), category: Distinctive, weight: 2.5 },
        S { platform_id: "juniper-junos", signature_id: "junos.set-routing-options", pattern: StartsWith("set routing-options "), category: Distinctive, weight: 2.5 },
        S { platform_id: "juniper-junos", signature_id: "junos.policy-options-set", pattern: StartsWith("set policy-options "), category: Distinctive, weight: 2.5 },
        S { platform_id: "juniper-junos", signature_id: "junos.brace-system", pattern: Equals("system {"), category: Structural, weight: 3.5 },
        S { platform_id: "juniper-junos", signature_id: "junos.brace-interfaces", pattern: Equals("interfaces {"), category: Structural, weight: 2.5 },
        S { platform_id: "juniper-junos", signature_id: "junos.brace-protocols", pattern: Equals("protocols {"), category: Structural, weight: 2.5 },
        S { platform_id: "juniper-junos", signature_id: "junos.brace-policy-options", pattern: Equals("policy-options {"), category: Structural, weight: 2.5 },
        S { platform_id: "juniper-junos", signature_id: "junos.brace-routing-options", pattern: Equals("routing-options {"), category: Structural, weight: 2.5 },

        // ---------- arista-eos ----------
        S { platform_id: "arista-eos", signature_id: "eos.daemon-terminattr", pattern: StartsWith("daemon TerminAttr"), category: Header, weight: 3.5 },
        S { platform_id: "arista-eos", signature_id: "eos.mgmt-api-http", pattern: StartsWith("management api http-commands"), category: Header, weight: 3.5 },
        S { platform_id: "arista-eos", signature_id: "eos.transceiver-qsfp", pattern: StartsWith("transceiver qsfp default-mode"), category: Distinctive, weight: 2.5 },
        S { platform_id: "arista-eos", signature_id: "eos.mlag-config", pattern: Equals("mlag configuration"), category: Distinctive, weight: 2.5 },
        S { platform_id: "arista-eos", signature_id: "eos.ip-routing", pattern: Equals("ip routing"), category: Distinctive, weight: 1.5 },
        S { platform_id: "arista-eos", signature_id: "eos.interface-eth", pattern: StartsWith("interface Ethernet"), category: Generic, weight: 0.5 },
        S { platform_id: "arista-eos", signature_id: "eos.router-bgp", pattern: StartsWith("router bgp "), category: Generic, weight: 0.5 },

        // ---------- mikrotik-routeros ----------
        S { platform_id: "mikrotik-routeros", signature_id: "routeros.interface-section", pattern: StartsWith("/interface"), category: Structural, weight: 3.5 },
        S { platform_id: "mikrotik-routeros", signature_id: "routeros.ip-address", pattern: StartsWith("/ip address"), category: Structural, weight: 3.5 },
        S { platform_id: "mikrotik-routeros", signature_id: "routeros.ip-route", pattern: StartsWith("/ip route"), category: Structural, weight: 2.5 },
        S { platform_id: "mikrotik-routeros", signature_id: "routeros.routing-bgp", pattern: StartsWith("/routing bgp"), category: Distinctive, weight: 2.5 },
        S { platform_id: "mikrotik-routeros", signature_id: "routeros.system-identity", pattern: StartsWith("/system identity"), category: Distinctive, weight: 2.5 },
        S { platform_id: "mikrotik-routeros", signature_id: "routeros.export-banner", pattern: Contains("# RouterOS"), category: Header, weight: 3.5 },

        // ---------- fortinet-fortios ----------
        S { platform_id: "fortinet-fortios", signature_id: "fortios.config-system-global", pattern: Equals("config system global"), category: Header, weight: 3.5 },
        S { platform_id: "fortinet-fortios", signature_id: "fortios.config-firewall-policy", pattern: Equals("config firewall policy"), category: Header, weight: 3.5 },
        S { platform_id: "fortinet-fortios", signature_id: "fortios.config-system-interface", pattern: Equals("config system interface"), category: Distinctive, weight: 2.5 },
        S { platform_id: "fortinet-fortios", signature_id: "fortios.set-vdom", pattern: StartsWith("set vdom "), category: Distinctive, weight: 2.5 },
        S { platform_id: "fortinet-fortios", signature_id: "fortios.next-keyword", pattern: Equals("next"), category: Generic, weight: 0.5 },
        S { platform_id: "fortinet-fortios", signature_id: "fortios.end-keyword", pattern: Equals("end"), category: Generic, weight: 0.5 },

        // ---------- paloalto-panos ----------
        S { platform_id: "paloalto-panos", signature_id: "panos.set-deviceconfig", pattern: StartsWith("set deviceconfig system"), category: Header, weight: 3.5 },
        S { platform_id: "paloalto-panos", signature_id: "panos.set-network-interface", pattern: StartsWith("set network interface"), category: Distinctive, weight: 2.5 },
        S { platform_id: "paloalto-panos", signature_id: "panos.set-rulebase-security", pattern: StartsWith("set rulebase security rules"), category: Distinctive, weight: 2.5 },
        S { platform_id: "paloalto-panos", signature_id: "panos.xml-deviceconfig", pattern: Contains("<deviceconfig>"), category: Header, weight: 3.5 },
        S { platform_id: "paloalto-panos", signature_id: "panos.xml-rulebase", pattern: Contains("<rulebase>"), category: Distinctive, weight: 2.5 },

        // ---------- huawei-vrp ----------
        S { platform_id: "huawei-vrp", signature_id: "vrp.sysname", pattern: StartsWith("sysname "), category: Header, weight: 3.5 },
        S { platform_id: "huawei-vrp", signature_id: "vrp.ip-route-static", pattern: StartsWith("ip route-static "), category: Distinctive, weight: 2.5 },
        S { platform_id: "huawei-vrp", signature_id: "vrp.return-keyword", pattern: Equals("return"), category: Distinctive, weight: 1.5 },
        S { platform_id: "huawei-vrp", signature_id: "vrp.ospf", pattern: StartsWith("ospf "), category: Distinctive, weight: 1.5 },
        S { platform_id: "huawei-vrp", signature_id: "vrp.bgp", pattern: StartsWith("bgp "), category: Distinctive, weight: 1.5 },
        S { platform_id: "huawei-vrp", signature_id: "vrp.interface-gig", pattern: StartsWith("interface GigabitEthernet"), category: Generic, weight: 0.5 },

        // ---------- nokia-sros ----------
        S { platform_id: "nokia-sros", signature_id: "sros.configure-router", pattern: StartsWith("configure router"), category: Header, weight: 3.5 },
        S { platform_id: "nokia-sros", signature_id: "sros.service-vprn", pattern: Contains("service vprn"), category: Distinctive, weight: 2.5 },
        S { platform_id: "nokia-sros", signature_id: "sros.router-base", pattern: Contains("router Base"), category: Distinctive, weight: 2.5 },
        S { platform_id: "nokia-sros", signature_id: "sros.exit-all", pattern: Equals("exit all"), category: Distinctive, weight: 2.5 },
        S { platform_id: "nokia-sros", signature_id: "sros.configure-slash", pattern: StartsWith("/configure"), category: Distinctive, weight: 2.5 },

        // ---------- aruba-aoscx ----------
        S { platform_id: "aruba-aoscx", signature_id: "aoscx.vsx", pattern: Equals("vsx"), category: Header, weight: 3.5 },
        S { platform_id: "aruba-aoscx", signature_id: "aoscx.interface-1-1", pattern: StartsWith("interface 1/1/"), category: Distinctive, weight: 2.5 },
        S { platform_id: "aruba-aoscx", signature_id: "aoscx.aaa-authentication", pattern: StartsWith("aaa authentication "), category: Generic, weight: 0.5 },
        S { platform_id: "aruba-aoscx", signature_id: "aoscx.router-ospf-v3", pattern: StartsWith("router ospfv3 "), category: Distinctive, weight: 1.5 },
        S { platform_id: "aruba-aoscx", signature_id: "aoscx.lag-keyword", pattern: StartsWith("interface lag "), category: Distinctive, weight: 1.5 },

        // ---------- dell-os10 ----------
        S { platform_id: "dell-os10", signature_id: "os10.interface-eth1", pattern: StartsWith("interface ethernet1/1/"), category: Header, weight: 3.5 },
        S { platform_id: "dell-os10", signature_id: "os10.spanning-tree-mode", pattern: StartsWith("spanning-tree mode "), category: Distinctive, weight: 1.5 },
        S { platform_id: "dell-os10", signature_id: "os10.ip-vrf", pattern: StartsWith("ip vrf "), category: Distinctive, weight: 1.5 },
        S { platform_id: "dell-os10", signature_id: "os10.router-bgp", pattern: StartsWith("router bgp "), category: Generic, weight: 0.5 },

        // ---------- extreme-exos-voss ----------
        S { platform_id: "extreme-exos-voss", signature_id: "exos.create-vlan", pattern: StartsWith("create vlan "), category: Header, weight: 3.5 },
        S { platform_id: "extreme-exos-voss", signature_id: "exos.configure-vlan", pattern: StartsWith("configure vlan "), category: Distinctive, weight: 2.5 },
        S { platform_id: "extreme-exos-voss", signature_id: "exos.enable-sharing", pattern: StartsWith("enable sharing "), category: Distinctive, weight: 2.5 },
        S { platform_id: "extreme-exos-voss", signature_id: "exos.configure-ospf", pattern: StartsWith("configure ospf "), category: Distinctive, weight: 2.5 },
        S { platform_id: "extreme-exos-voss", signature_id: "voss.interface-vlan", pattern: StartsWith("interface vlan "), category: Generic, weight: 0.5 },

        // ---------- nvidia-cumulus ----------
        S { platform_id: "nvidia-cumulus", signature_id: "cumulus.iface-swp", pattern: StartsWith("iface swp"), category: Header, weight: 3.5 },
        S { platform_id: "nvidia-cumulus", signature_id: "cumulus.auto-swp", pattern: StartsWith("auto swp"), category: Distinctive, weight: 2.5 },
        S { platform_id: "nvidia-cumulus", signature_id: "cumulus.nv-set", pattern: StartsWith("nv set "), category: Distinctive, weight: 2.5 },
        S { platform_id: "nvidia-cumulus", signature_id: "cumulus.net-add", pattern: StartsWith("net add "), category: Distinctive, weight: 2.5 },
        S { platform_id: "nvidia-cumulus", signature_id: "cumulus.frrouting-banner", pattern: Contains("FRRouting"), category: Header, weight: 3.5 },

        // ---------- vyos ----------
        S { platform_id: "vyos", signature_id: "vyos.set-protocols-bgp", pattern: StartsWith("set protocols bgp "), category: Distinctive, weight: 2.5 },
        S { platform_id: "vyos", signature_id: "vyos.set-protocols-static", pattern: StartsWith("set protocols static "), category: Distinctive, weight: 2.5 },
        S { platform_id: "vyos", signature_id: "vyos.set-service-ssh", pattern: StartsWith("set service ssh "), category: Distinctive, weight: 2.5 },
        S { platform_id: "vyos", signature_id: "vyos.set-interfaces-eth", pattern: StartsWith("set interfaces ethernet "), category: Generic, weight: 0.5 },
        S { platform_id: "vyos", signature_id: "vyos.vyatta-banner", pattern: Contains("vyos@"), category: Header, weight: 3.5 },

        // ---------- ubiquiti-edgeos-unifi ----------
        S { platform_id: "ubiquiti-edgeos-unifi", signature_id: "edgeos.set-service-nat", pattern: StartsWith("set service nat "), category: Distinctive, weight: 2.5 },
        S { platform_id: "ubiquiti-edgeos-unifi", signature_id: "edgeos.set-firewall-name", pattern: StartsWith("set firewall name "), category: Distinctive, weight: 2.5 },
        S { platform_id: "ubiquiti-edgeos-unifi", signature_id: "edgeos.ubnt-banner", pattern: Contains("ubnt@"), category: Header, weight: 3.5 },
        S { platform_id: "ubiquiti-edgeos-unifi", signature_id: "edgeos.interfaces-brace", pattern: Equals("interfaces {"), category: Generic, weight: 0.5 },
        S { platform_id: "ubiquiti-edgeos-unifi", signature_id: "unifi.unifi-marker", pattern: Contains("\"unifi\""), category: Distinctive, weight: 2.5 },

        // ---------- checkpoint-gaia ----------
        S { platform_id: "checkpoint-gaia", signature_id: "gaia.set-hostname", pattern: StartsWith("set hostname "), category: Distinctive, weight: 2.5 },
        S { platform_id: "checkpoint-gaia", signature_id: "gaia.set-interface", pattern: StartsWith("set interface "), category: Distinctive, weight: 2.5 },
        S { platform_id: "checkpoint-gaia", signature_id: "gaia.set-static-route", pattern: StartsWith("set static-route "), category: Distinctive, weight: 2.5 },
        S { platform_id: "checkpoint-gaia", signature_id: "gaia.set-snmp", pattern: StartsWith("set snmp "), category: Distinctive, weight: 1.5 },
        S { platform_id: "checkpoint-gaia", signature_id: "gaia.config-system-banner", pattern: Contains("config_system"), category: Header, weight: 3.5 },
        S { platform_id: "checkpoint-gaia", signature_id: "gaia.clish-banner", pattern: Contains("clish"), category: Distinctive, weight: 1.5 },
    ]
}

// Local type alias for ergonomic table entries.
#[allow(non_camel_case_types)]
type S = Signature;

// =====================================================================
// Engine entry point
// =====================================================================

pub fn detect_config_platform(config_text: &str) -> ConfigDetectionResult {
    let mut warnings: Vec<DetectionWarning> = Vec::new();
    let mut evidence: Vec<DetectionEvidence> = Vec::new();
    let mut scores: BTreeMap<&'static str, f32> = BTreeMap::new();
    let mut matches: BTreeMap<&'static str, u32> = BTreeMap::new();
    let mut distinct_sigs: BTreeMap<&'static str, HashSet<&'static str>> = BTreeMap::new();

    if config_text.trim().is_empty() {
        warnings.push(DetectionWarning::EmptyInput);
        return ConfigDetectionResult {
            best_match: None,
            candidates: Vec::new(),
            evidence,
            confidence: 0.0,
            warnings,
            scanned_line_count: 0,
            total_line_count: 0,
        };
    }

    let all_lines: Vec<&str> = config_text.lines().collect();
    let total_line_count = all_lines.len() as u64;
    let scanned_lines = all_lines.iter().take(MAX_LINES_SCANNED);
    let scanned_line_count = scanned_lines.len() as u64;

    if total_line_count > MAX_LINES_SCANNED as u64 {
        warnings.push(DetectionWarning::InputTruncated {
            scanned: scanned_line_count,
            total: total_line_count,
        });
    }

    let sigs = signatures();
    for (idx, raw_line) in all_lines.iter().take(MAX_LINES_SCANNED).enumerate() {
        let line = raw_line.trim_end_matches(['\r', '\n']);
        let trimmed = line.trim_start();
        if trimmed.is_empty() {
            continue;
        }
        let line_number = (idx as u64) + 1;

        for sig in sigs {
            if pattern_matches(sig.pattern, trimmed) {
                *scores.entry(sig.platform_id).or_insert(0.0) += sig.weight;
                *matches.entry(sig.platform_id).or_insert(0) += 1;
                distinct_sigs
                    .entry(sig.platform_id)
                    .or_default()
                    .insert(sig.signature_id);

                evidence.push(DetectionEvidence {
                    platform_id: sig.platform_id.to_string(),
                    signature_id: sig.signature_id.to_string(),
                    category: sig.category,
                    weight: sig.weight,
                    line_number,
                    preview: clip_preview(trimmed),
                    reason: format!("matched signature {}", sig.signature_id),
                });
            }
        }
    }

    let total_weight: f32 = scores.values().copied().sum();

    let mut candidates: Vec<DetectionCandidate> = scores
        .iter()
        .map(|(id, score)| {
            let normalized = if total_weight > 0.0 {
                score / total_weight
            } else {
                0.0
            };
            DetectionCandidate {
                platform_id: (*id).to_string(),
                score: *score,
                normalized_score: normalized,
                match_count: matches.get(id).copied().unwrap_or(0),
                distinct_signature_count: distinct_sigs
                    .get(id)
                    .map(|s| s.len() as u32)
                    .unwrap_or(0),
            }
        })
        .collect();

    // Deterministic ordering: score desc, then distinct sigs desc, then id asc.
    candidates.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(b.distinct_signature_count.cmp(&a.distinct_signature_count))
            .then(a.platform_id.cmp(&b.platform_id))
    });

    if candidates.is_empty() {
        warnings.push(DetectionWarning::NoSignaturesMatched);
        return ConfigDetectionResult {
            best_match: None,
            candidates,
            evidence,
            confidence: 0.0,
            warnings,
            scanned_line_count,
            total_line_count,
        };
    }

    if total_weight < LOW_CONFIDENCE_WEIGHT_THRESHOLD {
        warnings.push(DetectionWarning::LowConfidence {
            best_score: candidates[0].score,
        });
    }

    if candidates.len() >= 2 {
        let top = candidates[0].normalized_score;
        let runner = candidates[1].normalized_score;
        // Ambiguous when runner-up is within 60% of the top score.
        if top > 0.0 && runner / top >= 0.6 {
            warnings.push(DetectionWarning::Ambiguous {
                top_score: top,
                runner_up_score: runner,
            });
        }
    }

    let confidence = candidates[0].normalized_score;
    let best_match = if confidence >= MIN_CONFIDENCE_FOR_MATCH {
        let id = &candidates[0].platform_id;
        vendor_registry::get_platform(id).ok().map(|vp| PlatformRef {
            platform_id: Some(vp.id),
            vendor: Some(vp.vendor),
            os_family: Some(vp.os_family),
            os_version_raw: None,
            os_version_normalized: None,
            detection_confidence: Some(confidence),
        })
    } else {
        None
    };

    // Cap evidence to avoid runaway results on huge configs; keep deterministic
    // order (already insertion-ordered, which is line-ordered).
    if evidence.len() > 256 {
        evidence.truncate(256);
    }

    ConfigDetectionResult {
        best_match,
        candidates,
        evidence,
        confidence,
        warnings,
        scanned_line_count,
        total_line_count,
    }
}

fn pattern_matches(pattern: SignaturePattern, trimmed_line: &str) -> bool {
    match pattern {
        SignaturePattern::StartsWith(s) => trimmed_line.starts_with(s),
        SignaturePattern::Contains(s) => trimmed_line.contains(s),
        SignaturePattern::Equals(s) => trimmed_line.trim_end() == s,
    }
}

fn clip_preview(line: &str) -> String {
    if line.chars().count() <= PREVIEW_MAX_CHARS {
        return line.to_string();
    }
    let mut out: String = line.chars().take(PREVIEW_MAX_CHARS).collect();
    out.push('…');
    out
}

// =====================================================================
// Tests
// =====================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    fn detect(input: &str) -> ConfigDetectionResult {
        detect_config_platform(input)
    }

    fn assert_best(input: &str, expected: &str) {
        let r = detect(input);
        let best = r
            .best_match
            .as_ref()
            .unwrap_or_else(|| panic!("expected best match {expected}, got none; candidates={:?}", r.candidates));
        let id = best.platform_id.as_deref().unwrap_or("");
        assert_eq!(
            id, expected,
            "expected best={expected}, got {id}; candidates={:?}",
            r.candidates
        );
    }

    #[test]
    fn empty_input_returns_controlled_no_match() {
        let r = detect("");
        assert!(r.best_match.is_none());
        assert!(r.candidates.is_empty());
        assert_eq!(r.confidence, 0.0);
        assert!(r.warnings.contains(&DetectionWarning::EmptyInput));
    }

    #[test]
    fn whitespace_only_input_returns_controlled_no_match() {
        let r = detect("   \n\n\t  \n");
        assert!(r.best_match.is_none());
        assert!(r.warnings.contains(&DetectionWarning::EmptyInput));
    }

    #[test]
    fn cisco_iosxe_sample_detects_cisco_iosxe() {
        let cfg = r#"
version 17.9
service timestamps debug datetime msec
service timestamps log datetime msec
boot-start-marker
boot-end-marker
hostname core-01
no ip domain lookup
interface GigabitEthernet0/0/0
 description WAN
 ip address 10.0.0.1 255.255.255.0
ip route 0.0.0.0 0.0.0.0 10.0.0.254
router ospf 1
 router-id 10.0.0.1
router bgp 65001
 neighbor 10.0.0.254 remote-as 65000
line vty 0 4
 transport input ssh
end
"#;
        assert_best(cfg, "cisco-iosxe");
    }

    #[test]
    fn cisco_ios_sample_detects_cisco_ios() {
        let cfg = r#"
version 12.4
service pad
boot system flash:c2960-lanbasek9-mz.150-2.SE.bin
hostname core-01
ip classless
interface FastEthernet0/0
 ip address 10.0.0.1 255.255.255.0
interface Serial0/0
 ip address 192.0.2.1 255.255.255.252
line aux 0
 transport input none
"#;
        assert_best(cfg, "cisco-ios");
    }

    #[test]
    fn cisco_iosxr_sample_detects_cisco_iosxr() {
        let cfg = r#"
!! IOS XR Configuration 7.5.2
!! Last configuration change at Wed May 14 12:30:55 UTC 2026 by admin
hostname pe-01
interface HundredGigE0/0/0/0
 ipv4 address 192.0.2.1 255.255.255.0
!
route-policy PASS-ALL
  pass
end-policy
prefix-set CUSTOMER-A
  192.0.2.0/24
end-set
router bgp 65000
 bgp router-id 192.0.2.1
!
RP/0/RP0/CPU0:pe-01#commit
commit
"#;
        assert_best(cfg, "cisco-iosxr");
    }

    #[test]
    fn cisco_nxos_sample_detects_cisco_nxos() {
        let cfg = r#"
boot nxos bootflash:/nxos.9.3.10.bin
feature interface-vlan
feature bgp
feature lacp
hostname leaf-01
vrf context CUSTOMER-A
  rd auto
  address-family ipv4 unicast
interface Ethernet1/1
  switchport mode trunk
  switchport trunk allowed vlan 10,20,30
"#;
        assert_best(cfg, "cisco-nxos");
    }

    #[test]
    fn junos_set_style_sample_detects_juniper_junos() {
        let cfg = r#"
set system host-name pe-edge
set interfaces ge-0/0/0 unit 0 family inet address 10.0.0.1/30
set protocols ospf area 0.0.0.0 interface ge-0/0/0
set routing-options router-id 10.0.0.1
set policy-options policy-statement EXPORT term ACCEPT then accept
"#;
        assert_best(cfg, "juniper-junos");
    }

    #[test]
    fn junos_brace_style_sample_detects_juniper_junos() {
        let cfg = r#"
system {
    host-name pe-edge;
    services {
        ssh;
    }
}
interfaces {
    ge-0/0/0 {
        unit 0 {
            family inet { address 10.0.0.1/30; }
        }
    }
}
protocols {
    ospf {
        area 0.0.0.0 { interface ge-0/0/0.0; }
    }
}
routing-options {
    router-id 10.0.0.1;
}
policy-options {
    policy-statement EXPORT { term ACCEPT { then accept; } }
}
"#;
        assert_best(cfg, "juniper-junos");
    }

    #[test]
    fn arista_eos_sample_detects_arista_eos() {
        let cfg = r#"
daemon TerminAttr
   exec /usr/bin/TerminAttr -ingestgrpcurl=127.0.0.1:9910
   no shutdown
!
hostname leaf-01
transceiver qsfp default-mode 4x10G
mlag configuration
   domain-id leaf
   local-interface Vlan4094
ip routing
interface Ethernet1
   no switchport
   ip address 10.0.0.1/30
management api http-commands
   no shutdown
router bgp 65001
"#;
        assert_best(cfg, "arista-eos");
    }

    #[test]
    fn mikrotik_sample_detects_mikrotik_routeros() {
        let cfg = r#"
# RouterOS 7.10
/system identity
set name=edge-router
/interface
add name=ether1 type=ether
/ip address
add address=10.0.0.1/30 interface=ether1
/ip route
add dst-address=0.0.0.0/0 gateway=10.0.0.2
/routing bgp connection
add as=65001 remote.address=10.0.0.2
"#;
        assert_best(cfg, "mikrotik-routeros");
    }

    #[test]
    fn fortios_sample_detects_fortinet_fortios() {
        let cfg = r#"
config system global
    set hostname fgt-01
    set timezone 12
end
config system interface
    edit "port1"
        set vdom "root"
        set ip 10.0.0.1 255.255.255.0
        set allowaccess ping ssh https
    next
end
config firewall policy
    edit 1
        set name "wan-out"
        set srcintf "port2"
        set dstintf "port1"
        set action accept
    next
end
"#;
        assert_best(cfg, "fortinet-fortios");
    }

    #[test]
    fn huawei_vrp_sample_detects_huawei_vrp() {
        let cfg = r#"
sysname core-hw
interface GigabitEthernet0/0/1
 ip address 10.0.0.1 255.255.255.0
ip route-static 0.0.0.0 0.0.0.0 10.0.0.254
ospf 1
 area 0.0.0.0
  network 10.0.0.0 0.0.0.255
bgp 65001
 peer 10.0.0.254 as-number 65000
return
"#;
        assert_best(cfg, "huawei-vrp");
    }

    #[test]
    fn ambiguous_generic_input_returns_candidates_and_warning() {
        let cfg = r#"
hostname device-01
interface Ethernet1
router bgp 65000
"#;
        let r = detect(cfg);
        let has_ambig_or_low = r.warnings.iter().any(|w| {
            matches!(
                w,
                DetectionWarning::Ambiguous { .. } | DetectionWarning::LowConfidence { .. }
            )
        });
        assert!(
            has_ambig_or_low,
            "expected ambiguous or low-confidence warning, got {:?}",
            r.warnings
        );
        assert!(
            r.candidates.len() >= 2,
            "expected multiple candidates, got {:?}",
            r.candidates
        );
    }

    #[test]
    fn all_returned_platform_ids_exist_in_vendor_registry() {
        let valid: HashSet<String> = vendor_registry::list_platforms()
            .into_iter()
            .map(|p| p.id)
            .collect();
        for sig in signatures() {
            assert!(
                valid.contains(sig.platform_id),
                "signature references unknown platform id: {}",
                sig.platform_id
            );
        }
    }

    #[test]
    fn evidence_trail_contains_line_signature_weight_reason() {
        let cfg = "boot-start-marker\nrouter bgp 65001\n";
        let r = detect(cfg);
        assert!(!r.evidence.is_empty());
        let e = &r.evidence[0];
        assert!(e.line_number >= 1);
        assert!(!e.signature_id.is_empty());
        assert!(e.weight > 0.0);
        assert!(!e.reason.is_empty());
        assert!(!e.preview.is_empty());
    }

    #[test]
    fn detection_is_deterministic_for_repeated_calls() {
        let cfg = r#"
boot-start-marker
hostname r1
interface GigabitEthernet0/0
ip route 0.0.0.0 0.0.0.0 10.0.0.1
router bgp 65001
"#;
        let a = detect(cfg);
        let b = detect(cfg);
        let c = detect(cfg);
        assert_eq!(a, b);
        assert_eq!(b, c);
    }

    #[test]
    fn best_match_carries_registry_metadata() {
        let cfg = r#"
boot-start-marker
boot-end-marker
service timestamps log datetime msec
hostname r1
interface GigabitEthernet0/0
router ospf 1
router bgp 65001
"#;
        let r = detect(cfg);
        let best = r.best_match.expect("expected match");
        assert_eq!(best.platform_id.as_deref(), Some("cisco-iosxe"));
        assert_eq!(best.vendor.as_deref(), Some("Cisco"));
        assert!(best.os_family.is_some());
        assert!(best.detection_confidence.is_some());
    }

    #[test]
    fn preview_is_clipped_for_long_lines() {
        let long_line = format!("service timestamps log datetime msec {}", "x".repeat(500));
        let r = detect(&long_line);
        assert!(!r.evidence.is_empty(), "expected match; warnings={:?}", r.warnings);
        let preview = &r.evidence[0].preview;
        assert!(preview.chars().count() <= PREVIEW_MAX_CHARS + 1);
    }
}
