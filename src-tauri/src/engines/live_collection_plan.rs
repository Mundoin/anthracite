//! Live collection safety gate + dry-run plan (V1AT).
//!
//! V1AT prepares Anthracite for future read-only live neighbour
//! collection without contacting any device. This module is the
//! planning + safety boundary that future SSH/driver stages will
//! consult before any device contact.
//!
//! Invariants:
//!   - No SSH / NETCONF / RESTCONF / SNMP / gNMI here.
//!   - No credentials. No host/IP plumbing.
//!   - No background tasks. No scheduler. No polling.
//!   - No evidence-store mutation.
//!   - Every command in a returned plan is `read_only: true`.
//!   - Returns a deterministic, serialisable plan; same request
//!     always yields the same plan.
//!
//! Future live-collection drivers MUST:
//!   - Call `plan_live_topology_collection(request)` first.
//!   - Surface the plan to the operator for review.
//!   - Refuse to execute if `readiness != Ready`.
//!   - On execution, feed raw output through the existing
//!     V1AP/V1AQ raw-output import path, which then writes through
//!     the V1AR managed evidence store. No driver short-circuits.
//!
//! Doctrine: `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` V1AT.

use serde::{Deserialize, Serialize};

use crate::engines::topology_evidence_store::TopologyEvidenceImportMode;

/// Closed set of platform hints understood by the live-collection
/// planner. Mirrors the V1AQ raw-output dispatcher's accepted hints
/// so the planner never promises a command the parser can't consume.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LiveCollectionPlatform {
    Iosxe,
    Nxos,
    Iosxr,
    Eos,
    Junos,
    HuaweiVrp,
    NokiaSros,
    Fortios,
    Mikrotik,
}

impl LiveCollectionPlatform {
    pub fn from_hint(s: &str) -> Option<Self> {
        match s {
            "iosxe" => Some(Self::Iosxe),
            "nxos" => Some(Self::Nxos),
            "iosxr" => Some(Self::Iosxr),
            "eos" => Some(Self::Eos),
            "junos" => Some(Self::Junos),
            "huawei_vrp" => Some(Self::HuaweiVrp),
            "nokia_sros" => Some(Self::NokiaSros),
            "fortios" => Some(Self::Fortios),
            "mikrotik" => Some(Self::Mikrotik),
            _ => None,
        }
    }

    pub fn hint_str(self) -> &'static str {
        match self {
            Self::Iosxe => "iosxe",
            Self::Nxos => "nxos",
            Self::Iosxr => "iosxr",
            Self::Eos => "eos",
            Self::Junos => "junos",
            Self::HuaweiVrp => "huawei_vrp",
            Self::NokiaSros => "nokia_sros",
            Self::Fortios => "fortios",
            Self::Mikrotik => "mikrotik",
        }
    }

    pub fn display_label(self) -> &'static str {
        match self {
            Self::Iosxe => "Cisco IOS-XE",
            Self::Nxos => "Cisco NX-OS",
            Self::Iosxr => "Cisco IOS-XR",
            Self::Eos => "Arista EOS",
            Self::Junos => "Juniper Junos",
            Self::HuaweiVrp => "Huawei VRP",
            Self::NokiaSros => "Nokia SR OS",
            Self::Fortios => "FortiOS",
            Self::Mikrotik => "MikroTik",
        }
    }
}

/// Source kinds an operator can request in a dry-run plan. Matches
/// the V1AP raw-output source kinds (`RawNeighborSourceKind`) so the
/// downstream import path stays unchanged.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LiveCollectionSourceKind {
    Lldp,
    Cdp,
}

impl LiveCollectionSourceKind {
    pub fn raw_neighbor_source_kind(self) -> &'static str {
        match self {
            Self::Lldp => "lldp",
            Self::Cdp => "cdp",
        }
    }
}

/// One planned read-only command. The planner emits one entry per
/// (platform, requested source kind) pair that is supported.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LiveCollectionCommandPlan {
    pub source_kind: LiveCollectionSourceKind,
    /// The command string a future driver would issue. Read-only by
    /// construction; the `read_only` flag is enforced and asserted in
    /// tests.
    pub command: String,
    pub read_only: bool,
    /// `RawNeighborSourceKind` value the future driver must pass back
    /// when handing raw output to the V1AP import path.
    pub raw_neighbor_source_kind: String,
    /// Platform hint to thread through the V1AQ dispatcher when the
    /// raw output is imported later.
    pub platform_hint: String,
    /// Symbolic name of the TS/Rust import seam a future driver will
    /// call. Documents the boundary; not invoked here.
    pub planned_import_function: String,
    /// Human-readable note for the operator review surface.
    pub note: String,
}

