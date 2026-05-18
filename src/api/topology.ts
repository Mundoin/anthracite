/**
 * Typed Tauri command wrappers for the Topology Engine.
 *
 * Keep names aligned with `src-tauri/src/commands/topology.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type { TopologyView } from "../types/topology";

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
