//! Receipt projection — V1L.
//!
//! Receipts are a **view** over `DeviceModel`, not a parallel truth.
//! `project_receipt(&DeviceModel) -> ReceiptView` flattens the parsed
//! device shape into a UI-friendly summary: who parsed what, how much
//! landed, what landed where, what was unknown, what warnings fired.
//!
//! ## Hard rules (per V1L proposal §receipt)
//!
//! - Pure. No I/O. No mutation. Read-only over the input model.
//! - No parsing. The input model is already authoritative.
//! - Deterministic. `Vec` ordering only; no `HashMap` in any output path.
//! - Unknowns are capped at [`MAX_UNKNOWNS`] (256). The cap is signalled
//!   by [`ReceiptView::unknowns_truncated`].
//! - Receipt is parser-agnostic: it consumes the canonical model and the
//!   warning vocabulary that any parser uses (`absent:<area>` /
//!   `not_in_scope:<area>`). No cisco-iosxe-specific assumptions.
//!
//! ## Vocabulary
//!
//! The area-derivation logic walks `parse_confidence.warnings` for two
//! parser-emitted prefixes:
//!
//! - `absent:<area>`       — area is in the parser's coverage list but
//!                           the config did not populate it.
//! - `not_in_scope:<area>` — parser does not parse this area at this
//!                           maturity (see PARSER_COVERAGE_AREAS.md).
//!
//! Populated areas are inferred structurally by inspecting the model
//! fields directly. Any warning that does not match the two prefixes
//! falls through into `ReceiptView::warnings`.

use serde::{Deserialize, Serialize};

use super::network_model::{
    DeviceModel, EvidenceSourceKind, InterfaceKind, ParserMaturityObserved,
    ServiceKind, UnknownConfigLine, UnknownReason,
};

/// Maximum number of [`ReceiptUnknown`] entries emitted. Larger corpora
/// set [`ReceiptView::unknowns_truncated`] to `true` and drop the tail.
pub const MAX_UNKNOWNS: usize = 256;

const ABSENT_PREFIX: &str = "absent:";
const NOT_IN_SCOPE_PREFIX: &str = "not_in_scope:";

