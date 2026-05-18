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
}
