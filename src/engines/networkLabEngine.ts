import type {
  LabEnvironment,
  LabDevice,
  LabLink,
  LabInterface,
  LabDeviceClass,
  LabVendor,
  LabEnvironmentCapabilityFlags,
  LabPlatformId,
} from "../types/labEnvironment";
import type { IpAddressModel } from "../types/networkModel";
import {
  LAB_GENERATOR_VERSION,
  LAB_MAX_DEVICES,
  LAB_MAX_LINKS,
} from "../types/labEnvironment";
import { requireScenarioById } from "../data/scenarioCatalogue";
import { requirePreset } from "../data/labDevicePresets";
import { planAddresses } from "./labAddressPlanner";
import { synthesizeConfigsFor } from "./labConfigSynthesizer";

export interface GenerateLabEnvironmentInput {
  readonly scenario_id: string;
  readonly environment_id: string;
  readonly environment_name: string;
  readonly seed_override?: string;
}

interface DeviceComposition {
  readonly device_class: LabDeviceClass;
  readonly vendor: LabVendor;
  readonly count: number;
}

const SCENARIO_COMPOSITIONS: Record<string, readonly DeviceComposition[]> = {
  "micro-lab": [
    { device_class: "router", vendor: "cisco", count: 2 },
    { device_class: "router", vendor: "juniper", count: 1 },
  ],
  "branch-office": [
    { device_class: "firewall", vendor: "fortinet", count: 1 },
    { device_class: "router", vendor: "cisco", count: 1 },
    { device_class: "switch", vendor: "cisco", count: 1 },
    { device_class: "home_gateway", vendor: "avm", count: 1 },
    { device_class: "access_point", vendor: "aruba", count: 2 },
    { device_class: "camera", vendor: "axis", count: 1 },
    { device_class: "endpoint", vendor: "generic", count: 1 },
  ],
  campus: [
    { device_class: "router", vendor: "cisco", count: 2 },
    { device_class: "switch", vendor: "cisco", count: 4 },
    { device_class: "switch", vendor: "arista", count: 12 },
    { device_class: "firewall", vendor: "fortinet", count: 2 },
    { device_class: "access_point", vendor: "aruba", count: 2 },
    { device_class: "camera", vendor: "axis", count: 2 },
  ],
  "datacenter-pod": [
    { device_class: "switch", vendor: "arista", count: 20 }, // 4 spine + 16 leaf
    { device_class: "server", vendor: "generic", count: 8 },
    { device_class: "firewall", vendor: "fortinet", count: 2 },
    { device_class: "router", vendor: "cisco", count: 2 },
  ],
  "metro-mega-city": [
    { device_class: "router", vendor: "cisco", count: 16 },
    { device_class: "router", vendor: "juniper", count: 16 },
    { device_class: "switch", vendor: "arista", count: 32 },
    { device_class: "router", vendor: "mikrotik", count: 16 },
    { device_class: "isp_edge", vendor: "isp", count: 8 },
    { device_class: "firewall", vendor: "fortinet", count: 4 },
    { device_class: "firewall", vendor: "paloalto", count: 4 },
  ],
};

// Special env-fab-demo overrides
const FAB_DEMO_OVERRIDES = {
  "env-fab-demo": [
    { device_class: "router" as const, vendor: "cisco" as const, hostname: "core-sw-01" },
    { device_class: "router" as const, vendor: "cisco" as const, hostname: "core-sw-02" },
    { device_class: "router" as const, vendor: "juniper" as const, hostname: "edge-rtr-01" },
  ],
};

