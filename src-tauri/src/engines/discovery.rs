//! Discovery Engine — V1AF spine.
//!
//! Future boundary for device inventory records. In V1AF the engine is
//! intentionally **connected but empty**: it exposes a typed inventory
//! view, never invents devices, and never performs I/O.
//!
//! Boundary (per `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md`):
//!   - Owns:    discovery inventory records (future), source state, view
//!              projection.
//!   - Does NOT own: environments (Environment Engine), canonical device
//!              shape (DeviceModel via parser/INTAKE), topology, live
//!              state, polling.
//!
//! Initial state is `Empty` — *connected source, zero records*. This is
//! distinct from `not_connected` on the frontend `DataSourceState`, which
//! signals an absent capability. DataSourceState itself is unchanged in
//! V1AF.

use serde::{Deserialize, Serialize};
use crate::engines::network_model::{DeviceModel, DeviceIdentity, PlatformRef};

/// Engine-local source state for the Discovery inventory.
///
/// Maps to the frontend `DataSourceState` values that make sense for a
/// connected-but-empty inventory boundary. Deliberately narrower than the
/// full `DataSourceState` set — Discovery never reports `demo` or
/// `not_connected` from this engine.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DiscoverySourceState {
    Empty,
    Real,
    Unavailable,
}

/// Provenance of a future discovery record. Reserved for later stages
/// (INTAKE import, live collection, manual entry). Present now so the
/// wire contract is stable when records start landing.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DiscoveryRecordSourceKind {
    IntakeImport,
    LiveCollection,
    Manual,
}

/// A single discovery record envelope. Intentionally minimal in V1AF —
/// no `DeviceModel` field yet, no parser dependency. Later stages attach
/// a `DeviceModel` reference; this stage only locks the wrapper shape.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiscoveryDeviceRecord {
    pub id: String,
    pub environment_id: String,
    pub source_kind: DiscoveryRecordSourceKind,
    pub confidence: Option<f32>,
    pub last_seen: Option<String>,
}

/// Deterministic, view-shaped projection of the Discovery inventory for
/// one environment scope.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiscoveryInventoryView {
    pub environment_id: Option<String>,
    pub source_state: DiscoverySourceState,
    pub records: Vec<DiscoveryDeviceRecord>,
    pub total_records: u32,
    pub message: String,
}

/// Engine state. V1AF holds no records and no mutable state — the engine
/// exists as a typed seam so commands, TS mirror, and tests can settle.
pub struct DiscoveryEngine;

impl DiscoveryEngine {
    pub fn new() -> Self {
        Self
    }

    /// Deterministic empty inventory view. Same inputs → same output, no
    /// I/O, no clock, no random ids. Honest empty: `source_state =
    /// Empty`, zero records, stable message.
    pub fn inventory_view(&self, environment_id: Option<&str>) -> DiscoveryInventoryView {
        DiscoveryInventoryView {
            environment_id: environment_id.map(|s| s.to_string()),
            source_state: DiscoverySourceState::Empty,
            records: Vec::new(),
            total_records: 0,
            message: "discovery inventory empty — no records collected".to_string(),
        }
    }
}

impl Default for DiscoveryEngine {
    fn default() -> Self {
        Self::new()
    }
}

// =====================================================================
// V1AH — Discovery Import Preview
// =====================================================================

/// A candidate device for import into the Discovery inventory.
/// Wire format matches TS `DiscoveryImportCandidate` exactly.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiscoveryImportCandidate {
    pub candidate_id: String,
    pub environment_id: String,
    pub source_kind: DiscoveryRecordSourceKind,
    pub device_model: DeviceModel,
    pub confidence: Option<f32>,
    pub source_label: Option<String>,
    pub slice_id: Option<String>,
}

/// Reason for rejecting a candidate in import preview.
/// Wire format serializes as snake_case (e.g., "missing_identity").
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DiscoveryImportRejectionReason {
    MissingIdentity,
    EnvironmentMismatch,
    DuplicateRecordId,
}

/// A rejected import candidate with reason and explanation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DiscoveryImportRejection {
    pub candidate_id: String,
    pub reason: DiscoveryImportRejectionReason,
    pub message: String,
}

/// An accepted candidate paired with the record it would create.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiscoveryImportPreviewRecord {
    pub candidate_id: String,
    pub record: DiscoveryDeviceRecord,
}

