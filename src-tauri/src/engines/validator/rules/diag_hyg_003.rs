//! DIAG-HYG-003 — DNS resolution not configured.
//!
//! Skips when the parser declared `services_dns` out-of-scope.
//! Clean when a DNS service record exists. Triggers when DNS is
//! in scope but no DNS service was emitted by the parser.

use crate::engines::network_model::{DeviceModel, ServiceKind};

use crate::engines::validator::types::{
    Evidence, EvidenceKind, Finding, Severity, SignalCategory, SkipReason,
    ValidatorContext,
};

use super::{area_not_in_scope, Rule, RuleOutcome};

pub struct Rule103;

impl Rule for Rule103 {
    fn id(&self) -> &'static str {
        "DIAG-HYG-003"
    }
    fn rule_version(&self) -> u32 {
        1
    }
    fn area(&self) -> &'static str {
        "services_dns"
    }
    fn default_severity(&self) -> Severity {
        Severity::Low
    }
    fn signal(&self) -> SignalCategory {
        SignalCategory::Hard
    }
    fn title(&self) -> &'static str {
        "DNS resolution not configured"
    }
    fn recommendation(&self) -> Option<&'static str> {
        Some("Configure DNS resolvers for hostname-based operations.")
    }

    fn evaluate(&self, model: &DeviceModel, _ctx: &ValidatorContext) -> RuleOutcome {
        if area_not_in_scope(model, "services_dns") {
            return RuleOutcome::Skipped(SkipReason::AreaNotInScope);
        }
        if model.services.iter().any(|s| s.kind == ServiceKind::Dns) {
            return RuleOutcome::Clean;
        }
        RuleOutcome::Triggered(vec![Finding {
            finding_key: "DIAG-HYG-003:services_dns:absent".to_string(),
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
                note: Some("dns_service=absent".to_string()),
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

    fn dns_svc() -> ServiceModel {
        ServiceModel {
            kind: ServiceKind::Dns,
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
    fn no_dns_service_triggers_one_finding() {
        let m = DeviceModel::default();
        match Rule103.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Triggered(f) => {
                assert_eq!(f.len(), 1);
                assert_eq!(f[0].rule_id, "DIAG-HYG-003");
                assert_eq!(f[0].severity, Severity::Low);
                assert_eq!(f[0].finding_key, "DIAG-HYG-003:services_dns:absent");
            }
            other => panic!("expected Triggered, got {other:?}"),
        }
    }

    #[test]
    fn dns_service_present_is_clean() {
        let mut m = DeviceModel::default();
        m.services.push(dns_svc());
        match Rule103.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Clean => {}
            other => panic!("expected Clean, got {other:?}"),
        }
    }

    #[test]
    fn not_in_scope_warning_skips_rule() {
        let mut m = DeviceModel::default();
        m.parse_confidence = ParseConfidence {
            warnings: vec!["not_in_scope:services_dns".to_string()],
            ..ParseConfidence::default()
        };
        match Rule103.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Skipped(SkipReason::AreaNotInScope) => {}
            other => panic!("expected Skipped, got {other:?}"),
        }
    }
}
