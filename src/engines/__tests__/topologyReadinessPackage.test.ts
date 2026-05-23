/**
 * B1.3 — Topology Readiness Package Tests.
 *
 * Validates projection and readiness checks for all canonical scenarios.
 */

import { describe, it, expect } from "vitest";
import { createTopologyReadinessPackage } from "../topologyReadinessPackage";
import {
  createInitialStore,
  createEnvironmentFromScenario,
  listEnvironments,
  selectActiveEnvironment,
  archiveEnvironment,
} from "../../state/environmentLifecycle";
import type { LocalEnvironmentRecord } from "../../types/localEnvironment";

describe("topologyReadinessPackage", () => {
  describe("createTopologyReadinessPackage with null/undefined", () => {
    it("returns ready=false and no_active_environment blocker for null", () => {
      const result = createTopologyReadinessPackage(null);
      expect(result.ready).toBe(false);
      expect(result.device_count).toBe(0);
      expect(result.link_count).toBe(0);
      expect(result.endpoints_valid).toBe(false);
      expect(result.graph_projection_available).toBe(false);
      expect(result.blockers).toContain(
        "no_active_environment: No active environment"
      );
    });

    it("returns ready=false and no_active_environment blocker for undefined", () => {
      const result = createTopologyReadinessPackage(undefined);
      expect(result.ready).toBe(false);
      expect(result.blockers).toContain(
        "no_active_environment: No active environment"
      );
    });

    it("defaults to data_source_label='simulated' for null record", () => {
      const result = createTopologyReadinessPackage(null);
      expect(result.data_source_label).toBe("simulated");
    });
  });

  describe("createTopologyReadinessPackage with archived record", () => {
    it("returns ready=false when record lifecycle_state is archived", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      let record = listEnvironments(store)[0]!;

      // Manually construct an archived record for testing
      const archivedRecord: LocalEnvironmentRecord = {
        ...record,
        lifecycle_state: "archived",
      };

      const result = createTopologyReadinessPackage(archivedRecord);
      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes("archived"))).toBe(true);
    });

    it("archived record still reflects device and link counts", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      let record = listEnvironments(store)[0]!;

      // Manually construct an archived record
      const archivedRecord: LocalEnvironmentRecord = {
        ...record,
        lifecycle_state: "archived",
      };

      const result = createTopologyReadinessPackage(archivedRecord);
      expect(result.device_count).toBeGreaterThan(0);
      expect(result.link_count).toBeGreaterThan(0);
    });
  });

  describe("createTopologyReadinessPackage with valid records", () => {
    it("micro-lab returns ready=true with correct device/link counts", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = createTopologyReadinessPackage(record);
      expect(result.ready).toBe(true);
      expect(result.device_count).toBe(3);
      expect(result.link_count).toBe(2);
      expect(result.endpoints_valid).toBe(true);
      expect(result.graph_projection_available).toBe(true);
      expect(result.blockers.length).toBe(0);
    });

    it("branch-office returns ready=true with valid device/link counts", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "branch-office", {
        name: "Branch Office",
      });
      const record = listEnvironments(store)[0]!;

      const result = createTopologyReadinessPackage(record);
      expect(result.ready).toBe(true);
      expect(result.device_count).toBeGreaterThan(0);
      expect(result.link_count).toBeGreaterThan(0);
      expect(result.endpoints_valid).toBe(true);
      expect(result.graph_projection_available).toBe(true);
    });

    it("campus returns ready=true with valid device/link counts", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "campus", {
        name: "Campus",
      });
      const record = listEnvironments(store)[0]!;

      const result = createTopologyReadinessPackage(record);
      expect(result.ready).toBe(true);
      expect(result.device_count).toBeGreaterThan(0);
      expect(result.link_count).toBeGreaterThan(0);
      expect(result.endpoints_valid).toBe(true);
      expect(result.graph_projection_available).toBe(true);
    });

    it("datacenter-pod returns ready=true with valid device/link counts", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "datacenter-pod", {
        name: "Datacenter Pod",
      });
      const record = listEnvironments(store)[0]!;

      const result = createTopologyReadinessPackage(record);
      expect(result.ready).toBe(true);
      expect(result.device_count).toBeGreaterThan(0);
      expect(result.link_count).toBeGreaterThan(0);
      expect(result.endpoints_valid).toBe(true);
      expect(result.graph_projection_available).toBe(true);
    });

    it("metro-mega-city returns ready=true with valid device/link counts", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "metro-mega-city", {
        name: "Metro Mega City",
      });
      const record = listEnvironments(store)[0]!;

      const result = createTopologyReadinessPackage(record);
      expect(result.ready).toBe(true);
      expect(result.device_count).toBeGreaterThan(0);
      expect(result.link_count).toBeGreaterThan(0);
      expect(result.endpoints_valid).toBe(true);
      expect(result.graph_projection_available).toBe(true);
    });
  });

  describe("createTopologyReadinessPackage endpoints validation", () => {
    it("detects broken endpoint device_id and marks endpoints_valid=false", () => {
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

      const result = createTopologyReadinessPackage(mutatedRecord);
      expect(result.endpoints_valid).toBe(false);
      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes("endpoints_valid"))).toBe(
        true
      );
    });

    it("detects broken endpoint interface_id and marks endpoints_valid=false", () => {
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

      const result = createTopologyReadinessPackage(mutatedRecord);
      expect(result.endpoints_valid).toBe(false);
      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes("endpoints_valid"))).toBe(
        true
      );
    });
  });

  describe("createTopologyReadinessPackage with empty devices/links", () => {
    it("returns ready=false when device_count=0", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      let record = listEnvironments(store)[0]!;

      // Mutate to have zero devices
      const mutatedRecord: LocalEnvironmentRecord = {
        ...record,
        lab_payload: {
          ...record.lab_payload,
          devices: [],
        },
      };

      const result = createTopologyReadinessPackage(mutatedRecord);
      expect(result.device_count).toBe(0);
      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes("device_count"))).toBe(
        true
      );
    });

    it("returns ready=false when link_count=0", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      let record = listEnvironments(store)[0]!;

      // Mutate to have zero links
      const mutatedRecord: LocalEnvironmentRecord = {
        ...record,
        lab_payload: {
          ...record.lab_payload,
          links: [],
        },
      };

      const result = createTopologyReadinessPackage(mutatedRecord);
      expect(result.link_count).toBe(0);
      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes("link_count"))).toBe(
        true
      );
    });
  });

  describe("createTopologyReadinessPackage data source label", () => {
    it("returns data_source_label='simulated' for generated-lab provenance", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = createTopologyReadinessPackage(record);
      expect(result.data_source_label).toBe("simulated");
      expect(result.source).toBe("generated-lab");
    });

    it("returns data_source_label='simulated' for fabricated kind", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      let record = listEnvironments(store)[0]!;

      // Verify that micro-lab kind is fabricated or generated-lab
      expect(["fabricated", "generated-lab"]).toContain(record.kind);

      const result = createTopologyReadinessPackage(record);
      expect(result.data_source_label).toBe("simulated");
    });
  });

  describe("package structure and immutability", () => {
    it("returns frozen arrays in the package", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = createTopologyReadinessPackage(record);
      expect(Object.isFrozen(result.blockers)).toBe(true);
      expect(Object.isFrozen(result.warnings)).toBe(true);
    });

    it("all required fields are present in the package", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = createTopologyReadinessPackage(record);
      expect(typeof result.ready).toBe("boolean");
      expect(typeof result.device_count).toBe("number");
      expect(typeof result.link_count).toBe("number");
      expect(typeof result.endpoints_valid).toBe("boolean");
      expect(typeof result.source).toBe("string");
      expect(typeof result.data_source_label).toBe("string");
      expect(typeof result.graph_projection_available).toBe("boolean");
      expect(Array.isArray(result.blockers)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});