/// Reason a platform is not eligible for a dry-run plan in V1AT.
/// Mirrors V1AQ dispatcher rejection categories so the wording stays
/// consistent operator-side.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LiveCollectionUnsupportedReason {
    /// Parser exists but driver coverage is deferred (Huawei VRP, Nokia SR OS).
    DriverDeferred,
    /// Vendor parser explicitly unsupported in raw-output dispatcher.
    ParserUnsupported,
}

/// Categorical safety warnings surfaced to the operator. Closed set
/// — every new warning kind has to land here so the UI can render it
/// deterministically.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LiveCollectionSafetyWarning {
    UnsupportedPlatform,
    NoSourceKindSelected,
    ReplaceImportModeSelected,
    UnknownPlatformHint,
    MissingTargetIdentifier,
    EmptyCommandPlan,
    NoSourceKindMatchesPlatform,
}

/// Top-level readiness state. Drivers must refuse to execute unless
/// `Ready`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LiveCollectionReadinessState {
    Ready,
    NotReady,
    Unsupported,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LiveCollectionDryRunRequest {
    pub environment_id: Option<String>,
    /// Operator-supplied label for the intended target. Display-only.
    /// Never used to open a connection.
    pub target_label: Option<String>,
    pub platform_hint: Option<String>,
    pub source_kinds: Vec<LiveCollectionSourceKind>,
    pub planned_import_mode: Option<TopologyEvidenceImportMode>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LiveCollectionDryRunPlan {
    pub readiness: LiveCollectionReadinessState,
    pub environment_id: Option<String>,
    pub target_label: Option<String>,
    pub platform: Option<LiveCollectionPlatform>,
    pub raw_platform_hint: Option<String>,
    pub planned_import_mode: TopologyEvidenceImportMode,
    pub commands: Vec<LiveCollectionCommandPlan>,
    pub warnings: Vec<LiveCollectionSafetyWarning>,
    pub unsupported_reason: Option<LiveCollectionUnsupportedReason>,
    /// Closed checklist a driver must satisfy before execution. Stable
    /// strings so the UI can render them deterministically.
    pub safety_checklist: Vec<String>,
    /// Constant note. Always present in every plan.
    pub honesty_note: String,
}

const HONESTY_NOTE: &str =
    "Dry-run plan only. No device contact is performed in V1AT.";

const SAFETY_CHECKLIST: &[&str] = &[
    "Operator review required before any future collection.",
    "Driver must refuse execution unless readiness is ready.",
    "Every command in the plan is read-only.",
    "Raw output, when collected, must flow through V1AP/V1AQ import then the V1AR managed evidence store.",
    "No credentials are stored or transmitted by V1AT.",
];

fn safety_checklist() -> Vec<String> {
    SAFETY_CHECKLIST.iter().map(|s| (*s).to_string()).collect()
}

fn command_for(
    platform: LiveCollectionPlatform,
    kind: LiveCollectionSourceKind,
) -> Option<&'static str> {
    use LiveCollectionPlatform as P;
    use LiveCollectionSourceKind as K;
    match (platform, kind) {
        (P::Iosxe, K::Lldp) => Some("show lldp neighbors detail"),
        (P::Iosxe, K::Cdp) => Some("show cdp neighbors detail"),
        (P::Nxos, K::Lldp) => Some("show lldp neighbors detail"),
        (P::Nxos, K::Cdp) => Some("show cdp neighbors detail"),
        (P::Eos, K::Lldp) => Some("show lldp neighbors detail"),
        (P::Eos, K::Cdp) => Some("show cdp neighbors detail"),
        (P::Junos, K::Lldp) => Some("show lldp neighbors"),
        (P::Junos, K::Cdp) => None,
        (P::Iosxr, K::Lldp) => Some("show lldp neighbors detail"),
        (P::Iosxr, K::Cdp) => None,
        // Unsupported / deferred platforms emit no commands.
        (P::HuaweiVrp, _)
        | (P::NokiaSros, _)
        | (P::Fortios, _)
        | (P::Mikrotik, _) => None,
    }
}

