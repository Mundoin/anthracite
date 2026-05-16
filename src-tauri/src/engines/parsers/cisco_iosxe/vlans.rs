//! VLAN-area helpers.

use crate::engines::network_model::{VlanModel, VlanState};

#[derive(Debug, Clone, Default)]
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
            name: None,
            state: VlanState::Active,
            interfaces: Vec::new(),
        }
    }

    pub fn build(self) -> VlanModel {
        let mut ifs = self.interfaces;
        ifs.sort();
        ifs.dedup();
        VlanModel {
            id: self.id,
            name: self.name,
            state: self.state,
            interfaces: ifs,
        }
    }
}

/// Parse `vlan N` opener, returning the VLAN id.
pub fn parse_vlan_opener(args: &str) -> Option<u16> {
    args.split_whitespace().next()?.parse().ok()
}

/// Parse `name FOO` line inside a vlan block.
pub fn parse_name_line(args: &str) -> Option<String> {
    let n = args.trim();
    if n.is_empty() {
        None
    } else {
        Some(n.to_string())
    }
}

/// Parse `state suspend` line inside a vlan block.
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
    fn opener_parses_id() {
        assert_eq!(parse_vlan_opener("10"), Some(10));
        assert_eq!(parse_vlan_opener("4094"), Some(4094));
    }

    #[test]
    fn name_present() {
        assert_eq!(parse_name_line("USERS").as_deref(), Some("USERS"));
    }

    #[test]
    fn name_absent_when_blank() {
        assert_eq!(parse_name_line(""), None);
    }

    #[test]
    fn state_suspend() {
        assert_eq!(parse_state_line("suspend"), Some(VlanState::Suspended));
    }

    #[test]
    fn builder_dedups_and_sorts_interfaces() {
        let mut b = VlanBuilder::new(10);
        b.interfaces.push("Gi0/2".to_string());
        b.interfaces.push("Gi0/1".to_string());
        b.interfaces.push("Gi0/1".to_string());
        let v = b.build();
        assert_eq!(v.interfaces, vec!["Gi0/1".to_string(), "Gi0/2".to_string()]);
    }
}
