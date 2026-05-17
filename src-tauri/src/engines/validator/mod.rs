//! Validator Engine — V1P.
//!
//! Consumes a parsed `DeviceModel` plus a `ValidatorContext` and
//! returns a `ValidationReport` containing structured findings,
//! cleanly-evaluated rules, and skipped rules.
//!
//! Boundary (binding, see
//! `docs/architecture/VALIDATOR_ENGINE_CONTRACT.md`):
//!
//!   - Owns:    rule trait + registration, deterministic ordering,
//!              finding_key collision detection, severity vocabulary,
//!              the service-notes extractor (Path A).
//!   - Does NOT own: parsing, model population, vendor detection,
//!                   topology synthesis, receipt projection,
//!                   suppression / visibility policy, persistence,
//!                   export, Cortex.
//!
//! Discipline:
//!   - No mutation of `DeviceModel` (takes `&DeviceModel`).
//!   - No write to `DeviceModel.findings`. The validator never
//!     touches that field; `validator_does_not_mutate_device_model.rs`
//!     enforces the lock at runtime against every parser fixture.
//!   - Deterministic-only. No timestamps. No RNG. No HashMap in
//!     output paths.
//!   - No new Rust dependencies. `finding_key` is explicit ASCII.

use std::collections::BTreeSet;

use crate::engines::network_model::DeviceModel;

pub const VALIDATOR_VERSION: u32 = 1;
pub const RULE_PACK_VERSION: u32 = 3;

pub mod rules;
pub mod service_notes;
pub mod types;

pub use types::*;

use rules::{registered_rules, RuleOutcome};

/// Deterministic validation entry point.
///
/// Iterates registered rules in registration order, collects
/// findings / clean_rules / skipped_rules, applies the binding
/// ordering rule (severity DESC, rule_id ASC, finding_key ASC),
/// detects `finding_key` collisions, and returns a complete
/// `ValidationReport` with the supplied context echoed verbatim.
pub fn validate_device(
    model: &DeviceModel,
    ctx: &ValidatorContext,
) -> ValidationReport {
    let mut findings: Vec<Finding> = Vec::new();
    let mut clean_rules: Vec<RuleId> = Vec::new();
    let mut skipped_rules: Vec<SkippedRule> = Vec::new();

    for rule in registered_rules() {
        match rule.evaluate(model, ctx) {
            RuleOutcome::Clean => {
                clean_rules.push(rule.id().to_string());
            }
            RuleOutcome::Skipped(reason) => {
                skipped_rules.push(SkippedRule {
                    rule_id: rule.id().to_string(),
                    reason,
                    area: Some(rule.area().to_string()),
                });
            }
            RuleOutcome::Triggered(produced) => {
                findings.extend(produced);
            }
        }
    }

    // Deterministic ordering — severity DESC, rule_id ASC,
    // finding_key ASC. Sort stable so equal-key entries keep their
    // emission order from the rule.
    findings.sort_by(|a, b| {
        b.severity
            .cmp(&a.severity)
            .then_with(|| a.rule_id.cmp(&b.rule_id))
            .then_with(|| a.finding_key.cmp(&b.finding_key))
    });
    clean_rules.sort();
    skipped_rules.sort_by(|a, b| a.rule_id.cmp(&b.rule_id));

    // finding_key collision detection. A collision is a rule-author
    // bug. In test builds we panic so it surfaces immediately; in
    // release builds we keep the report rendering by inserting a
    // synthetic finding describing the collision rather than dropping
    // data.
    let mut seen: BTreeSet<String> = BTreeSet::new();
    let mut collisions: Vec<String> = Vec::new();
    for f in &findings {
        if !seen.insert(f.finding_key.clone()) {
            collisions.push(f.finding_key.clone());
        }
    }
    if !collisions.is_empty() {
        #[cfg(debug_assertions)]
        {
            panic!(
                "validator: finding_key collision detected — rule-author bug: {collisions:?}"
            );
        }
        #[cfg(not(debug_assertions))]
        {
            let collision_keys = collisions.join(",");
            findings.push(Finding {
                finding_key: format!("VALIDATOR-INTERNAL-001:collision:{collision_keys}"),
                rule_id: "VALIDATOR-INTERNAL-001".to_string(),
                rule_version: 1,
                severity: Severity::Critical,
                signal: SignalCategory::Hard,
                title: "finding_key collision across rules".to_string(),
                evidence: Vec::new(),
                affected_area: "validator_internal".to_string(),
                recommendation: Some(
                    "Rule-author bug. Inspect the rule(s) producing the colliding key."
                        .to_string(),
                ),
            });
        }
    }

    ValidationReport {
        validator_version: VALIDATOR_VERSION,
        rule_pack_version: RULE_PACK_VERSION,
        context: ctx.clone(),
        findings,
        clean_rules,
        skipped_rules,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_context() -> ValidatorContext {
        ValidatorContext {
            platform_id: None,
            parser_id: None,
            parser_version: None,
            selection_mode: SelectionMode::ManualOverride,
            detection_confidence: None,
            detection_source: Some(DetectionSource::NotApplicable),
            source_context: None,
        }
    }

    #[test]
    fn validate_empty_device_model_produces_a_report() {
        let model = DeviceModel::default();
        let ctx = empty_context();
        let r = validate_device(&model, &ctx);
        assert_eq!(r.validator_version, VALIDATOR_VERSION);
        assert_eq!(r.rule_pack_version, RULE_PACK_VERSION);
        assert_eq!(r.context, ctx);
        // findings + clean + skipped cover every registered rule.
        let total = r.findings.len() + r.clean_rules.len() + r.skipped_rules.len();
        assert_eq!(total, registered_rules().len());
    }
}
