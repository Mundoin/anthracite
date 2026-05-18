//! Tauri commands for the Live Collection planning surface (V1AT).
//!
//! V1AT exposes one read-only planning command. No device contact is
//! performed; the call returns a deterministic dry-run plan that an
//! operator must review before any future driver acts on it.
//!
//! See: `src-tauri/src/engines/live_collection_plan.rs` and
//! `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` V1AT.

use crate::engines::live_collection_plan::{
    plan_live_topology_collection, LiveCollectionDryRunPlan, LiveCollectionDryRunRequest,
};

#[tauri::command]
pub fn plan_live_topology_collection_cmd(
    request: LiveCollectionDryRunRequest,
) -> LiveCollectionDryRunPlan {
    plan_live_topology_collection(request)
}