/// Summary counts for an import preview.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DiscoveryImportSummary {
    pub total_candidates: u32,
    pub accepted_count: u32,
    pub rejected_count: u32,
}

/// Result of preview_import: accepted records, rejections, and summary.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiscoveryImportPreview {
    pub environment_id: String,
    pub accepted: Vec<DiscoveryImportPreviewRecord>,
    pub rejected: Vec<DiscoveryImportRejection>,
    pub summary: DiscoveryImportSummary,
}

/// Sanitize a string for use in a record_id: lowercase, [a-z0-9-] only,
/// collapse consecutive hyphens, trim edges, default to "unknown" if empty.
fn sanitize(s: &str) -> String {
    let mut result = String::new();
    let mut last_was_hyphen = false;

    for ch in s.to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            result.push(ch);
            last_was_hyphen = false;
        } else if !last_was_hyphen {
            result.push('-');
            last_was_hyphen = true;
        }
        // else: consecutive non-alphanumeric chars → skip
    }

    // Trim leading/trailing hyphens
    let trimmed = result.trim_matches('-').to_string();

    if trimmed.is_empty() {
        "unknown".to_string()
    } else {
        trimmed
    }
}

/// Derive a deterministic record_id from environment and candidate.
/// Format: "discovery::{sanitized_env}::{sanitized_identity}"
/// Identity = hostname (if present and non-empty) or candidate_id fallback.
fn discovery_record_id(environment_id: &str, candidate: &DiscoveryImportCandidate) -> String {
    let raw_identity = candidate
        .device_model
        .identity
        .hostname
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| candidate.candidate_id.clone());

    let sanitized_env = sanitize(environment_id);
    let sanitized_identity = sanitize(&raw_identity);

    format!("discovery::{}::{}", sanitized_env, sanitized_identity)
}

