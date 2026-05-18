//! Tauri commands for the Topology Engine.
//!
//! V1AJ: composes Discovery + Topology engines. Topology consumes
//! Discovery's `inventory_view` and projects to a typed read model.
//! Dependency direction: Topology reads Discovery; Discovery never
//! references Topology.

use crate::engines::discovery::DiscoveryEngine;
use crate::engines::topology::{TopologyEngine, TopologyView};
use tauri::State;

#[tauri::command]
pub fn get_topology_view(
    topology: State<'_, TopologyEngine>,
    discovery: State<'_, DiscoveryEngine>,
    environment_id: Option<String>,
) -> TopologyView {
    let inventory = discovery.inventory_view(environment_id.as_deref());
    topology.project(environment_id.as_deref(), &inventory.records)
}
