//! Anthracite — Tauri v2 backend.
//!
//! Stage V1C: Environment Engine spine. The legacy `ping` command stays as
//! a bridge sanity check; the Environment Engine is the first real domain
//! engine exposed through a typed command surface.

use serde::Serialize;

pub mod commands;
pub mod engines;

use engines::environment::EnvironmentEngine;

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
        stage: "V1C",
        version: env!("CARGO_PKG_VERSION"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(EnvironmentEngine::new())
        .invoke_handler(tauri::generate_handler![
            ping,
            commands::environment::list_environments,
            commands::environment::get_active_environment,
            commands::environment::set_active_environment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running anthracite tauri application");
}
