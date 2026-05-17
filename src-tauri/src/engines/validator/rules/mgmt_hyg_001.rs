//! MGMT-HYG-001 — Default or well-known SNMP community present.
//!
//! Locked community list (ASCII-lowercase comparison; preserves
//! original case in the evidence note): `public`, `private`,
//! `cisco`, `admin`.
//!
//! Skips when the parser declared `services_snmp` out-of-scope.
//! Clean when SNMP is in scope but no community-bearing record
//! exists or no community matches the locked list.

use crate::engines::network_model::{DeviceModel, ServiceKind};

use crate::engines::validator::service_notes::{
    extract_service_facts, ServiceRole,
};
use crate::engines::validator::types::{
    Evidence, EvidenceKind, Finding, Severity, SignalCategory, SkipReason,
    ValidatorContext,
};

use super::{area_not_in_scope, Rule, RuleOutcome};

const DEFAULT_COMMUNITIES: &[&str] = &["public", "private", "cisco", "admin"];

pub struct Rule001;

impl Rule for Rule001 {
    fn id(&self) -> &'static str {
        "MGMT-HYG-001"
    }
    fn rule_version(&self) -> u32 {
        1
    }
    fn area(&self) -> &'static str {
        "services_snmp"
    }
    fn default_severity(&self) -> Severity {
        Severity::High
    }
    fn signal(&self) -> SignalCategory {
        SignalCategory::Hard
    }
    fn title(&self) -> &'static str {
        "Default or well-known SNMP community present"
    }
    fn recommendation(&self) -> Option<&'static str> {
        Some("Replace default community with a strong unique value.")
    }

    fn evaluate(&self, model: &DeviceModel, _ctx: &ValidatorContext) -> RuleOutcome {
        if area_not_in_scope(model, "services_snmp") {
            return RuleOutcome::Skipped(SkipReason::AreaNotInScope);
        }
        let mut findings: Vec<Finding> = Vec::new();
        for (i, svc) in model.services.iter().enumerate() {
            if svc.kind != ServiceKind::Snmp {
                continue;
            }
            let facts = extract_service_facts(svc);
            // Trap-hosts records don't carry credentials.
            if facts.role == Some(ServiceRole::TrapHosts) {
                continue;
            }
            for community in &facts.communities {
                let lc = community.to_ascii_lowercase();
                if DEFAULT_COMMUNITIES.contains(&lc.as_str()) {
                    findings.push(Finding {
                        finding_key: format!(
                            "MGMT-HYG-001:services_snmp:services[{i}]:community={lc}"
                        ),
                        rule_id: self.id().to_string(),
                        rule_version: self.rule_version(),
                        severity: self.default_severity(),
                        signal: self.signal(),
                        title: self.title().to_string(),
                        evidence: vec![Evidence {
                            kind: EvidenceKind::ServiceNoteFact,
                            model_path: Some(format!("services[{i}]")),
                            line_start: None,
                            line_end: None,
                            raw_excerpt: None,
                            note: Some(format!("community={community}")),
                        }],
                        affected_area: self.area().to_string(),
                        recommendation: self
                            .recommendation()
                            .map(|s| s.to_string()),
                    });
                }
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
    fn default_community_public_triggers_one_finding() {
        let mut m = DeviceModel::default();
        m.services
            .push(snmp_svc("role=agent;communities=public"));
        let r = Rule001.evaluate(&m, &empty_ctx());
        match r {
            RuleOutcome::Triggered(f) => {
                assert_eq!(f.len(), 1);
                assert_eq!(f[0].rule_id, "MGMT-HYG-001");
                assert_eq!(f[0].severity, Severity::High);
                assert!(f[0].finding_key.contains("community=public"));
            }
            other => panic!("expected Triggered, got {other:?}"),
        }
    }

    #[test]
    fn non_default_community_is_clean() {
        let mut m = DeviceModel::default();
        m.services
            .push(snmp_svc("role=agent;communities=CompanyX-RO"));
        match Rule001.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Clean => {}
            other => panic!("expected Clean, got {other:?}"),
        }
    }

    #[test]
    fn multiple_default_communities_on_same_service_emit_distinct_findings() {
        let mut m = DeviceModel::default();
        m.services
            .push(snmp_svc("role=agent;communities=public,private"));
        match Rule001.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Triggered(f) => {
                assert_eq!(f.len(), 2);
                let keys: Vec<&str> =
                    f.iter().map(|x| x.finding_key.as_str()).collect();
                assert!(keys.iter().any(|k| k.contains("community=public")));
                assert!(keys.iter().any(|k| k.contains("community=private")));
            }
            other => panic!("expected Triggered, got {other:?}"),
        }
    }

    #[test]
    fn case_insensitive_match_lowercases_in_key_preserves_in_note() {
        let mut m = DeviceModel::default();
        m.services
            .push(snmp_svc("role=agent;communities=PUBLIC"));
        match Rule001.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Triggered(f) => {
                assert!(f[0].finding_key.contains("community=public"));
                assert!(f[0]
                    .evidence
                    .iter()
                    .any(|e| e.note.as_deref() == Some("community=PUBLIC")));
            }
            other => panic!("expected Triggered, got {other:?}"),
        }
    }

    #[test]
    fn trap_hosts_record_is_not_inspected_for_credentials() {
        let mut m = DeviceModel::default();
        m.services.push(snmp_svc("role=trap_hosts"));
        match Rule001.evaluate(&m, &empty_ctx()) {
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
        match Rule001.evaluate(&m, &empty_ctx()) {
            RuleOutcome::Skipped(SkipReason::AreaNotInScope) => {}
            other => panic!("expected Skipped(AreaNotInScope), got {other:?}"),
        }
    }
}

