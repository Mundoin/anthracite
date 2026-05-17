//! MGMT-HYG-002 — SNMP community-based access configured.
//!
//! Honest wording: this rule fires whenever any SNMP community
//! exists on a non-trap record. Today no parser populates
//! `ServiceModel.authentication_mode` for SNMPv3, so community
//! presence is the only deterministic signal of v1/v2c-style
//! access. The recommendation reflects the migration target.
//! Refinement comes when v3 detection is added — at that point
//! this rule's evaluator (and rule_version) will tighten.
//!
//! Emits ONE finding per device, not one per community. The
//! evidence carries the first qualifying service's index.

use crate::engines::network_model::{DeviceModel, ServiceKind};

use crate::engines::validator::service_notes::{
    extract_service_facts, ServiceRole,
};
use crate::engines::validator::types::{
    Evidence, EvidenceKind, Finding, Severity, SignalCategory, SkipReason,
    ValidatorContext,
};

use super::{area_not_in_scope, Rule, RuleOutcome};

pub struct Rule002;

impl Rule for Rule002 {
    fn id(&self) -> &'static str {
        "MGMT-HYG-002"
    }
    fn rule_version(&self) -> u32 {
        1
    }
    fn area(&self) -> &'static str {
        "services_snmp"
    }
    fn default_severity(&self) -> Severity {
        Severity::Medium
    }
    fn signal(&self) -> SignalCategory {
        SignalCategory::Hard
    }
    fn title(&self) -> &'static str {
        "SNMP community-based access configured"
    }
    fn recommendation(&self) -> Option<&'static str> {
        Some("Migrate to SNMPv3 with strong authentication and privacy.")
    }

    fn evaluate(&self, model: &DeviceModel, _ctx: &ValidatorContext) -> RuleOutcome {
        if area_not_in_scope(model, "services_snmp") {
            return RuleOutcome::Skipped(SkipReason::AreaNotInScope);
        }
        for (i, svc) in model.services.iter().enumerate() {
            if svc.kind != ServiceKind::Snmp {
                continue;
            }
            let facts = extract_service_facts(svc);
            if facts.role == Some(ServiceRole::TrapHosts) {
                continue;
            }
            if !facts.communities.is_empty() {
                return RuleOutcome::Triggered(vec![Finding {
                    finding_key: "MGMT-HYG-002:services_snmp:configured".to_string(),
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
                        note: Some(format!(
                            "community_count={}",
                            facts.communities.len()
                        )),
                    }],
                    affected_area: self.area().to_string(),
                    recommendation: self.recommendation().map(|s| s.to_string()),
                }]);
            }
        }
        RuleOutcome::Clean
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engines::network_model::{ParseConfidence, ServiceModel};

    fn snmp_svc(notes: &str) -> ServiceModel {
        ServiceModel {
            kind: ServiceKind::Snmp,
            servers: Vec::new(),
            source_interface: None,
            vrf: None,
            authentication_mode: None,
            notes: Some(notes.to_string()),
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
    fn any_community_triggers_exactly_one_finding() {
        let mut m = DeviceModel::default();
        m.services
            .push(snmp_svc("role=agent;communities=CompanyX-RO,CompanyX-RW"));
        match Rule002.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Triggered(f) => {
                assert_eq!(f.len(), 1);
                assert_eq!(f[0].rule_id, "MGMT-HYG-002");
                assert_eq!(f[0].severity, Severity::Medium);
                assert_eq!(
                    f[0].finding_key,
                    "MGMT-HYG-002:services_snmp:configured"
                );
            }
            other => panic!("expected Triggered, got {other:?}"),
        }
    }

    #[test]
    fn no_snmp_at_all_is_clean() {
        let m = DeviceModel::default();
        match Rule002.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Clean => {}
            other => panic!("expected Clean, got {other:?}"),
        }
    }

    #[test]
    fn only_trap_hosts_record_is_clean() {
        let mut m = DeviceModel::default();
        m.services.push(snmp_svc("role=trap_hosts"));
        match Rule002.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Clean => {}
            other => panic!("expected Clean, got {other:?}"),
        }
    }

    #[test]
    fn not_in_scope_warning_skips_rule() {
        let mut m = DeviceModel::default();
        m.parse_confidence = ParseConfidence {
            warnings: vec!["not_in_scope:services_snmp".to_string()],
            ..ParseConfidence::default()
        };
        match Rule002.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Skipped(SkipReason::AreaNotInScope) => {}
            other => panic!("expected Skipped, got {other:?}"),
        }
    }
}