export function generateLabEnvironment(
  input: GenerateLabEnvironmentInput
): LabEnvironment {
  const scenario = requireScenarioById(input.scenario_id);
  const scenarioSeed = input.seed_override ?? scenario.scenario_seed;

  // Validate caps
  if (scenario.target_device_count > LAB_MAX_DEVICES) {
    throw new Error(
      `Scenario ${input.scenario_id} target device count ${scenario.target_device_count} exceeds LAB_MAX_DEVICES`
    );
  }
  if (scenario.target_link_count > LAB_MAX_LINKS) {
    throw new Error(
      `Scenario ${input.scenario_id} target link count ${scenario.target_link_count} exceeds LAB_MAX_LINKS`
    );
  }

  // Generate devices
  let devices: LabDevice[] = [];
  let deviceIndex = 0;

  // Handle special env-fab-demo case
  if (input.environment_id === "env-fab-demo") {
    const overrides = FAB_DEMO_OVERRIDES["env-fab-demo"];
    const addressPlan = planAddresses({
      scenario_id: input.scenario_id,
      seed: scenarioSeed,
      device_count: overrides.length,
      link_count: 2,
      site_count: 1,
    });

    devices = overrides.map((override, idx) => {
      const preset = requirePreset(override.device_class, override.vendor);
      const deviceId = `fab-dev-${String(idx + 1).padStart(3, "0")}`;
      const platformId = (() => {
        if (override.vendor === "cisco") return "cisco-iosxe" as LabPlatformId;
        if (override.vendor === "juniper") return "juniper-junos" as LabPlatformId;
        return preset.platform_id;
      })();

      return {
        id: deviceId,
        hostname: override.hostname,
        display_label: override.hostname,
        device_class: override.device_class,
        vendor: override.vendor,
        platform_id: platformId,
        os_family: preset.os_family,
        management_ip: addressPlan.management_ip_for(idx),
        loopback_ip: addressPlan.loopback_ip_for(idx),
        site_id: null,
        zone: null,
        tags: [],
        capabilities: preset.default_capabilities,
        interfaces: buildInterfaces(
          deviceId,
          preset,
          override.device_class,
          addressPlan.management_ip_for(idx)
        ),
        provenance: "generated-lab" as const,
        source_state: "lab" as const,
      };
    });
  } else {
    // Normal scenario path
    const composition = SCENARIO_COMPOSITIONS[input.scenario_id];
    if (!composition) {
      throw new Error(`Unknown scenario_id: ${input.scenario_id}`);
    }

    const addressPlan = planAddresses({
      scenario_id: input.scenario_id,
      seed: scenarioSeed,
      device_count: scenario.target_device_count,
      link_count: scenario.target_link_count,
      site_count: 1,
    });

    for (const comp of composition) {
      for (let i = 0; i < comp.count; i++) {
        const preset = requirePreset(comp.device_class, comp.vendor);
        const deviceId = `lab-dev-${String(deviceIndex + 1).padStart(3, "0")}`;

        devices.push({
          id: deviceId,
          hostname: `${preset.hostname_prefix}-${String(deviceIndex + 1).padStart(3, "0")}`,
          display_label: `${preset.hostname_prefix}-${String(deviceIndex + 1).padStart(3, "0")}`,
          device_class: comp.device_class,
          vendor: comp.vendor,
          platform_id: preset.platform_id,
          os_family: preset.os_family,
          management_ip: addressPlan.management_ip_for(deviceIndex),
          loopback_ip: addressPlan.loopback_ip_for(deviceIndex),
          site_id: null,
          zone: null,
          tags: [],
          capabilities: preset.default_capabilities,
          interfaces: buildInterfaces(
            deviceId,
            preset,
            comp.device_class,
            addressPlan.management_ip_for(deviceIndex)
          ),
          provenance: "generated-lab" as const,
          source_state: "lab" as const,
        });

        deviceIndex++;
      }
    }
  }

  // Validate device count
  if (devices.length > scenario.max_device_count) {
    throw new Error(
      `Generated device count ${devices.length} exceeds scenario max ${scenario.max_device_count}`
    );
  }

  // Generate links
  const links = generateLinks(
    devices,
    input.environment_id,
    scenario.target_link_count,
    scenario.max_link_count
  );

  // Plan addresses
  const addressPlan = planAddresses({
    scenario_id: input.scenario_id,
    seed: scenarioSeed,
    device_count: devices.length,
    link_count: links.length,
    site_count: 1,
  });

  // Generate configs
  const configs = synthesizeConfigsFor(devices, scenarioSeed);

  // Capability flags
  const capability_flags: LabEnvironmentCapabilityFlags = {
    topology: true,
    inventory: true,
    interfaces: true,
    addressing: true,
    configs: true,
    routing: scenario.capabilities.includes("routing"),
    services: scenario.capabilities.includes("services"),
    security: scenario.capabilities.includes("security"),
  };

  return {
    environment_id: input.environment_id,
    name: input.environment_name,
    scenario_id: input.scenario_id,
    scenario_name: scenario.name,
    scenario_seed: scenarioSeed,
    source_kind: "network-lab" as const,
    provenance: "generated-lab" as const,
    source_state: "lab" as const,
    generator_version: LAB_GENERATOR_VERSION,
    schema_version: "1" as const,
    devices,
    links,
    address_plan: addressPlan.plan,
    configs,
    capability_flags,
    device_count: devices.length,
    link_count: links.length,
    config_count: configs.length,
  };
}

