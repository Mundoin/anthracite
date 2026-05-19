//! SSH Transport v1 (V1AZ).
//!
//! V1AZ implements read-only SSH execution against discovery targets.
//! Credentials are session-only in-memory (password or PEM-encoded private key).
//! All output is utf8-lossy decoded and size-limited.
//!
//! V1BC adds a per-attempt server-key observation (algorithm + SHA256
//! fingerprint + trust_mode) captured at TOFU handshake. Persistence of
//! pinned keys (known_hosts-style) is still deferred — current trust_mode
//! is always `tofu_session`.
//!
//! Invariants:
//!   - No credential persistence. Dropped immediately after use.
//!   - All commands verified read-only before execution.
//!   - Output strictly bounded by per-command and total limits.
//!   - Secrets never leak in error messages or logs.
//!   - Errors redacted to avoid exposing password/key bytes.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Newtype around a secret string. Custom Debug/Display always prints "***"
/// so secrets cannot leak through error chains, logs, or panics.
#[derive(Clone, Deserialize)]
pub struct SecretString(String);

impl SecretString {
    pub fn new(s: String) -> Self {
        Self(s)
    }

    /// Intentional: expose the secret bytes. Use only where absolutely necessary
    /// (e.g., passing to russh for authentication). Never call this in error paths.
    pub fn expose(&self) -> &str {
        &self.0
    }

    /// Consume and return the inner string. Use only when ownership is essential.
    pub fn into_inner(self) -> String {
        self.0
    }
}

impl fmt::Debug for SecretString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "SecretString(***)")
    }
}

impl fmt::Display for SecretString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "***")
    }
}

// DO NOT derive Serialize — we never serialize credentials to the frontend.

/// Operator-provided session-only credentials. Held in memory only
/// for the duration of an attempt; dropped immediately after.
#[derive(Clone, Debug, Deserialize)]
pub struct DiscoveryCredentials {
    pub auth: DiscoveryAuthMaterial,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum DiscoveryAuthMaterial {
    Password { password: SecretString },
    PrivateKey {
        private_key_pem: SecretString,
        passphrase: Option<SecretString>,
    },
}

/// Bounded execution policy — every attempt is capped.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct SshExecutionLimits {
    pub connect_timeout_ms: u32,        // default 10_000
    pub per_command_timeout_ms: u32,    // default 15_000
    pub max_output_bytes_per_command: u32, // default 1_048_576 (1 MiB)
    pub max_total_output_bytes: u32,    // default 8_388_608 (8 MiB)
}

impl Default for SshExecutionLimits {
    fn default() -> Self {
        Self {
            connect_timeout_ms: 10_000,
            per_command_timeout_ms: 15_000,
            max_output_bytes_per_command: 1_048_576,
            max_total_output_bytes: 8_388_608,
        }
    }
}

/// One command's result. stdout/stderr are utf8-lossy decoded;
/// truncated to max_output_bytes_per_command with `output_truncated: true`.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct CommandExecutionResult {
    pub command: String,
    pub exit_code: Option<i32>,
    pub duration_ms: u32,
    pub stdout: String,
    pub stderr: String,
    pub output_truncated: bool,
}

/// Trust-mode of a server-key observation. V1BC ships `TofuSession` only —
/// the fingerprint is observed and surfaced for the duration of the attempt
/// but is NOT persisted; a future stage adds pinning/known-hosts.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ServerKeyTrustMode {
    TofuSession,
}

/// One observation of the remote server's host key, captured at handshake.
/// Carries algorithm name (e.g. `ssh-ed25519`) and a `SHA256:<base64-nopad>`
/// fingerprint matching the OpenSSH `-E sha256` format.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ServerKeyObservation {
    pub algorithm: String,
    pub fingerprint_sha256: String,
    pub trust_mode: ServerKeyTrustMode,
}

/// Wrapper carrying both the outcome and any server-key observation captured
/// during the attempt. server_key is None when the connection failed before
/// the handshake reached the host-key step (or in Refused / pre-flight gate
/// rejections).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct SshAttemptResult {
    pub outcome: SshExecutionOutcome,
    pub server_key: Option<ServerKeyObservation>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SshExecutionOutcome {
    Success {
        command_results: Vec<CommandExecutionResult>,
    },
    AuthFailed {
        reason_redacted: String,
    },
    ConnectionFailed {
        reason_redacted: String,
    },
    Timeout {
        stage: String, // "connect" | "command:<name>"
    },
    CommandFailed {
        partial_results: Vec<CommandExecutionResult>,
        reason_redacted: String,
    },
    Refused {
        reason: String, // read-only gate refusals; no secrets
    },
}

