/**
 * Typed Tauri command wrappers for the Topology Engine.
 *
 * Keep names aligned with `src-tauri/src/commands/topology.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  TopologyView,
  TopologyNeighborEvidence,
  TopologyEvidenceSet,
  RawNeighborEvidenceImportRequest,
  RawNeighborEvidenceImportResult,
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
 * V1AO — import persisted neighbor evidence into the topology engine for
 * a given environment. Returns the evidence set metadata and count of
 * successfully stored records.
 */
export async function importTopologyNeighborEvidence(
  environmentId: string,
  evidence: readonly TopologyNeighborEvidence[],
  sourceLabel: string | null,
): Promise<TopologyEvidenceSet> {
  return invoke<TopologyEvidenceSet>("import_topology_neighbor_evidence", {
    environmentId,
    evidence,
    sourceLabel,
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
 * V1AO — clear all persisted neighbor evidence for a given environment.
 * Idempotent — succeeds even if no evidence exists.
 */
export async function clearTopologyNeighborEvidence(
  environmentId: string,
): Promise<void> {
  return invoke<void>("clear_topology_neighbor_evidence", { environmentId });
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