function buildInterfaces(
  deviceId: string,
  preset: ReturnType<typeof requirePreset>,
  deviceClass: LabDeviceClass,
  managementIp: IpAddressModel
): readonly LabInterface[] {
  const interfaces: LabInterface[] = [];
  const defaultCount = preset.default_interface_count;

  // First interface
  const isMgmtOnly = defaultCount === 1 &&
    ["camera", "endpoint", "home_gateway"].includes(deviceClass);

  interfaces.push({
    id: `${deviceId}-if-001`,
    name: preset.interface_name_pattern.replace("{n}", "1"),
    kind: isMgmtOnly ? "management" : "physical",
    description: "Management",
    ip_addresses: [managementIp],
    vlan_id: null,
    speed_mbps: 1000,
    enabled: true,
  });

  // Additional interfaces (if any)
  for (let i = 2; i <= defaultCount; i++) {
    interfaces.push({
      id: `${deviceId}-if-${String(i).padStart(3, "0")}`,
      name: preset.interface_name_pattern.replace("{n}", String(i)),
      kind: "physical",
      description: null,
      ip_addresses: [],
      vlan_id: null,
      speed_mbps: 1000,
      enabled: true,
    });
  }

  // Loopback interface
  interfaces.push({
    id: `${deviceId}-lo0`,
    name: "Loopback0",
    kind: "loopback",
    description: "Loopback",
    ip_addresses: [], // Will be filled by caller if needed; for now empty per contract
    vlan_id: null,
    speed_mbps: null,
    enabled: true,
  });

  return interfaces;
}

