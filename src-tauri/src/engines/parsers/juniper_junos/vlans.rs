//! Junos VLAN helpers — V1M.
//!
//! Junos models VLANs as named records under `vlans { NAME { vlan-id N; } }`.
//! A separate name → id table resolves `vlan members NAME` references
//! during finalization.

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
