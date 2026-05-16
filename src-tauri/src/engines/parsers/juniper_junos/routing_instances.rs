//! Junos routing-instance / VRF helpers — V1M.

use crate::engines::network_model::VrfModel;

#[derive(Debug, Default, Clone)]
pub struct VrfBuilder {
    pub name: String,
    pub instance_type: Option<String>,
    pub route_distinguisher: Option<String>,
    pub route_targets_import: Vec<String>,
    pub route_targets_export: Vec<String>,
    pub interfaces: Vec<String>,
    pub address_families: Vec<String>,
}

impl VrfBuilder {
    pub fn new(name: String) -> Self {
        Self {
            name,
            ..Self::default()
        }
    }

    pub fn build(mut self) -> VrfModel {
        self.interfaces.sort();
        self.interfaces.dedup();
        self.address_families.sort();
        self.address_families.dedup();
        self.route_targets_import.sort();
        self.route_targets_import.dedup();
        self.route_targets_export.sort();
        self.route_targets_export.dedup();
        VrfModel {
            name: self.name,
            route_distinguisher: self.route_distinguisher,
            route_targets_import: self.route_targets_import,
            route_targets_export: self.route_targets_export,
            interfaces: self.interfaces,
            address_families: self.address_families,
        }
    }
}
