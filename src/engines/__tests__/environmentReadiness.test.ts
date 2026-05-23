/**
 * B1.2 — Environment Readiness Evaluator Tests.
 *
 * Validates all 7 readiness rules and edge cases.
 */

import { describe, it, expect } from "vitest";
import { evaluateEnvironmentReadiness } from "../environmentReadiness";
import {
  createInitialStore,
  createEnvironmentFromScenario,
  listEnvironments,
} from "../../state/environmentLifecycle";
import type { LocalEnvironmentRecord } from "../../types/localEnvironment";

describe("environmentReadiness", () => {
  describe("evaluateEnvironmentReadiness with null/undefined", () => {
    it("returns ready=false and no_active_environment blocker for null", () => {
      const result = evaluateEnvironmentReadiness(null);
      expect(result.ready).toBe(false);
      expect(result.blockers).toContain(
        "no_active_environment: No active environment"
      );
      expect(result.rules.inventory_ready).toBe(false);
      expect(result.rules.links_ready).toBe(false);
      expect(result.rules.interfaces_ready).toBe(false);
      expect(result.rules.addressing_ready).toBe(false);
      expect(result.rules.configs_ready).toBe(false);
      expect(result.rules.sync_ready).toBe(false);
      expect(result.rules.topology_data_ready).toBe(false);
    });

    it("returns ready=false and no_active_environment blocker for undefined", () => {
      const result = evaluateEnvironmentReadiness(undefined);
      expect(result.ready).toBe(false);
      expect(result.blockers).toContain(
        "no_active_environment: No active environment"
      );
    });

    it("summary is 'No active environment' for null record", () => {
      const result = evaluateEnvironmentReadiness(null);
      expect(result.summary).toBe("No active environment");
    });
  });

  describe("evaluateEnvironmentReadiness with valid micro-lab", () => {
    it("returns ready=true and all rules pass for valid micro-lab", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = evaluateEnvironmentReadiness(record);
      expect(result.ready).toBe(true);
      expect(result.rules.inventory_ready).toBe(true);
      expect(result.rules.links_ready).toBe(true);
      expect(result.rules.interfaces_ready).toBe(true);
      expect(result.rules.addressing_ready).toBe(true);
      expect(result.rules.configs_ready).toBe(true);
      expect(result.rules.sync_ready).toBe(true);
      expect(result.rules.topology_data_ready).toBe(true);
      expect(result.blockers.length).toBe(0);
      expect(result.summary).toContain("ready for topology activation");
    });

    it("micro-lab has 3 devices and 2 links", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      expect(record.lab_payload.devices.length).toBe(3);
      expect(record.lab_payload.links.length).toBe(2);
    });
  });

  describe("evaluateEnvironmentReadiness addressing rule", () => {
    it("detects duplicate management_ip and marks addressing_ready=false", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      let record = listEnvironments(store)[0]!;

      // Clone the record and mutate to have duplicate management IPs
      const devices = record.lab_payload.devices.map((d, idx) => {
        if (idx < 2) {
          // Make first two devices have the same management IP
          return {
            ...d,
            management_ip: {
              address: "10.10.0.1",
              prefix_length: 24,
              version: 4 as const,
            },
          };
        }
        return d;
      });

      const mutatedRecord: LocalEnvironmentRecord = {
        ...record,
        lab_payload: {
          ...record.lab_payload,
          devices,
        },
      };

      const result = evaluateEnvironmentReadiness(mutatedRecord);
      expect(result.rules.addressing_ready).toBe(false);
      expect(result.blockers.some((b) => b.includes("addressing_ready"))).toBe(
        true
      );
      expect(
        result.blockers.some((b) => b.includes("duplicate management_ip"))
      ).toBe(true);
    });
  });

  describe("evaluateEnvironmentReadiness links rule", () => {
    it("detects broken endpoint device_id and marks links_ready=false", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      let record = listEnvironments(store)[0]!;

      // Mutate first link to have non-existent endpoint_a_device_id
      const links = record.lab_payload.links.map((l, idx) => {
        if (idx === 0) {
          return {
            ...l,
            endpoint_a_device_id: "non-existent-device-999",
          };
        }
        return l;
      });

      const mutatedRecord: LocalEnvironmentRecord = {
        ...record,
        lab_payload: {
          ...record.lab_payload,
          links,
        },
      };

      const result = evaluateEnvironmentReadiness(mutatedRecord);
      expect(result.rules.links_ready).toBe(false);
      expect(result.blockers.some((b) => b.includes("links_ready"))).toBe(
        true
      );
    });
  });

  describe("evaluateEnvironmentReadiness interfaces rule", () => {
    it("detects broken endpoint interface_id and marks interfaces_ready=false", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      let record = listEnvironments(store)[0]!;

      // Mutate first link to have non-existent endpoint_a_interface_id
      const links = record.lab_payload.links.map((l, idx) => {
        if (idx === 0) {
          return {
            ...l,
            endpoint_a_interface_id: "non-existent-interface-999",
          };
        }
        return l;
      });

      const mutatedRecord: LocalEnvironmentRecord = {
        ...record,
        lab_payload: {
          ...record.lab_payload,
          links,
        },
      };

      const result = evaluateEnvironmentReadiness(mutatedRecord);
      expect(result.rules.interfaces_ready).toBe(false);
      expect(result.blockers.some((b) => b.includes("interfaces_ready"))).toBe(
        true
      );
    });
  });

  describe("evaluateEnvironmentReadiness configs rule", () => {
    it("returns configs_ready=true when configs.length > 0", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      expect(record.lab_payload.configs.length).toBeGreaterThan(0);
      const result = evaluateEnvironmentReadiness(record);
      expect(result.rules.configs_ready).toBe(true);
    });

    it("returns configs_ready=false when configs.length === 0", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      let record = listEnvironments(store)[0]!;

      // Mutate to have empty configs
      const mutatedRecord: LocalEnvironmentRecord = {
        ...record,
        lab_payload: {
          ...record.lab_payload,
          configs: [],
        },
      };

      const result = evaluateEnvironmentReadiness(mutatedRecord);
      expect(result.rules.configs_ready).toBe(false);
      expect(result.blockers.some((b) => b.includes("configs_ready"))).toBe(
        true
      );
    });
  });

  describe("evaluateEnvironmentReadiness sync rule", () => {
    it("returns sync_ready=true when environment_uid, revision >= 1, and sync_state present", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      expect(record.environment_uid).toBeTruthy();
      expect(record.revision).toBeGreaterThanOrEqual(1);
      expect(record.sync_state).toBeTruthy();

      const result = evaluateEnvironmentReadiness(record);
      expect(result.rules.sync_ready).toBe(true);
    });

    it("returns sync_ready=false when revision < 1", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      let record = listEnvironments(store)[0]!;

      // Mutate to have revision < 1
      const mutatedRecord: LocalEnvironmentRecord = {
        ...record,
        revision: 0,
      };

      const result = evaluateEnvironmentReadiness(mutatedRecord);
      expect(result.rules.sync_ready).toBe(false);
      expect(result.blockers.some((b) => b.includes("sync_ready"))).toBe(true);
      expect(result.blockers.some((b) => b.includes("revision"))).toBe(true);
    });
  });

  describe("verdict structure and immutability", () => {
    it("returns frozen arrays in the verdict", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = evaluateEnvironmentReadiness(record);
      expect(Object.isFrozen(result.warnings)).toBe(true);
      expect(Object.isFrozen(result.blockers)).toBe(true);
    });

    it("rules record is readonly", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = evaluateEnvironmentReadiness(record);
      expect(result.rules).toBeDefined();
      // Readonly at type level; runtime freeze is up to TypeScript
      expect(typeof result.rules.inventory_ready).toBe("boolean");
    });
  });

  describe("other scenarios (cross-scenario validation)", () => {
    it("branch-office scenario passes readiness check", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "branch-office", {
        name: "Branch Office",
      });
      const record = listEnvironments(store)[0]!;

      expect(record.lab_payload.devices.length).toBeGreaterThan(0);
      expect(record.lab_payload.links.length).toBeGreaterThan(0);

      const result = evaluateEnvironmentReadiness(record);
      expect(result.ready).toBe(true);
    });

    it("campus scenario passes readiness check", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "campus", {
        name: "Campus",
      });
      const record = listEnvironments(store)[0]!;

      expect(record.lab_payload.devices.length).toBeGreaterThan(0);
      expect(record.lab_payload.links.length).toBeGreaterThan(0);

      const result = evaluateEnvironmentReadiness(record);
      expect(result.ready).toBe(true);
    });

    it("datacenter-pod scenario passes readiness check", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "datacenter-pod", {
        name: "Datacenter Pod",
      });
      const record = listEnvironments(store)[0]!;

      expect(record.lab_payload.devices.length).toBeGreaterThan(0);
      expect(record.lab_payload.links.length).toBeGreaterThan(0);

      const result = evaluateEnvironmentReadiness(record);
      expect(result.ready).toBe(true);
    });

    it("metro-mega-city scenario passes readiness check", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "metro-mega-city", {
        name: "Metro Mega City",
      });
      const record = listEnvironments(store)[0]!;

      expect(record.lab_payload.devices.length).toBeGreaterThan(0);
      expect(record.lab_payload.links.length).toBeGreaterThan(0);

      const result = evaluateEnvironmentReadiness(record);
      expect(result.ready).toBe(true);
    });
  });
});
