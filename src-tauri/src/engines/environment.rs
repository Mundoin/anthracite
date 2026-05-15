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

/// Lifecycle reading over the operator's active environment + catalogue.
/// Deterministic projection — no I/O, no clock, no probabilistic logic.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum EnvironmentLifecycleState {
    Ready,
    Degraded,
    Offline,
    Incomplete,
}

/// Compact readiness snapshot consumed by the HOME / Environment Centre.
/// Pure function of the catalogue + active selection at call time.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EnvironmentReadiness {
    pub active_environment_id: Option<String>,
    pub active_environment_name: Option<String>,
    pub lifecycle_state: EnvironmentLifecycleState,
    pub total_environments: u32,
    pub total_devices: u32,
    pub healthy_count: u32,
    pub degraded_count: u32,
    pub offline_count: u32,
    pub unknown_count: u32,
    pub message: String,
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
    /// Deterministic readiness projection over the catalogue + active
    /// selection. Pure: same state → same output, no I/O, no clock.
    pub fn readiness(&self) -> EnvironmentReadiness {
        let total_environments = self.catalogue.len() as u32;
        let total_devices: u32 = self.catalogue.iter().map(|e| e.device_count).sum();

        let mut healthy_count = 0u32;
        let mut degraded_count = 0u32;
        let mut offline_count = 0u32;
        let mut unknown_count = 0u32;
        for e in &self.catalogue {
            match e.status {
                EnvironmentStatus::Healthy => healthy_count += 1,
                EnvironmentStatus::Degraded => degraded_count += 1,
                EnvironmentStatus::Offline => offline_count += 1,
                EnvironmentStatus::Unknown => unknown_count += 1,
            }
        }

        let active = self.active();
        let (lifecycle_state, message) = match &active {
            None => (
                EnvironmentLifecycleState::Incomplete,
                "no active environment selected".to_string(),
            ),
            Some(env) => match env.status {
                EnvironmentStatus::Healthy => (
                    EnvironmentLifecycleState::Ready,
                    format!("{} ready · {} devices in scope", env.name, env.device_count),
                ),
                EnvironmentStatus::Degraded => (
                    EnvironmentLifecycleState::Degraded,
                    format!("{} degraded — review signals", env.name),
                ),
                EnvironmentStatus::Offline => (
                    EnvironmentLifecycleState::Offline,
                    format!("{} offline — operator action required", env.name),
                ),
                EnvironmentStatus::Unknown => (
                    EnvironmentLifecycleState::Incomplete,
                    format!("{} state unknown — discovery pending", env.name),
                ),
            },
        };

        EnvironmentReadiness {
            active_environment_id: active.as_ref().map(|e| e.id.clone()),
            active_environment_name: active.as_ref().map(|e| e.name.clone()),
            lifecycle_state,
            total_environments,
            total_devices,
            healthy_count,
            degraded_count,
            offline_count,
            unknown_count,
            message,
        }
    }

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

    // --- V1E readiness ------------------------------------------------

    #[test]
    fn readiness_for_default_active_environment_is_ready() {
        let engine = EnvironmentEngine::new();
        let r = engine.readiness();
        assert_eq!(r.active_environment_id.as_deref(), Some("env-core-eu1"));
        assert_eq!(r.active_environment_name.as_deref(), Some("Core EU-1"));
        assert_eq!(r.lifecycle_state, EnvironmentLifecycleState::Ready);
        assert_eq!(r.total_environments, 4);
        assert_eq!(r.total_devices, 412 + 88 + 24 + 1337);
        assert_eq!(r.healthy_count, 2);
        assert_eq!(r.degraded_count, 1);
        assert_eq!(r.offline_count, 0);
        assert_eq!(r.unknown_count, 1);
        assert!(r.message.contains("Core EU-1"));
    }

    #[test]
    fn readiness_updates_after_active_environment_changes() {
        let engine = EnvironmentEngine::new();
        let before = engine.readiness();
        assert_eq!(before.lifecycle_state, EnvironmentLifecycleState::Ready);

        engine
            .set_active("env-edge-us-east")
            .expect("known id must succeed");
        let after = engine.readiness();
        assert_eq!(after.active_environment_id.as_deref(), Some("env-edge-us-east"));
        assert_eq!(after.lifecycle_state, EnvironmentLifecycleState::Degraded);
        assert!(after.message.contains("Edge US-East"));

        engine
            .set_active("env-branch-mesh")
            .expect("known id must succeed");
        let unknown = engine.readiness();
        assert_eq!(unknown.lifecycle_state, EnvironmentLifecycleState::Incomplete);
        assert!(unknown.message.contains("state unknown"));
    }

    #[test]
    fn readiness_counts_remain_deterministic_across_calls() {
        let engine = EnvironmentEngine::new();
        let a = engine.readiness();
        let b = engine.readiness();
        assert_eq!(a, b);

        engine.set_active("env-lab-zrh").unwrap();
        let c = engine.readiness();
        let d = engine.readiness();
        assert_eq!(c, d);
        // Catalogue-wide counts must not drift with active selection.
        assert_eq!(a.total_environments, c.total_environments);
        assert_eq!(a.total_devices, c.total_devices);
        assert_eq!(a.healthy_count, c.healthy_count);
        assert_eq!(a.degraded_count, c.degraded_count);
        assert_eq!(a.offline_count, c.offline_count);
        assert_eq!(a.unknown_count, c.unknown_count);
    }

    #[test]
    fn stale_persistence_hydrates_fallback_and_readiness_follows_fallback() {
        let store = Arc::new(MemoryStore::with("env-was-deleted"));
        let engine = EnvironmentEngine::with_store(store);
        let r = engine.readiness();
        assert_eq!(r.active_environment_id.as_deref(), Some("env-core-eu1"));
        assert_eq!(r.lifecycle_state, EnvironmentLifecycleState::Ready);
        assert!(r.message.contains("Core EU-1"));
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
