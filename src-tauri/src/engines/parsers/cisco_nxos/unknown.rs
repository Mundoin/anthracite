//! NX-OS unknown / out-of-scope emission helpers — V1U.

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

/// NX-OS top-level keywords V1U treats as deliberately out-of-scope blocks.
/// Pushing a sentinel frame causes child lines to emit `OutOfScope` with
/// the correct `context_path` rather than `UnsupportedKeyword`.
pub const NXOS_OUT_OF_SCOPE_TOP_LEVEL: &[&str] = &[
    "router",
    "policy-map",
    "class-map",
    "route-map",
    "ip",       // handled selectively; remainder falls here
    "ipv6",     // handled selectively
    "monitor",
    "hardware",
    "boot",
    "ntp",      // handled selectively at top-level dispatcher
    "copp",
    "errdisable",
    "spanning-tree",
    "vpc",
    "evpn",
    "segment-routing",
    "mpls",
    "event-manager",
    "flow",
    "line",
    "fabric",
];