// =====================================================================
// Output types
// =====================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReceiptAreaStatus {
    Populated,
    Absent,
    NotInScope,
    Warning,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct ReceiptArea {
    pub name: String,
    pub status: ReceiptAreaStatus,
    pub populated_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct ReceiptUnknown {
    pub line_start: Option<u64>,
    pub line_end: Option<u64>,
    pub context_path: Option<String>,
    pub reason: Option<UnknownReason>,
    pub raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct ReceiptView {
    pub hostname: Option<String>,
    pub platform_id: Option<String>,
    pub os_version: Option<String>,
    pub source: Option<String>,
    pub source_kind: Option<EvidenceSourceKind>,
    pub byte_size: Option<u64>,
    pub line_count: Option<u64>,
    pub parser_version: Option<String>,
    pub registry_version: Option<String>,
    pub score: Option<f32>,
    pub coverage_ratio: f32,
    pub parsed_line_count: u64,
    pub unknown_line_count: u64,
    pub observed_maturity: Option<ParserMaturityObserved>,
    pub areas: Vec<ReceiptArea>,
    pub warnings: Vec<String>,
    pub unknowns: Vec<ReceiptUnknown>,
    pub unknowns_truncated: bool,
}

// =====================================================================
// Projection entry point
// =====================================================================

pub fn project_receipt(model: &DeviceModel) -> ReceiptView {
    let conf = &model.parse_confidence;

    // ---------- warnings split into structured area lists ------------
    let mut absent: Vec<String> = Vec::new();
    let mut not_in_scope: Vec<String> = Vec::new();
    let mut other_warnings: Vec<String> = Vec::new();
    for w in &conf.warnings {
        if let Some(area) = w.strip_prefix(ABSENT_PREFIX) {
            absent.push(area.to_string());
        } else if let Some(area) = w.strip_prefix(NOT_IN_SCOPE_PREFIX) {
            not_in_scope.push(area.to_string());
        } else {
            other_warnings.push(w.clone());
        }
    }
    absent.sort();
    absent.dedup();
    not_in_scope.sort();
    not_in_scope.dedup();
    other_warnings.sort();
    other_warnings.dedup();

    // ---------- populated areas inferred structurally ----------------
    let mut areas: Vec<ReceiptArea> = Vec::new();

    let identity_populated = identity_populated_count(model);
    if identity_populated > 0 {
        areas.push(area("identity", ReceiptAreaStatus::Populated, identity_populated));
    }
    if model.platform.platform_id.is_some() {
        areas.push(area("platform", ReceiptAreaStatus::Populated, 1));
    }
    push_count_area(&mut areas, "interfaces", model.interfaces.len());
    let ip_count: usize = model
        .interfaces
        .iter()
        .map(|i| i.ipv4_addresses.len() + i.ipv6_addresses.len())
        .sum();
    if ip_count > 0 {
        areas.push(area(
            "ip_addressing",
            ReceiptAreaStatus::Populated,
            ip_count as u32,
        ));
    }
    push_count_area(&mut areas, "vlans", model.vlans.len());
    push_count_area(&mut areas, "vrfs", model.vrfs.len());
    push_count_area(&mut areas, "static_routes", model.static_routes.len());
    push_count_area(&mut areas, "lag_groups", model.lag_groups.len());

    // Per-service-kind populated areas keep the structural shape symmetric
    // with the parser's `services_*` warning vocabulary.
    for (kind, area_name) in [
        (ServiceKind::Ssh, "services_ssh"),
        (ServiceKind::Snmp, "services_snmp"),
        (ServiceKind::Ntp, "services_ntp"),
        (ServiceKind::Dns, "services_dns"),
        (ServiceKind::Syslog, "services_syslog"),
    ] {
        let n = model.services.iter().filter(|s| s.kind == kind).count();
        if n > 0 {
            areas.push(area(area_name, ReceiptAreaStatus::Populated, n as u32));
        }
    }

    // Management surface — surfaced for the operator even though it's
    // derived from identity + interface classification.
    let mgmt_iface_count = model
        .interfaces
        .iter()
        .filter(|i| matches!(i.kind, InterfaceKind::Management))
        .count();
    if mgmt_iface_count > 0 {
        areas.push(area(
            "management",
            ReceiptAreaStatus::Populated,
            mgmt_iface_count as u32,
        ));
    }

    // Append absent + not-in-scope areas, skipping any name that is
    // already represented as populated.
    let populated_names: Vec<String> = areas.iter().map(|a| a.name.clone()).collect();
    for name in absent {
        if !populated_names.contains(&name) {
            areas.push(area(&name, ReceiptAreaStatus::Absent, 0));
        }
    }
    for name in not_in_scope {
        if !populated_names.iter().any(|p| p == &name) {
            areas.push(area(&name, ReceiptAreaStatus::NotInScope, 0));
        }
    }
    areas.sort_by(|a, b| a.name.cmp(&b.name));

    // ---------- unknowns -------------------------------------------------
    let total_unknowns = model.unknown_lines.len();
    let take = total_unknowns.min(MAX_UNKNOWNS);
    let mut unknowns: Vec<ReceiptUnknown> = model
        .unknown_lines
        .iter()
        .take(take)
        .map(project_unknown)
        .collect();
    // Already sorted by line_number upstream; keep stable.
    unknowns.sort_by(|a, b| {
        a.line_start
            .unwrap_or(0)
            .cmp(&b.line_start.unwrap_or(0))
            .then(a.raw.cmp(&b.raw))
    });
    let unknowns_truncated = total_unknowns > MAX_UNKNOWNS;

    // ---------- coverage ratio (parsed / (parsed + unknown)) ---------
    let denom = conf.parsed_line_count.saturating_add(conf.unknown_line_count);
    let coverage_ratio = if denom == 0 {
        0.0
    } else {
        let r = (conf.parsed_line_count as f32) / (denom as f32);
        // Round to 4dp to keep the value byte-stable in serialisation.
        (r * 10_000.0).round() / 10_000.0
    };

    ReceiptView {
        hostname: model.identity.hostname.clone(),
        platform_id: model.platform.platform_id.clone(),
        os_version: model
            .platform
            .os_version_normalized
            .clone()
            .or_else(|| model.platform.os_version_raw.clone()),
        source: model.evidence.source.clone(),
        source_kind: model.evidence.source_kind,
        byte_size: model.evidence.byte_size,
        line_count: model.evidence.line_count,
        parser_version: model.evidence.parser_version.clone(),
        registry_version: model.evidence.registry_version.clone(),
        score: conf.score,
        coverage_ratio,
        parsed_line_count: conf.parsed_line_count,
        unknown_line_count: conf.unknown_line_count,
        observed_maturity: conf.maturity_observed,
        areas,
        warnings: other_warnings,
        unknowns,
        unknowns_truncated,
    }
}

// =====================================================================
// Internals
// =====================================================================

fn area(name: &str, status: ReceiptAreaStatus, populated_count: u32) -> ReceiptArea {
    ReceiptArea {
        name: name.to_string(),
        status,
        populated_count,
    }
}

fn push_count_area(areas: &mut Vec<ReceiptArea>, name: &str, count: usize) {
    if count > 0 {
        areas.push(area(name, ReceiptAreaStatus::Populated, count as u32));
    }
}

fn identity_populated_count(model: &DeviceModel) -> u32 {
    let id = &model.identity;
    let mut n = 0u32;
    if id.hostname.is_some() {
        n += 1;
    }
    if id.chassis.is_some() {
        n += 1;
    }
    n += id.serial_numbers.len() as u32;
    n += id.management_ips.len() as u32;
    if id.last_change_marker.is_some() {
        n += 1;
    }
    n
}

fn project_unknown(u: &UnknownConfigLine) -> ReceiptUnknown {
    ReceiptUnknown {
        line_start: u.line_number,
        line_end: u.line_number,
        context_path: u.context_path.clone(),
        reason: u.reason,
        raw: u.raw.clone(),
    }
}

// =====================================================================
// Tests
// =====================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engines::network_model::{
        DeviceIdentity, EvidenceMetadata, InterfaceModel, ParseConfidence, PlatformRef,
        ServiceModel, VlanModel, VlanState,
    };

    fn base_model() -> DeviceModel {
        DeviceModel {
            identity: DeviceIdentity {
                hostname: Some("rcpt-test".to_string()),
                ..DeviceIdentity::default()
            },
            platform: PlatformRef {
                platform_id: Some("cisco-iosxe".to_string()),
                vendor: Some("Cisco".to_string()),
                os_family: Some("IOS / IOS XE".to_string()),
                os_version_raw: Some("17.9.3".to_string()),
                os_version_normalized: Some("17.9.3".to_string()),
                ..PlatformRef::default()
            },
            evidence: EvidenceMetadata {
                parser_version: Some("2".to_string()),
                byte_size: Some(123),
                line_count: Some(10),
                ..EvidenceMetadata::default()
            },
            parse_confidence: ParseConfidence {
                parsed_line_count: 9,
                unknown_line_count: 1,
                ..ParseConfidence::default()
            },
            ..DeviceModel::default()
        }
    }

    #[test]
    fn projection_is_pure_and_idempotent() {
        let m = base_model();
        let r1 = project_receipt(&m);
        let r2 = project_receipt(&m);
        assert_eq!(r1, r2, "projection must be deterministic");
    }

    #[test]
    fn coverage_ratio_uses_parsed_over_total() {
        let m = base_model();
        let r = project_receipt(&m);
        assert!((r.coverage_ratio - 0.9).abs() < 1e-4);
    }

    #[test]
    fn coverage_ratio_handles_zero_denominator() {
        let mut m = base_model();
        m.parse_confidence = ParseConfidence::default();
        let r = project_receipt(&m);
        assert_eq!(r.coverage_ratio, 0.0);
    }

    #[test]
    fn unknown_cap_applies_and_flag_flips() {
        let mut m = base_model();
        for i in 0..(MAX_UNKNOWNS + 5) {
            m.unknown_lines.push(UnknownConfigLine {
                source: None,
                line_number: Some(i as u64),
                raw: format!("noise {i}"),
                context_path: None,
                reason: Some(UnknownReason::Other),
            });
        }
        let r = project_receipt(&m);
        assert_eq!(r.unknowns.len(), MAX_UNKNOWNS);
        assert!(r.unknowns_truncated);
    }

    #[test]
    fn unknown_under_cap_is_not_truncated() {
        let mut m = base_model();
        m.unknown_lines.push(UnknownConfigLine {
            source: None,
            line_number: Some(7),
            raw: "alone".to_string(),
            context_path: None,
            reason: Some(UnknownReason::UnrecognizedInterfaceForm),
        });
        let r = project_receipt(&m);
        assert_eq!(r.unknowns.len(), 1);
        assert!(!r.unknowns_truncated);
        assert_eq!(
            r.unknowns[0].reason,
            Some(UnknownReason::UnrecognizedInterfaceForm)
        );
    }

    #[test]
    fn warnings_split_absent_not_in_scope_and_other() {
        let mut m = base_model();
        m.parse_confidence.warnings = vec![
            "absent:vlans".to_string(),
            "not_in_scope:acls".to_string(),
            "truncated_input".to_string(),
        ];
        let r = project_receipt(&m);
        assert!(r.areas.iter().any(|a| a.name == "vlans" && a.status == ReceiptAreaStatus::Absent));
        assert!(r
            .areas
            .iter()
            .any(|a| a.name == "acls" && a.status == ReceiptAreaStatus::NotInScope));
        assert_eq!(r.warnings, vec!["truncated_input".to_string()]);
    }

    #[test]
    fn populated_area_outranks_absent_warning_for_same_name() {
        let mut m = base_model();
        m.vlans.push(VlanModel {
            id: 10,
            name: Some("U".to_string()),
            state: VlanState::Active,
            interfaces: vec![],
        });
        // Parser would not emit absent:vlans here, but exercise the
        // de-dup: if both arrived, populated wins.
        m.parse_confidence.warnings.push("absent:vlans".to_string());
        let r = project_receipt(&m);
        let vlans_areas: Vec<&ReceiptArea> =
            r.areas.iter().filter(|a| a.name == "vlans").collect();
        assert_eq!(vlans_areas.len(), 1);
        assert_eq!(vlans_areas[0].status, ReceiptAreaStatus::Populated);
        assert_eq!(vlans_areas[0].populated_count, 1);
    }

    #[test]
    fn services_areas_emit_per_kind() {
        let mut m = base_model();
        m.services.push(ServiceModel {
            kind: ServiceKind::Ssh,
            ..ServiceModel::default()
        });
        m.services.push(ServiceModel {
            kind: ServiceKind::Ntp,
            ..ServiceModel::default()
        });
        let r = project_receipt(&m);
        assert!(r.areas.iter().any(|a| a.name == "services_ssh"));
        assert!(r.areas.iter().any(|a| a.name == "services_ntp"));
        assert!(!r.areas.iter().any(|a| a.name == "services_snmp"));
    }

    #[test]
    fn management_area_counts_management_interfaces() {
        let mut m = base_model();
        m.interfaces.push(InterfaceModel {
            name: "Management0".to_string(),
            normalized_name: Some("Mgmt0".to_string()),
            kind: InterfaceKind::Management,
            ..InterfaceModel::default()
        });
        let r = project_receipt(&m);
        let mgmt = r.areas.iter().find(|a| a.name == "management").unwrap();
        assert_eq!(mgmt.populated_count, 1);
    }

    #[test]
    fn receipt_round_trips_through_serde() {
        let m = base_model();
        let r = project_receipt(&m);
        let j = serde_json::to_string(&r).unwrap();
        let back: ReceiptView = serde_json::from_str(&j).unwrap();
        assert_eq!(r, back);
    }
}