function generateLinks(
  devices: readonly LabDevice[],
  environmentId: string,
  targetLinkCount: number,
  maxLinkCount: number
): LabLink[] {
  const links: LabLink[] = [];
  const isEnvFabDemo = environmentId === "env-fab-demo";

  if (isEnvFabDemo) {
    // Hard-coded fab-demo links: dev0↔dev1, dev1↔dev2
    if (devices.length >= 2) {
      links.push({
        id: "fab-link-001",
        endpoint_a_device_id: devices[0]!.id,
        endpoint_a_interface_id: devices[0]!.interfaces[0]!.id,
        endpoint_b_device_id: devices[1]!.id,
        endpoint_b_interface_id: devices[1]!.interfaces[0]!.id,
        link_type: "routed",
        medium: "ethernet",
        speed_mbps: 1000,
        enabled: true,
        vlan_id: null,
        provenance: "generated-lab" as const,
      });
    }

    if (devices.length >= 3) {
      links.push({
        id: "fab-link-002",
        endpoint_a_device_id: devices[1]!.id,
        endpoint_a_interface_id: devices[1]!.interfaces[0]!.id,
        endpoint_b_device_id: devices[2]!.id,
        endpoint_b_interface_id: devices[2]!.interfaces[0]!.id,
        link_type: "routed",
        medium: "ethernet",
        speed_mbps: 1000,
        enabled: true,
        vlan_id: null,
        provenance: "generated-lab" as const,
      });
    }

    return links;
  }

  // Normal scenario topology generation
  // Chain links: connect device i to device i+1
  const chainLinkCount = Math.min(devices.length - 1, targetLinkCount);
  for (let i = 0; i < chainLinkCount; i++) {
    const devA = devices[i]!;
    const devB = devices[i + 1]!;
    const linkId = `lab-link-${String(links.length + 1).padStart(3, "0")}`;

    const linkType = deriveLinkType(devA.device_class, devB.device_class);
    const medium = deriveLinkMedium(devA, devB);
    const speed = deriveSpeed(devA, devB);

    links.push({
      id: linkId,
      endpoint_a_device_id: devA.id,
      endpoint_a_interface_id: devA.interfaces[0]!.id,
      endpoint_b_device_id: devB.id,
      endpoint_b_interface_id: devB.interfaces[0]!.id,
      link_type: linkType,
      medium,
      speed_mbps: speed,
      enabled: true,
      vlan_id: null,
      provenance: "generated-lab" as const,
    });
  }

  // Cross-links: pair device i with device i+2, i+3, ... (stride incrementing)
  let stride = 2;
  for (let i = 0; i < devices.length && links.length < targetLinkCount; i++) {
    for (let offset = stride; offset < devices.length && links.length < targetLinkCount; offset++) {
      const targetIdx = i + offset;
      if (targetIdx >= devices.length) break;

      const devA = devices[i]!;
      const devB = devices[targetIdx]!;
      const linkId = `lab-link-${String(links.length + 1).padStart(3, "0")}`;

      const linkType = deriveLinkType(devA.device_class, devB.device_class);
      const medium = deriveLinkMedium(devA, devB);
      const speed = deriveSpeed(devA, devB);

      links.push({
        id: linkId,
        endpoint_a_device_id: devA.id,
        endpoint_a_interface_id: devA.interfaces[0]!.id,
        endpoint_b_device_id: devB.id,
        endpoint_b_interface_id: devB.interfaces[0]!.id,
        link_type: linkType,
        medium,
        speed_mbps: speed,
        enabled: true,
        vlan_id: null,
        provenance: "generated-lab" as const,
      });
    }
    stride++;
  }

  if (links.length > maxLinkCount) {
    throw new Error(
      `Generated link count ${links.length} exceeds scenario max ${maxLinkCount}`
    );
  }

  return links;
}

function deriveLinkType(
  classA: LabDeviceClass,
  classB: LabDeviceClass
): "access" | "trunk" | "routed" | "wan" | "isp" | "uplink" | "peer" | "service" {
  if (classA === "isp_edge" || classB === "isp_edge") return "wan";
  if (classA === "router" && classB === "router") return "routed";
  if (classA === "switch" && classB === "switch") return "trunk";
  if ((classA === "router" && classB === "switch") || (classA === "switch" && classB === "router"))
    return "access";
  if ((classA === "switch" && classB === "server") || (classA === "server" && classB === "switch"))
    return "service";
  return "routed";
}

function deriveLinkMedium(
  devA: LabDevice,
  devB: LabDevice
): "ethernet" | "fiber" | "wireless" | "virtual" {
  if (devA.device_class === "access_point" || devB.device_class === "access_point")
    return "wireless";
  if (devA.device_class === "isp_edge" || devB.device_class === "isp_edge") return "fiber";
  return "ethernet";
}

function deriveSpeed(devA: LabDevice, devB: LabDevice): number | null {
  // datacenter spine/leaf convention
  const isDatacenterDevice =
    ["arista"].includes(devA.vendor) && ["arista"].includes(devB.vendor);
  if (isDatacenterDevice) return 10000;

  // wireless
  if (devA.device_class === "access_point" || devB.device_class === "access_point")
    return null;

  // default
  return 1000;
}
