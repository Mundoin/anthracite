//! Anthracite — Tauri v2 backend.
//!
//! Stage V1E: Environment Engine spine + selection persistence + readiness
//! projection. The legacy `ping` command stays as a bridge sanity check;
//! the Environment Engine hydrates from a small JSON store in the app
//! data directory on boot, writes back on every successful selection
//! change, and exposes a deterministic readiness snapshot.

use std::sync::Arc;

use serde::Serialize;
use tauri::Manager;

pub mod commands;
pub mod engines;

use engines::discovery::{DiscoveryEngine, JsonDiscoveryFileStore};
use engines::environment::{EnvironmentEngine, JsonFileStore};

#[derive(Serialize)]
struct Pong {
    name: &'static str,
    stage: &'static str,
    version: &'static str,
}

#[tauri::command]
fn ping() -> Pong {
    Pong {
        name: "anthracite",
        stage: "port-d2",
        version: env!("CARGO_PKG_VERSION"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("app data directory must resolve on supported platforms");
            // Best-effort: create the directory now so the first save has a home.
            let _ = std::fs::create_dir_all(&data_dir);
            let store = JsonFileStore::new(data_dir.join("environment.json"));
            app.manage(EnvironmentEngine::with_store(Arc::new(store)));
            let discovery_path = data_dir.join("discovery_inventory.json");
            let discovery_store = JsonDiscoveryFileStore::new(discovery_path);
            app.manage(DiscoveryEngine::with_store(Arc::new(discovery_store)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            commands::environment::list_environments,
            commands::environment::get_active_environment,
            commands::environment::set_active_environment,
            commands::environment::get_environment_readiness,
            commands::vendor_registry::list_vendor_platforms,
            commands::vendor_registry::get_vendor_platform,
            commands::config_detection::detect_config_platform,
            commands::config_splitter::split_config_batch,
            commands::archive_intake::archive_intake,
            commands::parser::parse_device_config,
            commands::receipt::project_device_receipt,
            commands::validator::validate_device_model,
            commands::discovery::get_discovery_inventory,
            commands::discovery::preview_discovery_import,
            commands::discovery::import_discovery_records,
        ])
        .run(tauri::generate_context!())
        .expect("error while running anthracite tauri application");
}
