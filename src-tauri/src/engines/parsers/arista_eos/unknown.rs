//! EOS unknown / out-of-scope emission helpers — V1N.

use crate::engines::network_model::{UnknownConfigLine, UnknownReason};

pub fn emit(
    line_number: u64,
    raw: &str,
    context: Option<&str>,
    reason: UnknownReason,
) -> UnknownConfigLine {
    UnknownConfigLine {
        source: None,
        line_number: Some(line_number),
        raw: raw.to_string(),
        context_path: context.map(|s| s.to_string()),
        reason: Some(reason),
    }
}

pub fn default_reason() -> UnknownReason {
    UnknownReason::UnsupportedKeyword
}

/// EOS-specific top-level keywords V1N treats as deliberately
/// out-of-scope blocks. Used by the orchestrator to push a sentinel
/// frame so child lines fall through to a single `OutOfScope` emission
/// per line with the right `context_path`.
pub const EOS_OUT_OF_SCOPE_TOP_LEVEL: &[&str] = &[
    "mlag",
    "daemon",
    "event-handler",
    "router",
    "policy-map",
    "class-map",
    "queue-monitor",
    "monitor",
    "address-locking",
    "platform",
    "agent",
    "tap",
    "tunnel-engine",
];
