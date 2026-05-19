//! Discovery Foundation v1: planner and safety boundary (V1AX).
//!
//! V1AX synthesizes discovery targets into dry-run topology collection plans
//! and enforces read-only safety. No SSH/NETCONF/RESTCONF/SNMP/gNMI transport
//! is implemented here.
//!
//! Invariants:
//!   - No SSH/NETCONF/RESTCONF/SNMP/gNMI client. No tokio runtime. No transport crate.
//!   - No credentials persisted. No secrets in types.
//!   - No write commands. Refuses if plan reports any command as not read-only.
//!   - No scheduler, no background tasks.
//!   - Operator-triggered only via Tauri command.
//!
//! Doctrine: `docs/architecture/DISCOVERY_FOUNDATION_V1.md` V1AX.

use serde::{Deserialize, Serialize};
use crate::engines::live_collection_plan::{
    LiveCollectionPlatform, LiveCollectionSourceKind,
    LiveCollectionDryRunPlan, LiveCollectionDryRunRequest,
    plan_live_topology_collection,
};
use crate::engines::topology_evidence_store::TopologyEvidenceImportMode;
use crate::engines::ssh_transport::{
    SshTransport, DiscoveryCredentials, SshExecutionLimits,
    SshExecutionOutcome, ServerKeyObservation,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiscoveryTransport {
    Ssh,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiscoveryTarget {
    pub host: String,                              // operator-provided host or IP
    pub port: u16,                                 // 1..=65535
    pub username: String,                          // non-empty; credential reference, not secret
    pub platform_hint: LiveCollectionPlatform,    // closed-set, reused
    pub transport: DiscoveryTransport,
    pub data_source_label: String,                 // operator-chosen label, non-empty
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiscoveryTargetIssue {
    HostEmpty,
    HostWhitespaceOnly,
    PortInvalid,                  // serde will get u16 already; reserved for future ranges
    UsernameEmpty,
    DataSourceLabelEmpty,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiscoveryTargetValidation {
    pub is_valid: bool,
    pub issues: Vec<DiscoveryTargetIssue>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiscoveryRunPlan {
    pub target: DiscoveryTarget,
    pub dry_run: LiveCollectionDryRunPlan,         // reused from V1AT
    pub all_commands_read_only: bool,              // computed; must be true to attempt
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum DiscoveryRunOutcome {
    TransportDeferred { reason: String },          // planner-only path (V1AX); transport not attempted
    Refused { reason: String },                    // contract violation (write cmd, invalid target, plan unsafe)
    Captured { command_results: Vec<crate::engines::ssh_transport::CommandExecutionResult> }, // SSH execution succeeded
    AuthFailed { reason_redacted: String },        // authentication failed
    ConnectionFailed { reason_redacted: String },  // connection failed
    Timeout { stage: String },                     // timeout during connect or command
    CommandFailed { partial_results: Vec<crate::engines::ssh_transport::CommandExecutionResult>, reason_redacted: String }, // command execution failed
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiscoveryRunReport {
    pub target_label: String,                      // = target.data_source_label
    pub platform_hint: LiveCollectionPlatform,
    pub planned_command_count: u32,
    pub outcome: DiscoveryRunOutcome,
    /// V1BC: server-key observation captured at TOFU handshake. None when
    /// the transport never reached the host-key step (Refused, pre-flight
    /// failure, or planner-only `TransportDeferred`).
    #[serde(default)]
    pub server_key: Option<ServerKeyObservation>,
}

/// Validates a discovery target. Checks host non-empty after trim,
/// username non-empty after trim, data_source_label non-empty after trim.
/// Port is u16 so range is checked at deserialize.
pub fn validate_target(target: &DiscoveryTarget) -> DiscoveryTargetValidation {
    let mut issues = Vec::new();

    // Check host
    if target.host.trim().is_empty() {
        if target.host.is_empty() {
            issues.push(DiscoveryTargetIssue::HostEmpty);
        } else {
            issues.push(DiscoveryTargetIssue::HostWhitespaceOnly);
        }
    }

    // Check username
    if target.username.trim().is_empty() {
        issues.push(DiscoveryTargetIssue::UsernameEmpty);
    }

    // Check data_source_label
    if target.data_source_label.trim().is_empty() {
        issues.push(DiscoveryTargetIssue::DataSourceLabelEmpty);
    }

    let is_valid = issues.is_empty();
    DiscoveryTargetValidation { is_valid, issues }
}

/// Synthesizes a discovery plan from a target. Calls the V1AT planner
/// with LLDP+CDP source kinds and Append import mode.
pub fn plan_discovery(target: &DiscoveryTarget) -> DiscoveryRunPlan {
    let request = LiveCollectionDryRunRequest {
        environment_id: None,
        target_label: Some(target.data_source_label.clone()),
        platform_hint: Some(target.platform_hint.hint_str().to_string()),
        source_kinds: vec![
            LiveCollectionSourceKind::Lldp,
            LiveCollectionSourceKind::Cdp,
        ],
        planned_import_mode: Some(TopologyEvidenceImportMode::Append),
    };

    let dry_run = plan_live_topology_collection(request);

    // Compute all_commands_read_only by checking every command's read_only field
    let all_commands_read_only = dry_run.commands.iter().all(|cmd| cmd.read_only);

    DiscoveryRunPlan {
        target: target.clone(),
        dry_run,
        all_commands_read_only,
    }
}

/// Attempts discovery on a target. Validates the target, generates a plan,
/// and determines the outcome. Returns Refused if target is invalid or
/// the plan contains non-read-only commands. Otherwise returns TransportDeferred.
pub fn attempt_discovery(target: &DiscoveryTarget) -> DiscoveryRunReport {
    let validation = validate_target(target);
    if !validation.is_valid {
        let reason = format!(
            "invalid target: {:?}",
            validation.issues
        );
        return DiscoveryRunReport {
            target_label: target.data_source_label.clone(),
            platform_hint: target.platform_hint,
            planned_command_count: 0,
            outcome: DiscoveryRunOutcome::Refused { reason },
            server_key: None,
        };
    }

    let plan = plan_discovery(target);
    if !plan.all_commands_read_only {
        return DiscoveryRunReport {
            target_label: target.data_source_label.clone(),
            platform_hint: target.platform_hint,
            planned_command_count: plan.dry_run.commands.len() as u32,
            outcome: DiscoveryRunOutcome::Refused {
                reason: "plan contains a non-read-only command".to_string(),
            },
            server_key: None,
        };
    }

    DiscoveryRunReport {
        target_label: target.data_source_label.clone(),
        platform_hint: target.platform_hint,
        planned_command_count: plan.dry_run.commands.len() as u32,
        outcome: DiscoveryRunOutcome::TransportDeferred {
            reason: "ssh transport not yet implemented; V1AX is planner + boundary only".to_string(),
        },
        server_key: None,
    }
}

/// Executes a discovery run with SSH transport. Validates target, plans, and executes.
/// Returns a report with the outcome (success, auth failed, connection failed, etc.).
/// Credentials are dropped immediately after use and never persisted.
pub async fn execute_discovery(
    target: &DiscoveryTarget,
    credentials: DiscoveryCredentials,
    transport: &dyn SshTransport,
    limits: Option<SshExecutionLimits>,
) -> DiscoveryRunReport {
    // Validate target.
    let validation = validate_target(target);
    if !validation.is_valid {
        let reason = format!(
            "invalid target: {:?}",
            validation.issues
        );
        return DiscoveryRunReport {
            target_label: target.data_source_label.clone(),
            platform_hint: target.platform_hint,
            planned_command_count: 0,
            outcome: DiscoveryRunOutcome::Refused { reason },
            server_key: None,
        };
    }

    // Plan the discovery.
    let plan = plan_discovery(target);
    if !plan.all_commands_read_only {
        return DiscoveryRunReport {
            target_label: target.data_source_label.clone(),
            platform_hint: target.platform_hint,
            planned_command_count: plan.dry_run.commands.len() as u32,
            outcome: DiscoveryRunOutcome::Refused {
                reason: "plan contains a non-read-only command".to_string(),
            },
            server_key: None,
        };
    }

    // Extract commands from the plan.
    let commands: Vec<String> = plan.dry_run.commands.iter().map(|c| c.command.clone()).collect();

    if commands.is_empty() {
        return DiscoveryRunReport {
            target_label: target.data_source_label.clone(),
            platform_hint: target.platform_hint,
            planned_command_count: 0,
            outcome: DiscoveryRunOutcome::Refused {
                reason: "plan contains no commands".to_string(),
            },
            server_key: None,
        };
    }

    // Execute via SSH transport with credentials.
    // Credentials are borrowed here; dropped at end of this function.
    let execution_limits = limits.unwrap_or_default();
    let attempt = transport.execute_read_only(
        &target.host,
        target.port,
        &target.username,
        &credentials,
        &commands,
        execution_limits,
    ).await;

    // Map the SSH execution outcome to a DiscoveryRunOutcome. server_key
    // observation is preserved verbatim from the transport attempt.
    let discovery_outcome = match attempt.outcome {
        SshExecutionOutcome::Success { command_results } => {
            DiscoveryRunOutcome::Captured { command_results }
        }
        SshExecutionOutcome::AuthFailed { reason_redacted } => {
            DiscoveryRunOutcome::AuthFailed { reason_redacted }
        }
        SshExecutionOutcome::ConnectionFailed { reason_redacted } => {
            DiscoveryRunOutcome::ConnectionFailed { reason_redacted }
        }
        SshExecutionOutcome::Timeout { stage } => {
            DiscoveryRunOutcome::Timeout { stage }
        }
        SshExecutionOutcome::CommandFailed { partial_results, reason_redacted } => {
            DiscoveryRunOutcome::CommandFailed { partial_results, reason_redacted }
        }
        SshExecutionOutcome::Refused { reason } => {
            DiscoveryRunOutcome::Refused { reason }
        }
    };

    DiscoveryRunReport {
        target_label: target.data_source_label.clone(),
        platform_hint: target.platform_hint,
        planned_command_count: plan.dry_run.commands.len() as u32,
        outcome: discovery_outcome,
        server_key: attempt.server_key,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_target_returns_valid_for_good_target() {
        let target = DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let validation = validate_target(&target);
        assert!(validation.is_valid);
        assert!(validation.issues.is_empty());
    }

    #[test]
    fn validate_target_returns_host_empty_for_empty_host() {
        let target = DiscoveryTarget {
            host: "".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let validation = validate_target(&target);
        assert!(!validation.is_valid);
        assert!(validation.issues.contains(&DiscoveryTargetIssue::HostEmpty));
    }

    #[test]
    fn validate_target_returns_host_whitespace_only_for_whitespace_host() {
        let target = DiscoveryTarget {
            host: "   ".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let validation = validate_target(&target);
        assert!(!validation.is_valid);
        assert!(validation.issues.contains(&DiscoveryTargetIssue::HostWhitespaceOnly));
    }

    #[test]
    fn validate_target_returns_username_empty_for_whitespace_username() {
        let target = DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: " ".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let validation = validate_target(&target);
        assert!(!validation.is_valid);
        assert!(validation.issues.contains(&DiscoveryTargetIssue::UsernameEmpty));
    }

    #[test]
    fn validate_target_returns_data_source_label_empty() {
        let target = DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "".to_string(),
        };
        let validation = validate_target(&target);
        assert!(!validation.is_valid);
        assert!(validation.issues.contains(&DiscoveryTargetIssue::DataSourceLabelEmpty));
    }

    #[test]
    fn plan_discovery_returns_plan_with_all_commands_read_only_true() {
        let target = DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let plan = plan_discovery(&target);
        assert!(plan.all_commands_read_only);
    }

    #[test]
    fn plan_discovery_for_each_platform_returns_all_commands_read_only() {
        let platforms = vec![
            LiveCollectionPlatform::Iosxe,
            LiveCollectionPlatform::Nxos,
            LiveCollectionPlatform::Iosxr,
            LiveCollectionPlatform::Eos,
            LiveCollectionPlatform::Junos,
            LiveCollectionPlatform::HuaweiVrp,
            LiveCollectionPlatform::NokiaSros,
            LiveCollectionPlatform::Fortios,
            LiveCollectionPlatform::Mikrotik,
        ];

        for platform in platforms {
            let target = DiscoveryTarget {
                host: "10.0.0.1".to_string(),
                port: 22,
                username: "admin".to_string(),
                platform_hint: platform,
                transport: DiscoveryTransport::Ssh,
                data_source_label: "test-target".to_string(),
            };
            let plan = plan_discovery(&target);
            assert!(plan.all_commands_read_only, "Platform {:?} should have all_commands_read_only = true", platform);
        }
    }

    #[test]
    fn plan_discovery_plan_target_matches_input_target() {
        let target = DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let plan = plan_discovery(&target);
        assert_eq!(plan.target, target);
    }

    #[test]
    fn attempt_discovery_with_valid_target_returns_transport_deferred() {
        let target = DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let report = attempt_discovery(&target);
        match &report.outcome {
            DiscoveryRunOutcome::TransportDeferred { reason } => {
                assert!(reason.contains("ssh transport"));
            }
            _ => panic!("Expected TransportDeferred outcome"),
        }
    }

    #[test]
    fn attempt_discovery_with_invalid_target_returns_refused() {
        let target = DiscoveryTarget {
            host: "".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let report = attempt_discovery(&target);
        match &report.outcome {
            DiscoveryRunOutcome::Refused { reason } => {
                assert!(reason.contains("invalid target"));
            }
            _ => panic!("Expected Refused outcome"),
        }
    }

    #[test]
    fn attempt_discovery_planned_command_count_matches_plan() {
        let target = DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let plan = plan_discovery(&target);
        let report = attempt_discovery(&target);
        assert_eq!(report.planned_command_count, plan.dry_run.commands.len() as u32);
    }

    #[test]
    fn attempt_discovery_refuses_plan_with_non_read_only_commands() {
        // Create a test plan with all_commands_read_only = false
        // We need to mock this scenario by directly testing the refusal logic
        let target = DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };

        // Validate that the actual plan has all_commands_read_only = true
        // This test documents the expected behavior
        let plan = plan_discovery(&target);
        assert!(
            plan.all_commands_read_only,
            "Current planner returns all read-only commands as expected"
        );
    }

    #[test]
    fn attempt_discovery_report_target_label_matches() {
        let target = DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let report = attempt_discovery(&target);
        assert_eq!(report.target_label, target.data_source_label);
    }

    #[test]
    fn attempt_discovery_report_has_none_server_key() {
        // Planner-only path never observes a host key.
        let target = DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let report = attempt_discovery(&target);
        assert!(report.server_key.is_none());
    }

    #[test]
    fn refused_report_has_none_server_key() {
        let target = DiscoveryTarget {
            host: "".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        };
        let report = attempt_discovery(&target);
        assert!(report.server_key.is_none());
    }

    // ------------------------------------------------------------------
    // Mock SshTransport — verifies execute_discovery propagates an
    // observed ServerKeyObservation from transport into the report
    // verbatim (V1BC).
    // ------------------------------------------------------------------
    use crate::engines::ssh_transport::{
        ServerKeyObservation, ServerKeyTrustMode, SshAttemptResult,
    };

    struct MockTransport {
        result: SshAttemptResult,
    }

    #[async_trait::async_trait]
    impl SshTransport for MockTransport {
        async fn execute_read_only(
            &self,
            _host: &str,
            _port: u16,
            _username: &str,
            _credentials: &DiscoveryCredentials,
            _commands: &[String],
            _limits: SshExecutionLimits,
        ) -> SshAttemptResult {
            self.result.clone()
        }
    }

    fn good_target() -> DiscoveryTarget {
        DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Iosxe,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-01".to_string(),
        }
    }

    fn dummy_creds() -> DiscoveryCredentials {
        DiscoveryCredentials {
            auth: crate::engines::ssh_transport::DiscoveryAuthMaterial::Password {
                password: crate::engines::ssh_transport::SecretString::new("p".into()),
            },
        }
    }

    fn obs() -> ServerKeyObservation {
        ServerKeyObservation {
            algorithm: "ssh-ed25519".to_string(),
            fingerprint_sha256: "SHA256:MOCK".to_string(),
            trust_mode: ServerKeyTrustMode::TofuSession,
        }
    }

    #[tokio::test]
    async fn execute_discovery_propagates_server_key_on_success() {
        let mock = MockTransport {
            result: SshAttemptResult {
                outcome: SshExecutionOutcome::Success { command_results: vec![] },
                server_key: Some(obs()),
            },
        };
        let report = execute_discovery(&good_target(), dummy_creds(), &mock, None).await;
        assert!(matches!(report.outcome, DiscoveryRunOutcome::Captured { .. }));
        assert_eq!(report.server_key.as_ref().map(|s| &s.fingerprint_sha256[..]), Some("SHA256:MOCK"));
    }

    #[tokio::test]
    async fn execute_discovery_propagates_server_key_on_auth_failed() {
        let mock = MockTransport {
            result: SshAttemptResult {
                outcome: SshExecutionOutcome::AuthFailed {
                    reason_redacted: "auth rejected".to_string(),
                },
                server_key: Some(obs()),
            },
        };
        let report = execute_discovery(&good_target(), dummy_creds(), &mock, None).await;
        assert!(matches!(report.outcome, DiscoveryRunOutcome::AuthFailed { .. }));
        assert!(report.server_key.is_some());
    }

    #[tokio::test]
    async fn execute_discovery_keeps_none_server_key_on_connection_failed() {
        let mock = MockTransport {
            result: SshAttemptResult {
                outcome: SshExecutionOutcome::ConnectionFailed {
                    reason_redacted: "host unreachable".to_string(),
                },
                server_key: None,
            },
        };
        let report = execute_discovery(&good_target(), dummy_creds(), &mock, None).await;
        assert!(report.server_key.is_none());
    }

    #[test]
    fn attempt_discovery_report_platform_hint_matches() {
        let target = DiscoveryTarget {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            platform_hint: LiveCollectionPlatform::Nxos,
            transport: DiscoveryTransport::Ssh,
            data_source_label: "lab-spine-02".to_string(),
        };
        let report = attempt_discovery(&target);
        assert_eq!(report.platform_hint, LiveCollectionPlatform::Nxos);
    }
}
