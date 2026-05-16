//! Tauri command boundary for the V1O-A Config Splitter Engine.
//!
//! Single command: `split_config_batch`. Mirrors the V1J detection
//! command shape — typed input, typed output, no hidden state. Ordinary
//! conditions (empty input, ambiguous boundary, oversize batch) are
//! returned as `Ok(...)` with a `BatchWarning`; only genuine internal
//! failures use `Err`.

use crate::engines::config_splitter::{self, ConfigBatchSplitResult};

#[tauri::command]
pub fn split_config_batch(config_text: String) -> ConfigBatchSplitResult {
    config_splitter::split_config_batch(&config_text)
}
