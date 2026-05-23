/**
 * B1.2 — Environment Readiness Evaluator.
 *
 * Pure validator that assesses a LocalEnvironmentRecord against 7 readiness rules:
 * - inventory_ready
 * - links_ready
 * - interfaces_ready
 * - addressing_ready
 * - configs_ready
 * - sync_ready
 * - topology_data_ready
 *
 * Returns a structured verdict with boolean rule checks, blockers, warnings, and summary.
 *
 * No side effects. Deterministic.
 */

import type { LocalEnvironmentRecord } from "../types/localEnvironment";

export type EnvironmentReadinessRuleId =
  | "inventory_ready"
  | "links_ready"
  | "interfaces_ready"
  | "addressing_ready"
  | "configs_ready"
  | "sync_ready"
  | "topology_data_ready";

export interface EnvironmentReadinessVerdict {
  readonly ready: boolean;
  readonly rules: Readonly<Record<EnvironmentReadinessRuleId, boolean>>;
  readonly warnings: ReadonlyArray<string>;
  readonly blockers: ReadonlyArray<string>;
  readonly summary: string;
}

/**
 * Evaluates readiness of a LocalEnvironmentRecord.
 *
 * @param record - The environment record to evaluate, or null/undefined
 * @returns A readiness verdict with rule checks, blockers, warnings, and summary
 */
