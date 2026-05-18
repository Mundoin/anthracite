//! Tauri commands for the Topology Engine.
//!
//! V1AJ: composes Discovery + Topology engines. Topology consumes
//! Discovery's `inventory_view` and projects to a typed read model.
//! Dependency direction: Topology reads Discovery; Discovery never
//! references Topology.
//!
//! V1AO: add evidence store for live topology edges.

use crate::engines::discovery::DiscoveryEngine;
use crate::engines::topology::{TopologyEngine, TopologyNeighborEvidence, TopologyView};
use crate::engines::topology_evidence_store::{TopologyEvidenceStore, TopologyEvidenceSet};
use crate::engines::topology_neighbor_output::{RawNeighborEvidenceImportRequest, RawNeighborEvidenceImportResult};
use tauri::State;

#[tauri::command]
pub fn get_topology_view(
    topology: State<'_, TopologyEngine>,
    discovery: State<'_, DiscoveryEngine>,
    evidence_store: State<'_, Box<dyn TopologyEvidenceStore>>,
    environment_id: Option<String>,
) -> TopologyView {
    let inventory = discovery.inventory_view(environment_id.as_deref());
    let evidence = match &environment_id {
        Some(env) => evidence_store.load(env),
        None => Vec::new(),
    };
    topology.project_with_neighbor_evidence(environment_id.as_deref(), &inventory.records, &evidence)
}

#[tauri::command]
pub fn import_topology_neighbor_evidence(
    evidence_store: State<'_, Box<dyn TopologyEvidenceStore>>,
    environment_id: String,
    evidence: Vec<TopologyNeighborEvidence>,
    source_label: Option<String>,
) -> Result<TopologyEvidenceSet, String> {
    evidence_store
        .store(&environment_id, evidence, source_label)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_topology_neighbor_evidence(
    evidence_store: State<'_, Box<dyn TopologyEvidenceStore>>,
    environment_id: String,
) -> Vec<TopologyNeighborEvidence> {
    evidence_store.load(&environment_id)
}

#[tauri::command]
pub fn clear_topology_neighbor_evidence(
    evidence_store: State<'_, Box<dyn TopologyEvidenceStore>>,
    environment_id: String,
) -> Result<(), String> {
    evidence_store.clear(&environment_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_topology_neighbor_output(
    discovery: State<'_, DiscoveryEngine>,
    evidence_store: State<'_, Box<dyn TopologyEvidenceStore>>,
    request: RawNeighborEvidenceImportRequest,
) -> Result<RawNeighborEvidenceImportResult, String> {
    let inventory = discovery.inventory_view(Some(&request.environment_id));
    crate::engines::topology_neighbor_output::import_raw_neighbor_output(
        &request,
        &inventory.records,
        evidence_store.as_ref(),
    )
    .map_err(|e| e.to_string())
}
