//! MGMT-HYG-004 — Telnet service enabled (V1Z-A).
//!
//! Skips when the parser declared `services_telnet` out-of-scope.
//! Triggers when at least one `ServiceKind::Telnet` is present on
//! the model. Clean otherwise. Telnet is plaintext management
//! access; this stage cannot prove reachability or ACL exposure,
//! so the severity is fixed High and the recommendation is to
//! disable Telnet entirely in favour of SSH.

use crate::engines::network_model::{DeviceModel, ServiceKind};

use crate::engines::validator::types::{
    Evidence, EvidenceKind, Finding, Severity, SignalCategory, SkipReason,
    ValidatorContext,
};

use super::{area_not_in_scope, Rule, RuleOutcome};

pub struct Rule004;

impl Rule for Rule004 {
    fn id(&self) -> &'static str {
        "MGMT-HYG-004"
    }
    fn rule_version(&self) -> u32 {
        1
    }
    fn area(&self) -> &'static str {
        "services_telnet"
    }
    fn default_severity(&self) -> Severity {
        Severity::High
    }
    fn signal(&self) -> SignalCategory {
        SignalCategory::Hard
    }
    fn title(&self) -> &'static str {
        "Telnet service enabled"
    }
    fn recommendation(&self) -> Option<&'static str> {
        Some("Disable Telnet; enforce SSH-only management access.")
    }

    fn evaluate(&self, model: &DeviceModel, _ctx: &ValidatorContext) -> RuleOutcome {
        if area_not_in_scope(model, "services_telnet") {
            return RuleOutcome::Skipped(SkipReason::AreaNotInScope);
        }
        let mut findings: Vec<Finding> = Vec::new();
        for (i, svc) in model.services.iter().enumerate() {
            if svc.kind != ServiceKind::Telnet {
                continue;
            }
            findings.push(Finding {
                finding_key: format!(
                    "MGMT-HYG-004:services_telnet:services[{i}]:enabled"
                ),
                rule_id: self.id().to_string(),
                rule_version: self.rule_version(),
                severity: self.default_severity(),
                signal: self.signal(),
                title: self.title().to_string(),
                evidence: vec![Evidence {
                    kind: EvidenceKind::ModelPath,
                    model_path: Some(format!("services[{i}]")),
                    line_start: None,
                    line_end: None,
                    raw_excerpt: None,
                    note: Some("telnet=enabled".to_string()),
                }],
                affected_area: self.area().to_string(),
                recommendation: self.recommendation().map(|s| s.to_string()),
            });
        }
        if findings.is_empty() {
            RuleOutcome::Clean
        } else {
            RuleOutcome::Triggered(findings)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engines::network_model::{ParseConfidence, ServiceModel};

    fn telnet_svc() -> ServiceModel {
        ServiceModel {
            kind: ServiceKind::Telnet,
            servers: Vec::new(),
            source_interface: None,
            vrf: None,
            authentication_mode: None,
            notes: None,
        }
    }

    fn ssh_svc() -> ServiceModel {
        ServiceModel {
            kind: ServiceKind::Ssh,
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
            selection_mode:
                crate::engines::validator::types::SelectionMode::ManualOverride,
            detection_confidence: None,
            detection_source: None,
            source_context: None,
        }
    }

    #[test]
    fn telnet_service_present_triggers_high_finding() {
        let mut m = DeviceModel::default();
        m.services.push(telnet_svc());
        match Rule004.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Triggered(f) => {
                assert_eq!(f.len(), 1);
                assert_eq!(f[0].rule_id, "MGMT-HYG-004");
                assert_eq!(f[0].severity, Severity::High);
                assert!(f[0]
                    .finding_key
                    .contains("services[0]:enabled"));
                assert!(f[0]
                    .evidence
                    .iter()
                    .any(|e| e.note.as_deref() == Some("telnet=enabled")));
            }
            other => panic!("expected Triggered, got {other:?}"),
        }
    }

    #[test]
    fn ssh_only_is_clean() {
        let mut m = DeviceModel::default();
        m.services.push(ssh_svc());
        match Rule004.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Clean => {}
            other => panic!("expected Clean, got {other:?}"),
        }
    }

    #[test]
    fn no_services_is_clean() {
        let m = DeviceModel::default();
        match Rule004.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Clean => {}
            other => panic!("expected Clean, got {other:?}"),
        }
    }

    #[test]
    fn not_in_scope_warning_skips_rule() {
        let mut m = DeviceModel::default();
        m.parse_confidence = ParseConfidence {
            warnings: vec!["not_in_scope:services_telnet".to_string()],
            ..ParseConfidence::default()
        };
        match Rule004.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Skipped(SkipReason::AreaNotInScope) => {}
            other => panic!("expected Skipped(AreaNotInScope), got {other:?}"),
        }
    }
}
