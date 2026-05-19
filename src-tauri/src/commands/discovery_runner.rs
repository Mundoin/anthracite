//! Tauri commands for the Discovery Foundation v1 (V1AX).
//!
//! Exposes discovery planning and validation as operator-triggered commands.
//! No device contact is performed; the commands return deterministic plans
//! that an operator reviews before any future transport stage.
//!
//! See: `src-tauri/src/engines/discovery_runner.rs` and
//! `docs/architecture/DISCOVERY_FOUNDATION_V1.md` V1AX.

use crate::engines::discovery_runner::{
    DiscoveryTarget, DiscoveryTargetValidation, DiscoveryRunPlan, DiscoveryRunReport,
    validate_target, plan_discovery, attempt_discovery,
};

/// Validates a discovery target without generating a plan.
/// Returns issues if the target fails validation.
#[tauri::command]
pub fn validate_discovery_target(target: DiscoveryTarget) -> DiscoveryTargetValidation {
    validate_target(&target)
}

/// Generates a discovery run plan for a target without executing it.
/// Returns a plan with planned commands and safety checklist.
/// Panics if target is invalid; the frontend should validate first.
#[tauri::command]
pub fn plan_discovery_run(target: DiscoveryTarget) -> DiscoveryRunPlan {
    plan_discovery(&target)
}

/// Attempts discovery on a target. Validates, plans, and determines outcome.
/// Returns a report with the outcome (TransportDeferred or Refused).
#[tauri::command]
pub fn attempt_discovery_run(target: DiscoveryTarget) -> DiscoveryRunReport {
    attempt_discovery(&target)
}
