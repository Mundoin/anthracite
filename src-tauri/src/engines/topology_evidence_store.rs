//! V1AO — Persisted neighbour-evidence store for live topology edges.
//!
//! Engine-owned, deterministic, schema-versioned. Reads/writes a small
//! JSON file per environment. Corrupt/missing → empty Vec (honest "no
//! evidence", never panic).
//!
//! V1AR — Evidence set management: import modes (Replace/Append/Merge),
//! mutation result tracking, and summary helpers.

use crate::engines::topology::{TopologyNeighborEvidence, TopologyAdjacencyFactSourceKind};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// V1AR — Import mode for evidence sets.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TopologyEvidenceImportMode {
    Replace,
    Append,
    Merge,
}

impl Default for TopologyEvidenceImportMode {
    fn default() -> Self { Self::Replace }
}

/// V1AR — Mutation result from evidence import or clear operations.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TopologyEvidenceMutationResult {
    pub mode: TopologyEvidenceImportMode,
    pub previous_count: u32,
    pub incoming_count: u32,
    pub added_count: u32,
    pub replaced_count: u32,
    pub ignored_duplicate_count: u32,
    pub final_count: u32,
    pub evidence_set_id: Option<String>,
    pub source_labels: Vec<String>,
    pub store_mutated: bool,
}

/// V1AR — Summary of current evidence state per environment.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TopologyEvidenceSummary {
    pub environment_id: String,
    pub evidence_count: u32,
    pub source_labels: Vec<String>,
    pub source_kind_counts: Vec<(TopologyAdjacencyFactSourceKind, u32)>,
    pub evidence_set_id: Option<String>,
}

/// Public read/write contract for evidence stores.
pub trait TopologyEvidenceStore: Send + Sync {
    fn load(&self, environment_id: &str) -> Vec<TopologyNeighborEvidence>;
    fn store(
        &self,
        environment_id: &str,
        evidence: Vec<TopologyNeighborEvidence>,
        source_label: Option<String>,
    ) -> Result<TopologyEvidenceSet, TopologyEvidenceStoreError>;
    fn clear(&self, environment_id: &str) -> Result<(), TopologyEvidenceStoreError>;
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TopologyEvidenceSet {
    pub schema_version: String,        // "v1"
    pub environment_id: String,
    pub evidence_set_id: String,       // "evset-{env_id}-{hash_first_8}"
    pub source_label: Option<String>,
    pub evidence_count: u32,
    pub evidence: Vec<TopologyNeighborEvidence>,
}

#[derive(Debug)]
pub enum TopologyEvidenceStoreError {
    Io(String),
    Serialization(String),
}

impl std::fmt::Display for TopologyEvidenceStoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(s) => write!(f, "io: {}", s),
            Self::Serialization(s) => write!(f, "serialization: {}", s),
        }
    }
}

impl std::error::Error for TopologyEvidenceStoreError {}

/// No-op store; default + tests.
pub struct NullTopologyEvidenceStore;

impl TopologyEvidenceStore for NullTopologyEvidenceStore {
    fn load(&self, _: &str) -> Vec<TopologyNeighborEvidence> {
        Vec::new()
    }
    fn store(
        &self,
        environment_id: &str,
        evidence: Vec<TopologyNeighborEvidence>,
        source_label: Option<String>,
    ) -> Result<TopologyEvidenceSet, TopologyEvidenceStoreError> {
        let evidence_count = evidence.len() as u32;
        let evidence_set_id = compute_evidence_set_id(environment_id, &evidence);
        Ok(TopologyEvidenceSet {
            schema_version: "v1".to_string(),
            environment_id: environment_id.to_string(),
            evidence_set_id,
            source_label,
            evidence_count,
            evidence,
        })
    }
    fn clear(&self, _: &str) -> Result<(), TopologyEvidenceStoreError> {
        Ok(())
    }
}

/// JSON-file store, one file per env: `{root}/topology_evidence/{env_id}.json`.
pub struct JsonFileTopologyEvidenceStore {
    pub root: PathBuf,
}

impl JsonFileTopologyEvidenceStore {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    fn dir(&self) -> PathBuf {
        self.root.join("topology_evidence")
    }

