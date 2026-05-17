//! Deterministic engines.
//!
//! Each engine owns its data and exposes a typed API. Modes are surfaces
//! over these engines (see `docs/architecture/ENGINE_AND_API_BOUNDARIES.md`).

pub mod archive_intake;
pub mod config_detection;
pub mod config_splitter;
pub mod environment;
pub mod network_model;
pub mod parsers;
pub mod receipt;
pub mod validator;
pub mod vendor_registry;
