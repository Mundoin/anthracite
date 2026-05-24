//! Lab Persistence commands — V1BO.
//!
//! Frontend ↔ Rust contract for durable lab-environment persistence.
//! Treats the saved state as an opaque JSON string owned by the
//! frontend (`EnvironmentLifecycleStoreState` serialized via
//! `environmentPersistence.ts`). See `engines::lab_blob_store` for
//! rationale.

use tauri::State;

use crate::engines::lab_blob_store::LabBlobStore;

/// Read the persisted saved-environments blob. Returns `None` when the
/// file does not exist or is unreadable — the frontend treats either
/// as "no durable state yet" and falls back to localStorage.
#[tauri::command]
pub fn read_saved_environments_blob(store: State<'_, LabBlobStore>) -> Option<String> {
    store.read_blob()
}

/// Persist the saved-environments blob. The frontend serializes the
/// whole `EnvironmentLifecycleStoreState` snapshot and passes it
/// verbatim; Rust only persists the string. Returns the error string
/// on failure so the auto-save effect can surface it in `SaveStatus`.
#[tauri::command]
pub fn write_saved_environments_blob(
    blob: String,
    store: State<'_, LabBlobStore>,
) -> Result<(), String> {
    store.write_blob(&blob)
}
