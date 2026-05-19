use tauri::State;

use crate::engines::server_key_store::{ServerKeyPin, ServerKeyStore};

#[tauri::command]
pub fn get_server_key_pin(
    host: String,
    port: u16,
    store: State<'_, ServerKeyStore>,
) -> Option<ServerKeyPin> {
    store.get_pin(&host, port)
}

#[tauri::command]
pub fn pin_server_key(
    host: String,
    port: u16,
    algorithm: String,
    fingerprint_sha256: String,
    pinned_at: String,
    store: State<'_, ServerKeyStore>,
) -> Result<ServerKeyPin, String> {
    store.set_pin(&host, port, &algorithm, &fingerprint_sha256, &pinned_at)
}
