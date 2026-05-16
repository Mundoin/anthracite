//! Junos unknown-line emission helpers — V1M.
//!
//! Path-prefix vocabulary the V1M parser treats as out-of-scope. Any
//! `JunosLine` whose path starts with one of these prefixes is recorded
//! in `unknown_lines[]` with `UnknownReason::OutOfScope` rather than
//! falling through to the default `UnsupportedKeyword`.

use crate::engines::network_model::{UnknownConfigLine, UnknownReason};

use super::canonical::JunosLine;

/// Path prefixes the V1M parser deliberately does not interpret.
/// V1N-A: `deactivate` and `delete` set-style forms are also routed
/// here so they surface as `OutOfScope` evidence rather than vanishing.
pub const OUT_OF_SCOPE_PREFIXES: &[&[&str]] = &[
    &["protocols"],
    &["policy-options"],
    &["firewall"],
    &["security"],
    &["class-of-service"],
    &["forwarding-options"],
    &["services"],
    &["applications"],
    &["deactivate"],
    &["delete"],
];

pub fn is_out_of_scope(line: &JunosLine) -> bool {
    OUT_OF_SCOPE_PREFIXES
        .iter()
        .any(|p| line.path_starts_with(p))
}

pub fn emit_unknown(line: &JunosLine, reason: UnknownReason) -> UnknownConfigLine {
    UnknownConfigLine {
        source: None,
        line_number: Some(line.line_number),
        raw: line.raw.clone(),
        context_path: if line.path.is_empty() {
            None
        } else {
            Some(line.path.join(" "))
        },
        reason: Some(reason),
    }
}
