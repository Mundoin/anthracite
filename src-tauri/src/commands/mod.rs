//! Typed Tauri command surface.
//!
//! Modes call engines through these commands. One module per engine; the
//! command signatures are the typed contract between Rust and TypeScript.

pub mod config_detection;
pub mod environment;
pub mod vendor_registry;
