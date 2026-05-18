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
    pub local_interface: Option<String>,
    pub remote_interface: Option<String>,
    pub evidence: Vec<String>,
}

/// V1AL — top-level state for the adjacency layer specifically.
/// Distinct from `TopologySourceState` which describes nodes.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TopologyAdjacencyFactSourceState {
    NoneAvailable,
    Partial,
    Ready,
}

/// V1AL — closed set of link-fact source categories. Mirrors
/// `TopologyEdgeKind` discipline so future edge ingestion lines up.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TopologyAdjacencyFactSourceKind {
    Lldp,
    Cdp,
    ConfigNeighbor,
    Manual,
}

/// V1AM — explicit link fact, source of truth for reliable edges.
/// All fields are persisted; derives serde with snake_case.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TopologyLinkFact {
    pub source_kind: TopologyAdjacencyFactSourceKind,
    pub local_node_id: String,      // device_record_id (NOT topo:: prefixed)
    pub remote_node_id: String,     // device_record_id (NOT topo:: prefixed)
    pub local_interface: Option<String>,
    pub remote_interface: Option<String>,
    pub evidence: String,           // free-form provenance note
    pub source_label: Option<String>, // e.g. "parser:cisco-iosxe lldp neighbors"
}

/// V1AL — per-source breakdown for the adjacency readiness report.
/// `present: false` is honest "not connected" for that source;
/// `present: true, count: 0` means source connected but no facts ingested.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TopologyAdjacencyFactSource {
    pub kind: TopologyAdjacencyFactSourceKind,
    pub present: bool,
    pub count: u32,
    pub note: String,
}

/// V1AL — top-level adjacency readiness contract.
/// `eligible_node_count` (V1AL definition): nodes that could receive
/// adjacency facts. Currently == nodes.len() because every node has a
/// stable id. Future stages may tighten this once role/layer inference
/// adds eligibility constraints.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TopologyAdjacencyReadiness {
    pub eligible_node_count: u32,
    pub fact_source_state: TopologyAdjacencyFactSourceState,
    pub fact_sources: Vec<TopologyAdjacencyFactSource>,
    pub accepted_kinds: Vec<TopologyAdjacencyFactSourceKind>,
    pub reason: String,
}

/// V1AM — projection statistics from link fact ingestion.
/// Tracks how many facts were accepted, rejected, or collapsed.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct ProjectionStats {
    pub facts_total: u32,
    pub facts_accepted: u32,
    pub facts_rejected_unknown_node: u32,
    pub facts_rejected_self_link: u32,
    pub facts_collapsed_duplicate: u32,
    pub per_kind_counts: Vec<(TopologyAdjacencyFactSourceKind, u32)>,
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
    pub adjacency_readiness: TopologyAdjacencyReadiness,
}

/// V1AM — compute deterministic adjacency readiness given node count and fact counts.
/// Pure function. No clock, no I/O. Driven by per_kind_counts from projection.
fn compute_adjacency_readiness(
    node_count: u32,
    per_kind_counts: &[(TopologyAdjacencyFactSourceKind, u32)],
) -> TopologyAdjacencyReadiness {
    // Build fact_sources from per_kind_counts in stable order.
    // Stable order: Lldp=0, Cdp=1, ConfigNeighbor=2, Manual=3.
    let stable_kinds = vec![
        TopologyAdjacencyFactSourceKind::Lldp,
        TopologyAdjacencyFactSourceKind::Cdp,
        TopologyAdjacencyFactSourceKind::ConfigNeighbor,
        TopologyAdjacencyFactSourceKind::Manual,
    ];

    let mut fact_sources = Vec::new();
    let mut n_present = 0u32;

    for kind in &stable_kinds {
        let count = per_kind_counts
            .iter()
            .find(|(k, _)| k == kind)
            .map(|(_, c)| c)
            .copied()
            .unwrap_or(0);
        let present = count > 0;
        if present {
            n_present += 1;
        }
        let note = if present {
            format!("{} facts ingested", count)
        } else {
            match kind {
                TopologyAdjacencyFactSourceKind::Lldp => "LLDP fact ingestion not implemented",
                TopologyAdjacencyFactSourceKind::Cdp => "CDP fact ingestion not implemented",
                TopologyAdjacencyFactSourceKind::ConfigNeighbor => "Parser-derived neighbor facts not implemented",
                TopologyAdjacencyFactSourceKind::Manual => "Manual adjacency entry surface not built",
            }
            .to_string()
        };
        fact_sources.push(TopologyAdjacencyFactSource {
            kind: *kind,
            present,
            count,
            note,
        });
    }

    let all_present = n_present == 4;
    let fact_source_state = if all_present {
        TopologyAdjacencyFactSourceState::Ready
    } else if n_present > 0 {
        TopologyAdjacencyFactSourceState::Partial
    } else {
        TopologyAdjacencyFactSourceState::NoneAvailable
    };

    let reason = match fact_source_state {
        TopologyAdjacencyFactSourceState::NoneAvailable =>
            "no adjacency fact sources connected — edges remain empty".to_string(),
        TopologyAdjacencyFactSourceState::Partial =>
            format!("{} of 4 adjacency fact sources connected", n_present),
        TopologyAdjacencyFactSourceState::Ready =>
            "adjacency fact sources connected".to_string(),
    };

    let accepted_kinds = stable_kinds;

    TopologyAdjacencyReadiness {
        eligible_node_count: node_count,
        fact_source_state,
        fact_sources,
        accepted_kinds,
        reason,
    }
}

