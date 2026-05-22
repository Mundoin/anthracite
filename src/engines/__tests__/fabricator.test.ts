import { describe, it, expect } from "vitest";
import {
  generateFabricatorEnvironment,
  generateFabricatorEnvironmentFor,
} from "../fabricator";

describe("Fabricator Engine", () => {
  describe("generateFabricatorEnvironment (legacy)", () => {
    it("returns env-fab-demo with 3 devices and 2 links", () => {
      const env = generateFabricatorEnvironment();
      expect(env.environment_id).toBe("env-fab-demo");
      expect(env.devices.length).toBe(3);
      expect(env.links.length).toBe(2);
    });

    it("returns the same object every call (referential stability)", () => {
      const env1 = generateFabricatorEnvironment();
      const env2 = generateFabricatorEnvironment();
      expect(env1).toBe(env2);
    });

    it("has provenance 'fabricated'", () => {
      const env = generateFabricatorEnvironment();
      expect(env.provenance).toBe("fabricated");
    });
  });

  describe("generateFabricatorEnvironmentFor (parameterized)", () => {
    it("micro-lab produces 3 devices and 2 links", () => {
      const env = generateFabricatorEnvironmentFor("micro-lab", "env-test-1", "Test Micro");
      expect(env.devices.length).toBe(3);
      expect(env.links.length).toBe(2);
    });

    it("micro-lab uses provided environment_id and name", () => {
      const env = generateFabricatorEnvironmentFor("micro-lab", "env-custom-id", "Custom Name");
      expect(env.environment_id).toBe("env-custom-id");
      expect(env.name).toBe("Custom Name");
    });

    it("micro-lab device IDs match legacy IDs", () => {
      const env = generateFabricatorEnvironmentFor("micro-lab", "env-test", "Test");
      const deviceIds = env.devices.map((d) => d.id);
      expect(deviceIds).toEqual(["fab-dev-001", "fab-dev-002", "fab-dev-003"]);
    });

    it("micro-lab device names match legacy names", () => {
      const env = generateFabricatorEnvironmentFor("micro-lab", "env-test", "Test");
      const deviceNames = env.devices.map((d) => d.name);
      expect(deviceNames).toEqual(["core-sw-01", "core-sw-02", "edge-rtr-01"]);
    });

    it("branch-office produces exactly 8 devices and 10 links", () => {
      const env = generateFabricatorEnvironmentFor("branch-office", "env-bo-1", "Branch");
      expect(env.devices.length).toBe(8);
      expect(env.links.length).toBe(10);
    });

    it("campus produces exactly 24 devices and 36 links", () => {
      const env = generateFabricatorEnvironmentFor("campus", "env-campus-1", "Campus");
      expect(env.devices.length).toBe(24);
      expect(env.links.length).toBe(36);
    });

    it("datacenter-pod produces exactly 32 devices and 64 links", () => {
      const env = generateFabricatorEnvironmentFor(
        "datacenter-pod",
        "env-dc-1",
        "Datacenter",
      );
      expect(env.devices.length).toBe(32);
      expect(env.links.length).toBe(64);
    });

    it("metro-mega-city produces exactly 96 devices and 240 links", () => {
      const env = generateFabricatorEnvironmentFor("metro-mega-city", "env-metro-1", "Metro");
      expect(env.devices.length).toBe(96);
      expect(env.links.length).toBe(240);
    });

    it("throws Error for unknown scenario", () => {
      expect(() =>
        generateFabricatorEnvironmentFor("unknown-scenario", "env-test", "Test"),
      ).toThrow("Scenario not found: unknown-scenario");
    });

    it("all devices have vendor 'synthetic'", () => {
      const env = generateFabricatorEnvironmentFor("campus", "env-test", "Test");
      env.devices.forEach((d) => {
        expect(d.vendor).toBe("synthetic");
      });
    });

    it("all devices have platform starting with 'synthetic'", () => {
      const env = generateFabricatorEnvironmentFor("campus", "env-test", "Test");
      env.devices.forEach((d) => {
        expect(d.platform).toMatch(/^synthetic-/);
      });
    });

    it("all devices have source 'fabricated'", () => {
      const env = generateFabricatorEnvironmentFor("campus", "env-test", "Test");
      env.devices.forEach((d) => {
        expect(d.source).toBe("fabricated");
      });
    });

    it("all devices have role_hint 'device'", () => {
      const env = generateFabricatorEnvironmentFor("campus", "env-test", "Test");
      env.devices.forEach((d) => {
        expect(d.role_hint).toBe("device");
      });
    });

    it("all links have kind 'manual'", () => {
      const env = generateFabricatorEnvironmentFor("campus", "env-test", "Test");
      env.links.forEach((l) => {
        expect(l.kind).toBe("manual");
      });
    });

    it("all links have source 'fabricated'", () => {
      const env = generateFabricatorEnvironmentFor("campus", "env-test", "Test");
      env.links.forEach((l) => {
        expect(l.source).toBe("fabricated");
      });
    });

    it("all links reference valid device IDs", () => {
      const env = generateFabricatorEnvironmentFor("campus", "env-test", "Test");
      const deviceIds = new Set(env.devices.map((d) => d.id));
      env.links.forEach((l) => {
        expect(deviceIds.has(l.source_device_id)).toBe(true);
        expect(deviceIds.has(l.target_device_id)).toBe(true);
      });
    });

    it("is deterministic: same inputs produce equal output", () => {
      const env1 = generateFabricatorEnvironmentFor("campus", "env-test", "Test");
      const env2 = generateFabricatorEnvironmentFor("campus", "env-test", "Test");

      expect(env1.devices.length).toBe(env2.devices.length);
      expect(env1.links.length).toBe(env2.links.length);

      env1.devices.forEach((d, i) => {
        expect(d.id).toBe(env2.devices[i].id);
        expect(d.name).toBe(env2.devices[i].name);
      });

      env1.links.forEach((l, i) => {
        expect(l.id).toBe(env2.links[i].id);
        expect(l.source_device_id).toBe(env2.links[i].source_device_id);
        expect(l.target_device_id).toBe(env2.links[i].target_device_id);
      });
    });

    it("has provenance 'fabricated'", () => {
      const env = generateFabricatorEnvironmentFor("campus", "env-test", "Test");
      expect(env.provenance).toBe("fabricated");
    });

    it("has schema_version '1'", () => {
      const env = generateFabricatorEnvironmentFor("campus", "env-test", "Test");
      expect(env.schema_version).toBe("1");
    });
  });
});
