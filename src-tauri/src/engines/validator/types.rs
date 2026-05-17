//! Validator wire types — V1P.
//!
//! Every field name is snake_case, every tagged union uses
//! `#[serde(tag = "kind", rename_all = "snake_case")]` so the
//! TypeScript surface (`src/types/validator.ts`) can mirror them
//! verbatim.
//!
//! The shape is intentionally separate from the V1I
//! `FindingModel` carried on `DeviceModel.findings`. Per the C′
//! lock (see `docs/architecture/CANONICAL_NETWORK_MODEL.md` and
//! `docs/architecture/VALIDATOR_ENGINE_CONTRACT.md`),
//! `DeviceModel.findings` is reserved for parser-emitted findings;
//! validator findings live only in `ValidationReport`.

use serde::{Deserialize, Serialize};

pub type RuleId = String;

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize,
)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Info,
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SignalCategory {
    Hard,
    Derived,
    Heuristic,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SelectionMode {
    FromDetection,
    ManualOverride,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DetectionSource {
    BestMatch,
    Tied,
    Fallback,
    ManualOverride,
    NotApplicable,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SourceKind {
    Paste,
    File,
    ArchiveEntry,
    Slice,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case", default)]
pub struct SourceContext {
    pub kind: Option<SourceKind>,
    pub label: Option<String>,
    pub archive_name: Option<String>,
    pub slice_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ValidatorContext {
    pub platform_id: Option<String>,
    pub parser_id: Option<String>,
    pub parser_version: Option<String>,
    pub selection_mode: SelectionMode,
    pub detection_confidence: Option<f32>,
    pub detection_source: Option<DetectionSource>,
    pub source_context: Option<SourceContext>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EvidenceKind {
    ModelPath,
    ServiceNoteFact,
    UnknownLineRef,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Evidence {
    pub kind: EvidenceKind,
    pub model_path: Option<String>,
    pub line_start: Option<u64>,
    pub line_end: Option<u64>,
    pub raw_excerpt: Option<String>,
    pub note: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SkipReason {
    AreaNotInScope,
    AreaAbsent,
    InsufficientData,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct SkippedRule {
    pub rule_id: RuleId,
    pub reason: SkipReason,
    pub area: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Finding {
    pub finding_key: String,
    pub rule_id: RuleId,
    pub rule_version: u32,
    pub severity: Severity,
    pub signal: SignalCategory,
    pub title: String,
    pub evidence: Vec<Evidence>,
    pub affected_area: String,
    pub recommendation: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ValidationReport {
    pub validator_version: u32,
    pub rule_pack_version: u32,
    pub context: ValidatorContext,
    pub findings: Vec<Finding>,
    pub clean_rules: Vec<RuleId>,
    pub skipped_rules: Vec<SkippedRule>,
}

// =====================================================================
// Tests
// =====================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn default_context() -> ValidatorContext {
        ValidatorContext {
            platform_id: Some("cisco-iosxe".to_string()),
            parser_id: Some("cisco-iosxe".to_string()),
            parser_version: Some("3".to_string()),
            selection_mode: SelectionMode::ManualOverride,
            detection_confidence: None,
            detection_source: Some(DetectionSource::ManualOverride),
            source_context: Some(SourceContext {
                kind: Some(SourceKind::Paste),
                label: None,
                archive_name: None,
                slice_id: None,
            }),
        }
    }

    #[test]
    fn validator_context_round_trips() {
        let ctx = default_context();
        let json = serde_json::to_string(&ctx).unwrap();
        let back: ValidatorContext = serde_json::from_str(&json).unwrap();
        assert_eq!(ctx, back);
    }

    #[test]
    fn empty_validation_report_round_trips() {
        let report = ValidationReport {
            validator_version: 1,
            rule_pack_version: 1,
            context: default_context(),
            findings: Vec::new(),
            clean_rules: Vec::new(),
            skipped_rules: Vec::new(),
        };
        let s1 = serde_json::to_string(&report).unwrap();
        let back: ValidationReport = serde_json::from_str(&s1).unwrap();
        let s2 = serde_json::to_string(&back).unwrap();
        assert_eq!(s1, s2);
    }

    #[test]
    fn finding_with_one_evidence_round_trips() {
        let finding = Finding {
            finding_key: "MGMT-HYG-001:services_snmp:services[0]:community=public"
                .to_string(),
            rule_id: "MGMT-HYG-001".to_string(),
            rule_version: 1,
            severity: Severity::High,
            signal: SignalCategory::Hard,
            title: "Default or well-known SNMP community present".to_string(),
            evidence: vec![Evidence {
                kind: EvidenceKind::ServiceNoteFact,
                model_path: Some("services[0]".to_string()),
                line_start: None,
                line_end: None,
                raw_excerpt: None,
                note: Some("community=public".to_string()),
            }],
            affected_area: "services_snmp".to_string(),
            recommendation: Some(
                "Replace default community with a strong unique value.".to_string(),
            ),
        };
        let s1 = serde_json::to_string(&finding).unwrap();
        let back: Finding = serde_json::from_str(&s1).unwrap();
        let s2 = serde_json::to_string(&back).unwrap();
        assert_eq!(s1, s2);
        assert_eq!(finding, back);
    }

    #[test]
    fn severity_ordering_critical_is_greatest() {
        assert!(Severity::Critical > Severity::High);
        assert!(Severity::High > Severity::Medium);
        assert!(Severity::Medium > Severity::Low);
        assert!(Severity::Low > Severity::Info);
    }

    #[test]
    fn skipped_rule_serialises_with_tagged_kind() {
        let s = SkippedRule {
            rule_id: "MGMT-HYG-003".to_string(),
            reason: SkipReason::AreaNotInScope,
            area: Some("services_ssh".to_string()),
        };
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("\"reason\":\"area_not_in_scope\""));
        let back: SkippedRule = serde_json::from_str(&json).unwrap();
        assert_eq!(s, back);
    }
}
