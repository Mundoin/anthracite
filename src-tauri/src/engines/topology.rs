//! Topology Engine — V1AJ spine.
//!
//! Consumes persisted Discovery records and projects a deterministic
//! topology read model. Stateless: no persistence, no mutex, no clock.
//! Edges are absent in V1AJ until reliable link facts land.
//!
//! Boundary (per `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`):
//!   - Owns:    topology projection logic, node/edge wire shape.
//!   - Reads:   `DiscoveryDeviceRecord` slices (via the command layer).
//!   - Does NOT own: discovery records (Discovery Engine), DeviceModel
//!              (network_model), live device state, polling.
//!
//! Determinism: same input record list → byte-identical `TopologyView`.

use serde::{Deserialize, Serialize};
use crate::engines::discovery::DiscoveryDeviceRecord;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TopologySourceState {
    Empty,
    Real,
    Unavailable,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TopologyNodeSource {
    DiscoveryInventory,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TopologyEdgeKind {
    Lldp,
    Cdp,
    ConfigNeighbor,
    Manual,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TopologyEdgeSource {
    DiscoveryInventory,
    LiveCollection,
    Manual,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TopologyLayer {
    Inventory,
    Unknown,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TopologyRoleHint {
    Device,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TopologyNode {
    pub id: String,
    pub label: String,
    pub device_record_id: String,
    pub hostname: Option<String>,
    pub platform_id: Option<String>,
    pub vendor: Option<String>,
    pub role_hint: TopologyRoleHint,
    pub layer: TopologyLayer,
    pub source_kind: TopologyNodeSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TopologyEdge {
    pub id: String,
    pub source_node_id: String,
    pub target_node_id: String,
    pub kind: TopologyEdgeKind,
    pub confidence: Option<f32>,
    pub source: TopologyEdgeSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TopologySummary {
    pub environment_id: Option<String>,
    pub node_count: u32,
    pub edge_count: u32,
    pub source_record_count: u32,
}

// No Eq — contains Vec<TopologyEdge> which lacks Eq (Option<f32>).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TopologyView {
    pub environment_id: Option<String>,
    pub source_state: TopologySourceState,
    pub nodes: Vec<TopologyNode>,
    pub edges: Vec<TopologyEdge>,
    pub summary: TopologySummary,
    pub message: String,
}

/// Stateless engine. V1AJ has no projection state — same input → same output.
pub struct TopologyEngine;

impl TopologyEngine {
    pub fn new() -> Self {
        Self
    }

    /// Deterministic projection from Discovery records to a topology view.
    /// Pure function — no I/O, no clock, no random.
    /// Records must be iterated in given order so node order is stable.
    pub fn project(
        &self,
        environment_id: Option<&str>,
        records: &[DiscoveryDeviceRecord],
    ) -> TopologyView {
        let nodes: Vec<TopologyNode> = records
            .iter()
            .map(|record| {
                let hostname = record
                    .device_model
                    .identity
                    .hostname
                    .as_deref()
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.to_string());
                let label = hostname
                    .clone()
                    .unwrap_or_else(|| record.id.clone());
                let platform_id = record.device_model.platform.platform_id.clone();
                let vendor = record.device_model.platform.vendor.clone();
                TopologyNode {
                    id: format!("topo::{}", record.id),
                    label,
                    device_record_id: record.id.clone(),
                    hostname,
                    platform_id,
                    vendor,
                    role_hint: TopologyRoleHint::Device,
                    layer: TopologyLayer::Inventory,
                    source_kind: TopologyNodeSource::DiscoveryInventory,
                }
            })
            .collect();

        let edges: Vec<TopologyEdge> = Vec::new();  // V1AJ: no edges until reliable link facts exist.

        let node_count = nodes.len() as u32;
        let edge_count = edges.len() as u32;
        let source_record_count = records.len() as u32;

        let source_state = if node_count == 0 {
            TopologySourceState::Empty
        } else {
            TopologySourceState::Real
        };

        let message = if node_count == 0 {
            "topology empty — no discovery records in scope".to_string()
        } else {
            format!(
                "topology has {} node{} from discovery inventory · 0 reliable links",
                node_count,
                if node_count == 1 { "" } else { "s" }
            )
        };

        let summary = TopologySummary {
            environment_id: environment_id.map(|s| s.to_string()),
            node_count,
            edge_count,
            source_record_count,
        };

        TopologyView {
            environment_id: environment_id.map(|s| s.to_string()),
            source_state,
            nodes,
            edges,
            summary,
            message,
        }
    }
}

impl Default for TopologyEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engines::network_model::{DeviceIdentity, DeviceModel, PlatformRef};
    use crate::engines::discovery::DiscoveryRecordSourceKind;

    fn make_record(
        record_id: &str,
        environment_id: &str,
        hostname: Option<&str>,
        platform_id: Option<&str>,
        vendor: Option<&str>,
    ) -> DiscoveryDeviceRecord {
        let identity = DeviceIdentity {
            hostname: hostname.map(|s| s.to_string()),
            ..Default::default()
        };
        let platform = PlatformRef {
            platform_id: platform_id.map(|s| s.to_string()),
            vendor: vendor.map(|s| s.to_string()),
            ..Default::default()
        };
        DiscoveryDeviceRecord {
            id: record_id.to_string(),
            environment_id: environment_id.to_string(),
            source_kind: DiscoveryRecordSourceKind::IntakeImport,
            confidence: None,
            last_seen: None,
            device_model: DeviceModel::minimal(identity, platform),
            source_label: None,
            slice_id: None,
        }
    }

    #[test]
    fn empty_records_produces_empty_view() {
        let engine = TopologyEngine::new();
        let view = engine.project(Some("env-x"), &[]);
        assert_eq!(view.source_state, TopologySourceState::Empty);
        assert!(view.nodes.is_empty());
        assert!(view.edges.is_empty());
        assert_eq!(view.summary.node_count, 0);
        assert_eq!(view.summary.edge_count, 0);
        assert_eq!(view.summary.source_record_count, 0);
        assert!(view.message.contains("empty"));
    }

    #[test]
    fn single_record_produces_one_node() {
        let engine = TopologyEngine::new();
        let record = make_record("discovery::env-a::router-1", "env-a", Some("router-1"), None, None);
        let view = engine.project(Some("env-a"), &[record.clone()]);
        assert_eq!(view.nodes.len(), 1);
        let node = &view.nodes[0];
        assert_eq!(node.label, "router-1");
        assert_eq!(node.id, "topo::discovery::env-a::router-1");
        assert_eq!(node.role_hint, TopologyRoleHint::Device);
        assert_eq!(node.layer, TopologyLayer::Inventory);
        assert_eq!(node.source_kind, TopologyNodeSource::DiscoveryInventory);
    }

    #[test]
    fn multiple_records_produce_one_node_each() {
        let engine = TopologyEngine::new();
        let rec1 = make_record("rec1", "env-a", Some("router-1"), None, None);
        let rec2 = make_record("rec2", "env-a", Some("router-2"), None, None);
        let rec3 = make_record("rec3", "env-a", Some("router-3"), None, None);
        let view = engine.project(Some("env-a"), &[rec1, rec2, rec3]);
        assert_eq!(view.nodes.len(), 3);
        assert_eq!(view.nodes[0].id, "topo::rec1");
        assert_eq!(view.nodes[1].id, "topo::rec2");
        assert_eq!(view.nodes[2].id, "topo::rec3");
    }

    #[test]
    fn node_id_is_namespaced_with_record_id() {
        let engine = TopologyEngine::new();
        let record = make_record("discovery::env-a::router-1", "env-a", Some("router-1"), None, None);
        let view = engine.project(Some("env-a"), &[record]);
        assert_eq!(view.nodes[0].id, "topo::discovery::env-a::router-1");
    }

    #[test]
    fn node_label_falls_back_to_record_id_when_hostname_missing() {
        let engine = TopologyEngine::new();
        let record = make_record("discovery::env-a::sliceX", "env-a", None, None, None);
        let view = engine.project(Some("env-a"), &[record]);
        assert_eq!(view.nodes[0].label, "discovery::env-a::sliceX");
    }

    #[test]
    fn node_label_falls_back_when_hostname_blank() {
        let engine = TopologyEngine::new();
        let record = make_record("discovery::env-a::sliceX", "env-a", Some("   "), None, None);
        let view = engine.project(Some("env-a"), &[record]);
        assert_eq!(view.nodes[0].label, "discovery::env-a::sliceX");
    }

    #[test]
    fn node_carries_platform_id_and_vendor_when_present() {
        let engine = TopologyEngine::new();
        let record = make_record(
            "rec1",
            "env-a",
            Some("router-1"),
            Some("cisco-iosxe-17"),
            Some("cisco"),
        );
        let view = engine.project(Some("env-a"), &[record]);
        let node = &view.nodes[0];
        assert_eq!(node.platform_id, Some("cisco-iosxe-17".to_string()));
        assert_eq!(node.vendor, Some("cisco".to_string()));
    }

    #[test]
    fn node_carries_null_platform_when_absent() {
        let engine = TopologyEngine::new();
        let record = make_record("rec1", "env-a", Some("router-1"), None, None);
        let view = engine.project(Some("env-a"), &[record]);
        let node = &view.nodes[0];
        assert_eq!(node.platform_id, None);
        assert_eq!(node.vendor, None);
    }

    #[test]
    fn real_records_produce_real_source_state() {
        let engine = TopologyEngine::new();
        let record = make_record("rec1", "env-a", Some("router-1"), None, None);
        let view = engine.project(Some("env-a"), &[record]);
        assert_eq!(view.source_state, TopologySourceState::Real);
        assert!(view.message.contains("node"));
    }

    #[test]
    fn edges_are_always_empty_in_v1aj() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("rec1", "env-a", Some("r1"), None, None),
            make_record("rec2", "env-a", Some("r2"), None, None),
            make_record("rec3", "env-a", Some("r3"), None, None),
            make_record("rec4", "env-a", Some("r4"), None, None),
            make_record("rec5", "env-a", Some("r5"), None, None),
        ];
        let view = engine.project(Some("env-a"), &records);
        assert!(view.edges.is_empty());
        assert_eq!(view.summary.edge_count, 0);
        assert!(view.message.contains("0 reliable links"));
    }

    #[test]
    fn environment_id_is_reflected_in_view_and_summary() {
        let engine = TopologyEngine::new();
        let record = make_record("rec1", "env-core-eu1", Some("router-1"), None, None);
        let view = engine.project(Some("env-core-eu1"), &[record]);
        assert_eq!(view.environment_id, Some("env-core-eu1".to_string()));
        assert_eq!(view.summary.environment_id, Some("env-core-eu1".to_string()));
    }

    #[test]
    fn environment_id_is_none_when_unscoped() {
        let engine = TopologyEngine::new();
        let record = make_record("rec1", "env-a", Some("router-1"), None, None);
        let view = engine.project(None, &[record]);
        assert_eq!(view.environment_id, None);
        assert_eq!(view.summary.environment_id, None);
    }

    #[test]
    fn summary_source_record_count_matches_input_len() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("rec1", "env-a", Some("r1"), None, None),
            make_record("rec2", "env-a", Some("r2"), None, None),
            make_record("rec3", "env-a", Some("r3"), None, None),
        ];
        let view = engine.project(Some("env-a"), &records);
        assert_eq!(view.summary.source_record_count, 3);
    }

    #[test]
    fn same_input_produces_same_output() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("rec1", "env-a", Some("router-1"), Some("cisco-iosxe"), Some("cisco")),
            make_record("rec2", "env-a", Some("router-2"), None, None),
        ];
        let view1 = engine.project(Some("env-a"), &records);
        let view2 = engine.project(Some("env-a"), &records);
        assert_eq!(view1, view2);
    }

    #[test]
    fn node_order_matches_input_order() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("aaa", "env-a", Some("router-aaa"), None, None),
            make_record("bbb", "env-a", Some("router-bbb"), None, None),
            make_record("ccc", "env-a", Some("router-ccc"), None, None),
        ];
        let view = engine.project(Some("env-a"), &records);
        assert_eq!(view.nodes[0].device_record_id, "aaa");
        assert_eq!(view.nodes[1].device_record_id, "bbb");
        assert_eq!(view.nodes[2].device_record_id, "ccc");
    }

    #[test]
    fn serialization_shape_matches_ts_wire_contract() {
        let engine = TopologyEngine::new();
        let view = engine.project(Some("env-a"), &[]);
        let value = serde_json::to_value(&view).expect("serialization failed");
        let obj = value.as_object().expect("value must be an object");
        assert!(obj.contains_key("environment_id"));
        assert!(obj.contains_key("source_state"));
        assert!(obj.contains_key("nodes"));
        assert!(obj.contains_key("edges"));
        assert!(obj.contains_key("summary"));
        assert!(obj.contains_key("message"));
    }

    #[test]
    fn source_state_serializes_lowercase() {
        let state = TopologySourceState::Empty;
        let s = serde_json::to_string(&state).expect("serialization failed");
        assert_eq!(s, "\"empty\"");
    }
}
