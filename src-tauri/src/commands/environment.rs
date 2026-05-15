//! Tauri commands for the Environment Engine.

use crate::engines::environment::{Environment, EnvironmentEngine};
use tauri::State;

#[tauri::command]
pub fn list_environments(engine: State<'_, EnvironmentEngine>) -> Vec<Environment> {
    engine.list()
}

#[tauri::command]
pub fn get_active_environment(engine: State<'_, EnvironmentEngine>) -> Option<Environment> {
    engine.active()
}

#[tauri::command]
pub fn set_active_environment(
    engine: State<'_, EnvironmentEngine>,
    id: String,
) -> Result<Environment, String> {
    engine.set_active(&id)
}
