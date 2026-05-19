//! Tauri command for SSH-based discovery execution (V1AZ).
//!
//! Exposes SSH execution as an operator-triggered command.
//! Credentials are session-only; never persisted or logged.

use crate::engines::discovery_runner::{
    DiscoveryTarget, DiscoveryRunReport, execute_discovery,
};
use crate::engines::ssh_transport::{
    DiscoveryCredentials, RealRusshTransport, SshExecutionLimits,
};

/// Executes a discovery run with SSH transport. Validates target, plans,
/// and executes read-only commands via SSH. Returns a report with the outcome.
/// Credentials are session-only in-memory; dropped immediately after use.
#[tauri::command]
pub async fn execute_discovery_run(
    target: DiscoveryTarget,
    credentials: DiscoveryCredentials,
    limits: Option<SshExecutionLimits>,
) -> DiscoveryRunReport {
    let transport = RealRusshTransport::new();
    execute_discovery(&target, credentials, &transport, limits).await
}
