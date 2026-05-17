//! Validator rule trait + registration.
//!
//! V1P ships three MGMT-HYG rules (001/002/003). MGMT-HYG-004
//! (Telnet enabled) is deferred to a follow-up stage because no
//! current parser emits `ServiceKind::Telnet` — see V1P stage note
//! §"Halt-rule trip" for the discovery.
//!
//! Rules are zero-sized unit structs implementing `Rule`. The
//! registered slice is built statically at compile time so the
//! registration is a const slice of `&'static dyn Rule` — no
//! once_cell, no Lazy, no Vec allocation per call.

use crate::engines::network_model::DeviceModel;

use super::types::{Finding, Severity, SignalCategory, SkipReason, ValidatorContext};

pub mod mgmt_hyg_001;
pub mod mgmt_hyg_002;
pub mod mgmt_hyg_003;

pub trait Rule: Send + Sync {
    fn id(&self) -> &'static str;
    fn rule_version(&self) -> u32;
    fn area(&self) -> &'static str;
    fn default_severity(&self) -> Severity;
    fn signal(&self) -> SignalCategory;
    fn title(&self) -> &'static str;
    fn recommendation(&self) -> Option<&'static str>;
    fn evaluate(&self, model: &DeviceModel, ctx: &ValidatorContext) -> RuleOutcome;
}

pub enum RuleOutcome {
    Clean,
    Skipped(SkipReason),
    Triggered(Vec<Finding>),
}

impl std::fmt::Debug for RuleOutcome {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RuleOutcome::Clean => write!(f, "Clean"),
            RuleOutcome::Skipped(r) => write!(f, "Skipped({r:?})"),
            RuleOutcome::Triggered(v) => write!(f, "Triggered({} findings)", v.len()),
        }
    }
}

pub fn registered_rules() -> &'static [&'static dyn Rule] {
    static RULES: &[&dyn Rule] = &[
        &mgmt_hyg_001::Rule001,
        &mgmt_hyg_002::Rule002,
        &mgmt_hyg_003::Rule003,
    ];
    RULES
}

/// Helper used by every rule that scopes to a parser-declared area.
/// Returns `true` when the parser explicitly marked the area as out
/// of scope via a `not_in_scope:{area}` warning on
/// `DeviceModel.parse_confidence.warnings`.
pub fn area_not_in_scope(model: &DeviceModel, area: &str) -> bool {
    let marker = format!("not_in_scope:{area}");
    model
        .parse_confidence
        .warnings
        .iter()
        .any(|w| w == &marker)
}
