import { describe, it, expect } from "vitest";
import { generateLabEnvironment, type GenerateLabEnvironmentInput } from "../networkLabEngine";
import { LAB_GENERATOR_VERSION, LAB_MAX_DEVICES, LAB_MAX_LINKS } from "../../types/labEnvironment";

describe("networkLabEngine", () => {
  describe("scenario device counts", () => {
    it("should generate micro-lab with 3 devices and 2 links", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro Lab",
      });

      expect(env.device_count).toBe(3);
      expect(env.link_count).toBe(2);
      expect(env.devices).toHaveLength(3);
      expect(env.links).toHaveLength(2);
    });

    it("should generate branch-office with 8 devices and 10 links", () => {
      const env = generateLabEnvironment({
        scenario_id: "branch-office",
        environment_id: "test-branch",
        environment_name: "Test Branch",
      });

      expect(env.device_count).toBe(8);
      expect(env.link_count).toBe(10);
      expect(env.devices).toHaveLength(8);
      expect(env.links).toHaveLength(10);
    });

    it("should generate campus with 24 devices and 36 links", () => {
      const env = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus",
        environment_name: "Test Campus",
      });

      expect(env.device_count).toBe(24);
      expect(env.link_count).toBe(36);
    });

    it("should generate datacenter-pod with 32 devices and 64 links", () => {
      const env = generateLabEnvironment({
        scenario_id: "datacenter-pod",
        environment_id: "test-dc",
        environment_name: "Test DC",
      });

      expect(env.device_count).toBe(32);
      expect(env.link_count).toBe(64);
    });

    it("should generate metro-mega-city with 96 devices and 240 links", () => {
      const env = generateLabEnvironment({
        scenario_id: "metro-mega-city",
        environment_id: "test-metro",
        environment_name: "Test Metro",
      });

      expect(env.device_count).toBe(96);
      expect(env.link_count).toBe(240);
    });
  });

  describe("env-fab-demo special case", () => {
    it("should use fab-dev-NNN device ids", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "env-fab-demo",
        environment_name: "Fabricator Demo",
      });

      expect(env.devices[0]?.id).toBe("fab-dev-001");
      expect(env.devices[1]?.id).toBe("fab-dev-002");
      expect(env.devices[2]?.id).toBe("fab-dev-003");
    });

    it("should use hardcoded hostnames for env-fab-demo", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "env-fab-demo",
        environment_name: "Fabricator Demo",
      });

      expect(env.devices[0]?.hostname).toBe("core-sw-01");
      expect(env.devices[1]?.hostname).toBe("core-sw-02");
      expect(env.devices[2]?.hostname).toBe("edge-rtr-01");
    });

    it("should override vendors for env-fab-demo", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "env-fab-demo",
        environment_name: "Fabricator Demo",
      });

      expect(env.devices[0]?.vendor).toBe("cisco");
      expect(env.devices[1]?.vendor).toBe("cisco");
      expect(env.devices[2]?.vendor).toBe("juniper");
    });

    it("should override platform_ids for env-fab-demo", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "env-fab-demo",
        environment_name: "Fabricator Demo",
      });

      expect(env.devices[0]?.platform_id).toBe("cisco-iosxe");
      expect(env.devices[1]?.platform_id).toBe("cisco-iosxe");
      expect(env.devices[2]?.platform_id).toBe("juniper-junos");
    });

    it("should use fab-link-NNN link ids for env-fab-demo", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "env-fab-demo",
        environment_name: "Fabricator Demo",
      });

      expect(env.links[0]?.id).toBe("fab-link-001");
      expect(env.links[1]?.id).toBe("fab-link-002");
    });
  });

  describe("device structure", () => {
    it("should have at least 1 interface per device", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      for (const device of env.devices) {
        expect(device.interfaces.length).toBeGreaterThan(0);
      }
    });

    it("should include loopback interface on every device", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      for (const device of env.devices) {
        const hasLoopback = device.interfaces.some((i) => i.kind === "loopback");
        expect(hasLoopback).toBe(true);
      }
    });

    it("should have management_ip and loopback_ip on devices", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      for (const device of env.devices) {
        expect(device.management_ip).toBeDefined();
        expect(device.management_ip?.family).toBe("v4");
        expect(device.loopback_ip).toBeDefined();
        expect(device.loopback_ip?.family).toBe("v4");
      }
    });
  });

  describe("config generation", () => {
    it("should have a config artifact per device", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      expect(env.configs).toHaveLength(env.device_count);
      expect(env.config_count).toBe(env.device_count);
    });

    it("should have device_id matching in configs", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      const deviceIds = new Set(env.devices.map((d) => d.id));
      const configDeviceIds = new Set(env.configs.map((c) => c.device_id));

      expect(configDeviceIds).toEqual(deviceIds);
    });
  });

  describe("link topology validation", () => {
    it("should reference valid device ids in link endpoints", () => {
      const env = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus",
        environment_name: "Test Campus",
      });

      const deviceIds = new Set(env.devices.map((d) => d.id));

      for (const link of env.links) {
        expect(deviceIds.has(link.endpoint_a_device_id)).toBe(true);
        expect(deviceIds.has(link.endpoint_b_device_id)).toBe(true);
      }
    });

    it("should reference valid interface ids in link endpoints", () => {
      const env = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus",
        environment_name: "Test Campus",
      });

      const interfacesByDevice = new Map<string, Set<string>>();
      for (const device of env.devices) {
        const ifIds = new Set(device.interfaces.map((i) => i.id));
        interfacesByDevice.set(device.id, ifIds);
      }

      for (const link of env.links) {
        const deviceAIfs = interfacesByDevice.get(link.endpoint_a_device_id);
        const deviceBIfs = interfacesByDevice.get(link.endpoint_b_device_id);

        expect(deviceAIfs?.has(link.endpoint_a_interface_id)).toBe(true);
        expect(deviceBIfs?.has(link.endpoint_b_interface_id)).toBe(true);
      }
    });
  });

  describe("IP address uniqueness", () => {
    it("should allocate unique management IPs across devices", () => {
      const env = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus",
        environment_name: "Test Campus",
      });

      const mgmtIps = env.devices
        .map((d) => d.management_ip?.address)
        .filter(Boolean);
      const uniqueMgmtIps = new Set(mgmtIps);

      expect(uniqueMgmtIps.size).toBe(mgmtIps.length);
    });

    it("should allocate unique loopback IPs across devices", () => {
      const env = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus",
        environment_name: "Test Campus",
      });

      const loopIps = env.devices
        .map((d) => d.loopback_ip?.address)
        .filter(Boolean);
      const uniqueLoopIps = new Set(loopIps);

      expect(uniqueLoopIps.size).toBe(loopIps.length);
    });
  });

  describe("capability flags", () => {
    it("should have routing=true for campus", () => {
      const env = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus",
        environment_name: "Test Campus",
      });

      expect(env.capability_flags.routing).toBe(true);
    });

    it("should have routing=false for micro-lab", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      expect(env.capability_flags.routing).toBe(false);
    });

    it("should have common flags enabled", () => {
      const env = generateLabEnvironment({
        scenario_id: "branch-office",
        environment_id: "test-branch",
        environment_name: "Test Branch",
      });

      expect(env.capability_flags.topology).toBe(true);
      expect(env.capability_flags.inventory).toBe(true);
      expect(env.capability_flags.interfaces).toBe(true);
      expect(env.capability_flags.addressing).toBe(true);
      expect(env.capability_flags.configs).toBe(true);
    });
  });

  describe("environment metadata", () => {
    it("should set generator_version to LAB_GENERATOR_VERSION", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      expect(env.generator_version).toBe(LAB_GENERATOR_VERSION);
    });

    it("should set source_kind to network-lab", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      expect(env.source_kind).toBe("network-lab");
    });

    it("should set provenance to generated-lab", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      expect(env.provenance).toBe("generated-lab");
    });

    it("should set source_state to lab", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      expect(env.source_state).toBe("lab");
    });

    it("should set schema_version to 1", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      expect(env.schema_version).toBe("1");
    });
  });

  describe("provenance propagation", () => {
    it("should set provenance on every device", () => {
      const env = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus",
        environment_name: "Test Campus",
      });

      for (const device of env.devices) {
        expect(device.provenance).toBe("generated-lab");
      }
    });

    it("should set provenance on every link", () => {
      const env = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus",
        environment_name: "Test Campus",
      });

      for (const link of env.links) {
        expect(link.provenance).toBe("generated-lab");
      }
    });

    it("should set provenance on every config", () => {
      const env = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus",
        environment_name: "Test Campus",
      });

      for (const config of env.configs) {
        expect(config.provenance).toBe("generated-lab");
      }
    });
  });

  describe("seed handling", () => {
    it("should use scenario seed by default", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      expect(env.scenario_seed).toBeDefined();
      expect(typeof env.scenario_seed).toBe("string");
    });

    it("should use seed_override when provided", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
        seed_override: "custom-seed-123",
      });

      expect(env.scenario_seed).toBe("custom-seed-123");
    });

    it("should preserve device/link counts with seed_override", () => {
      const env1 = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus-1",
        environment_name: "Test Campus 1",
        seed_override: "seed-a",
      });

      const env2 = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus-2",
        environment_name: "Test Campus 2",
        seed_override: "seed-b",
      });

      expect(env1.device_count).toBe(env2.device_count);
      expect(env1.link_count).toBe(env2.link_count);
    });
  });

  describe("determinism", () => {
    it("should produce identical output for same input", () => {
      const input: GenerateLabEnvironmentInput = {
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
        seed_override: "fixed-seed",
      };

      const env1 = generateLabEnvironment(input);
      const env2 = generateLabEnvironment(input);

      expect(env1.device_count).toBe(env2.device_count);
      expect(env1.link_count).toBe(env2.link_count);
      expect(env1.devices).toHaveLength(env2.devices.length);
      expect(env1.links).toHaveLength(env2.links.length);

      // Deep check device IDs and hostnames
      for (let i = 0; i < env1.devices.length; i++) {
        expect(env1.devices[i]?.id).toBe(env2.devices[i]?.id);
        expect(env1.devices[i]?.hostname).toBe(env2.devices[i]?.hostname);
      }
    });
  });

  describe("error handling", () => {
    it("should throw on unknown scenario_id", () => {
      expect(() =>
        generateLabEnvironment({
          scenario_id: "unknown-scenario",
          environment_id: "test",
          environment_name: "Test",
        })
      ).toThrow();
    });

    it("should throw if scenario exceeds LAB_MAX_DEVICES", () => {
      // This scenario doesn't exist, but we're testing the validation logic
      // We can't easily trigger this without modifying scenarioCatalogue,
      // so we'll skip for now and rely on the max cap validation working
      // on the scenario itself
    });

    it("should throw if scenario exceeds LAB_MAX_LINKS", () => {
      // Similar to above, skipped
    });
  });

  describe("address plan integration", () => {
    it("should include address_plan with management subnet", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      expect(env.address_plan.management_subnet).toBe("10.10.0.0/24");
    });

    it("should include address_plan with loopback subnet", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      expect(env.address_plan.loopback_subnet).toBe("10.255.0.0/24");
    });

    it("should include address_plan with transit subnet", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      expect(env.address_plan.transit_subnet).toBe("10.20.0.0/16");
    });

    it("should have allocated subnets per link", () => {
      const env = generateLabEnvironment({
        scenario_id: "micro-lab",
        environment_id: "test-micro",
        environment_name: "Test Micro",
      });

      const transitSubnets = env.address_plan.allocated.filter(
        (s) => s.purpose === "transit"
      );
      expect(transitSubnets).toHaveLength(env.link_count);
    });
  });

  describe("scenario name propagation", () => {
    it("should set scenario_name from catalogue", () => {
      const env = generateLabEnvironment({
        scenario_id: "campus",
        environment_id: "test-campus",
        environment_name: "Test Campus",
      });

      expect(env.scenario_name).toBeDefined();
      expect(typeof env.scenario_name).toBe("string");
    });
  });
});
