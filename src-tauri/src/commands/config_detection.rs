//! Tauri commands for the Config Detection Engine.

use crate::engines::config_detection::{self, ConfigDetectionResult};

#[tauri::command]
pub fn detect_config_platform(config_text: String) -> ConfigDetectionResult {
    config_detection::detect_config_platform(&config_text)
}
