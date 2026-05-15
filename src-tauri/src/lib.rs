//! Anthracite — Tauri v2 backend.
//!
//! Stage V1D: Environment Engine spine + selection persistence. The legacy
//! `ping` command stays as a bridge sanity check; the Environment Engine
//! hydrates from a small JSON store in the app data directory on boot and
//! writes back on every successful selection change.

use std::sync::Arc;

use serde::Serialize;
use tauri::Manager;

pub mod commands;
pub mod engines;

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
        stage: "V1D",
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            commands::environment::list_environments,
            commands::environment::get_active_environment,
            commands::environment::set_active_environment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running anthracite tauri application");
}
