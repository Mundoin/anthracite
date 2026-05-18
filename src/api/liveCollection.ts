/**
 * Typed Tauri command wrapper for the V1AT Live Collection planning
 * surface. Planning only — no device contact, no credentials, no
 * polling, no store mutation.
 *
 * Keep names aligned with `src-tauri/src/commands/live_collection.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  LiveCollectionDryRunPlan,
  LiveCollectionDryRunRequest,
} from "../types/liveCollection";

/**
 * V1AT — return a deterministic dry-run plan for a future live
 * neighbour collection. No SSH session is opened; no command is
 * executed. The plan is for operator review only.
 */
export async function planLiveTopologyCollection(
  request: LiveCollectionDryRunRequest,
): Promise<LiveCollectionDryRunPlan> {
  return invoke<LiveCollectionDryRunPlan>(
    "plan_live_topology_collection_cmd",
    { request },
  );
}
