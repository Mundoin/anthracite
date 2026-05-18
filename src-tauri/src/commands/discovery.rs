//! Tauri commands for the Discovery Engine.
//!
//! V1AF surface: a single read-only view command. No mutation, no
//! collection trigger — that lands in later stages.
//! V1AH: added preview_discovery_import for non-mutating import candidate preview.
//! V1AI: added import_discovery_records for authoritative import with persistence.

use crate::engines::discovery::{
    DiscoveryEngine, DiscoveryImportCandidate, DiscoveryImportCommitResult, DiscoveryImportPreview,
    DiscoveryInventoryView,
};
use tauri::State;

#[tauri::command]
pub fn get_discovery_inventory(
    engine: State<'_, DiscoveryEngine>,
    environment_id: Option<String>,
) -> DiscoveryInventoryView {
    engine.inventory_view(environment_id.as_deref())
}

/// Preview importing discovery candidates into an environment.
/// Non-mutating: returns accepted, rejected, and summary without storing records.
#[tauri::command]
pub fn preview_discovery_import(
    engine: State<'_, DiscoveryEngine>,
    environment_id: String,
    candidates: Vec<DiscoveryImportCandidate>,
) -> DiscoveryImportPreview {
    engine.preview_import(&environment_id, &candidates)
}

/// Authoritative import: validate, store, and persist discovery candidates.
/// Returns the commit result with accepted records, rejections, and summary.
/// On success, records are stored in-memory and persisted to disk.
#[tauri::command]
pub fn import_discovery_records(
    engine: State<'_, DiscoveryEngine>,
    environment_id: String,
    candidates: Vec<DiscoveryImportCandidate>,
) -> Result<DiscoveryImportCommitResult, String> {
    engine.import_records(&environment_id, &candidates)
}
