//! Junos aggregate-Ethernet (LAG) helpers — V1M.
//!
//! Junos models LAG as:
//!   - `ae0` bundle interface (the aggregator)
//!   - member interfaces declaring `gigether-options 802.3ad ae0` or
//!     `ether-options 802.3ad ae0`
//!
//! V1M maps Junos `ae<N>` directly into `lag_membership = "ae<N>"` on
//! members, then synthesises `LagGroupModel` records during finalize
//! by reverse-mapping membership. This mirrors the V1K Cisco pattern.

use crate::engines::network_model::LagMode;

/// Parse the Junos LACP mode keyword. `active`, `passive` map; `static`
/// is implied when no LACP keyword appears (caller's responsibility).
pub fn parse_lacp_mode(s: &str) -> Option<LagMode> {
    match s {
        "active" => Some(LagMode::Active),
        "passive" => Some(LagMode::Passive),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lacp_modes_parse() {
        assert_eq!(parse_lacp_mode("active"), Some(LagMode::Active));
        assert_eq!(parse_lacp_mode("passive"), Some(LagMode::Passive));
        assert!(parse_lacp_mode("static").is_none());
    }
}
