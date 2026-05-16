//! Helpers for emitting `UnknownConfigLine` records.

use crate::engines::network_model::{UnknownConfigLine, UnknownReason};

pub fn emit(
    line_number: u64,
    raw: &str,
    context_path: Option<&str>,
    reason: UnknownReason,
) -> UnknownConfigLine {
    UnknownConfigLine {
        source: None,
        line_number: Some(line_number),
        raw: raw.to_string(),
        context_path: context_path.map(|s| s.to_string()),
        reason: Some(reason),
    }
}

/// Default reason for any cisco-iosxe line the parser does not recognise
/// at its current maturity level.
pub fn default_reason() -> UnknownReason {
    UnknownReason::UnsupportedKeyword
}
