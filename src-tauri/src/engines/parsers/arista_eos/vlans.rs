//! EOS VLAN helpers — V1N.

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

pub fn parse_vlan_opener(args: &str) -> Option<u16> {
    args.split_whitespace().next()?.parse().ok()
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
