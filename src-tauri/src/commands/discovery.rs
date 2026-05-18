//! Tauri commands for the Discovery Engine.
//!
//! V1AF surface: a single read-only view command. No mutation, no
//! collection trigger — that lands in later stages.

use crate::engines::discovery::{DiscoveryEngine, DiscoveryInventoryView};
use tauri::State;

#[tauri::command]
pub fn get_discovery_inventory(
    engine: State<'_, DiscoveryEngine>,
    environment_id: Option<String>,
) -> DiscoveryInventoryView {
    engine.inventory_view(environment_id.as_deref())
}
