//! DIAG-HYG-002 — Syslog service not configured.
//!
//! Skips when the parser declared `services_syslog` out-of-scope.
//! Clean when a Syslog service record exists. Triggers when syslog is
//! in scope but no syslog service was emitted by the parser.

use crate::engines::network_model::{DeviceModel, ServiceKind};

use crate::engines::validator::types::{
    Evidence, EvidenceKind, Finding, Severity, SignalCategory, SkipReason,
    ValidatorContext,
};

use super::{area_not_in_scope, Rule, RuleOutcome};

pub struct Rule102;

impl Rule for Rule102 {
    fn id(&self) -> &'static str {
        "DIAG-HYG-002"
    }
    fn rule_version(&self) -> u32 {
        1
    }
    fn area(&self) -> &'static str {
        "services_syslog"
    }
    fn default_severity(&self) -> Severity {
        Severity::Medium
    }
    fn signal(&self) -> SignalCategory {
        SignalCategory::Hard
    }
    fn title(&self) -> &'static str {
        "Syslog service not configured"
    }
    fn recommendation(&self) -> Option<&'static str> {
        Some("Configure remote syslog for forensic timestamps and audit trail.")
    }

    fn evaluate(&self, model: &DeviceModel, _ctx: &ValidatorContext) -> RuleOutcome {
        if area_not_in_scope(model, "services_syslog") {
            return RuleOutcome::Skipped(SkipReason::AreaNotInScope);
        }
        if model.services.iter().any(|s| s.kind == ServiceKind::Syslog) {
            return RuleOutcome::Clean;
        }
        RuleOutcome::Triggered(vec![Finding {
            finding_key: "DIAG-HYG-002:services_syslog:absent".to_string(),
            rule_id: self.id().to_string(),
            rule_version: self.rule_version(),
            severity: self.default_severity(),
            signal: self.signal(),
            title: self.title().to_string(),
            evidence: vec![Evidence {
                kind: EvidenceKind::ModelPath,
                model_path: Some("services".to_string()),
                line_start: None,
                line_end: None,
                raw_excerpt: None,
                note: Some("syslog_service=absent".to_string()),
            }],
            affected_area: self.area().to_string(),
            recommendation: self.recommendation().map(|s| s.to_string()),
        }])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engines::network_model::{ParseConfidence, ServiceModel};

    fn syslog_svc() -> ServiceModel {
        ServiceModel {
            kind: ServiceKind::Syslog,
            servers: Vec::new(),
            source_interface: None,
            vrf: None,
            authentication_mode: None,
            notes: None,
        }
    }

    fn empty_ctx() -> ValidatorContext {
        ValidatorContext {
            platform_id: None,
            parser_id: None,
            parser_version: None,
            selection_mode: crate::engines::validator::types::SelectionMode::ManualOverride,
            detection_confidence: None,
            detection_source: None,
            source_context: None,
        }
    }

    #[test]
    fn no_syslog_service_triggers_one_finding() {
        let m = DeviceModel::default();
        match Rule102.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Triggered(f) => {
                assert_eq!(f.len(), 1);
                assert_eq!(f[0].rule_id, "DIAG-HYG-002");
                assert_eq!(f[0].severity, Severity::Medium);
                assert_eq!(f[0].finding_key, "DIAG-HYG-002:services_syslog:absent");
            }
            other => panic!("expected Triggered, got {other:?}"),
        }
    }

    #[test]
    fn syslog_service_present_is_clean() {
        let mut m = DeviceModel::default();
        m.services.push(syslog_svc());
        match Rule102.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Clean => {}
            other => panic!("expected Clean, got {other:?}"),
        }
    }

    #[test]
    fn not_in_scope_warning_skips_rule() {
        let mut m = DeviceModel::default();
        m.parse_confidence = ParseConfidence {
            warnings: vec!["not_in_scope:services_syslog".to_string()],
            ..ParseConfidence::default()
        };
        match Rule102.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Skipped(SkipReason::AreaNotInScope) => {}
            other => panic!("expected Skipped, got {other:?}"),
        }
    }
}
