//! Tauri command for the parser dispatch boundary (V1K).
//!
//! Per [`docs/architecture/PARSER_COMMAND_CONTRACT.md`](../../../../docs/architecture/PARSER_COMMAND_CONTRACT.md):
//! caller supplies a `PlatformRef`; parser never calls detection;
//! unknown/missing platform id returns a controlled `Err`.

use crate::engines::network_model::{DeviceModel, PlatformRef};
use crate::engines::parsers;

#[tauri::command]
pub fn parse_device_config(
    platform_ref: PlatformRef,
    config_text: String,
) -> Result<DeviceModel, String> {
    parsers::parse_device_config(platform_ref, &config_text)
}
