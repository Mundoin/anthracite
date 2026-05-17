//! NX-OS VLAN helpers — V1U.
//!
//! NX-OS `vlan X` / `vlan X-Y,Z` blocks are similar to IOS-XE.
//! V1U only handles single VLAN IDs; ranges are captured as unknown.

use crate::engines::network_model::{VlanModel, VlanState};

#[derive(Debug, Default, Clone)]
pub struct VlanBuilder {
    pub id: u16,
    pub name: Option<String>,
    pub state: VlanState,
    pub interfaces: Vec<String>,
}

impl VlanBuilder {
    pub fn new(id: u16) -> Self {
        Self {
            id,
            ..Self::default()
        }
    }

    pub fn build(mut self) -> VlanModel {
        self.interfaces.sort();
        self.interfaces.dedup();
        VlanModel {
            id: self.id,
            name: self.name,
            state: self.state,
            interfaces: self.interfaces,
        }
    }
}

/// Return Some(id) only for a simple single-id opener (no ranges).
pub fn parse_vlan_opener(args: &str) -> Option<u16> {
    let tok = args.split_whitespace().next()?;
    if tok.contains('-') || tok.contains(',') {
        return None;
    }
    tok.parse().ok()
}

pub fn parse_name_line(args: &str) -> Option<String> {
    let t = args.trim();
    if t.is_empty() {
        None
    } else {
        Some(t.to_string())
    }
}

pub fn parse_state_line(args: &str) -> Option<VlanState> {
    match args.trim().to_ascii_lowercase().as_str() {
        "active" => Some(VlanState::Active),
        "suspend" | "suspended" => Some(VlanState::Suspended),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_id_opener() {
        assert_eq!(parse_vlan_opener("100"), Some(100));
    }

    #[test]
    fn range_returns_none() {
        assert!(parse_vlan_opener("100-110").is_none());
    }

    #[test]
    fn comma_list_returns_none() {
        assert!(parse_vlan_opener("100,200").is_none());
    }
}