export function evaluateEnvironmentReadiness(
  record: LocalEnvironmentRecord | null | undefined
): EnvironmentReadinessVerdict {
  // Handle null/undefined
  if (!record) {
    return {
      ready: false,
      rules: {
        inventory_ready: false,
        links_ready: false,
        interfaces_ready: false,
        addressing_ready: false,
        configs_ready: false,
        sync_ready: false,
        topology_data_ready: false,
      },
      warnings: [],
      blockers: ["no_active_environment: No active environment"],
      summary: "No active environment",
    };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  // Rule 1: inventory_ready
  const inventory_ready =
    record.lab_payload.devices.length > 0 &&
    record.lab_payload.devices.every(
      (device) =>
        device.id &&
        device.hostname &&
        device.vendor &&
        device.device_class &&
        device.platform_id
    );
  if (!inventory_ready) {
    blockers.push(
      "inventory_ready: Lab must have at least one device with id, hostname, vendor, device_class, and platform_id"
    );
  }

  // Rule 2: links_ready
  let links_ready = true;
  if (record.lab_payload.links.length === 0) {
    links_ready = false;
    blockers.push("links_ready: Lab must have at least one link");
  } else {
    // Verify every link endpoint device id resolves to a device
    const deviceIds = new Set(record.lab_payload.devices.map((d) => d.id));
    for (const link of record.lab_payload.links) {
      if (
        !deviceIds.has(link.endpoint_a_device_id) ||
        !deviceIds.has(link.endpoint_b_device_id)
      ) {
        links_ready = false;
        blockers.push(
          `links_ready: Link ${link.id} has endpoint device id that does not resolve to a device`
        );
        break;
      }
    }
  }

  // Rule 3: interfaces_ready
  let interfaces_ready = true;
  for (const link of record.lab_payload.links) {
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
        interfaces_ready = false;
        blockers.push(
          `interfaces_ready: Link ${link.id} endpoint_a_interface_id does not resolve to an interface on device ${deviceA.id}`
        );
        break;
      }
    }

    if (deviceB) {
      const interfaceB = deviceB.interfaces.find(
        (i) => i.id === link.endpoint_b_interface_id
      );
      if (!interfaceB) {
        interfaces_ready = false;
        blockers.push(
          `interfaces_ready: Link ${link.id} endpoint_b_interface_id does not resolve to an interface on device ${deviceB.id}`
        );
        break;
      }
    }
  }

  // Rule 4: addressing_ready
  let addressing_ready = true;
  const issues: string[] = [];

  if (!record.lab_payload.address_plan.management_subnet) {
    issues.push("missing management_subnet");
  }
  if (!record.lab_payload.address_plan.loopback_subnet) {
    issues.push("missing loopback_subnet");
  }
  if (!record.lab_payload.address_plan.transit_subnet) {
    issues.push("missing transit_subnet");
  }

  // Check for duplicate management IPs
  const mgmtIps = new Set<string>();
  for (const device of record.lab_payload.devices) {
    if (device.management_ip?.address) {
      if (mgmtIps.has(device.management_ip.address)) {
        issues.push(
          `duplicate management_ip: ${device.management_ip.address}`
        );
        addressing_ready = false;
      }
      mgmtIps.add(device.management_ip.address);
    }
  }

  if (issues.length > 0) {
    addressing_ready = false;
    blockers.push(`addressing_ready: ${issues.join("; ")}`);
  }

  // Rule 5: configs_ready
  let configs_ready = record.lab_payload.configs.length > 0;
  if (!configs_ready) {
    blockers.push("configs_ready: Lab must have at least one config");
  } else {
    // Warn if any device has no config
    const devicesWithConfigs = new Set(
      record.lab_payload.configs.map((c) => c.device_id)
    );
    for (const device of record.lab_payload.devices) {
      if (
        !devicesWithConfigs.has(device.id) &&
        !device.platform_id.includes("generic")
      ) {
        warnings.push(
          `configs_ready: Device ${device.hostname} (${device.id}) has no config`
        );
      }
    }
  }

  // Rule 6: sync_ready
  const sync_ready =
    !!record.environment_uid &&
    record.revision >= 1 &&
    !!record.sync_state;
  if (!sync_ready) {
    const syncIssues: string[] = [];
    if (!record.environment_uid) {
      syncIssues.push("missing environment_uid");
    }
    if (record.revision < 1) {
      syncIssues.push(`revision is ${record.revision} (must be >= 1)`);
    }
    if (!record.sync_state) {
      syncIssues.push("missing sync_state");
    }
    blockers.push(`sync_ready: ${syncIssues.join("; ")}`);
  }

  // Rule 7: topology_data_ready
  // Composite: inventory_ready AND links_ready AND interfaces_ready AND provenance present
  const topology_data_ready =
    inventory_ready &&
    links_ready &&
    interfaces_ready &&
    !!record.provenance;
  if (!topology_data_ready) {
    const topoIssues: string[] = [];
    if (!inventory_ready) {
      topoIssues.push("inventory_ready=false");
    }
    if (!links_ready) {
      topoIssues.push("links_ready=false");
    }
    if (!interfaces_ready) {
      topoIssues.push("interfaces_ready=false");
    }
    if (!record.provenance) {
      topoIssues.push("missing provenance");
    }
    blockers.push(`topology_data_ready: ${topoIssues.join("; ")}`);
  }

  // Determine overall readiness
  const overallReady =
    inventory_ready &&
    links_ready &&
    interfaces_ready &&
    addressing_ready &&
    configs_ready &&
    sync_ready &&
    topology_data_ready;

  // Build summary
  let summary: string;
  if (overallReady) {
    summary = "Environment is ready for topology activation";
  } else if (blockers.length > 0) {
    const failedRules = [
      !inventory_ready && "inventory",
      !links_ready && "links",
      !interfaces_ready && "interfaces",
      !addressing_ready && "addressing",
      !configs_ready && "configs",
      !sync_ready && "sync",
      !topology_data_ready && "topology_data",
    ]
      .filter((x) => x)
      .join(", ");
    summary = `Environment not ready: ${failedRules} checks failed`;
  } else {
    summary = "Environment has warnings but may be usable";
  }

  return {
    ready: overallReady,
    rules: {
      inventory_ready,
      links_ready,
      interfaces_ready,
      addressing_ready,
      configs_ready,
      sync_ready,
      topology_data_ready,
    },
    warnings: Object.freeze(warnings),
    blockers: Object.freeze(blockers),
    summary,
  };
}