impl DiscoveryEngine {
    /// Preview importing candidates into this environment.
    /// Returns accepted records, rejections, and summary — does not mutate state.
    /// Deterministic: same input ordering → same output ordering.
    pub fn preview_import(
        &self,
        environment_id: &str,
        candidates: &[DiscoveryImportCandidate],
    ) -> DiscoveryImportPreview {
        let mut accepted: Vec<DiscoveryImportPreviewRecord> = Vec::new();
        let mut rejected: Vec<DiscoveryImportRejection> = Vec::new();
        let mut seen_record_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

        for candidate in candidates {
            // Rule 1: environment_mismatch
            if candidate.environment_id != environment_id {
                rejected.push(DiscoveryImportRejection {
                    candidate_id: candidate.candidate_id.clone(),
                    reason: DiscoveryImportRejectionReason::EnvironmentMismatch,
                    message: format!(
                        "candidate environment_id '{}' does not match preview scope '{}'",
                        candidate.environment_id, environment_id
                    ),
                });
                continue;
            }

            // Rule 2: missing_identity
            let has_hostname = candidate
                .device_model
                .identity
                .hostname
                .as_deref()
                .map(|h| !h.trim().is_empty())
                .unwrap_or(false);
            let has_candidate_id = !candidate.candidate_id.trim().is_empty();

            if !has_hostname && !has_candidate_id {
                rejected.push(DiscoveryImportRejection {
                    candidate_id: candidate.candidate_id.clone(),
                    reason: DiscoveryImportRejectionReason::MissingIdentity,
                    message: "candidate has no usable identity (hostname missing and candidate_id blank)".to_string(),
                });
                continue;
            }

            // Derive record_id for duplicate check and acceptance
            let record_id = discovery_record_id(environment_id, candidate);

            // Rule 3: duplicate_record_id
            if seen_record_ids.contains(&record_id) {
                rejected.push(DiscoveryImportRejection {
                    candidate_id: candidate.candidate_id.clone(),
                    reason: DiscoveryImportRejectionReason::DuplicateRecordId,
                    message: format!("record_id '{}' already accepted in this preview", record_id),
                });
                continue;
            }

            // Accept: create record and track id
            seen_record_ids.insert(record_id.clone());
            let record = DiscoveryDeviceRecord {
                id: record_id,
                environment_id: environment_id.to_string(),
                source_kind: candidate.source_kind,
                confidence: candidate.confidence,
                last_seen: None,
            };
            accepted.push(DiscoveryImportPreviewRecord {
                candidate_id: candidate.candidate_id.clone(),
                record,
            });
        }

        let summary = DiscoveryImportSummary {
            total_candidates: candidates.len() as u32,
            accepted_count: accepted.len() as u32,
            rejected_count: rejected.len() as u32,
        };
        DiscoveryImportPreview {
            environment_id: environment_id.to_string(),
            accepted,
            rejected,
            summary,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inventory_view_is_deterministic_across_calls() {
        let engine = DiscoveryEngine::new();
        let a = engine.inventory_view(Some("env-core-eu1"));
        let b = engine.inventory_view(Some("env-core-eu1"));
        assert_eq!(a, b);
    }

    #[test]
    fn initial_inventory_has_zero_records() {
        let engine = DiscoveryEngine::new();
        let view = engine.inventory_view(None);
        assert!(view.records.is_empty());
        assert_eq!(view.total_records, 0);
    }

    #[test]
    fn initial_source_state_is_empty() {
        let engine = DiscoveryEngine::new();
        let view = engine.inventory_view(Some("env-lab-zrh"));
        assert_eq!(view.source_state, DiscoverySourceState::Empty);
    }

    #[test]
    fn environment_id_is_reflected_when_provided() {
        let engine = DiscoveryEngine::new();
        let view = engine.inventory_view(Some("env-edge-us-east"));
        assert_eq!(view.environment_id.as_deref(), Some("env-edge-us-east"));
    }

    #[test]
    fn environment_id_is_none_when_unscoped() {
        let engine = DiscoveryEngine::new();
        let view = engine.inventory_view(None);
        assert!(view.environment_id.is_none());
    }

    #[test]
    fn no_fake_records_are_returned() {
        let engine = DiscoveryEngine::new();
        for env in [None, Some("env-core-eu1"), Some("env-bogus")] {
            let view = engine.inventory_view(env);
            assert!(view.records.is_empty(), "discovery must not seed records");
            assert_eq!(view.total_records, 0);
        }
    }

    #[test]
    fn message_is_stable_and_honest() {
        let engine = DiscoveryEngine::new();
        let a = engine.inventory_view(Some("env-core-eu1"));
        let b = engine.inventory_view(None);
        assert_eq!(a.message, b.message);
        assert!(a.message.contains("empty"));
        assert!(!a.message.to_lowercase().contains("demo"));
    }

    #[test]
    fn source_state_serialises_as_lowercase_wire_value() {
        let json = serde_json::to_string(&DiscoverySourceState::Empty).unwrap();
        assert_eq!(json, "\"empty\"");
    }

    // ===================================================================
    // V1AH — Discovery Import Preview Tests
    // ===================================================================

    fn make_candidate(
        candidate_id: &str,
        environment_id: &str,
        hostname: Option<&str>,
        confidence: Option<f32>,
    ) -> DiscoveryImportCandidate {
        let identity = DeviceIdentity {
            hostname: hostname.map(|s| s.to_string()),
            ..Default::default()
        };
        let platform = PlatformRef::default();
        DiscoveryImportCandidate {
            candidate_id: candidate_id.to_string(),
            environment_id: environment_id.to_string(),
            source_kind: DiscoveryRecordSourceKind::IntakeImport,
            device_model: DeviceModel::minimal(identity, platform),
            confidence,
            source_label: None,
            slice_id: Some(candidate_id.to_string()),
        }
    }

    #[test]
    fn preview_empty_candidates_yields_zero_counts() {
        let engine = DiscoveryEngine::new();
        let result = engine.preview_import("env-core-eu1", &[]);
        assert_eq!(result.summary.total_candidates, 0);
        assert_eq!(result.summary.accepted_count, 0);
        assert_eq!(result.summary.rejected_count, 0);
        assert!(result.accepted.is_empty());
        assert!(result.rejected.is_empty());
    }

    #[test]
    fn preview_accepts_candidate_with_hostname() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("c1", "env-core-eu1", Some("router-1"), Some(0.95));
        let result = engine.preview_import("env-core-eu1", &[candidate]);
        assert_eq!(result.accepted.len(), 1);
        assert_eq!(result.rejected.len(), 0);
        let record_id = &result.accepted[0].record.id;
        assert!(record_id.starts_with("discovery::env-core-eu1::"));
        assert!(record_id.contains("router-1"));
    }

    #[test]
    fn preview_rejects_environment_mismatch() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("c1", "env-edge-us-east", Some("router-1"), None);
        let result = engine.preview_import("env-core-eu1", &[candidate]);
        assert_eq!(result.accepted.len(), 0);
        assert_eq!(result.rejected.len(), 1);
        assert_eq!(
            result.rejected[0].reason,
            DiscoveryImportRejectionReason::EnvironmentMismatch
        );
    }

