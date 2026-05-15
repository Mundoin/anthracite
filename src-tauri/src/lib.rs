//! Anthracite — Tauri v2 backend skeleton.
//!
//! Stage V1A: no domain logic yet. Single ping command proves the
//! frontend↔backend bridge works.

use serde::Serialize;

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
        stage: "V1A",
        version: env!("CARGO_PKG_VERSION"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![ping])
        .run(tauri::generate_context!())
        .expect("error while running anthracite tauri application");
}
