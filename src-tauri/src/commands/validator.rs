//! Tauri command boundary for the V1P Validator Engine.
//!
//! Single command: `validate_device_model`. Accepts a parsed
//! `DeviceModel` plus a `ValidatorContext`, returns a structured
//! `ValidationReport`. Mirrors the V1O-A / V1O-B return-shape
//! discipline:
//!
//!   - `Ok(ValidationReport)` for ALL ordinary outcomes,
//!     including empty / no findings.
//!   - `Err(String)` reserved for genuine internal failure. The
//!     engine is infallible; this variant is reserved for future
//!     panic-catching boundaries and consistency with the
//!     neighbouring command shapes.

use crate::engines::network_model::DeviceModel;
use crate::engines::validator::{self, ValidationReport, ValidatorContext};

#[tauri::command]
pub fn validate_device_model(
    device_model: DeviceModel,
    context: ValidatorContext,
) -> Result<ValidationReport, String> {
    Ok(validator::validate_device(&device_model, &context))
}