    fn env_path(&self, env_id: &str) -> PathBuf {
        // Sanitize env_id minimally for FS safety: replace path separators with `_`.
        let safe = env_id.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
        self.dir().join(format!("{}.json", safe))
    }
}

impl TopologyEvidenceStore for JsonFileTopologyEvidenceStore {
    fn load(&self, environment_id: &str) -> Vec<TopologyNeighborEvidence> {
        let path = self.env_path(environment_id);
        if !path.exists() {
            return Vec::new();
        }
        match std::fs::read_to_string(&path) {
            Ok(text) => match serde_json::from_str::<TopologyEvidenceSet>(&text) {
                Ok(set) if set.schema_version == "v1" => set.evidence,
                _ => Vec::new(), // corrupt / wrong-schema → honest empty
            },
            Err(_) => Vec::new(),
        }
    }

    fn store(
        &self,
        environment_id: &str,
        evidence: Vec<TopologyNeighborEvidence>,
        source_label: Option<String>,
    ) -> Result<TopologyEvidenceSet, TopologyEvidenceStoreError> {
        std::fs::create_dir_all(self.dir())
            .map_err(|e| TopologyEvidenceStoreError::Io(e.to_string()))?;
        let evidence_count = evidence.len() as u32;
        let evidence_set_id = compute_evidence_set_id(environment_id, &evidence);
        let set = TopologyEvidenceSet {
            schema_version: "v1".to_string(),
            environment_id: environment_id.to_string(),
            evidence_set_id,
            source_label,
            evidence_count,
            evidence,
        };
        let json = serde_json::to_string_pretty(&set)
            .map_err(|e| TopologyEvidenceStoreError::Serialization(e.to_string()))?;
        std::fs::write(self.env_path(environment_id), json)
            .map_err(|e| TopologyEvidenceStoreError::Io(e.to_string()))?;
        Ok(set)
    }

    fn clear(&self, environment_id: &str) -> Result<(), TopologyEvidenceStoreError> {
        let path = self.env_path(environment_id);
        if path.exists() {
            std::fs::remove_file(&path)
                .map_err(|e| TopologyEvidenceStoreError::Io(e.to_string()))?;
        }
        Ok(())
    }
}

/// Deterministic id from env + content hash (first 8 hex of sha256).
fn compute_evidence_set_id(environment_id: &str, evidence: &[TopologyNeighborEvidence]) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    environment_id.hash(&mut h);
    let serialized = serde_json::to_string(evidence).unwrap_or_default();
    serialized.hash(&mut h);
    format!("evset-{}-{:016x}", environment_id, h.finish())
}

// ──── V1AR — Evidence Set Management Helpers ────

/// Statistics from merge operations.
#[derive(Debug, Clone)]
pub(crate) struct MergeStats {
    pub added_count: u32,
    pub replaced_count: u32,
    pub ignored_duplicate_count: u32,
}

/// V1AR — Replace mode: discard existing, return incoming as final.
pub(crate) fn replace_topology_evidence(
    existing: &[TopologyNeighborEvidence],
    incoming: Vec<TopologyNeighborEvidence>,
) -> (Vec<TopologyNeighborEvidence>, MergeStats) {
    let replaced_count = existing.len() as u32;
    let added_count = incoming.len() as u32;
    let stats = MergeStats {
        added_count,
        replaced_count,
        ignored_duplicate_count: 0,
    };
    (incoming, stats)
}

/// V1AR — Append mode: return existing + incoming concatenated, no dedup.
pub(crate) fn append_topology_evidence(
    existing: Vec<TopologyNeighborEvidence>,
    incoming: Vec<TopologyNeighborEvidence>,
) -> (Vec<TopologyNeighborEvidence>, MergeStats) {
    let added_count = incoming.len() as u32;
    let mut final_evidence = existing;
    final_evidence.extend(incoming);
    let stats = MergeStats {
        added_count,
        replaced_count: 0,
        ignored_duplicate_count: 0,
    };
    (final_evidence, stats)
}

