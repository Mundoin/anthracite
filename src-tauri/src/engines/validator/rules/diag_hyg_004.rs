//! DIAG-HYG-004 — NTP service configured without server (V1Z-A).
//!
//! Skips when the parser declared `services_ntp` out-of-scope.
//! Skips with `InsufficientData` when no NTP service exists at
//! all — DIAG-HYG-001 owns the absence case; this rule covers the
//! "configured but unusable" case.
//! Triggers when an NTP `ServiceModel` exists with an empty
//! `servers` list. Clean when every NTP service has at least one
//! server.

use crate::engines::network_model::{DeviceModel, ServiceKind};

use crate::engines::validator::types::{
    Evidence, EvidenceKind, Finding, Severity, SignalCategory, SkipReason,
    ValidatorContext,
};

use super::{area_not_in_scope, Rule, RuleOutcome};

pub struct Rule104;

impl Rule for Rule104 {
    fn id(&self) -> &'static str {
        "DIAG-HYG-004"
    }
    fn rule_version(&self) -> u32 {
        1
    }
    fn area(&self) -> &'static str {
        "services_ntp"
    }
    fn default_severity(&self) -> Severity {
        Severity::Medium
    }
    fn signal(&self) -> SignalCategory {
        SignalCategory::Hard
    }
    fn title(&self) -> &'static str {
        "NTP service configured without server"
    }
    fn recommendation(&self) -> Option<&'static str> {
        Some(
            "Add at least one NTP server or peer; without a peer the \
             device cannot synchronise time.",
        )
    }

    fn evaluate(&self, model: &DeviceModel, _ctx: &ValidatorContext) -> RuleOutcome {
        if area_not_in_scope(model, "services_ntp") {
            return RuleOutcome::Skipped(SkipReason::AreaNotInScope);
        }
        let ntp_services: Vec<(usize, &crate::engines::network_model::ServiceModel)> = model
            .services
            .iter()
            .enumerate()
            .filter(|(_, s)| s.kind == ServiceKind::Ntp)
            .collect();
        if ntp_services.is_empty() {
            // DIAG-HYG-001 owns absence; without an NTP service we
            // cannot speak to server-list configuration.
            return RuleOutcome::Skipped(SkipReason::InsufficientData);
        }
        let mut findings: Vec<Finding> = Vec::new();
        for (i, svc) in &ntp_services {
            if svc.servers.is_empty() {
                findings.push(Finding {
                    finding_key: format!(
                        "DIAG-HYG-004:services_ntp:services[{i}]:server_list_empty"
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
                        note: Some("ntp_servers=empty".to_string()),
                    }],
                    affected_area: self.area().to_string(),
                    recommendation: self.recommendation().map(|s| s.to_string()),
                });
            }
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

    fn ntp_svc(servers: Vec<String>) -> ServiceModel {
        ServiceModel {
            kind: ServiceKind::Ntp,
            servers,
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
    fn ntp_service_with_empty_servers_triggers_medium() {
        let mut m = DeviceModel::default();
        m.services.push(ntp_svc(Vec::new()));
        match Rule104.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Triggered(f) => {
                assert_eq!(f.len(), 1);
                assert_eq!(f[0].rule_id, "DIAG-HYG-004");
                assert_eq!(f[0].severity, Severity::Medium);
                assert!(f[0]
                    .finding_key
                    .contains("services[0]:server_list_empty"));
                assert!(f[0]
                    .evidence
                    .iter()
                    .any(|e| e.note.as_deref() == Some("ntp_servers=empty")));
            }
            other => panic!("expected Triggered, got {other:?}"),
        }
    }

    #[test]
    fn ntp_service_with_one_server_is_clean() {
        let mut m = DeviceModel::default();
        m.services.push(ntp_svc(vec!["10.0.0.1".to_string()]));
        match Rule104.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Clean => {}
            other => panic!("expected Clean, got {other:?}"),
        }
    }

    #[test]
    fn no_ntp_service_is_skipped_with_insufficient_data() {
        let m = DeviceModel::default();
        match Rule104.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Skipped(SkipReason::InsufficientData) => {}
            other => panic!("expected Skipped(InsufficientData), got {other:?}"),
        }
    }

    #[test]
    fn not_in_scope_warning_skips_rule_first() {
        let mut m = DeviceModel::default();
        m.parse_confidence = ParseConfidence {
            warnings: vec!["not_in_scope:services_ntp".to_string()],
            ..ParseConfidence::default()
        };
        match Rule104.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Skipped(SkipReason::AreaNotInScope) => {}
            other => panic!("expected Skipped(AreaNotInScope), got {other:?}"),
        }
    }
}
