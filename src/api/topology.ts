/**
 * Typed Tauri command wrappers for the Topology Engine.
 *
 * Keep names aligned with `src-tauri/src/commands/topology.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  TopologyView,
  TopologyNeighborEvidence,
  RawNeighborEvidenceImportRequest,
  RawNeighborEvidenceImportResult,
  TopologyEvidenceImportMode,
  TopologyEvidenceMutationResult,
  TopologyEvidenceSummary,
} from "../types/topology";

/**
 * V1AJ — fetch the deterministic Topology read model for the given
 * environment scope. Projects persisted Discovery records into nodes.
 * Edges are empty until reliable link facts land.
 */
export async function getTopologyView(
  environmentId?: string | null,
): Promise<TopologyView> {
  return invoke<TopologyView>("get_topology_view", {
    environmentId: environmentId ?? null,
  });
}

/**
 * V1AO/V1AR — import persisted neighbor evidence into the topology engine for
 * a given environment. Returns mutation result with counts and metadata.
 * Mode defaults to "replace" if null.
 */
export async function importTopologyNeighborEvidence(
  environmentId: string,
  evidence: readonly TopologyNeighborEvidence[],
  sourceLabel: string | null,
  mode: TopologyEvidenceImportMode | null = null,
): Promise<TopologyEvidenceMutationResult> {
  return invoke<TopologyEvidenceMutationResult>("import_topology_neighbor_evidence", {
    environmentId,
    evidence,
    sourceLabel,
    mode,
  });
}

/**
 * V1AO — retrieve persisted neighbor evidence for a given environment.
 * Returns the full set of evidence records currently stored.
 */
export async function getTopologyNeighborEvidence(
  environmentId: string,
): Promise<readonly TopologyNeighborEvidence[]> {
  return invoke<readonly TopologyNeighborEvidence[]>(
    "get_topology_neighbor_evidence",
    { environmentId },
  );
}

/**
 * V1AO/V1AR — clear all persisted neighbor evidence for a given environment.
 * Idempotent — succeeds even if no evidence exists. Returns mutation result.
 */
export async function clearTopologyNeighborEvidence(
  environmentId: string,
): Promise<TopologyEvidenceMutationResult> {
  return invoke<TopologyEvidenceMutationResult>("clear_topology_neighbor_evidence", { environmentId });
}

/**
 * V1AP — import raw neighbour output (LLDP/CDP) text into the topology engine
 * for a given environment. Parses, validates, and returns acceptance/rejection breakdown.
 */
export async function importTopologyNeighborOutput(
  request: RawNeighborEvidenceImportRequest,
): Promise<RawNeighborEvidenceImportResult> {
  return invoke<RawNeighborEvidenceImportResult>("import_topology_neighbor_output", {
    request,
  });
}

/**
 * V1AR — retrieve summary metadata for persisted neighbor evidence in a given
 * environment. Returns counts, source labels, and evidence set metadata.
 */
export async function getTopologyEvidenceSummary(
  environmentId: string,
): Promise<TopologyEvidenceSummary> {
  return invoke<TopologyEvidenceSummary>("get_topology_evidence_summary", { environmentId });
}