/// V1AM — project edges from explicit link facts.
/// Deterministic edge projection: deduped by canonical ID, sorted by (kind ordinal, id).
pub fn project_edges_from_link_facts(
    nodes: &[TopologyNode],
    facts: &[TopologyLinkFact],
) -> (Vec<TopologyEdge>, ProjectionStats) {
    use std::collections::{HashMap, HashSet};

    let mut stats = ProjectionStats {
        facts_total: facts.len() as u32,
        facts_accepted: 0,
        facts_rejected_unknown_node: 0,
        facts_rejected_self_link: 0,
        facts_collapsed_duplicate: 0,
        per_kind_counts: vec![
            (TopologyAdjacencyFactSourceKind::Lldp, 0),
            (TopologyAdjacencyFactSourceKind::Cdp, 0),
            (TopologyAdjacencyFactSourceKind::ConfigNeighbor, 0),
            (TopologyAdjacencyFactSourceKind::Manual, 0),
        ],
    };

    // Build valid node ID set from nodes.
    let valid_nodes: HashSet<&str> = nodes
        .iter()
        .map(|n| n.device_record_id.as_str())
        .collect();

    // Map edge ID -> TopologyEdge; use this to dedupe and collapse evidence.
    let mut edge_map: HashMap<String, TopologyEdge> = HashMap::new();

    for fact in facts {
        // Reject self-links.
        if fact.local_node_id == fact.remote_node_id {
            stats.facts_rejected_self_link += 1;
            continue;
        }

        // Reject unknown node references.
        if !valid_nodes.contains(fact.local_node_id.as_str())
            || !valid_nodes.contains(fact.remote_node_id.as_str())
        {
            stats.facts_rejected_unknown_node += 1;
            continue;
        }

        // Compute canonical edge ID (symmetric dedup).
        // Normalize so (lo_node, lo_iface, hi_node, hi_iface) is lex-min.
        let (lo_node, lo_iface, hi_node, hi_iface) = {
            let pair_a = (
                fact.local_node_id.as_str(),
                fact.local_interface.as_deref().unwrap_or("*"),
                fact.remote_node_id.as_str(),
                fact.remote_interface.as_deref().unwrap_or("*"),
            );
            let pair_b = (
                fact.remote_node_id.as_str(),
                fact.remote_interface.as_deref().unwrap_or("*"),
                fact.local_node_id.as_str(),
                fact.local_interface.as_deref().unwrap_or("*"),
            );
            if pair_a <= pair_b {
                pair_a
            } else {
                pair_b
            }
        };

        let kind_str = match fact.source_kind {
            TopologyAdjacencyFactSourceKind::Lldp => "lldp",
            TopologyAdjacencyFactSourceKind::Cdp => "cdp",
            TopologyAdjacencyFactSourceKind::ConfigNeighbor => "config_neighbor",
            TopologyAdjacencyFactSourceKind::Manual => "manual",
        };

        let edge_id = format!(
            "topo-edge::{}::{}::{}::{}::{}",
            kind_str, lo_node, lo_iface, hi_node, hi_iface
        );

        // Check if edge already exists (collapse case).
        if let Some(existing) = edge_map.get_mut(&edge_id) {
            // Append evidence (dedupe identical strings).
            if !fact.evidence.is_empty() && !existing.evidence.contains(&fact.evidence) {
                existing.evidence.push(fact.evidence.clone());
            }
            stats.facts_collapsed_duplicate += 1;
        } else {
            // Create new edge.
            let (local_iface, remote_iface) = if lo_node == fact.local_node_id.as_str() {
                (
                    fact.local_interface.clone(),
                    fact.remote_interface.clone(),
                )
            } else {
                (
                    fact.remote_interface.clone(),
                    fact.local_interface.clone(),
                )
            };

            let evidence = if fact.evidence.is_empty() {
                Vec::new()
            } else {
                vec![fact.evidence.clone()]
            };

            let edge = TopologyEdge {
                id: edge_id.clone(),
                source_node_id: format!("topo::{}", lo_node),
                target_node_id: format!("topo::{}", hi_node),
                kind: match fact.source_kind {
                    TopologyAdjacencyFactSourceKind::Lldp => TopologyEdgeKind::Lldp,
                    TopologyAdjacencyFactSourceKind::Cdp => TopologyEdgeKind::Cdp,
                    TopologyAdjacencyFactSourceKind::ConfigNeighbor => TopologyEdgeKind::ConfigNeighbor,
                    TopologyAdjacencyFactSourceKind::Manual => TopologyEdgeKind::Manual,
                },
                confidence: None,
                source: TopologyEdgeSource::DiscoveryInventory,
                local_interface: local_iface,
                remote_interface: remote_iface,
                evidence,
            };

            edge_map.insert(edge_id, edge);
            stats.facts_accepted += 1;

            // Increment per-kind count.
            if let Some((_, count)) = stats.per_kind_counts.iter_mut().find(|(k, _)| *k == fact.source_kind) {
                *count += 1;
            }
        }
    }

    // Collect edges and sort by (kind ordinal, id).
    let mut edges: Vec<TopologyEdge> = edge_map.into_values().collect();
    edges.sort_by(|a, b| {
        let kind_ord = |ek: &TopologyEdgeKind| match ek {
            TopologyEdgeKind::Lldp => 0,
            TopologyEdgeKind::Cdp => 1,
            TopologyEdgeKind::ConfigNeighbor => 2,
            TopologyEdgeKind::Manual => 3,
        };
        let ord_a = kind_ord(&a.kind);
        let ord_b = kind_ord(&b.kind);
        if ord_a != ord_b {
            ord_a.cmp(&ord_b)
        } else {
            a.id.cmp(&b.id)
        }
    });

    (edges, stats)
}

