//! Environment Engine — V1C spine, V1D persistence.
//!
//! Owns the operator's set of *environments* (production estates), the
//! active selection, and a deterministic view over them. The catalogue is
//! still the V1C static demo set; V1D adds **selection persistence**:
//! the active environment id is hydrated from a small JSON store on
//! construction and written back through that store on every successful
//! `set_active`.
//!
//! Boundary (per `ENGINE_AND_API_BOUNDARIES.md`):
//!   - Owns:    environment records + active selection + selection persistence.
//!   - Does NOT own: inventory, devices, vendor model, topology, live state.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

/// Operator-facing environment record. Mirrored in TS as `Environment`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Environment {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub device_count: u32,
    pub status: EnvironmentStatus,
    pub updated_at: String,
    pub summary: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum EnvironmentStatus {
    Healthy,
    Degraded,
    Offline,
    Unknown,
}

/// Persisted shape on disk. Intentionally minimal so later fields can be
/// added without breaking older state files (missing fields → defaults).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EnvironmentState {
    pub active_environment_id: Option<String>,
}

/// Persistence boundary. Implementations may be a JSON file, in-memory
/// test double, or a no-op. Stays narrow on purpose — selection only.
pub trait EnvironmentStore: Send + Sync {
    /// Load the persisted active environment id, if any.
    fn load(&self) -> Option<String>;
    /// Persist the active environment id.
    fn save(&self, id: &str) -> Result<(), String>;
}

/// No-op store. Used by `EnvironmentEngine::new()` and by code paths that
/// explicitly want non-persistent behaviour.
pub struct NullStore;

impl EnvironmentStore for NullStore {
    fn load(&self) -> Option<String> {
        None
    }
    fn save(&self, _id: &str) -> Result<(), String> {
        Ok(())
    }
}

/// JSON file persistence. Writes a `{ "active_environment_id": "..." }`
/// document to a path inside the Tauri app data directory.
pub struct JsonFileStore {
    path: PathBuf,
}

impl JsonFileStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn path(&self) -> &PathBuf {
        &self.path
    }
}

impl EnvironmentStore for JsonFileStore {
    fn load(&self) -> Option<String> {
        let bytes = std::fs::read(&self.path).ok()?;
        let state: EnvironmentState = serde_json::from_slice(&bytes).ok()?;
        state.active_environment_id
    }

    fn save(&self, id: &str) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let state = EnvironmentState {
            active_environment_id: Some(id.to_string()),
        };
        let bytes = serde_json::to_vec_pretty(&state).map_err(|e| e.to_string())?;
        std::fs::write(&self.path, bytes).map_err(|e| e.to_string())
    }
}

/// Engine state. Static catalogue + Mutex-guarded active selection +
/// pluggable persistence store.
pub struct EnvironmentEngine {
    catalogue: Vec<Environment>,
    active: Mutex<String>,
    store: Arc<dyn EnvironmentStore>,
}

impl EnvironmentEngine {
    /// Non-persistent constructor. Equivalent to `with_store(NullStore)`.
    pub fn new() -> Self {
        Self::with_store(Arc::new(NullStore))
    }

    /// Build the engine with a concrete persistence store. The store is
    /// queried once at construction time to hydrate the active selection;
    /// a stale, missing, or unreadable id falls back deterministically to
    /// the first environment in the catalogue.
    pub fn with_store(store: Arc<dyn EnvironmentStore>) -> Self {
        let catalogue = demo_catalogue();
        let fallback = catalogue
            .first()
            .map(|e| e.id.clone())
            .unwrap_or_default();
        let active = match store.load() {
            Some(saved) if catalogue.iter().any(|e| e.id == saved) => saved,
            _ => fallback,
        };
        Self {
            catalogue,
            active: Mutex::new(active),
            store,
        }
    }

    /// Deterministic environment list. Order is stable across calls.
    pub fn list(&self) -> Vec<Environment> {
        self.catalogue.clone()
    }

