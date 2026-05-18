//! Typed Tauri command surface.
//!
//! Modes call engines through these commands. One module per engine; the
//! command signatures are the typed contract between Rust and TypeScript.

pub mod archive_intake;
pub mod config_detection;
pub mod config_splitter;
pub mod discovery;
pub mod environment;
pub mod live_collection;
pub mod parser;
pub mod receipt;
pub mod topology;
pub mod validator;
pub mod vendor_registry;