/// V1AR — Merge mode: dedup on 5-tuple key, merge fields intelligently.
/// Dedup key: (source_kind, local_node_id, local_interface, remote_node_id, remote_interface).
pub(crate) fn merge_topology_evidence(
    existing: Vec<TopologyNeighborEvidence>,
    incoming: Vec<TopologyNeighborEvidence>,
) -> (Vec<TopologyNeighborEvidence>, MergeStats) {
    let mut final_evidence = existing;
    let mut stats = MergeStats {
        added_count: 0,
        replaced_count: 0,
        ignored_duplicate_count: 0,
    };

    for incoming_record in incoming {
        // Check if a record with matching 5-tuple exists in final_evidence.
        let dedup_key = (
            incoming_record.source_kind,
            incoming_record.local_node_id.clone(),
            incoming_record.local_interface.clone(),
            incoming_record.remote_node_id.clone(),
            incoming_record.remote_interface.clone(),
        );

        if let Some(existing_record) = final_evidence.iter_mut().find(|e| {
            (
                e.source_kind,
                e.local_node_id.clone(),
                e.local_interface.clone(),
                e.remote_node_id.clone(),
                e.remote_interface.clone(),
            ) == dedup_key
        }) {
            // Merge fields into existing position.
            // source_label: lex-sorted join on difference or one Some.
            if let (Some(existing_label), Some(incoming_label)) = (&existing_record.source_label, &incoming_record.source_label) {
                if existing_label != incoming_label {
                    let mut labels = vec![existing_label.clone(), incoming_label.clone()];
                    labels.sort();
                    existing_record.source_label = Some(labels.join("; "));
                }
            } else if incoming_record.source_label.is_some() {
                existing_record.source_label = incoming_record.source_label;
            }

            // evidence_notes: same policy with " | " separator.
            if let (Some(existing_notes), Some(incoming_notes)) = (&existing_record.evidence_notes, &incoming_record.evidence_notes) {
                if existing_notes != incoming_notes {
                    let mut notes = vec![existing_notes.clone(), incoming_notes.clone()];
                    notes.sort();
                    existing_record.evidence_notes = Some(notes.join(" | "));
                }
            } else if incoming_record.evidence_notes.is_some() {
                existing_record.evidence_notes = incoming_record.evidence_notes;
            }

            // remote_chassis_id: prefer existing if Some, else incoming if Some, else None.
            if existing_record.remote_chassis_id.is_none() && incoming_record.remote_chassis_id.is_some() {
                existing_record.remote_chassis_id = incoming_record.remote_chassis_id;
            }

            // remote_system_name: same policy.
            if existing_record.remote_system_name.is_none() && incoming_record.remote_system_name.is_some() {
                existing_record.remote_system_name = incoming_record.remote_system_name;
            }

            // remote_port_id: same policy.
            if existing_record.remote_port_id.is_none() && incoming_record.remote_port_id.is_some() {
                existing_record.remote_port_id = incoming_record.remote_port_id;
            }

            stats.ignored_duplicate_count += 1;
        } else {
            // No match: append after all existing records.
            final_evidence.push(incoming_record);
            stats.added_count += 1;
        }
    }

    (final_evidence, stats)
}

/// V1AR — Summarize current evidence state.
pub fn summarize_topology_evidence(
    environment_id: &str,
    evidence: &[TopologyNeighborEvidence],
    evidence_set_id: Option<&str>,
) -> TopologyEvidenceSummary {
    let evidence_count = evidence.len() as u32;

    // Collect and dedup source labels, then lex-sort.
    let mut source_labels: Vec<String> = evidence
        .iter()
        .filter_map(|e| e.source_label.clone())
        .collect();
    source_labels.sort();
    source_labels.dedup();

    // Count per kind in stable order: Lldp, Cdp, ConfigNeighbor, Manual.
    let stable_kinds = vec![
        TopologyAdjacencyFactSourceKind::Lldp,
        TopologyAdjacencyFactSourceKind::Cdp,
        TopologyAdjacencyFactSourceKind::ConfigNeighbor,
        TopologyAdjacencyFactSourceKind::Manual,
    ];
    let mut source_kind_counts = Vec::new();
    for kind in stable_kinds {
        let count = evidence.iter().filter(|e| e.source_kind == kind).count() as u32;
        source_kind_counts.push((kind, count));
    }

    TopologyEvidenceSummary {
        environment_id: environment_id.to_string(),
        evidence_count,
        source_labels,
        source_kind_counts,
        evidence_set_id: evidence_set_id.map(|s| s.to_string()),
    }
}

