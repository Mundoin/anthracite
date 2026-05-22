import { describe, it, expect } from "vitest";
import { toFabricatorView } from "../labProjections";
import type { LabEnvironment } from "../../types/labEnvironment";

const createLabEnvironment = (overrides: Partial<LabEnvironment> = {}): LabEnvironment => ({
  environment_id: "test-env",
  name: "Test Environment",
  scenario_id: "micro-lab",
  scenario_name: "Micro Lab",
  scenario_seed: "test-seed",
  source_kind: "network-lab" as const,
  provenance: "generated-lab" as const,
  source_state: "lab" as const,
  generator_version: "lab-engine/0.1.0",
  schema_version: "1" as const,
  devices: [
    {
      id: "lab-dev-001",
      hostname: "router-001",
      display_label: "router-001",
      device_class: "router",
      vendor: "cisco",
      platform_id: "cisco-iosxe",
      os_family: "IOS XE",
      management_ip: {
        family: "v4",
        address: "10.10.0.1",
        prefix_length: 24,
        secondary: false,
        vrf: null,
      },
      loopback_ip: {
        family: "v4",
        address: "10.255.0.1",
        prefix_length: 32,
        secondary: false,
        vrf: null,
      },
      site_id: null,
      zone: null,
      tags: [],
      capabilities: ["routing"],
      interfaces: [
        {
          id: "lab-dev-001-if-001",
          name: "GigabitEthernet0/0/0",
          kind: "physical" as const,
          description: "Management",
          ip_addresses: [
            {
              family: "v4",
              address: "10.10.0.1",
              prefix_length: 24,
              secondary: false,
              vrf: null,
            },
          ],
          vlan_id: null,
          speed_mbps: 1000,
          enabled: true,
        },
      ],
      provenance: "generated-lab" as const,
      source_state: "lab" as const,
    },
    {
      id: "lab-dev-002",
      hostname: "router-002",
      display_label: "router-002",
      device_class: "router",
      vendor: "juniper",
      platform_id: "juniper-junos",
      os_family: "Junos",
      management_ip: {
        family: "v4",
        address: "10.10.0.2",
        prefix_length: 24,
        secondary: false,
        vrf: null,
      },
      loopback_ip: {
        family: "v4",
        address: "10.255.0.2",
        prefix_length: 32,
        secondary: false,
        vrf: null,
      },
      site_id: null,
      zone: null,
      tags: [],
      capabilities: ["routing"],
      interfaces: [
        {
          id: "lab-dev-002-if-001",
          name: "ge-0/0/0",
          kind: "physical" as const,
          description: "Management",
          ip_addresses: [
            {
              family: "v4",
              address: "10.10.0.2",
              prefix_length: 24,
              secondary: false,
              vrf: null,
            },
          ],
          vlan_id: null,
          speed_mbps: 1000,
          enabled: true,
        },
      ],
      provenance: "generated-lab" as const,
      source_state: "lab" as const,
    },
  ],
  links: [
    {
      id: "lab-link-001",
      endpoint_a_device_id: "lab-dev-001",
      endpoint_a_interface_id: "lab-dev-001-if-001",
      endpoint_b_device_id: "lab-dev-002",
      endpoint_b_interface_id: "lab-dev-002-if-001",
      link_type: "routed",
      medium: "ethernet",
      speed_mbps: 1000,
      enabled: true,
      vlan_id: null,
      provenance: "generated-lab" as const,
    },
  ],
  address_plan: {
    management_subnet: "10.10.0.0/24",
    loopback_subnet: "10.255.0.0/24",
    transit_subnet: "10.20.0.0/16",
    vlan_subnets: [],
    site_subnets: [],
    allocated: [
      {
        id: "subnet-mgmt-10.10.0.0-24",
        cidr: "10.10.0.0/24",
        purpose: "management",
        site_id: null,
        vlan_id: null,
      },
    ],
  },
  configs: [
    {
      device_id: "lab-dev-001",
      config_kind: "cli_config",
      vendor: "cisco",
      platform_id: "cisco-iosxe",
      generated_at: "lab-deterministic",
      config_text: "hostname router-001",
      structured_profile: null,
      parser_hint: "cisco-iosxe",
      provenance: "generated-lab" as const,
      limitations: [],
    },
  ],
  capability_flags: {
    topology: true,
    inventory: true,
    interfaces: true,
    addressing: true,
    configs: true,
    routing: false,
    services: false,
    security: false,
  },
  device_count: 2,
  link_count: 1,
  config_count: 1,
  ...overrides,
});

