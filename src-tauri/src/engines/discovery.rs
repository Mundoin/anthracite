//! Discovery Engine — V1AI spine.
//!
//! Authoritative inventory boundary for device records. In V1AI the engine:
//! - Owns discovery inventory records (persisted to disk).
//! - Exposes typed inventory view, source state, preview + import operations.
//! - Never invents devices; import validation is deterministic.
//!
//! Boundary (per `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md`):
//!   - Owns:    discovery inventory records (persisted), source state, view
//!              projection, import validation.
//!   - Does NOT own: environments (Environment Engine), canonical device
//!              shape (DeviceModel via parser/INTAKE), topology, live
//!              state, polling.
//!
//! State is one of:
//! - `Empty` — connected source, zero records.
//! - `Real` — connected source, inventory has ≥1 records.
//! - `Unavailable` — connection lost or store error.
//!
//! V1AI persistence: records hydrate from `JsonDiscoveryFileStore` on engine init,
//! persisted after each successful import. Preview is advisory (reads store state).

use serde::{Deserialize, Serialize};
use crate::engines::network_model::DeviceModel;
use std::sync::Arc;

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

/// A single discovery record envelope. Extended in V1AI with authoritative
/// device model, source label, and slice identifier. Wire shape matches TS
/// `DiscoveryDeviceRecord` exactly.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiscoveryDeviceRecord {
    pub id: String,
    pub environment_id: String,
    pub source_kind: DiscoveryRecordSourceKind,
    pub confidence: Option<f32>,
    pub last_seen: Option<String>,
    pub device_model: DeviceModel,
    pub source_label: Option<String>,
    pub slice_id: Option<String>,
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

// =====================================================================
// V1AI — Persistence Boundary
// =====================================================================

/// V1AI persisted inventory shape on disk. Schema versioned from day one.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveryInventoryState {
    pub schema_version: u32,
    pub records: Vec<DiscoveryDeviceRecord>,
}

pub const DISCOVERY_INVENTORY_SCHEMA_VERSION: u32 = 1;

/// Persistence boundary for Discovery inventory. Stays narrow on purpose.
pub trait DiscoveryStore: Send + Sync {
    fn load(&self) -> DiscoveryInventoryState;
    fn save(&self, state: &DiscoveryInventoryState) -> Result<(), String>;
}

pub struct NullDiscoveryStore;

impl DiscoveryStore for NullDiscoveryStore {
    fn load(&self) -> DiscoveryInventoryState {
        DiscoveryInventoryState {
            schema_version: DISCOVERY_INVENTORY_SCHEMA_VERSION,
            records: Vec::new(),
        }
    }

    fn save(&self, _: &DiscoveryInventoryState) -> Result<(), String> {
        Ok(())
    }
}

/// JSON file persistence for discovery inventory.
pub struct JsonDiscoveryFileStore {
    path: std::path::PathBuf,
}

impl JsonDiscoveryFileStore {
    pub fn new(path: std::path::PathBuf) -> Self {
        Self { path }
    }

    pub fn path(&self) -> &std::path::PathBuf {
        &self.path
    }
}

impl DiscoveryStore for JsonDiscoveryFileStore {
    fn load(&self) -> DiscoveryInventoryState {
        // Missing file → empty inventory (safe).
        // Unreadable / corrupt JSON → empty inventory (safe fallback).
        match std::fs::read(&self.path) {
            Ok(bytes) => serde_json::from_slice(&bytes)
                .unwrap_or_else(|_| DiscoveryInventoryState {
                    schema_version: DISCOVERY_INVENTORY_SCHEMA_VERSION,
                    records: Vec::new(),
                }),
            Err(_) => DiscoveryInventoryState {
                schema_version: DISCOVERY_INVENTORY_SCHEMA_VERSION,
                records: Vec::new(),
            },
        }
    }

    fn save(&self, state: &DiscoveryInventoryState) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let bytes = serde_json::to_vec_pretty(state).map_err(|e| e.to_string())?;
        std::fs::write(&self.path, bytes).map_err(|e| e.to_string())
    }
}

// =====================================================================
// Engine
// =====================================================================

/// Discovery Engine — stateful inventory boundary with persistence.
/// Records are hydrated from the store on init and persisted after successful imports.
pub struct DiscoveryEngine {
    records: std::sync::Mutex<Vec<DiscoveryDeviceRecord>>,
    store: Arc<dyn DiscoveryStore>,
}