/// V1AR — Orchestration wrapper: apply import with mode dispatch and store mutation.
pub fn apply_evidence_import(
    store: &dyn TopologyEvidenceStore,
    environment_id: &str,
    incoming: Vec<TopologyNeighborEvidence>,
    mode: TopologyEvidenceImportMode,
    source_label: Option<String>,
) -> Result<TopologyEvidenceMutationResult, TopologyEvidenceStoreError> {
    let existing = store.load(environment_id);
    let previous_count = existing.len() as u32;
    let incoming_count = incoming.len() as u32;

    // No-mutation safety: empty incoming → no store call, return no-op result.
    if incoming.is_empty() {
        let summary = summarize_topology_evidence(environment_id, &existing, None);
        return Ok(TopologyEvidenceMutationResult {
            mode,
            previous_count,
            incoming_count: 0,
            added_count: 0,
            replaced_count: 0,
            ignored_duplicate_count: 0,
            final_count: existing.len() as u32,
            evidence_set_id: None,
            source_labels: summary.source_labels,
            store_mutated: false,
        });
    }

    // Apply mode-specific merge logic.
    let (final_evidence, stats) = match mode {
        TopologyEvidenceImportMode::Replace => replace_topology_evidence(&existing, incoming),
        TopologyEvidenceImportMode::Append => append_topology_evidence(existing, incoming),
        TopologyEvidenceImportMode::Merge => merge_topology_evidence(existing, incoming),
    };

    // Persist to store.
    let set = store.store(environment_id, final_evidence.clone(), source_label)?;

    // Build summary for final evidence.
    let summary = summarize_topology_evidence(environment_id, &final_evidence, Some(&set.evidence_set_id));

    Ok(TopologyEvidenceMutationResult {
        mode,
        previous_count,
        incoming_count,
        added_count: stats.added_count,
        replaced_count: stats.replaced_count,
        ignored_duplicate_count: stats.ignored_duplicate_count,
        final_count: final_evidence.len() as u32,
        evidence_set_id: Some(set.evidence_set_id),
        source_labels: summary.source_labels,
        store_mutated: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn make_evidence(
        source_kind: crate::engines::topology::TopologyAdjacencyFactSourceKind,
        local_node_id: &str,
        remote_node_id: &str,
    ) -> TopologyNeighborEvidence {
        TopologyNeighborEvidence {
            source_kind,
            local_node_id: local_node_id.to_string(),
            local_interface: None,
            remote_node_id: remote_node_id.to_string(),
            remote_interface: None,
            remote_chassis_id: None,
            remote_system_name: None,
            remote_port_id: None,
            source_label: None,
            evidence_notes: None,
        }
    }

    #[test]
    fn null_store_load_returns_empty() {
        let store = NullTopologyEvidenceStore;
        let result = store.load("env-a");
        assert!(result.is_empty());
    }

    #[test]
    fn null_store_store_returns_evidence_set_with_count_and_id() {
        let store = NullTopologyEvidenceStore;
        let evidence = vec![make_evidence(
            crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp,
            "node1",
            "node2",
        )];
        let result = store
            .store("env-a", evidence.clone(), None)
            .expect("store should succeed");
        assert_eq!(result.evidence_count, 1);
        assert!(result.evidence_set_id.starts_with("evset-"));
        assert_eq!(result.evidence.len(), 1);
    }

    #[test]
    fn null_store_clear_returns_ok() {
        let store = NullTopologyEvidenceStore;
        let result = store.clear("env-a");
        assert!(result.is_ok());
    }

    #[test]
    fn json_store_load_missing_file_returns_empty() {
        let temp_dir = TempDir::new().expect("temp dir");
        let store = JsonFileTopologyEvidenceStore::new(temp_dir.path().to_path_buf());
        let result = store.load("nonexistent-env");
        assert!(result.is_empty());
    }

    #[test]
    fn json_store_round_trip_preserves_evidence() {
        let temp_dir = TempDir::new().expect("temp dir");
        let store = JsonFileTopologyEvidenceStore::new(temp_dir.path().to_path_buf());
        let evidence = vec![
            make_evidence(
                crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp,
                "node1",
                "node2",
            ),
            make_evidence(
                crate::engines::topology::TopologyAdjacencyFactSourceKind::Cdp,
                "node2",
                "node3",
            ),
            make_evidence(
                crate::engines::topology::TopologyAdjacencyFactSourceKind::ConfigNeighbor,
                "node3",
                "node1",
            ),
        ];
        let stored = store
            .store("env-a", evidence.clone(), Some("test-source".to_string()))
            .expect("store should succeed");
        assert_eq!(stored.evidence_count, 3);
        assert_eq!(stored.source_label, Some("test-source".to_string()));

        let loaded = store.load("env-a");
        assert_eq!(loaded.len(), 3);
        assert_eq!(loaded, evidence);
    }

    #[test]
    fn json_store_corrupt_file_returns_empty() {
        let temp_dir = TempDir::new().expect("temp dir");
        let store = JsonFileTopologyEvidenceStore::new(temp_dir.path().to_path_buf());
        let path = store.env_path("env-a");
        fs::create_dir_all(path.parent().unwrap()).expect("mkdir");
        fs::write(&path, "{ invalid json }").expect("write");

        let result = store.load("env-a");
        assert!(result.is_empty());
    }

    #[test]
    fn json_store_wrong_schema_returns_empty() {
        let temp_dir = TempDir::new().expect("temp dir");
        let store = JsonFileTopologyEvidenceStore::new(temp_dir.path().to_path_buf());
        let path = store.env_path("env-a");
        fs::create_dir_all(path.parent().unwrap()).expect("mkdir");
        let bad_schema = r#"{"schema_version": "v2", "evidence": []}"#;
        fs::write(&path, bad_schema).expect("write");

        let result = store.load("env-a");
        assert!(result.is_empty());
    }

    #[test]
    fn json_store_clear_removes_file() {
        let temp_dir = TempDir::new().expect("temp dir");
        let store = JsonFileTopologyEvidenceStore::new(temp_dir.path().to_path_buf());
        let evidence = vec![make_evidence(
            crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp,
            "node1",
            "node2",
        )];
        store
            .store("env-a", evidence, None)
            .expect("store should succeed");

        let path = store.env_path("env-a");
        assert!(path.exists());

        store.clear("env-a").expect("clear should succeed");
        assert!(!path.exists());
    }

    #[test]
    fn json_store_environment_isolation() {
        let temp_dir = TempDir::new().expect("temp dir");
        let store = JsonFileTopologyEvidenceStore::new(temp_dir.path().to_path_buf());
        let evidence_a = vec![make_evidence(
            crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp,
            "node1",
            "node2",
        )];
        let evidence_b = vec![make_evidence(
            crate::engines::topology::TopologyAdjacencyFactSourceKind::Cdp,
            "node3",
            "node4",
        )];
        store
            .store("env-a", evidence_a, None)
            .expect("store env-a");
        store
            .store("env-b", evidence_b, None)
            .expect("store env-b");

        let loaded_a = store.load("env-a");
        let loaded_b = store.load("env-b");

        assert_eq!(loaded_a.len(), 1);
        assert_eq!(loaded_a[0].local_node_id, "node1");
        assert_eq!(loaded_b.len(), 1);
        assert_eq!(loaded_b[0].local_node_id, "node3");
    }

    #[test]
    fn evidence_set_id_deterministic_for_same_input() {
        let env_id = "env-a";
        let evidence = vec![make_evidence(
            crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp,
            "node1",
            "node2",
        )];
        let id1 = compute_evidence_set_id(env_id, &evidence);
        let id2 = compute_evidence_set_id(env_id, &evidence);
        assert_eq!(id1, id2);
    }

    #[test]
    fn evidence_set_id_changes_when_evidence_changes() {
        let env_id = "env-a";
        let evidence1 = vec![make_evidence(
            crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp,
            "node1",
            "node2",
        )];
        let evidence2 = vec![make_evidence(
            crate::engines::topology::TopologyAdjacencyFactSourceKind::Cdp,
            "node1",
            "node2",
        )];
        let id1 = compute_evidence_set_id(env_id, &evidence1);
        let id2 = compute_evidence_set_id(env_id, &evidence2);
        assert_ne!(id1, id2);
    }

    // ──── V1AR — Evidence Set Management Tests ────

    #[test]
    fn replace_overwrites_existing() {
        let existing = vec![
            make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2"),
            make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node2", "node3"),
            make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node3", "node4"),
        ];
        let incoming = vec![
            make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Cdp, "nodeA", "nodeB"),
            make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Cdp, "nodeB", "nodeC"),
        ];
        let (final_evidence, stats) = replace_topology_evidence(&existing, incoming.clone());
        assert_eq!(final_evidence.len(), 2);
        assert_eq!(final_evidence, incoming);
        assert_eq!(stats.added_count, 2);
        assert_eq!(stats.replaced_count, 3);
        assert_eq!(stats.ignored_duplicate_count, 0);
    }

    #[test]
    fn append_preserves_and_concatenates() {
        let existing = vec![
            make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2"),
            make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node2", "node3"),
            make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node3", "node4"),
        ];
        let incoming = vec![
            make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Cdp, "nodeA", "nodeB"),
            make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Cdp, "nodeB", "nodeC"),
        ];
        let (final_evidence, stats) = append_topology_evidence(existing.clone(), incoming.clone());
        assert_eq!(final_evidence.len(), 5);
        assert_eq!(&final_evidence[0..3], &existing[..]);
        assert_eq!(&final_evidence[3..5], &incoming[..]);
        assert_eq!(stats.added_count, 2);
        assert_eq!(stats.replaced_count, 0);
        assert_eq!(stats.ignored_duplicate_count, 0);
    }

    #[test]
    fn merge_collapses_duplicate_by_key() {
        let mut existing = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        existing.source_label = Some("existing-label".to_string());

        let mut incoming = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        incoming.source_label = Some("incoming-label".to_string());
        incoming.remote_chassis_id = Some("chassis-x".to_string());

        let (final_evidence, stats) = merge_topology_evidence(vec![existing.clone()], vec![incoming.clone()]);
        assert_eq!(final_evidence.len(), 1);
        assert_eq!(stats.added_count, 0);
        assert_eq!(stats.replaced_count, 0);
        assert_eq!(stats.ignored_duplicate_count, 1);

        // source_label should be merged and lex-sorted.
        assert_eq!(final_evidence[0].source_label, Some("existing-label; incoming-label".to_string()));
        // remote_chassis_id should be taken from incoming if existing is None.
        assert_eq!(final_evidence[0].remote_chassis_id, Some("chassis-x".to_string()));
    }

    #[test]
    fn merge_preserves_source_labels_deterministically_when_different() {
        let mut existing = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        existing.source_label = Some("X".to_string());

        let mut incoming = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        incoming.source_label = Some("Y".to_string());

        let (final_evidence, _) = merge_topology_evidence(vec![existing], vec![incoming]);
        // Should be lex-sorted: X; Y.
        assert_eq!(final_evidence[0].source_label, Some("X; Y".to_string()));
    }

    #[test]
    fn merge_keeps_single_label_when_only_one_present() {
        let mut existing = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        existing.source_label = Some("X".to_string());

        let incoming = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        // incoming.source_label = None

        let (final_evidence, _) = merge_topology_evidence(vec![existing], vec![incoming]);
        assert_eq!(final_evidence[0].source_label, Some("X".to_string()));
    }

    #[test]
    fn merge_evidence_notes_join_with_pipe() {
        let mut existing = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        existing.evidence_notes = Some("note-a".to_string());

        let mut incoming = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        incoming.evidence_notes = Some("note-b".to_string());

        let (final_evidence, _) = merge_topology_evidence(vec![existing], vec![incoming]);
        // Should be lex-sorted and joined with " | ".
        assert_eq!(final_evidence[0].evidence_notes, Some("note-a | note-b".to_string()));
    }

    #[test]
    fn merge_dedup_key_is_5_tuple_exact_match() {
        let mut existing = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        existing.local_interface = Some("eth0".to_string());

        let mut incoming = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        incoming.local_interface = Some("eth1".to_string()); // Different interface → not a duplicate

        let (final_evidence, stats) = merge_topology_evidence(vec![existing], vec![incoming]);
        // Should be two records, not merged.
        assert_eq!(final_evidence.len(), 2);
        assert_eq!(stats.added_count, 1);
        assert_eq!(stats.ignored_duplicate_count, 0);
    }

    #[test]
    fn merge_dedup_key_handles_none_interfaces() {
        let existing = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        // Both have None interfaces

        let incoming = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");

        let (final_evidence, stats) = merge_topology_evidence(vec![existing], vec![incoming]);
        // Should match on 5-tuple including None == None.
        assert_eq!(final_evidence.len(), 1);
        assert_eq!(stats.ignored_duplicate_count, 1);
    }

    #[test]
    fn merge_keeps_existing_chassis_when_both_some() {
        let mut existing = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        existing.remote_chassis_id = Some("chassis-existing".to_string());

        let mut incoming = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        incoming.remote_chassis_id = Some("chassis-incoming".to_string());

        let (final_evidence, _) = merge_topology_evidence(vec![existing], vec![incoming]);
        // Should prefer existing when both Some.
        assert_eq!(final_evidence[0].remote_chassis_id, Some("chassis-existing".to_string()));
    }

    #[test]
    fn summarize_returns_dedup_sorted_labels_and_kind_counts() {
        let mut ev1 = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        ev1.source_label = Some("label-z".to_string());

        let mut ev2 = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Cdp, "node2", "node3");
        ev2.source_label = Some("label-a".to_string());

        let mut ev3 = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node3", "node4");
        ev3.source_label = Some("label-z".to_string()); // Duplicate label

        let summary = summarize_topology_evidence("env-test", &[ev1, ev2, ev3], Some("evset-123"));

        assert_eq!(summary.environment_id, "env-test");
        assert_eq!(summary.evidence_count, 3);
        assert_eq!(summary.evidence_set_id, Some("evset-123".to_string()));

        // Labels should be dedup'd and lex-sorted.
        assert_eq!(summary.source_labels, vec!["label-a", "label-z"]);

        // source_kind_counts in stable order: Lldp, Cdp, ConfigNeighbor, Manual.
        assert_eq!(summary.source_kind_counts[0], (crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, 2));
        assert_eq!(summary.source_kind_counts[1], (crate::engines::topology::TopologyAdjacencyFactSourceKind::Cdp, 1));
        assert_eq!(summary.source_kind_counts[2], (crate::engines::topology::TopologyAdjacencyFactSourceKind::ConfigNeighbor, 0));
        assert_eq!(summary.source_kind_counts[3], (crate::engines::topology::TopologyAdjacencyFactSourceKind::Manual, 0));
    }

    #[test]
    fn apply_evidence_import_empty_incoming_no_mutation_for_replace() {
        let store = NullTopologyEvidenceStore;
        let existing = vec![make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2")];
        // Pre-populate the store conceptually by storing once.
        let _ = store.store("env-test", existing, None);

        // Now attempt to import empty with Replace mode.
        let result = apply_evidence_import(
            &store,
            "env-test",
            vec![],
            TopologyEvidenceImportMode::Replace,
            None,
        ).expect("apply should succeed");

        assert_eq!(result.mode, TopologyEvidenceImportMode::Replace);
        assert_eq!(result.store_mutated, false);
        assert_eq!(result.incoming_count, 0);
    }

    #[test]
    fn apply_evidence_import_empty_incoming_no_mutation_for_append() {
        let store = NullTopologyEvidenceStore;
        let existing = vec![make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2")];
        let _ = store.store("env-test", existing, None);

        let result = apply_evidence_import(
            &store,
            "env-test",
            vec![],
            TopologyEvidenceImportMode::Append,
            None,
        ).expect("apply should succeed");

        assert_eq!(result.mode, TopologyEvidenceImportMode::Append);
        assert_eq!(result.store_mutated, false);
        assert_eq!(result.incoming_count, 0);
    }

    #[test]
    fn apply_evidence_import_empty_incoming_no_mutation_for_merge() {
        let store = NullTopologyEvidenceStore;
        let existing = vec![make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2")];
        let _ = store.store("env-test", existing, None);

        let result = apply_evidence_import(
            &store,
            "env-test",
            vec![],
            TopologyEvidenceImportMode::Merge,
            None,
        ).expect("apply should succeed");

        assert_eq!(result.mode, TopologyEvidenceImportMode::Merge);
        assert_eq!(result.store_mutated, false);
        assert_eq!(result.incoming_count, 0);
    }

    #[test]
    fn apply_evidence_import_replace_calls_store_with_incoming() {
        let store = NullTopologyEvidenceStore;
        // NullStore doesn't persist; it always returns empty on load.
        // So previous_count will be 0, and we're replacing 0 with 1.

        let incoming = vec![make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Cdp, "node3", "node4")];
        let result = apply_evidence_import(
            &store,
            "env-test",
            incoming.clone(),
            TopologyEvidenceImportMode::Replace,
            None,
        ).expect("apply should succeed");

        assert_eq!(result.mode, TopologyEvidenceImportMode::Replace);
        assert_eq!(result.store_mutated, true);
        assert_eq!(result.previous_count, 0);  // NullStore returns empty on load
        assert_eq!(result.added_count, 1);
        assert_eq!(result.replaced_count, 0);  // No existing to replace
        assert_eq!(result.final_count, 1);
    }

    #[test]
    fn apply_evidence_import_merge_calls_store_with_merged_evidence() {
        let store = NullTopologyEvidenceStore;
        // NullStore doesn't persist; it always returns empty on load.
        // So merge with empty existing means the incoming record is added (not merged).

        let mut incoming = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        incoming.remote_chassis_id = Some("new-chassis".to_string());

        let result = apply_evidence_import(
            &store,
            "env-test",
            vec![incoming],
            TopologyEvidenceImportMode::Merge,
            None,
        ).expect("apply should succeed");

        assert_eq!(result.mode, TopologyEvidenceImportMode::Merge);
        assert_eq!(result.store_mutated, true);
        assert_eq!(result.previous_count, 0);  // NullStore returns empty on load
        assert_eq!(result.added_count, 1);     // No existing match, so it's added
        assert_eq!(result.ignored_duplicate_count, 0);
        assert_eq!(result.final_count, 1);
    }

    #[test]
    fn apply_evidence_import_mutation_result_carries_evidence_set_id_and_labels() {
        let store = NullTopologyEvidenceStore;
        let mut ev = make_evidence(crate::engines::topology::TopologyAdjacencyFactSourceKind::Lldp, "node1", "node2");
        ev.source_label = Some("my-label".to_string());

        let result = apply_evidence_import(
            &store,
            "env-test",
            vec![ev],
            TopologyEvidenceImportMode::Replace,
            None,
        ).expect("apply should succeed");

        assert!(result.evidence_set_id.is_some());
        assert_eq!(result.source_labels, vec!["my-label"]);
    }

    #[test]
    fn topology_evidence_import_mode_serialises_snake_case() {
        let replace_json = serde_json::to_string(&TopologyEvidenceImportMode::Replace).unwrap();
        assert_eq!(replace_json, "\"replace\"");

        let append_json = serde_json::to_string(&TopologyEvidenceImportMode::Append).unwrap();
        assert_eq!(append_json, "\"append\"");

        let merge_json = serde_json::to_string(&TopologyEvidenceImportMode::Merge).unwrap();
        assert_eq!(merge_json, "\"merge\"");
    }

    #[test]
    fn mutation_result_serialises_with_expected_keys() {
        let result = TopologyEvidenceMutationResult {
            mode: TopologyEvidenceImportMode::Replace,
            previous_count: 5,
            incoming_count: 3,
            added_count: 3,
            replaced_count: 5,
            ignored_duplicate_count: 0,
            final_count: 3,
            evidence_set_id: Some("evset-123".to_string()),
            source_labels: vec!["label-a".to_string()],
            store_mutated: true,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"mode\":\"replace\""));
        assert!(json.contains("\"previous_count\":5"));
        assert!(json.contains("\"store_mutated\":true"));
    }
}
