/**
 * V1BW — Pure topology state counting.
 *
 * Counts device + link operational states across a GraphReadyTopologyView.
 * Healthy = baseline. Affected = everything else.
 *
 * No I/O, no DOM, no React. Deterministic for unit tests.
 */

import type { GraphReadyTopologyView } from "../topologyReview";
import type { LabOperationalState } from "../../../types/labEnvironment";

export const STATE_ORDER: readonly LabOperationalState[] = [
  "healthy",
  "warning",
  "degraded",
  "down",
  "maintenance",
  "unknown",
] as const;

export type StateCountMap = Record<LabOperationalState, number>;

export interface TopologyStateCounts {
  readonly devices: StateCountMap;
  readonly links: StateCountMap;
  readonly affected_devices: number;   // sum of non-healthy device states
  readonly affected_links: number;     // sum of non-healthy link states
}

function emptyCounts(): StateCountMap {
  return { healthy: 0, warning: 0, degraded: 0, down: 0, maintenance: 0, unknown: 0 };
}

export function computeStateCounts(view: GraphReadyTopologyView): TopologyStateCounts {
  const devices = emptyCounts();
  for (const n of view.nodes) {
    devices[n.operational_state ?? "healthy"] += 1;
  }
  const links = emptyCounts();
  for (const e of view.edges) {
    links[e.operational_state ?? "healthy"] += 1;
  }
  const affected_devices =
    devices.warning + devices.degraded + devices.down + devices.maintenance + devices.unknown;
  const affected_links =
    links.warning + links.degraded + links.down + links.maintenance + links.unknown;
  return { devices, links, affected_devices, affected_links };
}

export function formatStateLabel(state: LabOperationalState): string {
  switch (state) {
    case "healthy":     return "Healthy";
    case "warning":     return "Warning";
    case "degraded":    return "Degraded";
    case "down":        return "Down";
    case "maintenance": return "Maintenance";
    case "unknown":     return "Unknown";
  }
}