describe("labProjections", () => {
  describe("toFabricatorView", () => {
    it("should convert environment_id", () => {
      const labEnv = createLabEnvironment({ environment_id: "test-env-123" });
      const view = toFabricatorView(labEnv);

      expect(view.environment_id).toBe("test-env-123");
    });

    it("should convert name", () => {
      const labEnv = createLabEnvironment({ name: "Custom Lab Name" });
      const view = toFabricatorView(labEnv);

      expect(view.name).toBe("Custom Lab Name");
    });

    it("should convert schema_version to string", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      expect(view.schema_version).toBe("1");
    });

    it("should set provenance to fabricated", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      expect(view.provenance).toBe("fabricated");
    });
  });

  describe("device conversion", () => {
    it("should convert all devices", () => {
      const labEnv = createLabEnvironment({
        devices: Array.from({ length: 5 }, (_, i) => ({
          id: `lab-dev-${i + 1}`,
          hostname: `device-${i + 1}`,
          display_label: `device-${i + 1}`,
          device_class: "router" as const,
          vendor: "cisco" as const,
          platform_id: "cisco-iosxe" as const,
          os_family: "IOS XE",
          management_ip: null,
          loopback_ip: null,
          site_id: null,
          zone: null,
          tags: [],
          capabilities: [],
          interfaces: [],
          provenance: "generated-lab" as const,
          source_state: "lab" as const,
        })),
      });

      const view = toFabricatorView(labEnv);

      expect(view.devices).toHaveLength(5);
    });

    it("should map device id to fabricated device id", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      expect(view.devices[0]?.id).toBe("lab-dev-001");
      expect(view.devices[1]?.id).toBe("lab-dev-002");
    });

    it("should map hostname to fabricated device name", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      expect(view.devices[0]?.name).toBe("router-001");
      expect(view.devices[1]?.name).toBe("router-002");
    });

    it("should preserve vendor", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      expect(view.devices[0]?.vendor).toBe("cisco");
      expect(view.devices[1]?.vendor).toBe("juniper");
    });

    it("should preserve platform_id as platform", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      expect(view.devices[0]?.platform).toBe("cisco-iosxe");
      expect(view.devices[1]?.platform).toBe("juniper-junos");
    });

    it("should set role_hint to device for all devices", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      for (const device of view.devices) {
        expect(device.role_hint).toBe("device");
      }
    });

    it("should set source to fabricated for all devices", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      for (const device of view.devices) {
        expect(device.source).toBe("fabricated");
      }
    });
  });

  describe("link conversion", () => {
    it("should convert all links", () => {
      const labEnv = createLabEnvironment({
        links: Array.from({ length: 3 }, (_, i) => ({
          id: `lab-link-${i + 1}`,
          endpoint_a_device_id: `lab-dev-${i + 1}`,
          endpoint_a_interface_id: `if-${i + 1}-a`,
          endpoint_b_device_id: `lab-dev-${i + 2}`,
          endpoint_b_interface_id: `if-${i + 1}-b`,
          link_type: "routed" as const,
          medium: "ethernet" as const,
          speed_mbps: 1000,
          enabled: true,
          vlan_id: null,
          provenance: "generated-lab" as const,
        })),
      });

      const view = toFabricatorView(labEnv);

      expect(view.links).toHaveLength(3);
    });

    it("should map link id", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      expect(view.links[0]?.id).toBe("lab-link-001");
    });

    it("should map endpoint_a_device_id to source_device_id", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      expect(view.links[0]?.source_device_id).toBe("lab-dev-001");
    });

    it("should map endpoint_b_device_id to target_device_id", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      expect(view.links[0]?.target_device_id).toBe("lab-dev-002");
    });

    it("should set kind to manual for all links", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      for (const link of view.links) {
        expect(link.kind).toBe("manual");
      }
    });

    it("should set source to fabricated for all links", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      for (const link of view.links) {
        expect(link.source).toBe("fabricated");
      }
    });
  });

  describe("fab-demo environment", () => {
    it("should project fab-dev-NNN device ids correctly", () => {
      const labEnv = createLabEnvironment({
        environment_id: "env-fab-demo",
        devices: [
          {
            id: "fab-dev-001",
            hostname: "core-sw-01",
            display_label: "core-sw-01",
            device_class: "router" as const,
            vendor: "cisco" as const,
            platform_id: "cisco-iosxe" as const,
            os_family: "IOS XE",
            management_ip: null,
            loopback_ip: null,
            site_id: null,
            zone: null,
            tags: [],
            capabilities: [],
            interfaces: [],
            provenance: "generated-lab" as const,
            source_state: "lab" as const,
          },
          {
            id: "fab-dev-002",
            hostname: "core-sw-02",
            display_label: "core-sw-02",
            device_class: "router" as const,
            vendor: "cisco" as const,
            platform_id: "cisco-iosxe" as const,
            os_family: "IOS XE",
            management_ip: null,
            loopback_ip: null,
            site_id: null,
            zone: null,
            tags: [],
            capabilities: [],
            interfaces: [],
            provenance: "generated-lab" as const,
            source_state: "lab" as const,
          },
        ],
        links: [
          {
            id: "fab-link-001",
            endpoint_a_device_id: "fab-dev-001",
            endpoint_a_interface_id: "if-a",
            endpoint_b_device_id: "fab-dev-002",
            endpoint_b_interface_id: "if-b",
            link_type: "routed" as const,
            medium: "ethernet" as const,
            speed_mbps: 1000,
            enabled: true,
            vlan_id: null,
            provenance: "generated-lab" as const,
          },
        ],
      });

      const view = toFabricatorView(labEnv);

      expect(view.environment_id).toBe("env-fab-demo");
      expect(view.devices[0]?.id).toBe("fab-dev-001");
      expect(view.devices[1]?.id).toBe("fab-dev-002");
      expect(view.links[0]?.id).toBe("fab-link-001");
    });

    it("should preserve fab-demo hostnames", () => {
      const labEnv = createLabEnvironment({
        environment_id: "env-fab-demo",
        devices: [
          {
            id: "fab-dev-001",
            hostname: "core-sw-01",
            display_label: "core-sw-01",
            device_class: "router" as const,
            vendor: "cisco" as const,
            platform_id: "cisco-iosxe" as const,
            os_family: "IOS XE",
            management_ip: null,
            loopback_ip: null,
            site_id: null,
            zone: null,
            tags: [],
            capabilities: [],
            interfaces: [],
            provenance: "generated-lab" as const,
            source_state: "lab" as const,
          },
        ],
      });

      const view = toFabricatorView(labEnv);

      expect(view.devices[0]?.name).toBe("core-sw-01");
    });
  });

  describe("roundtrip compatibility", () => {
    it("should preserve device count through projection", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      expect(view.devices.length).toBe(labEnv.devices.length);
    });

    it("should preserve link count through projection", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      expect(view.links.length).toBe(labEnv.links.length);
    });

    it("should preserve topology structure", () => {
      const labEnv = createLabEnvironment();
      const view = toFabricatorView(labEnv);

      // Verify endpoint mapping preserves connectivity
      expect(view.links[0]?.source_device_id).toBe(
        labEnv.links[0]?.endpoint_a_device_id
      );
      expect(view.links[0]?.target_device_id).toBe(
        labEnv.links[0]?.endpoint_b_device_id
      );
    });
  });
});
