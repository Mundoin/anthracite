//! NX-OS `feature` command tracker — V1U.
//!
//! NX-OS enables services with `feature <name>`. V1U tracks the features
//! that affect service detection; all others are treated as parsed-and-counted
//! at the orchestrator level without modelling.

/// Features that V1U recognises as affecting service detection.
pub const TRACKED_FEATURES: &[&str] = &["ssh", "ntp", "snmp"];

/// Returns true if the feature name (already lowercased) is one V1U tracks.
pub fn is_tracked(feature_lower: &str) -> bool {
    TRACKED_FEATURES.contains(&feature_lower)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ssh_is_tracked() {
        assert!(is_tracked("ssh"));
    }

    #[test]
    fn bgp_is_not_tracked() {
        assert!(!is_tracked("bgp"));
    }
}