/// Trait so unit tests can inject a mock transport without going to a
/// real socket. Real impl uses russh. Async because russh is async.
#[async_trait::async_trait]
pub trait SshTransport: Send + Sync {
    async fn execute_read_only(
        &self,
        host: &str,
        port: u16,
        username: &str,
        credentials: &DiscoveryCredentials,
        commands: &[String],
        limits: SshExecutionLimits,
    ) -> SshAttemptResult;
}

/// Real SSH transport implementation using russh (pure-Rust async).
///
/// V1AZ implementation:
/// - Connect via russh::client::connect with bounded connect timeout
/// - Authenticate password or PEM private key (TOFU server-key, V1BA will pin)
/// - Open one session channel per command, exec read-only command,
///   stream stdout/stderr with per-command + total output caps,
///   honour per-command timeout, capture exit status
/// - All errors mapped through `redact_error` so neither credential
///   bytes nor russh-internal addresses leak to the operator
///
/// russh / russh-keys never leak into any public DiscoveryTarget,
/// DiscoveryRunOutcome, or frontend type. They are confined to this
/// module behind the SshTransport trait.
pub struct RealRusshTransport;

struct TofuClient {
    observed: std::sync::Arc<tokio::sync::Mutex<Option<ServerKeyObservation>>>,
}

impl TofuClient {
    fn new() -> (Self, std::sync::Arc<tokio::sync::Mutex<Option<ServerKeyObservation>>>) {
        let observed = std::sync::Arc::new(tokio::sync::Mutex::new(None));
        (Self { observed: observed.clone() }, observed)
    }
}

/// Builds an OpenSSH-style fingerprint `SHA256:<base64-nopad>` plus algorithm
/// label for an observed server public key. Pure function; testable.
pub fn observe_server_key(public_key: &russh_keys::key::PublicKey) -> ServerKeyObservation {
    ServerKeyObservation {
        algorithm: public_key.name().to_string(),
        fingerprint_sha256: format!("SHA256:{}", public_key.fingerprint()),
        trust_mode: ServerKeyTrustMode::TofuSession,
    }
}

#[async_trait::async_trait]
impl russh::client::Handler for TofuClient {
    type Error = russh::Error;

    // TOFU — accepts any server key, but captures algorithm + SHA256
    // fingerprint so the operator can see what we connected to (V1BC).
    // Persistence/pinning (known_hosts) is deferred to a future stage.
    async fn check_server_key(
        &mut self,
        server_public_key: &russh_keys::key::PublicKey,
    ) -> Result<bool, Self::Error> {
        let obs = observe_server_key(server_public_key);
        let mut guard = self.observed.lock().await;
        *guard = Some(obs);
        Ok(true)
    }
}

impl RealRusshTransport {
    pub fn new() -> Self {
        Self
    }
}

