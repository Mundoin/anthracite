/**
 * B1.3 — Topology Readiness Package.
 *
 * Pre-topology contract artifact that projects a LocalEnvironmentRecord
 * into a minimal readiness summary for tomorrow's topology session.
 *
 * Pure projection. No side effects. Deterministic.
 */

import type { LocalEnvironmentRecord } from "../types/localEnvironment";
import { activeRecordToGraphReadyView } from "./labTopologyActivation";

export interface TopologyReadinessPackage {
  readonly ready: boolean;
  readonly device_count: number;
  readonly link_count: number;
  readonly endpoints_valid: boolean;
  readonly source: string;
  readonly data_source_label: string;
  readonly graph_projection_available: boolean;
  readonly blockers: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Creates a topology readiness package from a LocalEnvironmentRecord.
 *
 * Projects the record into a minimal artifact describing whether topology
 * rendering can proceed, along with device/link counts and data provenance.
 *
 * @param record - The environment record, or null/undefined
 * @returns A topology readiness package
 */
export function createTopologyReadinessPackage(
  record: LocalEnvironmentRecord | null | undefined
): TopologyReadinessPackage {
  // Handle null/archived
  if (!record) {
    return {
      ready: false,
      device_count: 0,
      link_count: 0,
      endpoints_valid: false,
      source: "",
      data_source_label: "simulated",
      graph_projection_available: false,
      blockers: Object.freeze(["no_active_environment: No active environment"]),
      warnings: Object.freeze([]),
    };
  }

  if (record.lifecycle_state === "archived") {
    return {
      ready: false,
      device_count: record.lab_payload.devices.length,
      link_count: record.lab_payload.links.length,
      endpoints_valid: false,
      source: record.provenance,
      data_source_label: deriveDataSourceLabel(record),
      graph_projection_available: false,
      blockers: Object.freeze(["environment_archived: Environment is archived"]),
      warnings: Object.freeze([]),
    };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  const device_count = record.lab_payload.devices.length;
  const link_count = record.lab_payload.links.length;

  // Check endpoints validity
  let endpoints_valid = true;
  const deviceIds = new Set(record.lab_payload.devices.map((d) => d.id));

  for (const link of record.lab_payload.links) {
    // Check endpoint devices exist
    if (
      !deviceIds.has(link.endpoint_a_device_id) ||
      !deviceIds.has(link.endpoint_b_device_id)
    ) {
      endpoints_valid = false;
      blockers.push(
        `endpoints_valid: Link ${link.id} has endpoint device ids that do not resolve`
      );
      break;
    }

    // Check endpoint interfaces exist
    const deviceA = record.lab_payload.devices.find(
      (d) => d.id === link.endpoint_a_device_id
    );
    const deviceB = record.lab_payload.devices.find(
      (d) => d.id === link.endpoint_b_device_id
    );

    if (deviceA) {
      const interfaceA = deviceA.interfaces.find(
        (i) => i.id === link.endpoint_a_interface_id
      );
      if (!interfaceA) {
        endpoints_valid = false;
        blockers.push(
          `endpoints_valid: Link ${link.id} endpoint_a_interface_id does not resolve`
        );
        break;
      }
    }

    if (deviceB) {
      const interfaceB = deviceB.interfaces.find(
        (i) => i.id === link.endpoint_b_interface_id
      );
      if (!interfaceB) {
        endpoints_valid = false;
        blockers.push(
          `endpoints_valid: Link ${link.id} endpoint_b_interface_id does not resolve`
        );
        break;
      }
    }
  }

  // Check graph projection availability
  const graphView = activeRecordToGraphReadyView(record);
  const graph_projection_available = graphView !== null;

  // Derive data source label
  const data_source_label = deriveDataSourceLabel(record);

  // Determine overall readiness
  const ready =
    endpoints_valid &&
    graph_projection_available &&
    device_count > 0 &&
    link_count > 0;

  if (!ready) {
    if (!endpoints_valid) {
      // Already added to blockers above
    }
    if (!graph_projection_available) {
      blockers.push(
        "graph_projection_available: Cannot project environment into topology graph"
      );
    }
    if (device_count === 0) {
      blockers.push("device_count: Lab must have at least one device");
    }
    if (link_count === 0) {
      blockers.push("link_count: Lab must have at least one link");
    }
  }

  return {
    ready,
    device_count,
    link_count,
    endpoints_valid,
    source: record.provenance,
    data_source_label,
    graph_projection_available,
    blockers: Object.freeze(blockers),
    warnings: Object.freeze(warnings),
  };
}

/**
 * Derives the data source label from record metadata.
 *
 * Maps provenance and kind to canonical labels:
 * - "generated-lab" / "synthetic" / "fabricated" → "simulated"
 * - other / unknown → "simulated" (defensive default)
 */
function deriveDataSourceLabel(record: LocalEnvironmentRecord): string {
  if (
    record.provenance === "generated-lab" ||
    record.provenance === "synthetic" ||
    record.provenance === "fabricated"
  ) {
    return "simulated";
  }

  if (
    record.kind === "generated-lab" ||
    record.kind === "fabricated"
  ) {
    return "simulated";
  }

  // Defensive default
  return "simulated";
}
