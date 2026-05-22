/**
 * Scenario catalogue (D4D).
 *
 * Deterministic registry of synthetic environment profiles. Each scenario
 * describes a named topology with device/link counts, scale category, and
 * seed for reproducible generation.
 *
 * Frozen at module load — callers receive the same catalogue every call.
 */

import type { ScenarioRecord } from "../types/scenario";
import { LAB_MAX_DEVICES, LAB_MAX_LINKS } from "../types/labEnvironment";

const MICRO_LAB: ScenarioRecord = {
  scenario_id: "micro-lab",
  name: "Micro Lab",
  summary: "Small default for quick tests",
  description: "Minimal 3-device, 2-link lab environment. Ideal for rapid iteration and proof-of-concept.",
  scale_profile: "micro",
  intended_use: "Quick tests and development iteration",
  device_count: 3,
  link_count: 2,
  target_device_count: 3,
  target_link_count: 2,
  max_device_count: 3,
  max_link_count: 2,
  source_kind: "synthetic",
  seed: "micro-lab-v1",
  scenario_seed: "micro-lab-v1",
  lifecycle_status: "available",
  maturity: "stable",
  limitations: [],
  capabilities: ["topology", "inventory", "interfaces", "addressing", "configs"],
  future_surfaces: ["topology", "inventory", "configs", "reports", "troubleshooting"],
};

const BRANCH_OFFICE: ScenarioRecord = {
  scenario_id: "branch-office",
  name: "Branch Office",
  summary: "Router/firewall/switch/access edge",
  description:
    "8-device, 10-link branch office topology. Includes edge router, firewall, core switch, and access layer. Realistic small-office profile.",
  scale_profile: "small",
  intended_use: "Branch office topology and edge routing patterns",
  device_count: 8,
  link_count: 10,
  target_device_count: 8,
  target_link_count: 10,
  max_device_count: 16,
  max_link_count: 32,
  source_kind: "synthetic",
  seed: "branch-office-v1",
  scenario_seed: "branch-office-v1",
  lifecycle_status: "available",
  maturity: "stable",
  limitations: [],
  capabilities: ["topology", "inventory", "interfaces", "addressing", "configs", "routing", "security"],
  future_surfaces: ["topology", "inventory", "configs", "reports", "troubleshooting"],
};

const CAMPUS: ScenarioRecord = {
  scenario_id: "campus",
  name: "Campus",
  summary: "Core/distribution/access with VLAN/routing",
  description:
    "24-device, 36-link multi-building campus network. Includes core, distribution, and access tiers with VLAN and routing complexity.",
  scale_profile: "medium",
  intended_use: "Campus network design and large L2/L3 topologies",
  device_count: 24,
  link_count: 36,
  target_device_count: 24,
  target_link_count: 36,
  max_device_count: 48,
  max_link_count: 96,
  source_kind: "synthetic",
  seed: "campus-v1",
  scenario_seed: "campus-v1",
  lifecycle_status: "available",
  maturity: "stable",
  limitations: [],
  capabilities: ["topology", "inventory", "interfaces", "addressing", "configs", "routing", "services"],
  future_surfaces: ["topology", "inventory", "configs", "reports", "troubleshooting"],
};

const DATACENTER_POD: ScenarioRecord = {
  scenario_id: "datacenter-pod",
  name: "Datacenter Pod",
  summary: "Leaf/spine pod, vendor-neutral",
  description:
    "32-device, 64-link datacenter pod with leaf/spine architecture. Vendor-agnostic design suitable for modern DC topologies.",
  scale_profile: "large",
  intended_use: "Datacenter fabric and high-density switching",
  device_count: 32,
  link_count: 64,
  target_device_count: 32,
  target_link_count: 64,
  max_device_count: 64,
  max_link_count: 192,
  source_kind: "synthetic",
  seed: "datacenter-pod-v1",
  scenario_seed: "datacenter-pod-v1",
  lifecycle_status: "available",
  maturity: "stable",
  limitations: [],
  capabilities: ["topology", "inventory", "interfaces", "addressing", "configs", "routing", "services"],
  future_surfaces: ["topology", "inventory", "configs", "reports", "troubleshooting"],
};

