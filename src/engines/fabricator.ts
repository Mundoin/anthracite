/**
 * Fabricator Engine (D4A).
 *
 * Deterministic synthetic environment generator. No I/O, no randomness,
 * no timestamps. Same input (none) → same output, always.
 *
 * Output is tagged provenance: "fabricated" throughout. This is the seam
 * that D4B (environment wiring) and D4C (topology canvas) will consume.
 */

import type {
  FabricatorEnvironment,
  FabricatedDevice,
  FabricatedLink,
} from "../types/fabricator";
import { getScenarioById } from "../data/scenarioCatalogue";

const DEVICES: readonly FabricatedDevice[] = [
  {
    id: "fab-dev-001",
    name: "core-sw-01",
    vendor: "cisco",
    platform: "ios-xe",
    role_hint: "device",
    source: "fabricated",
  },
  {
    id: "fab-dev-002",
    name: "core-sw-02",
    vendor: "cisco",
    platform: "ios-xe",
    role_hint: "device",
    source: "fabricated",
  },
  {
    id: "fab-dev-003",
    name: "edge-rtr-01",
    vendor: "juniper",
    platform: "junos",
    role_hint: "device",
    source: "fabricated",
  },
] as const;

const LINKS: readonly FabricatedLink[] = [
  {
    id: "fab-link-001",
    source_device_id: "fab-dev-001",
    target_device_id: "fab-dev-002",
    kind: "manual",
    source: "fabricated",
  },
  {
    id: "fab-link-002",
    source_device_id: "fab-dev-002",
    target_device_id: "fab-dev-003",
    kind: "manual",
    source: "fabricated",
  },
] as const;

const ENVIRONMENT: FabricatorEnvironment = {
  environment_id: "env-fab-demo",
  name: "Demo Lab — Fabricated",
  devices: DEVICES,
  links: LINKS,
  provenance: "fabricated",
  schema_version: "1",
} as const;

/**
 * Returns the canonical fabricated environment.
 * Referentially stable — callers receive the same frozen object every call.
 */
export function generateFabricatorEnvironment(): FabricatorEnvironment {
  return ENVIRONMENT;
}

/**
 * Generates a FabricatorEnvironment for a given scenario.
 *
 * @param scenarioId - ID of the scenario (e.g. "micro-lab", "campus")
 * @param environmentId - Environment identifier for the generated env
 * @param environmentName - Human-readable name for the environment
 * @returns A FabricatorEnvironment with devices and links matching the scenario
 * @throws Error if scenarioId does not exist in the catalogue
 *
 * Topology strategy: devices link in a simple chain. Link count is achieved
 * by creating multiple chains or adding cross-links as needed.
 */
export function generateFabricatorEnvironmentFor(
  scenarioId: string,
  environmentId: string,
  environmentName: string,
): FabricatorEnvironment {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }

  // For micro-lab, use the legacy device names and IDs to maintain compatibility
  if (scenarioId === "micro-lab") {
    const devices: FabricatedDevice[] = [
      {
        id: "fab-dev-001",
        name: "core-sw-01",
        vendor: "synthetic",
        platform: "synthetic-v1",
        role_hint: "device",
        source: "fabricated",
      },
      {
        id: "fab-dev-002",
        name: "core-sw-02",
        vendor: "synthetic",
        platform: "synthetic-v1",
        role_hint: "device",
        source: "fabricated",
      },
      {
        id: "fab-dev-003",
        name: "edge-rtr-01",
        vendor: "synthetic",
        platform: "synthetic-v1",
        role_hint: "device",
        source: "fabricated",
      },
    ];

    const links: FabricatedLink[] = [
      {
        id: "fab-link-001",
        source_device_id: "fab-dev-001",
        target_device_id: "fab-dev-002",
        kind: "manual",
        source: "fabricated",
      },
      {
        id: "fab-link-002",
        source_device_id: "fab-dev-002",
        target_device_id: "fab-dev-003",
        kind: "manual",
        source: "fabricated",
      },
    ];

    return {
      environment_id: environmentId,
      name: environmentName,
      devices,
      links,
      provenance: "fabricated",
      schema_version: "1",
    };
  }

  // For other scenarios, generate deterministically based on device_count and link_count
  const devices: FabricatedDevice[] = [];
  for (let i = 0; i < scenario.device_count; i++) {
    devices.push({
      id: `fab-dev-${String(i + 1).padStart(3, "0")}`,
      name: `device-${i + 1}`,
      vendor: "synthetic",
      platform: "synthetic-v1",
      role_hint: "device",
      source: "fabricated",
    });
  }

  // Generate links deterministically: chain devices, then add remaining links
  // Strategy: create a chain of links first, then add cross-links if needed
  const links: FabricatedLink[] = [];
  let linkIndex = 0;

  // Chain all devices sequentially
  for (let i = 0; i < devices.length - 1; i++) {
    links.push({
      id: `fab-link-${String(linkIndex + 1).padStart(3, "0")}`,
      source_device_id: devices[i].id,
      target_device_id: devices[i + 1].id,
      kind: "manual",
      source: "fabricated",
    });
    linkIndex++;
  }

  // Add cross-links to reach desired link count
  let crossLinkSource = 0;
  let crossLinkTarget = 2;

  while (linkIndex < scenario.link_count && devices.length > 2) {
    if (crossLinkTarget >= devices.length) {
      crossLinkSource++;
      crossLinkTarget = crossLinkSource + 2;
    }
    if (crossLinkTarget >= devices.length || crossLinkSource >= devices.length) {
      break;
    }

    links.push({
      id: `fab-link-${String(linkIndex + 1).padStart(3, "0")}`,
      source_device_id: devices[crossLinkSource].id,
      target_device_id: devices[crossLinkTarget].id,
      kind: "manual",
      source: "fabricated",
    });
    linkIndex++;
    crossLinkTarget++;
  }

  return {
    environment_id: environmentId,
    name: environmentName,
    devices,
    links,
    provenance: "fabricated",
    schema_version: "1",
  };
}