/// Stateless engine. V1AJ has no projection state — same input → same output.
pub struct TopologyEngine;

impl TopologyEngine {
    pub fn new() -> Self {
        Self
    }

    /// V1AM — deterministic projection from Discovery records and link facts to a topology view.
    /// Pure function — no I/O, no clock, no random.
    /// Records must be iterated in given order so node order is stable.
    pub fn project_with_facts(
        &self,
        environment_id: Option<&str>,
        records: &[DiscoveryDeviceRecord],
        facts: &[TopologyLinkFact],
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

        let (edges, stats) = project_edges_from_link_facts(&nodes, facts);

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
            let link_text = if edge_count == 1 {
                format!("{} reliable link", edge_count)
            } else {
                format!("{} reliable links", edge_count)
            };
            format!(
                "topology has {} node{} from discovery inventory · {}",
                node_count,
                if node_count == 1 { "" } else { "s" },
                link_text
            )
        };

        let summary = TopologySummary {
            environment_id: environment_id.map(|s| s.to_string()),
            node_count,
            edge_count,
            source_record_count,
        };

        let adjacency_readiness = compute_adjacency_readiness(node_count, &stats.per_kind_counts);

        TopologyView {
            environment_id: environment_id.map(|s| s.to_string()),
            source_state,
            nodes,
            edges,
            summary,
            message,
            adjacency_readiness,
        }
    }

    /// Thin wrapper around `project_with_facts` with empty facts.
    /// Preserves V1AL zero-edge behaviour for backward compatibility.
    pub fn project(
        &self,
        environment_id: Option<&str>,
        records: &[DiscoveryDeviceRecord],
    ) -> TopologyView {
        self.project_with_facts(environment_id, records, &[])
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

    fn make_fact(
        source_kind: TopologyAdjacencyFactSourceKind,
        local_node_id: &str,
        remote_node_id: &str,
        local_interface: Option<&str>,
        remote_interface: Option<&str>,
        evidence: &str,
    ) -> TopologyLinkFact {
        TopologyLinkFact {
            source_kind,
            local_node_id: local_node_id.to_string(),
            remote_node_id: remote_node_id.to_string(),
            local_interface: local_interface.map(|s| s.to_string()),
            remote_interface: remote_interface.map(|s| s.to_string()),
            evidence: evidence.to_string(),
            source_label: None,
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

    // ────────────────────────────────────────────────────────────────
    // V1AL — Adjacency Readiness Tests
    // ────────────────────────────────────────────────────────────────

    #[test]
    fn adjacency_readiness_present_when_no_records() {
        let engine = TopologyEngine::new();
        let view = engine.project(Some("env"), &[]);
        assert_eq!(view.adjacency_readiness.eligible_node_count, 0);
        assert_eq!(
            view.adjacency_readiness.fact_source_state,
            TopologyAdjacencyFactSourceState::NoneAvailable
        );
        assert_eq!(view.adjacency_readiness.fact_sources.len(), 4);
        assert_eq!(view.adjacency_readiness.accepted_kinds.len(), 4);
        assert!(view.adjacency_readiness.reason.contains("no adjacency fact sources connected"));
        assert!(view.adjacency_readiness.reason.contains("edges remain empty"));
    }

    #[test]
    fn adjacency_readiness_eligible_count_matches_nodes_in_v1al() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("rec1", "env-a", Some("r1"), None, None),
            make_record("rec2", "env-a", Some("r2"), None, None),
            make_record("rec3", "env-a", Some("r3"), None, None),
        ];
        let view = engine.project(Some("env-a"), &records);
        assert_eq!(view.adjacency_readiness.eligible_node_count, 3);
        assert_eq!(view.nodes.len(), 3);
        assert_eq!(view.adjacency_readiness.eligible_node_count as usize, view.nodes.len());
    }

    #[test]
    fn adjacency_fact_sources_all_absent_in_v1al() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("rec1", "env-a", Some("r1"), None, None),
            make_record("rec2", "env-a", Some("r2"), None, None),
        ];
        let view = engine.project(Some("env-a"), &records);
        for source in &view.adjacency_readiness.fact_sources {
            assert!(!source.present, "source {:?} should not be present", source.kind);
            assert_eq!(source.count, 0, "source {:?} should have count 0", source.kind);
        }
    }

    #[test]
    fn adjacency_fact_source_state_is_none_available_in_v1al() {
        let engine = TopologyEngine::new();
        let record = make_record("rec1", "env-a", Some("router-1"), None, None);
        let view = engine.project(Some("env-a"), &[record]);
        assert_eq!(
            view.adjacency_readiness.fact_source_state,
            TopologyAdjacencyFactSourceState::NoneAvailable
        );
    }

    #[test]
    fn adjacency_fact_sources_ordered_stably() {
        let engine = TopologyEngine::new();
        let record = make_record("rec1", "env-a", Some("r1"), None, None);
        let view = engine.project(Some("env-a"), &[record]);
        // Fact sources must be: lldp, cdp, config_neighbor, manual (stable order)
        assert_eq!(
            view.adjacency_readiness.fact_sources[0].kind,
            TopologyAdjacencyFactSourceKind::Lldp
        );
        assert_eq!(
            view.adjacency_readiness.fact_sources[1].kind,
            TopologyAdjacencyFactSourceKind::Cdp
        );
        assert_eq!(
            view.adjacency_readiness.fact_sources[2].kind,
            TopologyAdjacencyFactSourceKind::ConfigNeighbor
        );
        assert_eq!(
            view.adjacency_readiness.fact_sources[3].kind,
            TopologyAdjacencyFactSourceKind::Manual
        );
        // Same order for accepted_kinds
        assert_eq!(
            view.adjacency_readiness.accepted_kinds[0],
            TopologyAdjacencyFactSourceKind::Lldp
        );
        assert_eq!(
            view.adjacency_readiness.accepted_kinds[1],
            TopologyAdjacencyFactSourceKind::Cdp
        );
        assert_eq!(
            view.adjacency_readiness.accepted_kinds[2],
            TopologyAdjacencyFactSourceKind::ConfigNeighbor
        );
        assert_eq!(
            view.adjacency_readiness.accepted_kinds[3],
            TopologyAdjacencyFactSourceKind::Manual
        );
    }

    #[test]
    fn adjacency_accepted_kinds_lists_all_four_categories() {
        let engine = TopologyEngine::new();
        let record = make_record("rec1", "env-a", Some("r1"), None, None);
        let view = engine.project(Some("env-a"), &[record]);
        assert_eq!(view.adjacency_readiness.accepted_kinds.len(), 4);
        let contains_lldp = view
            .adjacency_readiness
            .accepted_kinds
            .contains(&TopologyAdjacencyFactSourceKind::Lldp);
        let contains_cdp = view
            .adjacency_readiness
            .accepted_kinds
            .contains(&TopologyAdjacencyFactSourceKind::Cdp);
        let contains_config = view
            .adjacency_readiness
            .accepted_kinds
            .contains(&TopologyAdjacencyFactSourceKind::ConfigNeighbor);
        let contains_manual = view
            .adjacency_readiness
            .accepted_kinds
            .contains(&TopologyAdjacencyFactSourceKind::Manual);
        assert!(contains_lldp && contains_cdp && contains_config && contains_manual);
    }

    #[test]
    fn adjacency_reason_stable_string_when_none_available() {
        let engine = TopologyEngine::new();
        let record = make_record("rec1", "env-a", Some("r1"), None, None);
        let view = engine.project(Some("env-a"), &[record]);
        let reason = &view.adjacency_readiness.reason;
        assert_eq!(
            reason,
            "no adjacency fact sources connected — edges remain empty"
        );
    }

    #[test]
    fn adjacency_readiness_serialises_snake_case_state_and_kinds() {
        let state = TopologyAdjacencyFactSourceState::NoneAvailable;
        let s = serde_json::to_string(&state).expect("serialization failed");
        assert_eq!(s, "\"none_available\"");

        let state = TopologyAdjacencyFactSourceState::Partial;
        let s = serde_json::to_string(&state).expect("serialization failed");
        assert_eq!(s, "\"partial\"");

        let state = TopologyAdjacencyFactSourceState::Ready;
        let s = serde_json::to_string(&state).expect("serialization failed");
        assert_eq!(s, "\"ready\"");

        let kind = TopologyAdjacencyFactSourceKind::ConfigNeighbor;
        let s = serde_json::to_string(&kind).expect("serialization failed");
        assert_eq!(s, "\"config_neighbor\"");

        let kind = TopologyAdjacencyFactSourceKind::Lldp;
        let s = serde_json::to_string(&kind).expect("serialization failed");
        assert_eq!(s, "\"lldp\"");
    }

    #[test]
    fn adjacency_readiness_is_deterministic_across_calls() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("rec1", "env-a", Some("r1"), None, None),
            make_record("rec2", "env-a", Some("r2"), None, None),
        ];
        let view1 = engine.project(Some("env-a"), &records);
        let view2 = engine.project(Some("env-a"), &records);
        assert_eq!(
            view1.adjacency_readiness,
            view2.adjacency_readiness,
            "adjacent readiness must be deterministic"
        );
    }

    #[test]
    fn adjacency_readiness_does_not_invent_edges() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("rec1", "env-a", Some("r1"), None, None),
            make_record("rec2", "env-a", Some("r2"), None, None),
            make_record("rec3", "env-a", Some("r3"), None, None),
        ];
        let view = engine.project(Some("env-a"), &records);
        assert!(view.edges.is_empty(), "edges must remain empty");
        assert_eq!(view.summary.edge_count, 0);
        for source in &view.adjacency_readiness.fact_sources {
            assert_eq!(
                source.count, 0,
                "fact source {:?} must have count 0 in V1AL",
                source.kind
            );
        }
    }

    // ────────────────────────────────────────────────────────────────
    // V1AM — Link Fact Pipeline Tests
    // ────────────────────────────────────────────────────────────────

    #[test]
    fn no_facts_produces_zero_edges_and_none_available_readiness() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("rec1", "env-a", Some("r1"), None, None),
            make_record("rec2", "env-a", Some("r2"), None, None),
        ];
        let view = engine.project_with_facts(Some("env-a"), &records, &[]);
        assert!(view.edges.is_empty());
        assert_eq!(view.summary.edge_count, 0);
        assert_eq!(
            view.adjacency_readiness.fact_source_state,
            TopologyAdjacencyFactSourceState::NoneAvailable
        );
        for source in &view.adjacency_readiness.fact_sources {
            assert!(!source.present);
            assert_eq!(source.count, 0);
        }
    }

    #[test]
    fn one_lldp_fact_between_known_nodes_creates_one_edge_and_partial_readiness() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let facts = vec![make_fact(
            TopologyAdjacencyFactSourceKind::Lldp,
            "node1",
            "node2",
            Some("eth0"),
            Some("eth1"),
            "lldp discovered",
        )];
        let view = engine.project_with_facts(Some("env-a"), &records, &facts);
        assert_eq!(view.edges.len(), 1);
        assert_eq!(view.edges[0].kind, TopologyEdgeKind::Lldp);
        assert_eq!(
            view.adjacency_readiness.fact_source_state,
            TopologyAdjacencyFactSourceState::Partial
        );
        let lldp_source = view
            .adjacency_readiness
            .fact_sources
            .iter()
            .find(|s| s.kind == TopologyAdjacencyFactSourceKind::Lldp)
            .unwrap();
        assert!(lldp_source.present);
        assert_eq!(lldp_source.count, 1);
    }

    #[test]
    fn one_cdp_fact_increments_cdp_source_count() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let facts = vec![make_fact(
            TopologyAdjacencyFactSourceKind::Cdp,
            "node1",
            "node2",
            None,
            None,
            "cdp discovered",
        )];
        let view = engine.project_with_facts(Some("env-a"), &records, &facts);
        assert_eq!(view.edges.len(), 1);
        let cdp_source = view
            .adjacency_readiness
            .fact_sources
            .iter()
            .find(|s| s.kind == TopologyAdjacencyFactSourceKind::Cdp)
            .unwrap();
        assert!(cdp_source.present);
        assert_eq!(cdp_source.count, 1);
    }

    #[test]
    fn one_config_neighbor_fact_creates_source_count() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let facts = vec![make_fact(
            TopologyAdjacencyFactSourceKind::ConfigNeighbor,
            "node1",
            "node2",
            None,
            None,
            "config derived",
        )];
        let view = engine.project_with_facts(Some("env-a"), &records, &facts);
        assert_eq!(view.edges.len(), 1);
        let config_source = view
            .adjacency_readiness
            .fact_sources
            .iter()
            .find(|s| s.kind == TopologyAdjacencyFactSourceKind::ConfigNeighbor)
            .unwrap();
        assert!(config_source.present);
        assert_eq!(config_source.count, 1);
    }

    #[test]
    fn one_manual_fact_creates_source_count() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let facts = vec![make_fact(
            TopologyAdjacencyFactSourceKind::Manual,
            "node1",
            "node2",
            None,
            None,
            "manual entry",
        )];
        let view = engine.project_with_facts(Some("env-a"), &records, &facts);
        assert_eq!(view.edges.len(), 1);
        let manual_source = view
            .adjacency_readiness
            .fact_sources
            .iter()
            .find(|s| s.kind == TopologyAdjacencyFactSourceKind::Manual)
            .unwrap();
        assert!(manual_source.present);
        assert_eq!(manual_source.count, 1);
    }

    #[test]
    fn duplicate_facts_collapse_deterministically() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let fact = make_fact(
            TopologyAdjacencyFactSourceKind::Lldp,
            "node1",
            "node2",
            Some("eth0"),
            Some("eth1"),
            "evidence1",
        );
        let facts = vec![fact.clone(), fact.clone()];
        let view = engine.project_with_facts(Some("env-a"), &records, &facts);
        assert_eq!(view.edges.len(), 1);
        assert_eq!(view.edges[0].evidence.len(), 1); // dedupe identical
        let lldp_source = view
            .adjacency_readiness
            .fact_sources
            .iter()
            .find(|s| s.kind == TopologyAdjacencyFactSourceKind::Lldp)
            .unwrap();
        // facts_accepted=1, facts_collapsed_duplicate=1 (the second fact was collapsed)
        assert_eq!(lldp_source.count, 1);
    }

    #[test]
    fn reversed_symmetric_facts_collapse_to_single_edge() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let fact_a = make_fact(
            TopologyAdjacencyFactSourceKind::Lldp,
            "node1",
            "node2",
            Some("eth0"),
            Some("eth1"),
            "lldp from node1",
        );
        let fact_b = make_fact(
            TopologyAdjacencyFactSourceKind::Lldp,
            "node2",
            "node1",
            Some("eth1"),
            Some("eth0"),
            "lldp from node2",
        );
        let facts = vec![fact_a, fact_b];
        let view = engine.project_with_facts(Some("env-a"), &records, &facts);
        assert_eq!(view.edges.len(), 1);
        // Both evidence strings should be in the edge (different, so not deduped).
        assert_eq!(view.edges[0].evidence.len(), 2);
    }

    #[test]
    fn unknown_local_node_ref_rejected() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let fact = make_fact(
            TopologyAdjacencyFactSourceKind::Lldp,
            "ghost",
            "node2",
            None,
            None,
            "ghost to node2",
        );
        let view = engine.project_with_facts(Some("env-a"), &records, &[fact]);
        assert!(view.edges.is_empty());
        let lldp_source = view
            .adjacency_readiness
            .fact_sources
            .iter()
            .find(|s| s.kind == TopologyAdjacencyFactSourceKind::Lldp)
            .unwrap();
        assert_eq!(lldp_source.count, 0); // rejected, not counted
    }

    #[test]
    fn unknown_remote_node_ref_rejected() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let fact = make_fact(
            TopologyAdjacencyFactSourceKind::Lldp,
            "node1",
            "ghost",
            None,
            None,
            "node1 to ghost",
        );
        let view = engine.project_with_facts(Some("env-a"), &records, &[fact]);
        assert!(view.edges.is_empty());
        let lldp_source = view
            .adjacency_readiness
            .fact_sources
            .iter()
            .find(|s| s.kind == TopologyAdjacencyFactSourceKind::Lldp)
            .unwrap();
        assert_eq!(lldp_source.count, 0);
    }

    #[test]
    fn self_link_rejected() {
        let engine = TopologyEngine::new();
        let records = vec![make_record("node1", "env-a", Some("r1"), None, None)];
        let fact = make_fact(
            TopologyAdjacencyFactSourceKind::Lldp,
            "node1",
            "node1",
            None,
            None,
            "self-link",
        );
        let view = engine.project_with_facts(Some("env-a"), &records, &[fact]);
        assert!(view.edges.is_empty());
        let lldp_source = view
            .adjacency_readiness
            .fact_sources
            .iter()
            .find(|s| s.kind == TopologyAdjacencyFactSourceKind::Lldp)
            .unwrap();
        assert_eq!(lldp_source.count, 0);
    }

    #[test]
    fn edge_id_and_order_deterministic_across_runs() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
            make_record("node3", "env-a", Some("r3"), None, None),
        ];
        let facts = vec![
            make_fact(
                TopologyAdjacencyFactSourceKind::Lldp,
                "node1",
                "node2",
                None,
                None,
                "lldp",
            ),
            make_fact(
                TopologyAdjacencyFactSourceKind::Cdp,
                "node2",
                "node3",
                None,
                None,
                "cdp",
            ),
            make_fact(
                TopologyAdjacencyFactSourceKind::Manual,
                "node1",
                "node3",
                None,
                None,
                "manual",
            ),
        ];
        let view1 = engine.project_with_facts(Some("env-a"), &records, &facts);
        let view2 = engine.project_with_facts(Some("env-a"), &records, &facts);
        assert_eq!(view1.edges, view2.edges, "edges must be identical across runs");
        // Verify order: lldp < cdp < manual by (kind ordinal, id)
        assert_eq!(view1.edges[0].kind, TopologyEdgeKind::Lldp);
        assert_eq!(view1.edges[1].kind, TopologyEdgeKind::Cdp);
        assert_eq!(view1.edges[2].kind, TopologyEdgeKind::Manual);
    }

    #[test]
    fn all_four_kinds_present_yields_ready_state() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let facts = vec![
            make_fact(
                TopologyAdjacencyFactSourceKind::Lldp,
                "node1",
                "node2",
                None,
                None,
                "lldp",
            ),
            make_fact(
                TopologyAdjacencyFactSourceKind::Cdp,
                "node2",
                "node1",
                None,
                None,
                "cdp",
            ),
            make_fact(
                TopologyAdjacencyFactSourceKind::ConfigNeighbor,
                "node1",
                "node2",
                None,
                None,
                "config",
            ),
            make_fact(
                TopologyAdjacencyFactSourceKind::Manual,
                "node2",
                "node1",
                None,
                None,
                "manual",
            ),
        ];
        let view = engine.project_with_facts(Some("env-a"), &records, &facts);
        assert_eq!(
            view.adjacency_readiness.fact_source_state,
            TopologyAdjacencyFactSourceState::Ready
        );
        // 4 edges (or 2 if cdp/config/manual collapse with lldp by ID, but they shouldn't given different kinds).
        // Each kind creates a unique edge due to kind_str in ID.
        assert_eq!(view.edges.len(), 4);
    }

    #[test]
    fn project_no_args_preserves_v1al_zero_edge_behaviour() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let view = engine.project(Some("env-a"), &records);
        assert!(view.edges.is_empty());
        assert!(view.message.contains("0 reliable links"));
        assert_eq!(
            view.adjacency_readiness.fact_source_state,
            TopologyAdjacencyFactSourceState::NoneAvailable
        );
    }

    #[test]
    fn topology_link_fact_serialises_snake_case() {
        let fact = TopologyLinkFact {
            source_kind: TopologyAdjacencyFactSourceKind::Lldp,
            local_node_id: "node1".to_string(),
            remote_node_id: "node2".to_string(),
            local_interface: Some("eth0".to_string()),
            remote_interface: Some("eth1".to_string()),
            evidence: "test evidence".to_string(),
            source_label: Some("test label".to_string()),
        };
        let json = serde_json::to_value(&fact).expect("serialization failed");
        let obj = json.as_object().expect("value must be an object");
        assert!(obj.contains_key("source_kind"));
        assert!(obj.contains_key("local_node_id"));
        assert!(obj.contains_key("remote_node_id"));
        assert!(obj.contains_key("local_interface"));
        assert!(obj.contains_key("remote_interface"));
        assert!(obj.contains_key("evidence"));
        assert!(obj.contains_key("source_label"));
    }

    #[test]
    fn topology_edge_carries_evidence_and_interfaces_when_from_fact() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let facts = vec![make_fact(
            TopologyAdjacencyFactSourceKind::Lldp,
            "node1",
            "node2",
            Some("eth0"),
            Some("eth1"),
            "test evidence",
        )];
        let view = engine.project_with_facts(Some("env-a"), &records, &facts);
        assert_eq!(view.edges.len(), 1);
        let edge = &view.edges[0];
        assert_eq!(edge.local_interface, Some("eth0".to_string()));
        assert_eq!(edge.remote_interface, Some("eth1".to_string()));
        assert!(edge.evidence.contains(&"test evidence".to_string()));
    }

    #[test]
    fn partial_readiness_reason_reports_count() {
        let engine = TopologyEngine::new();
        let records = vec![
            make_record("node1", "env-a", Some("r1"), None, None),
            make_record("node2", "env-a", Some("r2"), None, None),
        ];
        let facts = vec![
            make_fact(
                TopologyAdjacencyFactSourceKind::Lldp,
                "node1",
                "node2",
                None,
                None,
                "lldp",
            ),
            make_fact(
                TopologyAdjacencyFactSourceKind::Cdp,
                "node2",
                "node1",
                None,
                None,
                "cdp",
            ),
        ];
        let view = engine.project_with_facts(Some("env-a"), &records, &facts);
        assert_eq!(
            view.adjacency_readiness.fact_source_state,
            TopologyAdjacencyFactSourceState::Partial
        );
        assert!(view.adjacency_readiness.reason.contains("2 of 4"));
    }
}
