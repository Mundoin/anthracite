/**
 * B1.1 — Environment Creation Type Contract Tests.
 */

import { describe, it, expect } from "vitest";
import {
  ENVIRONMENT_CREATION_TYPES,
  getCreationType,
  type EnvironmentCreationTypeId,
} from "../environmentCreationTypes";

describe("environmentCreationTypes", () => {
  describe("ENVIRONMENT_CREATION_TYPES", () => {
    it("contains exactly 3 entries", () => {
      expect(ENVIRONMENT_CREATION_TYPES.length).toBe(3);
    });

    it("only generated-lab has status='available'", () => {
      const available = ENVIRONMENT_CREATION_TYPES.filter(
        (t) => t.status === "available"
      );
      expect(available).toHaveLength(1);
      expect(available[0]!.id).toBe("generated-lab");
    });

    it("import and live-discovery have status='planned'", () => {
      const planned = ENVIRONMENT_CREATION_TYPES.filter(
        (t) => t.status === "planned"
      );
      expect(planned).toHaveLength(2);
      expect(planned.map((t) => t.id).sort()).toEqual([
        "import",
        "live-discovery",
      ]);
    });

    it("all entries have non-empty output_contract", () => {
      for (const type of ENVIRONMENT_CREATION_TYPES) {
        expect(type.output_contract.length).toBeGreaterThan(0);
      }
    });

    it("all entries have non-empty readiness_notes", () => {
      for (const type of ENVIRONMENT_CREATION_TYPES) {
        expect(type.readiness_notes.length).toBeGreaterThan(0);
      }
    });

    it("all entries have required_inputs array", () => {
      for (const type of ENVIRONMENT_CREATION_TYPES) {
        expect(Array.isArray(type.required_inputs)).toBe(true);
        expect(type.required_inputs.length).toBeGreaterThan(0);
      }
    });

    it("generated-lab requires scenario_id", () => {
      const generatedLab = ENVIRONMENT_CREATION_TYPES.find(
        (t) => t.id === "generated-lab"
      )!;
      expect(generatedLab.required_inputs).toContain("scenario_id");
    });

    it("import requires config archive or evidence files", () => {
      const importType = ENVIRONMENT_CREATION_TYPES.find(
        (t) => t.id === "import"
      )!;
      expect(importType.required_inputs).toContain(
        "config archive or evidence files"
      );
    });

    it("live-discovery requires SSH credentials, SNMP target, or discovery seed", () => {
      const liveDiscovery = ENVIRONMENT_CREATION_TYPES.find(
        (t) => t.id === "live-discovery"
      )!;
      expect(liveDiscovery.required_inputs).toContain(
        "SSH credentials, SNMP target, or discovery seed"
      );
    });

    it("is frozen (immutable)", () => {
      expect(Object.isFrozen(ENVIRONMENT_CREATION_TYPES)).toBe(true);
    });
  });

  describe("getCreationType", () => {
    it("returns correct record for generated-lab", () => {
      const result = getCreationType("generated-lab");
      expect(result.id).toBe("generated-lab");
      expect(result.status).toBe("available");
    });

    it("returns correct record for import", () => {
      const result = getCreationType("import");
      expect(result.id).toBe("import");
      expect(result.status).toBe("planned");
    });

    it("returns correct record for live-discovery", () => {
      const result = getCreationType("live-discovery");
      expect(result.id).toBe("live-discovery");
      expect(result.status).toBe("planned");
    });

    it("throws Error for unknown type id", () => {
      expect(() => {
        getCreationType("unknown-type" as EnvironmentCreationTypeId);
      }).toThrow("Environment creation type not found: unknown-type");
    });

    it("returns the same reference from ENVIRONMENT_CREATION_TYPES", () => {
      const fromFunction = getCreationType("generated-lab");
      const fromArray = ENVIRONMENT_CREATION_TYPES.find(
        (t) => t.id === "generated-lab"
      )!;
      expect(fromFunction).toBe(fromArray);
    });
  });
});