const METRO_MEGA_CITY: ScenarioRecord = {
  scenario_id: "metro-mega-city",
  name: "Metro / Mega City",
  summary: "Large future-scale placeholder, generated capped",
  description:
    "96-device, 240-link metro/mega-city scale topology. Placeholder for large-scale network generation. Counts capped this run at 128 devices / 320 links; future iterations will scale to thousands.",
  scale_profile: "mega",
  intended_use: "Large-scale network simulation and performance testing",
  device_count: 96,
  link_count: 240,
  target_device_count: 96,
  target_link_count: 240,
  max_device_count: 128,
  max_link_count: 320,
  source_kind: "synthetic",
  seed: "metro-mega-city-v1",
  scenario_seed: "metro-mega-city-v1",
  lifecycle_status: "experimental",
  maturity: "experimental",
  limitations: ["Currently capped at 128 devices / 320 links for normal operator flow."],
  capabilities: ["topology", "inventory", "interfaces", "addressing", "configs", "routing", "services"],
  future_surfaces: ["topology", "inventory", "configs", "reports", "troubleshooting"],
};

// Validate all scenarios against hard caps at module load
function validateScenarioCaps(scenarios: readonly ScenarioRecord[]): void {
  for (const scenario of scenarios) {
    if (scenario.target_device_count > scenario.max_device_count) {
      throw new Error(
        `Scenario "${scenario.scenario_id}": target_device_count (${scenario.target_device_count}) ` +
        `exceeds max_device_count (${scenario.max_device_count})`
      );
    }
    if (scenario.max_device_count > LAB_MAX_DEVICES) {
      throw new Error(
        `Scenario "${scenario.scenario_id}": max_device_count (${scenario.max_device_count}) ` +
        `exceeds LAB_MAX_DEVICES (${LAB_MAX_DEVICES})`
      );
    }
    if (scenario.target_link_count > scenario.max_link_count) {
      throw new Error(
        `Scenario "${scenario.scenario_id}": target_link_count (${scenario.target_link_count}) ` +
        `exceeds max_link_count (${scenario.max_link_count})`
      );
    }
    if (scenario.max_link_count > LAB_MAX_LINKS) {
      throw new Error(
        `Scenario "${scenario.scenario_id}": max_link_count (${scenario.max_link_count}) ` +
        `exceeds LAB_MAX_LINKS (${LAB_MAX_LINKS})`
      );
    }
  }
}

const SCENARIOS_TO_FREEZE: readonly ScenarioRecord[] = [
  MICRO_LAB,
  BRANCH_OFFICE,
  CAMPUS,
  DATACENTER_POD,
  METRO_MEGA_CITY,
];

// Validate before freezing
validateScenarioCaps(SCENARIOS_TO_FREEZE);

export const SCENARIO_CATALOGUE: readonly ScenarioRecord[] = Object.freeze(
  SCENARIOS_TO_FREEZE
);

/**
 * Returns a frozen list of all available scenarios.
 */
export function listScenarios(): readonly ScenarioRecord[] {
  return SCENARIO_CATALOGUE;
}

/**
 * Retrieves a scenario by ID. Returns undefined if not found.
 */
export function getScenarioById(id: string): ScenarioRecord | undefined {
  for (const scenario of SCENARIO_CATALOGUE) {
    if (scenario.scenario_id === id) {
      return scenario;
    }
  }
  return undefined;
}

/**
 * Retrieves a scenario by ID. Throws if not found.
 */
export function requireScenarioById(id: string): ScenarioRecord {
  const scenario = getScenarioById(id);
  if (!scenario) {
    throw new Error(`Scenario not found: ${id}`);
  }
  return scenario;
}