    #[test]
    fn preview_rejects_duplicate_record_id() {
        let engine = DiscoveryEngine::new();
        let c1 = make_candidate("c1", "env-core-eu1", Some("core-01"), None);
        let c2 = make_candidate("c2", "env-core-eu1", Some("core-01"), None);
        let result = engine.preview_import("env-core-eu1", &[c1, c2]);
        assert_eq!(result.accepted.len(), 1);
        assert_eq!(result.rejected.len(), 1);
        assert_eq!(
            result.rejected[0].reason,
            DiscoveryImportRejectionReason::DuplicateRecordId
        );
        assert_eq!(result.accepted[0].candidate_id, "c1");
    }

    #[test]
    fn preview_rejects_missing_identity_when_no_hostname_and_blank_candidate_id() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("", "env-core-eu1", None, None);
        let result = engine.preview_import("env-core-eu1", &[candidate]);
        assert_eq!(result.accepted.len(), 0);
        assert_eq!(result.rejected.len(), 1);
        assert_eq!(
            result.rejected[0].reason,
            DiscoveryImportRejectionReason::MissingIdentity
        );
    }

    #[test]
    fn preview_accepts_when_hostname_missing_but_candidate_id_present() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("slice-7", "env-core-eu1", None, None);
        let result = engine.preview_import("env-core-eu1", &[candidate]);
        assert_eq!(result.accepted.len(), 1);
        assert_eq!(result.rejected.len(), 0);
        let record_id = &result.accepted[0].record.id;
        assert!(record_id.contains("slice-7"));
    }

    #[test]
    fn preview_is_deterministic_across_calls() {
        let engine = DiscoveryEngine::new();
        let candidates = vec![
            make_candidate("c1", "env-core-eu1", Some("router-1"), Some(0.9)),
            make_candidate("c2", "env-core-eu1", Some("router-2"), Some(0.85)),
        ];
        let result1 = engine.preview_import("env-core-eu1", &candidates);
        let result2 = engine.preview_import("env-core-eu1", &candidates);
        assert_eq!(result1, result2);
    }

    #[test]
    fn preview_does_not_mutate_inventory() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("c1", "env-core-eu1", Some("router-1"), None);
        let _ = engine.preview_import("env-core-eu1", &[candidate]);
        let view = engine.inventory_view(Some("env-core-eu1"));
        assert!(view.records.is_empty());
        assert_eq!(view.source_state, DiscoverySourceState::Empty);
    }

    #[test]
    fn record_id_format_is_namespaced() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("c1", "env-test-xyz", Some("device-name"), None);
        let result = engine.preview_import("env-test-xyz", &[candidate]);
        let record_id = &result.accepted[0].record.id;
        assert!(record_id.starts_with("discovery::"));
        assert!(record_id.contains("env-test-xyz"));
        assert!(record_id.contains("device-name"));
    }

    #[test]
    fn rejection_reason_serializes_as_snake_case() {
        let json = serde_json::to_string(&DiscoveryImportRejectionReason::EnvironmentMismatch)
            .unwrap();
        assert_eq!(json, "\"environment_mismatch\"");
    }

    #[test]
    fn sanitize_handles_special_chars() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("c1", "env-core-eu1", Some("Edge.Router/01 (DC1)"), None);
        let result = engine.preview_import("env-core-eu1", &[candidate]);
        let record_id = &result.accepted[0].record.id;
        // Should have no /, ., space, or parens
        assert!(!record_id.contains('/'));
        assert!(!record_id.contains('.'));
        assert!(!record_id.contains(' '));
        assert!(!record_id.contains('('));
        assert!(!record_id.contains(')'));
        // Should only contain lowercase ascii alphanumeric + hyphens (+ :: delimiter)
        for ch in record_id.chars() {
            assert!(
                ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-' || ch == ':',
                "unexpected char {ch:?} in record_id {record_id:?}"
            );
        }
    }
}