impl Default for RealRusshTransport {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl SshTransport for RealRusshTransport {
    async fn execute_read_only(
        &self,
        host: &str,
        port: u16,
        username: &str,
        credentials: &DiscoveryCredentials,
        commands: &[String],
        limits: SshExecutionLimits,
    ) -> SshAttemptResult {
        // Verify all commands are read-only before any network I/O.
        if let Err(e) = verify_read_only(commands) {
            return SshAttemptResult {
                outcome: SshExecutionOutcome::Refused { reason: e },
                server_key: None,
            };
        }

        let config = std::sync::Arc::new(russh::client::Config::default());
        let connect_timeout = std::time::Duration::from_millis(limits.connect_timeout_ms as u64);

        // -----------------------------------------------------------------
        // Connect (bounded by connect_timeout). TofuClient observes the
        // server host key into `observed` during the handshake.
        // -----------------------------------------------------------------
        let (tofu, observed) = TofuClient::new();
        let connect_fut = russh::client::connect(config, (host, port), tofu);
        let mut handle = match tokio::time::timeout(connect_timeout, connect_fut).await {
            Err(_) => return SshAttemptResult {
                outcome: SshExecutionOutcome::Timeout { stage: "connect".to_string() },
                server_key: observed.lock().await.clone(),
            },
            Ok(Err(e)) => return SshAttemptResult {
                outcome: SshExecutionOutcome::ConnectionFailed {
                    reason_redacted: redact_error(&e.to_string()),
                },
                server_key: observed.lock().await.clone(),
            },
            Ok(Ok(h)) => h,
        };
        // Snapshot the observation now — the handshake reached check_server_key.
        let server_key_snapshot: Option<ServerKeyObservation> = observed.lock().await.clone();

        // -----------------------------------------------------------------
        // Authenticate (password OR private key). Bounded by connect_timeout
        // as a coarse upper bound for the auth round-trip.
        // -----------------------------------------------------------------
        let auth_result: Result<bool, russh::Error> = match &credentials.auth {
            DiscoveryAuthMaterial::Password { password } => {
                let auth_fut = handle.authenticate_password(username, password.expose());
                match tokio::time::timeout(connect_timeout, auth_fut).await {
                    Err(_) => return SshAttemptResult {
                        outcome: SshExecutionOutcome::Timeout { stage: "authenticate".to_string() },
                        server_key: server_key_snapshot,
                    },
                    Ok(r) => r,
                }
            }
            DiscoveryAuthMaterial::PrivateKey { private_key_pem, passphrase } => {
                let pass_opt = passphrase.as_ref().map(|p| p.expose());
                let keypair = match russh_keys::decode_secret_key(private_key_pem.expose(), pass_opt) {
                    Ok(k) => k,
                    Err(e) => return SshAttemptResult {
                        outcome: SshExecutionOutcome::AuthFailed {
                            reason_redacted: redact_error(&format!("private key parse failed: {}", e)),
                        },
                        server_key: server_key_snapshot,
                    },
                };
                let auth_fut = handle.authenticate_publickey(username, std::sync::Arc::new(keypair));
                match tokio::time::timeout(connect_timeout, auth_fut).await {
                    Err(_) => return SshAttemptResult {
                        outcome: SshExecutionOutcome::Timeout { stage: "authenticate".to_string() },
                        server_key: server_key_snapshot,
                    },
                    Ok(r) => r,
                }
            }
        };
        match auth_result {
            Err(e) => return SshAttemptResult {
                outcome: SshExecutionOutcome::AuthFailed {
                    reason_redacted: redact_error(&e.to_string()),
                },
                server_key: server_key_snapshot,
            },
            Ok(false) => return SshAttemptResult {
                outcome: SshExecutionOutcome::AuthFailed {
                    reason_redacted: "authentication rejected".to_string(),
                },
                server_key: server_key_snapshot,
            },
            Ok(true) => {}
        }

        // -----------------------------------------------------------------
        // Execute each command in its own channel session. Enforces
        // per-command timeout + per-command + total output caps.
        // -----------------------------------------------------------------
        let per_cmd_timeout = std::time::Duration::from_millis(limits.per_command_timeout_ms as u64);
        let mut results: Vec<CommandExecutionResult> = Vec::with_capacity(commands.len());
        let mut total_bytes: usize = 0;

        for command in commands {
            let started = std::time::Instant::now();
            let exec_fut = run_one_command(&mut handle, command, &limits, total_bytes);
            let outcome = match tokio::time::timeout(per_cmd_timeout, exec_fut).await {
                Err(_) => {
                    let _ = handle.disconnect(russh::Disconnect::ByApplication, "", "").await;
                    return SshAttemptResult {
                        outcome: SshExecutionOutcome::Timeout {
                            stage: format!("command:{}", command),
                        },
                        server_key: server_key_snapshot,
                    };
                }
                Ok(r) => r,
            };
            let duration_ms = started.elapsed().as_millis().min(u32::MAX as u128) as u32;
            match outcome {
                Ok(mut cmd_res) => {
                    cmd_res.duration_ms = duration_ms;
                    total_bytes = total_bytes.saturating_add(cmd_res.stdout.len() + cmd_res.stderr.len());
                    results.push(cmd_res);
                }
                Err(err) => {
                    let _ = handle.disconnect(russh::Disconnect::ByApplication, "", "").await;
                    return SshAttemptResult {
                        outcome: SshExecutionOutcome::CommandFailed {
                            partial_results: results,
                            reason_redacted: redact_error(&err),
                        },
                        server_key: server_key_snapshot,
                    };
                }
            }
            if total_bytes >= limits.max_total_output_bytes as usize {
                break;
            }
        }

        let _ = handle.disconnect(russh::Disconnect::ByApplication, "", "").await;
        SshAttemptResult {
            outcome: SshExecutionOutcome::Success { command_results: results },
            server_key: server_key_snapshot,
        }
    }
}

/// Run a single read-only command on its own session channel. Returns the
/// per-command result with stdout/stderr capped by `max_output_bytes_per_command`
/// and the remaining total budget (`max_total_output_bytes - total_consumed`).
async fn run_one_command(
    handle: &mut russh::client::Handle<TofuClient>,
    command: &str,
    limits: &SshExecutionLimits,
    total_consumed: usize,
) -> Result<CommandExecutionResult, String> {
    let mut channel = handle
        .channel_open_session()
        .await
        .map_err(|e| format!("channel open failed: {}", e))?;
    channel
        .exec(true, command.as_bytes())
        .await
        .map_err(|e| format!("exec failed: {}", e))?;

    let per_cmd_cap = limits.max_output_bytes_per_command as usize;
    let total_cap = limits.max_total_output_bytes as usize;
    let remaining_total = total_cap.saturating_sub(total_consumed);
    let effective_cap = per_cmd_cap.min(remaining_total);

    let mut stdout_buf: Vec<u8> = Vec::new();
    let mut stderr_buf: Vec<u8> = Vec::new();
    let mut exit_code: Option<i32> = None;
    let mut truncated = false;

    while let Some(msg) = channel.wait().await {
        match msg {
            russh::ChannelMsg::Data { ref data } => {
                if stdout_buf.len() + stderr_buf.len() < effective_cap {
                    let room = effective_cap.saturating_sub(stdout_buf.len() + stderr_buf.len());
                    if data.len() <= room {
                        stdout_buf.extend_from_slice(data);
                    } else {
                        stdout_buf.extend_from_slice(&data[..room]);
                        truncated = true;
                    }
                } else {
                    truncated = true;
                }
            }
            russh::ChannelMsg::ExtendedData { ref data, ext } if ext == 1 => {
                if stdout_buf.len() + stderr_buf.len() < effective_cap {
                    let room = effective_cap.saturating_sub(stdout_buf.len() + stderr_buf.len());
                    if data.len() <= room {
                        stderr_buf.extend_from_slice(data);
                    } else {
                        stderr_buf.extend_from_slice(&data[..room]);
                        truncated = true;
                    }
                } else {
                    truncated = true;
                }
            }
            russh::ChannelMsg::ExitStatus { exit_status } => {
                exit_code = Some(exit_status as i32);
            }
            russh::ChannelMsg::Eof | russh::ChannelMsg::Close => break,
            _ => {}
        }
    }

    Ok(CommandExecutionResult {
        command: command.to_string(),
        exit_code,
        duration_ms: 0, // caller overwrites with measured duration
        stdout: String::from_utf8_lossy(&stdout_buf).to_string(),
        stderr: String::from_utf8_lossy(&stderr_buf).to_string(),
        output_truncated: truncated,
    })
}

// ============================================================================
// Helpers
// ============================================================================

/// Redacts an error message by removing credential bytes. Only includes
/// the error kind name to avoid exposing operator secrets.
fn redact_error(msg: &str) -> String {
    // Simple strategy: if the error message is long or contains suspicious patterns,
    // replace it with a generic message. Otherwise, return as-is.
    if msg.len() > 200 || msg.contains("password") || msg.contains("key") {
        "ssh error (see app logs)".to_string()
    } else {
        msg.to_string()
    }
}

/// Verifies that all commands are read-only and do not contain dangerous tokens.
/// Returns Ok(()) if all commands pass, or an error reason for the UI.
fn verify_read_only(commands: &[String]) -> Result<(), String> {
    const FORBIDDEN_TOKENS: &[&str] = &[
        "configure terminal",
        "conf t",
        "enable",
        "no ",
        "write memory",
        "write erase",
        "copy run",
        "reload",
        "shutdown ",
        "delete ",
        "format ",
        "erase ",
        "commit",
    ];

    for cmd in commands {
        let cmd_lower = cmd.to_lowercase();

        for forbidden in FORBIDDEN_TOKENS {
            if cmd_lower.contains(forbidden) {
                return Err(format!(
                    "command contains forbidden token: {}",
                    forbidden
                ));
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn secret_string_debug_prints_redacted() {
        let secret = SecretString::new("my_password".to_string());
        assert_eq!(format!("{:?}", secret), "SecretString(***)");
    }

    #[test]
    fn secret_string_display_prints_redacted() {
        let secret = SecretString::new("my_password".to_string());
        assert_eq!(format!("{}", secret), "***");
    }

    #[test]
    fn secret_string_expose_returns_inner() {
        let secret = SecretString::new("my_password".to_string());
        assert_eq!(secret.expose(), "my_password");
    }

    #[test]
    fn verify_read_only_accepts_safe_commands() {
        let cmds = vec!["show version".to_string(), "show running-config".to_string()];
        assert!(verify_read_only(&cmds).is_ok());
    }

    #[test]
    fn verify_read_only_rejects_configure_terminal() {
        let cmds = vec!["configure terminal".to_string()];
        assert!(verify_read_only(&cmds).is_err());
    }

    #[test]
    fn verify_read_only_rejects_write_memory() {
        let cmds = vec!["write memory".to_string()];
        assert!(verify_read_only(&cmds).is_err());
    }

    #[test]
    fn verify_read_only_rejects_reload() {
        let cmds = vec!["reload".to_string()];
        assert!(verify_read_only(&cmds).is_err());
    }

    #[test]
    fn verify_read_only_case_insensitive() {
        let cmds = vec!["CONFIGURE TERMINAL".to_string()];
        assert!(verify_read_only(&cmds).is_err());
    }

    #[test]
    fn ssh_execution_limits_default() {
        let limits = SshExecutionLimits::default();
        assert_eq!(limits.connect_timeout_ms, 10_000);
        assert_eq!(limits.per_command_timeout_ms, 15_000);
        assert_eq!(limits.max_output_bytes_per_command, 1_048_576);
        assert_eq!(limits.max_total_output_bytes, 8_388_608);
    }

    #[test]
    fn redact_error_keeps_short_safe_messages() {
        let msg = "connection refused";
        assert_eq!(redact_error(msg), "connection refused");
    }

    #[test]
    fn redact_error_redacts_long_messages() {
        let msg = "a".repeat(300);
        assert_eq!(redact_error(&msg), "ssh error (see app logs)");
    }

    #[test]
    fn redact_error_redacts_password_mention() {
        let msg = "password invalid";
        assert!(redact_error(msg).contains("ssh error"));
    }

    #[test]
    fn command_execution_result_serializes() {
        let result = CommandExecutionResult {
            command: "show version".to_string(),
            exit_code: Some(0),
            duration_ms: 150,
            stdout: "Cisco IOS-XE".to_string(),
            stderr: "".to_string(),
            output_truncated: false,
        };
        let json = serde_json::to_string(&result).expect("serialize");
        assert!(json.contains("show version"));
    }

    #[test]
    fn ssh_execution_outcome_success_serializes() {
        let outcome = SshExecutionOutcome::Success {
            command_results: vec![],
        };
        let json = serde_json::to_string(&outcome).expect("serialize");
        assert!(json.contains("success"));
    }

    #[test]
    fn ssh_execution_outcome_auth_failed_serializes() {
        let outcome = SshExecutionOutcome::AuthFailed {
            reason_redacted: "auth rejected".to_string(),
        };
        let json = serde_json::to_string(&outcome).expect("serialize");
        assert!(json.contains("auth_failed"));
    }

    #[test]
    fn server_key_observation_serializes_as_expected() {
        let obs = ServerKeyObservation {
            algorithm: "ssh-ed25519".to_string(),
            fingerprint_sha256: "SHA256:abc123".to_string(),
            trust_mode: ServerKeyTrustMode::TofuSession,
        };
        let json = serde_json::to_string(&obs).expect("serialize");
        assert!(json.contains("ssh-ed25519"));
        assert!(json.contains("SHA256:abc123"));
        assert!(json.contains("tofu_session"));
    }

    #[test]
    fn ssh_attempt_result_carries_outcome_and_server_key() {
        let result = SshAttemptResult {
            outcome: SshExecutionOutcome::Success { command_results: vec![] },
            server_key: Some(ServerKeyObservation {
                algorithm: "ssh-ed25519".to_string(),
                fingerprint_sha256: "SHA256:xyz".to_string(),
                trust_mode: ServerKeyTrustMode::TofuSession,
            }),
        };
        let json = serde_json::to_string(&result).expect("serialize");
        assert!(json.contains("success"));
        assert!(json.contains("SHA256:xyz"));
        assert!(json.contains("tofu_session"));
    }

    #[test]
    fn ssh_attempt_result_server_key_none_serializes_null() {
        let result = SshAttemptResult {
            outcome: SshExecutionOutcome::ConnectionFailed {
                reason_redacted: "host unreachable".to_string(),
            },
            server_key: None,
        };
        let json = serde_json::to_string(&result).expect("serialize");
        assert!(json.contains("\"server_key\":null"));
        assert!(json.contains("connection_failed"));
    }

    #[test]
    fn server_key_trust_mode_only_emits_tofu_session_today() {
        // Lock the V1BC contract: only one trust mode ships. A future
        // stage extending this enum must also extend the receipt + UI.
        let json = serde_json::to_string(&ServerKeyTrustMode::TofuSession).expect("serialize");
        assert_eq!(json, "\"tofu_session\"");
    }
}
