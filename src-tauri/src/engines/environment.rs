//! Environment Engine — V1C spine.
//!
//! Owns the operator's set of *environments* (production estates), the
//! active selection, and a deterministic view over them. No I/O in V1C —
//! the catalogue is a static demo set so the typed API and the HOME
//! surface can be exercised end-to-end before persistence lands.
//!
//! Boundary (per `ENGINE_AND_API_BOUNDARIES.md`):
//!   - Owns:    environment records + active selection.
//!   - Does NOT own: inventory, devices, vendor model, topology, live state.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;

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

/// Engine state. Static catalogue + Mutex-guarded active selection.
pub struct EnvironmentEngine {
    catalogue: Vec<Environment>,
    active: Mutex<String>,
}

impl EnvironmentEngine {
    pub fn new() -> Self {
        let catalogue = demo_catalogue();
        let active = catalogue
            .first()
            .map(|e| e.id.clone())
            .unwrap_or_default();
        Self {
            catalogue,
            active: Mutex::new(active),
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

    /// Set the active environment. Returns the new active record or an
    /// error string if the id is not in the catalogue.
    pub fn set_active(&self, id: &str) -> Result<Environment, String> {
        let found = self
            .catalogue
            .iter()
            .find(|e| e.id == id)
            .cloned()
            .ok_or_else(|| format!("unknown environment id: {id}"))?;
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

/// Static V1C demo catalogue. Replaced by persistence in a later stage.
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
        // Stable sum across runs — guards against accidental catalogue drift.
        assert_eq!(total, 412 + 88 + 24 + 1337);
    }
}