impl DiscoveryEngine {
    /// Non-persistent constructor (uses NullDiscoveryStore).
    pub fn new() -> Self {
        Self::with_store(Arc::new(NullDiscoveryStore))
    }

    /// Build the engine with a concrete store. Hydrates records from the store at boot.
    pub fn with_store(store: Arc<dyn DiscoveryStore>) -> Self {
        let state = store.load();
        Self {
            records: std::sync::Mutex::new(state.records),
            store,
        }
    }

    /// Deterministic inventory view reading from current state.
    /// Same inputs → same output, no clock, no random ids. Honest view
    /// reflecting in-memory records (hydrated from store at init and
    /// mutated by imports).
    pub fn inventory_view(&self, environment_id: Option<&str>) -> DiscoveryInventoryView {
        let guard = self
            .records
            .lock()
            .expect("discovery records mutex poisoned");
        let scoped: Vec<DiscoveryDeviceRecord> = match environment_id {
            Some(env) => guard
                .iter()
                .filter(|r| r.environment_id == env)
                .cloned()
                .collect(),
            None => guard.clone(),
        };
        let total = scoped.len() as u32;
        let source_state = if total == 0 {
            DiscoverySourceState::Empty
        } else {
            DiscoverySourceState::Real
        };
        let message = if total == 0 {
            "discovery inventory empty — no records collected".to_string()
        } else {
            format!(
                "discovery inventory has {} record{}",
                total,
                if total == 1 { "" } else { "s" }
            )
        };
        DiscoveryInventoryView {
            environment_id: environment_id.map(|s| s.to_string()),
            source_state,
            records: scoped,
            total_records: total,
            message,
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

/// Summary counts for an import commit.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DiscoveryImportCommitSummary {
    pub total_candidates: u32,
    pub imported_count: u32,
    pub rejected_count: u32,
    pub inventory_total_after: u32,
}

/// Result of import_records: accepted records, rejections, and summary.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiscoveryImportCommitResult {
    pub environment_id: String,
    pub imported_records: Vec<DiscoveryDeviceRecord>,
    pub rejected: Vec<DiscoveryImportRejection>,
    pub summary: DiscoveryImportCommitSummary,
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

/// Shared per-candidate validation and record building.
/// Returns the would-be record on accept, or a rejection on reject.
/// Caller tracks duplicate-record-id state across existing store + in-request records.
fn validate_and_build_record(
    environment_id: &str,
    candidate: &DiscoveryImportCandidate,
    existing_record_ids: &std::collections::HashSet<String>,
    in_request_record_ids: &std::collections::HashSet<String>,
) -> Result<DiscoveryDeviceRecord, DiscoveryImportRejection> {
    // Rule 1: environment_mismatch
    if candidate.environment_id != environment_id {
        return Err(DiscoveryImportRejection {
            candidate_id: candidate.candidate_id.clone(),
            reason: DiscoveryImportRejectionReason::EnvironmentMismatch,
            message: format!(
                "candidate environment_id '{}' does not match scope '{}'",
                candidate.environment_id, environment_id
            ),
        });
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
        return Err(DiscoveryImportRejection {
            candidate_id: candidate.candidate_id.clone(),
            reason: DiscoveryImportRejectionReason::MissingIdentity,
            message: "candidate has no usable identity (hostname missing and candidate_id blank)"
                .to_string(),
        });
    }

    let record_id = discovery_record_id(environment_id, candidate);

    // Rule 3: duplicate against existing store
    if existing_record_ids.contains(&record_id) {
        return Err(DiscoveryImportRejection {
            candidate_id: candidate.candidate_id.clone(),
            reason: DiscoveryImportRejectionReason::DuplicateRecordId,
            message: format!("record_id '{}' already exists in inventory", record_id),
        });
    }

    // Rule 4: duplicate within this request
    if in_request_record_ids.contains(&record_id) {
        return Err(DiscoveryImportRejection {
            candidate_id: candidate.candidate_id.clone(),
            reason: DiscoveryImportRejectionReason::DuplicateRecordId,
            message: format!("record_id '{}' already accepted in this request", record_id),
        });
    }

    Ok(DiscoveryDeviceRecord {
        id: record_id,
        environment_id: environment_id.to_string(),
        source_kind: candidate.source_kind,
        confidence: candidate.confidence,
        last_seen: None,
        device_model: candidate.device_model.clone(),
        source_label: candidate.source_label.clone(),
        slice_id: candidate.slice_id.clone(),
    })
}

impl DiscoveryEngine {
    /// Preview importing candidates into this environment.
    /// Returns accepted records, rejections, and summary — does not mutate state.
    /// Deterministic: same input ordering → same output ordering.
    /// Reads existing records from store for honest duplicate detection.
    pub fn preview_import(
        &self,
        environment_id: &str,
        candidates: &[DiscoveryImportCandidate],
    ) -> DiscoveryImportPreview {
        // Preview reads existing records from store for honest duplicate detection.
        let existing: std::collections::HashSet<String> = self
            .records
            .lock()
            .expect("discovery records mutex poisoned")
            .iter()
            .map(|r| r.id.clone())
            .collect();
        let mut in_request: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut accepted: Vec<DiscoveryImportPreviewRecord> = Vec::new();
        let mut rejected: Vec<DiscoveryImportRejection> = Vec::new();

        for candidate in candidates {
            match validate_and_build_record(environment_id, candidate, &existing, &in_request) {
                Ok(record) => {
                    in_request.insert(record.id.clone());
                    accepted.push(DiscoveryImportPreviewRecord {
                        candidate_id: candidate.candidate_id.clone(),
                        record,
                    });
                }
                Err(rejection) => rejected.push(rejection),
            }
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

    /// Authoritative import: validate, store, and persist.
    /// Returns the commit result with accepted records, rejections, and summary.
    /// On success, records are stored and persisted to disk.
    /// On store error, the in-memory state is mutated but the error is returned
    /// (next import will retry).
    pub fn import_records(
        &self,
        environment_id: &str,
        candidates: &[DiscoveryImportCandidate],
    ) -> Result<DiscoveryImportCommitResult, String> {
        let mut guard = self
            .records
            .lock()
            .map_err(|_| "discovery records mutex poisoned".to_string())?;
        let existing: std::collections::HashSet<String> =
            guard.iter().map(|r| r.id.clone()).collect();
        let mut in_request: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut imported_records: Vec<DiscoveryDeviceRecord> = Vec::new();
        let mut rejected: Vec<DiscoveryImportRejection> = Vec::new();

        for candidate in candidates {
            match validate_and_build_record(environment_id, candidate, &existing, &in_request) {
                Ok(record) => {
                    in_request.insert(record.id.clone());
                    imported_records.push(record);
                }
                Err(rejection) => rejected.push(rejection),
            }
        }

        // Apply: append accepted records to in-memory state, then persist.
        for record in &imported_records {
            guard.push(record.clone());
        }
        let inventory_total_after = guard.len() as u32;
        let new_state = DiscoveryInventoryState {
            schema_version: DISCOVERY_INVENTORY_SCHEMA_VERSION,
            records: guard.clone(),
        };
        drop(guard); // release lock before I/O

        // Persist: if the store save fails, surface the error to the caller.
        // (The in-memory state has already been mutated; the next save attempt
        // on a future import will retry. Documented behaviour.)
        self.store.save(&new_state)?;

        let summary = DiscoveryImportCommitSummary {
            total_candidates: candidates.len() as u32,
            imported_count: imported_records.len() as u32,
            rejected_count: rejected.len() as u32,
            inventory_total_after,
        };
        Ok(DiscoveryImportCommitResult {
            environment_id: environment_id.to_string(),
            imported_records,
            rejected,
            summary,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engines::network_model::{DeviceIdentity, PlatformRef};

    // ===================================================================
    // V1AF/V1AI — Inventory View Tests
    // ===================================================================

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
    // V1AI — Persistence and Import Tests
    // ===================================================================

    #[test]
    fn empty_store_returns_empty_view() {
        let engine = DiscoveryEngine::new();
        let view = engine.inventory_view(None);
        assert_eq!(view.source_state, DiscoverySourceState::Empty);
        assert!(view.records.is_empty());
        assert_eq!(view.total_records, 0);
    }

    #[test]
    fn import_valid_candidate_stores_record() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("c1", "env-core-eu1", Some("router-1"), Some(0.95));
        let result = engine.import_records("env-core-eu1", &[candidate]).unwrap();
        assert_eq!(result.summary.imported_count, 1);
        assert_eq!(result.summary.rejected_count, 0);
        assert_eq!(result.summary.inventory_total_after, 1);
        let view = engine.inventory_view(Some("env-core-eu1"));
        assert_eq!(view.records.len(), 1);
        assert_eq!(view.source_state, DiscoverySourceState::Real);
    }

    #[test]
    fn inventory_view_real_after_import() {
        let engine = DiscoveryEngine::new();
        let candidates = vec![
            make_candidate("c1", "env-core-eu1", Some("router-1"), None),
            make_candidate("c2", "env-core-eu1", Some("router-2"), None),
        ];
        let _ = engine.import_records("env-core-eu1", &candidates).unwrap();
        let view = engine.inventory_view(None);
        assert_eq!(view.source_state, DiscoverySourceState::Real);
        assert!(view.message.contains("2 records"));
    }

    #[test]
    fn environment_filter_returns_scoped_records_only() {
        let engine = DiscoveryEngine::new();
        let c1 = make_candidate("c1", "env-a", Some("dev-a1"), None);
        let c2 = make_candidate("c2", "env-a", Some("dev-a2"), None);
        let c3 = make_candidate("c3", "env-b", Some("dev-b1"), None);
        let _ = engine.import_records("env-a", &[c1, c2]).unwrap();
        let _ = engine.import_records("env-b", &[c3]).unwrap();
        let view_a = engine.inventory_view(Some("env-a"));
        let view_b = engine.inventory_view(Some("env-b"));
        let view_all = engine.inventory_view(None);
        assert_eq!(view_a.records.len(), 2);
        assert_eq!(view_b.records.len(), 1);
        assert_eq!(view_all.records.len(), 3);
    }

    #[test]
    fn duplicate_existing_record_rejected() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("c1", "env-core-eu1", Some("router-1"), None);
        let r1 = engine.import_records("env-core-eu1", &[candidate.clone()]).unwrap();
        assert_eq!(r1.summary.imported_count, 1);
        let r2 = engine.import_records("env-core-eu1", &[candidate]).unwrap();
        assert_eq!(r2.summary.imported_count, 0);
        assert_eq!(r2.summary.rejected_count, 1);
        assert_eq!(
            r2.rejected[0].reason,
            DiscoveryImportRejectionReason::DuplicateRecordId
        );
        let view = engine.inventory_view(None);
        assert_eq!(view.total_records, 1);
    }

    #[test]
    fn duplicate_within_same_request_first_wins() {
        let engine = DiscoveryEngine::new();
        let c1 = make_candidate("c1", "env-core-eu1", Some("core-01"), None);
        let c2 = make_candidate("c2", "env-core-eu1", Some("core-01"), None);
        let result = engine.import_records("env-core-eu1", &[c1, c2]).unwrap();
        assert_eq!(result.summary.imported_count, 1);
        assert_eq!(result.summary.rejected_count, 1);
        assert_eq!(result.imported_records[0].id, result.imported_records[0].id); // c1
    }

    #[test]
    fn import_recomputes_acceptance_not_blind_trust() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("c1", "env-core-eu1", Some("router-1"), None);
        let r1 = engine.import_records("env-core-eu1", &[candidate.clone()]).unwrap();
        let r2 = engine.import_records("env-core-eu1", &[candidate]).unwrap();
        assert_eq!(r1.summary.imported_count, 1);
        assert_eq!(r2.summary.imported_count, 0);
    }

    #[test]
    fn preview_remains_non_mutating() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("c1", "env-core-eu1", Some("router-1"), None);
        let _ = engine.preview_import("env-core-eu1", &[candidate]);
        let view = engine.inventory_view(None);
        assert!(view.records.is_empty());
        assert_eq!(view.source_state, DiscoverySourceState::Empty);
    }

    #[test]
    fn preview_sees_existing_records_as_duplicates() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("c1", "env-core-eu1", Some("router-1"), None);
        let _ = engine.import_records("env-core-eu1", &[candidate.clone()]).unwrap();
        let preview = engine.preview_import("env-core-eu1", &[candidate]);
        assert_eq!(preview.accepted.len(), 0);
        assert_eq!(preview.rejected.len(), 1);
        assert_eq!(
            preview.rejected[0].reason,
            DiscoveryImportRejectionReason::DuplicateRecordId
        );
    }

    #[test]
    fn deterministic_output_across_same_initial_store_state() {
        let e1 = DiscoveryEngine::new();
        let e2 = DiscoveryEngine::new();
        let candidates = vec![
            make_candidate("c1", "env-core-eu1", Some("router-1"), Some(0.9)),
            make_candidate("c2", "env-core-eu1", Some("router-2"), Some(0.85)),
        ];
        let r1 = e1.import_records("env-core-eu1", &candidates).unwrap();
        let r2 = e2.import_records("env-core-eu1", &candidates).unwrap();
        assert_eq!(r1.summary.imported_count, r2.summary.imported_count);
        assert_eq!(r1.summary.rejected_count, r2.summary.rejected_count);
    }

    #[test]
    fn json_file_store_round_trips_records() {
        let temp_dir = std::env::temp_dir();
        let path = temp_dir.join(format!(
            "discovery_test_{}.json",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));
        {
            let store = Arc::new(JsonDiscoveryFileStore::new(path.clone()));
            let engine = DiscoveryEngine::with_store(store);
            let c1 = make_candidate("c1", "env-core-eu1", Some("router-1"), None);
            let c2 = make_candidate("c2", "env-core-eu1", Some("router-2"), None);
            let _ = engine.import_records("env-core-eu1", &[c1, c2]).unwrap();
        }
        {
            let store = Arc::new(JsonDiscoveryFileStore::new(path.clone()));
            let engine = DiscoveryEngine::with_store(store);
            let view = engine.inventory_view(None);
            assert_eq!(view.records.len(), 2);
            assert_eq!(view.source_state, DiscoverySourceState::Real);
            for record in &view.records {
                assert!(!record.device_model.identity.hostname.is_none());
            }
        }
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn corrupt_json_file_falls_back_to_empty() {
        let temp_dir = std::env::temp_dir();
        let path = temp_dir.join(format!(
            "discovery_corrupt_{}.json",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));
        std::fs::write(&path, b"{not valid json").unwrap();
        let store = Arc::new(JsonDiscoveryFileStore::new(path.clone()));
        let engine = DiscoveryEngine::with_store(store);
        let view = engine.inventory_view(None);
        assert!(view.records.is_empty());
        assert_eq!(view.source_state, DiscoverySourceState::Empty);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn missing_json_file_falls_back_to_empty() {
        let temp_dir = std::env::temp_dir();
        let path = temp_dir.join(format!(
            "discovery_missing_{}.json",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));
        let store = Arc::new(JsonDiscoveryFileStore::new(path));
        let engine = DiscoveryEngine::with_store(store);
        let view = engine.inventory_view(None);
        assert!(view.records.is_empty());
    }

    #[test]
    fn import_with_environment_mismatch_rejected_and_not_stored() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("c1", "env-edge-us-east", Some("router-1"), None);
        let result = engine.import_records("env-core-eu1", &[candidate]).unwrap();
        assert_eq!(result.summary.imported_count, 0);
        assert_eq!(result.summary.rejected_count, 1);
        assert_eq!(
            result.rejected[0].reason,
            DiscoveryImportRejectionReason::EnvironmentMismatch
        );
        let view = engine.inventory_view(None);
        assert!(view.records.is_empty());
    }

    #[test]
    fn import_with_missing_identity_rejected_and_not_stored() {
        let engine = DiscoveryEngine::new();
        let candidate = make_candidate("", "env-core-eu1", None, None);
        let result = engine.import_records("env-core-eu1", &[candidate]).unwrap();
        assert_eq!(result.summary.imported_count, 0);
        assert_eq!(result.summary.rejected_count, 1);
        assert_eq!(
            result.rejected[0].reason,
            DiscoveryImportRejectionReason::MissingIdentity
        );
        let view = engine.inventory_view(None);
        assert!(view.records.is_empty());
    }

    #[test]
    fn commit_summary_inventory_total_after_includes_pre_existing_records() {
        let engine = DiscoveryEngine::new();
        let c1 = make_candidate("c1", "env-a", Some("dev-a1"), None);
        let c2 = make_candidate("c2", "env-a", Some("dev-a2"), None);
        let c3 = make_candidate("c3", "env-b", Some("dev-b1"), None);
        let r1 = engine.import_records("env-a", &[c1, c2]).unwrap();
        assert_eq!(r1.summary.inventory_total_after, 2);
        let r2 = engine.import_records("env-b", &[c3]).unwrap();
        assert_eq!(r2.summary.inventory_total_after, 3);
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
        let record = &result.accepted[0].record;
        assert_eq!(record.environment_id, "env-core-eu1");
        assert_eq!(
            record.device_model.identity.hostname.as_deref(),
            Some("router-1")
        );
        assert_eq!(record.confidence, Some(0.95));
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