fn unsupported_reason_for(
    platform: LiveCollectionPlatform,
) -> Option<LiveCollectionUnsupportedReason> {
    use LiveCollectionPlatform as P;
    match platform {
        P::HuaweiVrp | P::NokiaSros => Some(LiveCollectionUnsupportedReason::DriverDeferred),
        P::Fortios | P::Mikrotik => Some(LiveCollectionUnsupportedReason::ParserUnsupported),
        _ => None,
    }
}

/// Build a deterministic dry-run plan for a future live collection.
/// Pure function: same request always yields the same plan. No I/O,
/// no device contact, no store mutation.
pub fn plan_live_topology_collection(
    request: LiveCollectionDryRunRequest,
) -> LiveCollectionDryRunPlan {
    let planned_import_mode = request
        .planned_import_mode
        .unwrap_or(TopologyEvidenceImportMode::Merge);

    let mut warnings: Vec<LiveCollectionSafetyWarning> = Vec::new();

    if request.target_label.as_deref().map(str::trim).map(str::is_empty).unwrap_or(true) {
        warnings.push(LiveCollectionSafetyWarning::MissingTargetIdentifier);
    }

    let raw_hint = request.platform_hint.clone();
    let platform = match request.platform_hint.as_deref() {
        Some(h) => {
            let parsed = LiveCollectionPlatform::from_hint(h);
            if parsed.is_none() {
                warnings.push(LiveCollectionSafetyWarning::UnknownPlatformHint);
            }
            parsed
        }
        None => {
            warnings.push(LiveCollectionSafetyWarning::UnknownPlatformHint);
            None
        }
    };

    if request.source_kinds.is_empty() {
        warnings.push(LiveCollectionSafetyWarning::NoSourceKindSelected);
    }

    if planned_import_mode == TopologyEvidenceImportMode::Replace {
        warnings.push(LiveCollectionSafetyWarning::ReplaceImportModeSelected);
    }

    let unsupported_reason = platform.and_then(unsupported_reason_for);
    if unsupported_reason.is_some() {
        warnings.push(LiveCollectionSafetyWarning::UnsupportedPlatform);
    }

    // De-duplicate source kinds while preserving operator order.
    let mut seen_kinds = std::collections::HashSet::new();
    let ordered_kinds: Vec<LiveCollectionSourceKind> = request
        .source_kinds
        .iter()
        .copied()
        .filter(|k| seen_kinds.insert(*k))
        .collect();

    let mut commands: Vec<LiveCollectionCommandPlan> = Vec::new();
    if let Some(p) = platform {
        if unsupported_reason.is_none() {
            for kind in &ordered_kinds {
                if let Some(cmd) = command_for(p, *kind) {
                    commands.push(LiveCollectionCommandPlan {
                        source_kind: *kind,
                        command: cmd.to_string(),
                        read_only: true,
                        raw_neighbor_source_kind: kind.raw_neighbor_source_kind().to_string(),
                        platform_hint: p.hint_str().to_string(),
                        planned_import_function: "importTopologyNeighborOutput".to_string(),
                        note: format!(
                            "Read-only {} neighbour command planned for {}.",
                            kind.raw_neighbor_source_kind().to_uppercase(),
                            p.display_label(),
                        ),
                    });
                }
            }
        }
    }

    if !ordered_kinds.is_empty()
        && platform.is_some()
        && unsupported_reason.is_none()
        && commands.is_empty()
    {
        warnings.push(LiveCollectionSafetyWarning::NoSourceKindMatchesPlatform);
    }

    if commands.is_empty() {
        warnings.push(LiveCollectionSafetyWarning::EmptyCommandPlan);
    }

    let readiness = if unsupported_reason.is_some() {
        LiveCollectionReadinessState::Unsupported
    } else if commands.is_empty()
        || warnings.iter().any(|w| {
            matches!(
                w,
                LiveCollectionSafetyWarning::UnknownPlatformHint
                    | LiveCollectionSafetyWarning::NoSourceKindSelected
                    | LiveCollectionSafetyWarning::MissingTargetIdentifier
                    | LiveCollectionSafetyWarning::EmptyCommandPlan
                    | LiveCollectionSafetyWarning::NoSourceKindMatchesPlatform
            )
        })
    {
        LiveCollectionReadinessState::NotReady
    } else {
        LiveCollectionReadinessState::Ready
    };

    LiveCollectionDryRunPlan {
        readiness,
        environment_id: request.environment_id,
        target_label: request.target_label,
        platform,
        raw_platform_hint: raw_hint,
        planned_import_mode,
        commands,
        warnings,
        unsupported_reason,
        safety_checklist: safety_checklist(),
        honesty_note: HONESTY_NOTE.to_string(),
    }
}

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn req(
        platform_hint: Option<&str>,
        kinds: Vec<LiveCollectionSourceKind>,
        mode: Option<TopologyEvidenceImportMode>,
    ) -> LiveCollectionDryRunRequest {
        LiveCollectionDryRunRequest {
            environment_id: Some("env-core-eu1".to_string()),
            target_label: Some("router-a".to_string()),
            platform_hint: platform_hint.map(str::to_string),
            source_kinds: kinds,
            planned_import_mode: mode,
        }
    }

    #[test]
    fn iosxe_lldp_cdp_emits_two_readonly_commands_and_ready_state() {
        let plan = plan_live_topology_collection(req(
            Some("iosxe"),
            vec![LiveCollectionSourceKind::Lldp, LiveCollectionSourceKind::Cdp],
            None,
        ));
        assert_eq!(plan.readiness, LiveCollectionReadinessState::Ready);
        assert_eq!(plan.commands.len(), 2);
        for c in &plan.commands {
            assert!(c.read_only);
            assert_eq!(c.planned_import_function, "importTopologyNeighborOutput");
            assert_eq!(c.platform_hint, "iosxe");
        }
        assert_eq!(plan.commands[0].command, "show lldp neighbors detail");
        assert_eq!(plan.commands[1].command, "show cdp neighbors detail");
        assert_eq!(plan.planned_import_mode, TopologyEvidenceImportMode::Merge);
        assert!(plan.warnings.is_empty());
        assert!(plan.unsupported_reason.is_none());
    }

    #[test]
    fn nxos_eos_iosxe_all_resolve_for_lldp_and_cdp() {
        for hint in &["nxos", "eos", "iosxe"] {
            let plan = plan_live_topology_collection(req(
                Some(hint),
                vec![LiveCollectionSourceKind::Lldp, LiveCollectionSourceKind::Cdp],
                None,
            ));
            assert_eq!(plan.commands.len(), 2, "hint {hint} should emit 2 commands");
            assert_eq!(plan.readiness, LiveCollectionReadinessState::Ready);
        }
    }

    #[test]
    fn junos_emits_only_lldp_command_cdp_skipped() {
        let plan = plan_live_topology_collection(req(
            Some("junos"),
            vec![LiveCollectionSourceKind::Lldp, LiveCollectionSourceKind::Cdp],
            None,
        ));
        assert_eq!(plan.commands.len(), 1);
        assert_eq!(plan.commands[0].source_kind, LiveCollectionSourceKind::Lldp);
        assert_eq!(plan.commands[0].command, "show lldp neighbors");
    }

    #[test]
    fn iosxr_emits_only_lldp_command() {
        let plan = plan_live_topology_collection(req(
            Some("iosxr"),
            vec![LiveCollectionSourceKind::Lldp, LiveCollectionSourceKind::Cdp],
            None,
        ));
        assert_eq!(plan.commands.len(), 1);
        assert_eq!(plan.commands[0].source_kind, LiveCollectionSourceKind::Lldp);
    }

    #[test]
    fn unsupported_platform_emits_no_commands_and_warning() {
        for hint in &["fortios", "mikrotik"] {
            let plan = plan_live_topology_collection(req(
                Some(hint),
                vec![LiveCollectionSourceKind::Lldp],
                None,
            ));
            assert!(plan.commands.is_empty());
            assert_eq!(plan.readiness, LiveCollectionReadinessState::Unsupported);
            assert_eq!(
                plan.unsupported_reason,
                Some(LiveCollectionUnsupportedReason::ParserUnsupported)
            );
            assert!(plan
                .warnings
                .contains(&LiveCollectionSafetyWarning::UnsupportedPlatform));
        }
    }

    #[test]
    fn huawei_and_nokia_are_driver_deferred() {
        for hint in &["huawei_vrp", "nokia_sros"] {
            let plan = plan_live_topology_collection(req(
                Some(hint),
                vec![LiveCollectionSourceKind::Lldp],
                None,
            ));
            assert_eq!(plan.readiness, LiveCollectionReadinessState::Unsupported);
            assert_eq!(
                plan.unsupported_reason,
                Some(LiveCollectionUnsupportedReason::DriverDeferred)
            );
        }
    }

    #[test]
    fn no_source_kinds_selected_warns_and_blocks() {
        let plan = plan_live_topology_collection(req(Some("iosxe"), vec![], None));
        assert!(plan.commands.is_empty());
        assert!(plan
            .warnings
            .contains(&LiveCollectionSafetyWarning::NoSourceKindSelected));
        assert_eq!(plan.readiness, LiveCollectionReadinessState::NotReady);
    }

    #[test]
    fn replace_import_mode_emits_warning_but_does_not_block_when_otherwise_ready() {
        let plan = plan_live_topology_collection(req(
            Some("iosxe"),
            vec![LiveCollectionSourceKind::Lldp],
            Some(TopologyEvidenceImportMode::Replace),
        ));
        assert_eq!(plan.planned_import_mode, TopologyEvidenceImportMode::Replace);
        assert!(plan
            .warnings
            .contains(&LiveCollectionSafetyWarning::ReplaceImportModeSelected));
        assert_eq!(plan.readiness, LiveCollectionReadinessState::Ready);
    }

    #[test]
    fn unknown_platform_hint_warns_and_blocks() {
        let plan = plan_live_topology_collection(req(
            Some("netflix"),
            vec![LiveCollectionSourceKind::Lldp],
            None,
        ));
        assert!(plan.platform.is_none());
        assert!(plan
            .warnings
            .contains(&LiveCollectionSafetyWarning::UnknownPlatformHint));
        assert_eq!(plan.readiness, LiveCollectionReadinessState::NotReady);
    }

    #[test]
    fn missing_target_identifier_warns() {
        let r = LiveCollectionDryRunRequest {
            environment_id: Some("env".to_string()),
            target_label: None,
            platform_hint: Some("iosxe".to_string()),
            source_kinds: vec![LiveCollectionSourceKind::Lldp],
            planned_import_mode: None,
        };
        let plan = plan_live_topology_collection(r);
        assert!(plan
            .warnings
            .contains(&LiveCollectionSafetyWarning::MissingTargetIdentifier));
        assert_eq!(plan.readiness, LiveCollectionReadinessState::NotReady);
    }

    #[test]
    fn deterministic_repeated_calls_yield_same_plan() {
        let r = req(
            Some("eos"),
            vec![LiveCollectionSourceKind::Cdp, LiveCollectionSourceKind::Lldp],
            Some(TopologyEvidenceImportMode::Append),
        );
        let a = plan_live_topology_collection(r.clone());
        let b = plan_live_topology_collection(r);
        assert_eq!(a, b);
    }

    #[test]
    fn dry_run_request_and_plan_round_trip_through_serde_json() {
        let r = req(
            Some("iosxe"),
            vec![LiveCollectionSourceKind::Lldp],
            Some(TopologyEvidenceImportMode::Merge),
        );
        let req_json = serde_json::to_string(&r).unwrap();
        let parsed_req: LiveCollectionDryRunRequest =
            serde_json::from_str(&req_json).unwrap();
        assert_eq!(parsed_req, r);

        let plan = plan_live_topology_collection(r);
        let plan_json = serde_json::to_string(&plan).unwrap();
        let parsed_plan: LiveCollectionDryRunPlan =
            serde_json::from_str(&plan_json).unwrap();
        assert_eq!(parsed_plan, plan);
    }

    #[test]
    fn source_kinds_dedup_preserves_first_occurrence_order() {
        let plan = plan_live_topology_collection(req(
            Some("iosxe"),
            vec![
                LiveCollectionSourceKind::Cdp,
                LiveCollectionSourceKind::Lldp,
                LiveCollectionSourceKind::Cdp,
            ],
            None,
        ));
        assert_eq!(plan.commands.len(), 2);
        assert_eq!(plan.commands[0].source_kind, LiveCollectionSourceKind::Cdp);
        assert_eq!(plan.commands[1].source_kind, LiveCollectionSourceKind::Lldp);
    }

    #[test]
    fn honesty_note_and_safety_checklist_always_present() {
        let plan = plan_live_topology_collection(req(
            Some("iosxe"),
            vec![LiveCollectionSourceKind::Lldp],
            None,
        ));
        assert!(plan.honesty_note.contains("No device contact"));
        assert!(plan
            .safety_checklist
            .iter()
            .any(|s| s.contains("Operator review required")));
        assert!(plan
            .safety_checklist
            .iter()
            .any(|s| s.contains("Every command in the plan is read-only")));
    }
}