    /// Currently selected environment, or `None` if catalogue is empty.
    pub fn active(&self) -> Option<Environment> {
        let id = self.active.lock().ok()?.clone();
        self.catalogue.iter().find(|e| e.id == id).cloned()
    }

    /// Set the active environment. Validates against the catalogue,
    /// persists the new id through the configured store, and only then
    /// updates in-memory state. If persistence fails, the previous active
    /// id is left untouched.
    pub fn set_active(&self, id: &str) -> Result<Environment, String> {
        let found = self
            .catalogue
            .iter()
            .find(|e| e.id == id)
            .cloned()
            .ok_or_else(|| format!("unknown environment id: {id}"))?;
        self.store.save(&found.id)?;
        let mut guard = self
            .active
            .lock()
            .map_err(|_| "environment engine mutex poisoned".to_string())?;
        *guard = found.id.clone();
        Ok(found)
    }
}

impl Default for EnvironmentEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Static V1C demo catalogue. Replaced by a real catalogue in a later stage.
fn demo_catalogue() -> Vec<Environment> {
    vec![
        Environment {
            id: "env-core-eu1".to_string(),
            name: "Core EU-1".to_string(),
            kind: "core-datacenter".to_string(),
            device_count: 412,
            status: EnvironmentStatus::Healthy,
            updated_at: "2026-05-15T08:42:00Z".to_string(),
            summary: "Primary EU core fabric. Multi-vendor spine/leaf.".to_string(),
        },
        Environment {
            id: "env-edge-us-east".to_string(),
            name: "Edge US-East".to_string(),
            kind: "edge-pop".to_string(),
            device_count: 88,
            status: EnvironmentStatus::Degraded,
            updated_at: "2026-05-15T07:11:00Z".to_string(),
            summary: "US-East edge PoP. Two transit sessions flapping.".to_string(),
        },
        Environment {
            id: "env-lab-zrh".to_string(),
            name: "Lab ZRH".to_string(),
            kind: "lab".to_string(),
            device_count: 24,
            status: EnvironmentStatus::Healthy,
            updated_at: "2026-05-14T22:03:00Z".to_string(),
            summary: "Zurich engineering lab. Vendor proofs and reproductions.".to_string(),
        },
        Environment {
            id: "env-branch-mesh".to_string(),
            name: "Branch Mesh".to_string(),
            kind: "branch-fleet".to_string(),
            device_count: 1_337,
            status: EnvironmentStatus::Unknown,
            updated_at: "2026-05-15T06:00:00Z".to_string(),
            summary: "Distributed branch fleet. Polling cadence reduced.".to_string(),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    /// In-memory test double. Records the last saved id so tests can
    /// assert persistence happened (or didn't).
    struct MemoryStore {
        initial: Option<String>,
        saved: Mutex<Option<String>>,
    }

    impl MemoryStore {
        fn empty() -> Self {
            Self {
                initial: None,
                saved: Mutex::new(None),
            }
        }
        fn with(id: &str) -> Self {
            Self {
                initial: Some(id.to_string()),
                saved: Mutex::new(None),
            }
        }
        fn last_saved(&self) -> Option<String> {
            self.saved.lock().unwrap().clone()
        }
    }

    impl EnvironmentStore for MemoryStore {
        fn load(&self) -> Option<String> {
            self.initial.clone()
        }
        fn save(&self, id: &str) -> Result<(), String> {
            *self.saved.lock().unwrap() = Some(id.to_string());
            Ok(())
        }
    }

    // --- V1C invariants (kept) ---------------------------------------

    #[test]
    fn list_is_deterministic() {
        let a = EnvironmentEngine::new().list();
        let b = EnvironmentEngine::new().list();
        assert_eq!(a, b);
        assert!(!a.is_empty());
    }

    #[test]
    fn first_environment_is_active_by_default() {
        let engine = EnvironmentEngine::new();
        let active = engine.active().expect("must have default active");
        assert_eq!(active.id, "env-core-eu1");
    }

    #[test]
    fn set_active_known_id_updates_selection() {
        let engine = EnvironmentEngine::new();
        let target = "env-lab-zrh";
        let updated = engine.set_active(target).expect("known id must succeed");
        assert_eq!(updated.id, target);
        assert_eq!(engine.active().unwrap().id, target);
    }

    #[test]
    fn set_active_unknown_id_errors_and_keeps_previous() {
        let engine = EnvironmentEngine::new();
        let prev = engine.active().unwrap().id;
        let err = engine.set_active("env-does-not-exist").unwrap_err();
        assert!(err.contains("unknown environment id"));
        assert_eq!(engine.active().unwrap().id, prev);
    }

    #[test]
    fn network_scope_totals_are_stable() {
        let engine = EnvironmentEngine::new();
        let total: u32 = engine.list().iter().map(|e| e.device_count).sum();
        assert_eq!(total, 412 + 88 + 24 + 1337);
    }

    // --- V1D persistence ---------------------------------------------

    #[test]
    fn hydrate_falls_back_to_first_when_no_saved_id() {
        let store = Arc::new(MemoryStore::empty());
        let engine = EnvironmentEngine::with_store(store);
        assert_eq!(engine.active().unwrap().id, "env-core-eu1");
    }

    #[test]
    fn hydrate_uses_valid_saved_id() {
        let store = Arc::new(MemoryStore::with("env-lab-zrh"));
        let engine = EnvironmentEngine::with_store(store);
        assert_eq!(engine.active().unwrap().id, "env-lab-zrh");
    }

    #[test]
    fn hydrate_stale_saved_id_falls_back_to_first() {
        let store = Arc::new(MemoryStore::with("env-was-deleted"));
        let engine = EnvironmentEngine::with_store(store);
        assert_eq!(engine.active().unwrap().id, "env-core-eu1");
    }

    #[test]
    fn set_active_persists_valid_id_through_store() {
        let store = Arc::new(MemoryStore::empty());
        let engine = EnvironmentEngine::with_store(store.clone());
        engine.set_active("env-lab-zrh").expect("must succeed");
        assert_eq!(store.last_saved().as_deref(), Some("env-lab-zrh"));
        assert_eq!(engine.active().unwrap().id, "env-lab-zrh");
    }

    #[test]
    fn invalid_set_active_does_not_persist_or_mutate_state() {
        let store = Arc::new(MemoryStore::with("env-lab-zrh"));
        let engine = EnvironmentEngine::with_store(store.clone());
        assert_eq!(engine.active().unwrap().id, "env-lab-zrh");

        let err = engine.set_active("env-bogus").unwrap_err();
        assert!(err.contains("unknown environment id"));

        assert_eq!(engine.active().unwrap().id, "env-lab-zrh");
        assert_eq!(store.last_saved(), None);
    }

    // --- V1D file-backed round trip ----------------------------------

    #[test]
    fn json_file_store_round_trips_through_engine() {
        let tmp = std::env::temp_dir().join(format!(
            "anthracite-env-{}-{}.json",
            std::process::id(),
            // nanos give us a per-test-call unique suffix
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0),
        ));
        // Ensure clean slate.
        let _ = std::fs::remove_file(&tmp);

        // First boot: no file → fallback to first, then operator selects lab.
        {
            let store = Arc::new(JsonFileStore::new(tmp.clone()));
            let engine = EnvironmentEngine::with_store(store);
            assert_eq!(engine.active().unwrap().id, "env-core-eu1");
            engine.set_active("env-lab-zrh").expect("set must succeed");
        }

        // Second boot: persisted id is hydrated.
        {
            let store = Arc::new(JsonFileStore::new(tmp.clone()));
            let engine = EnvironmentEngine::with_store(store);
            assert_eq!(engine.active().unwrap().id, "env-lab-zrh");
        }

        // Tamper: corrupt the file → fallback to first on next boot.
        std::fs::write(&tmp, b"{not valid json").unwrap();
        {
            let store = Arc::new(JsonFileStore::new(tmp.clone()));
            let engine = EnvironmentEngine::with_store(store);
            assert_eq!(engine.active().unwrap().id, "env-core-eu1");
        }

        let _ = std::fs::remove_file(&tmp);
    }
}
