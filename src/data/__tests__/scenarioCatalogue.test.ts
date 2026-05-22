import { describe, it, expect } from "vitest";
import {
  SCENARIO_CATALOGUE,
  listScenarios,
  getScenarioById,
  requireScenarioById,
} from "../scenarioCatalogue";
import { LAB_MAX_DEVICES, LAB_MAX_LINKS } from "../../types/labEnvironment";

describe("scenarioCatalogue", () => {
  it("contains all 5 scenarios with expected IDs", () => {
    const ids = SCENARIO_CATALOGUE.map((s) => s.scenario_id);
    expect(ids).toEqual([
      "micro-lab",
      "branch-office",
      "campus",
      "datacenter-pod",
      "metro-mega-city",
    ]);
  });

  it("has unique scenario IDs", () => {
    const ids = SCENARIO_CATALOGUE.map((s) => s.scenario_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("each scenario has a stable seed", () => {
    SCENARIO_CATALOGUE.forEach((s) => {
      expect(s.seed).toBeDefined();
      expect(s.seed.length).toBeGreaterThan(0);
    });
  });

  it("all scenarios within 128 device cap", () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      expect(scenario.target_device_count).toBeLessThanOrEqual(LAB_MAX_DEVICES);
      expect(scenario.max_device_count).toBeLessThanOrEqual(LAB_MAX_DEVICES);
    }
  });

  it("all scenarios within 384 link cap", () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      expect(scenario.target_link_count).toBeLessThanOrEqual(LAB_MAX_LINKS);
      expect(scenario.max_link_count).toBeLessThanOrEqual(LAB_MAX_LINKS);
    }
  });

  it("metro-mega-city is exactly 128 max devices", () => {
    const metro = getScenarioById("metro-mega-city");
    expect(metro).toBeDefined();
    expect(metro!.max_device_count).toBe(128);
  });

  it("every scenario has non-empty capabilities array", () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      expect(scenario.capabilities.length).toBeGreaterThan(0);
      expect(Array.isArray(scenario.capabilities)).toBe(true);
    }
  });

  it("every scenario has non-empty future_surfaces array", () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      expect(scenario.future_surfaces.length).toBeGreaterThan(0);
      expect(Array.isArray(scenario.future_surfaces)).toBe(true);
    }
  });

  it("every scenario has scenario_seed and target_device_count + target_link_count + max_device_count + max_link_count", () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      expect(scenario.scenario_seed).toBeTruthy();
      expect(typeof scenario.scenario_seed).toBe("string");
      expect(scenario.target_device_count).toBeDefined();
      expect(typeof scenario.target_device_count).toBe("number");
      expect(scenario.target_link_count).toBeDefined();
      expect(typeof scenario.target_link_count).toBe("number");
      expect(scenario.max_device_count).toBeDefined();
      expect(typeof scenario.max_device_count).toBe("number");
      expect(scenario.max_link_count).toBeDefined();
      expect(typeof scenario.max_link_count).toBe("number");
    }
  });

  it("backward compat: device_count === target_device_count", () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      expect(scenario.device_count).toBe(scenario.target_device_count);
    }
  });

  it("backward compat: link_count === target_link_count", () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      expect(scenario.link_count).toBe(scenario.target_link_count);
    }
  });

  it("backward compat: seed === scenario_seed", () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      expect(scenario.seed).toBe(scenario.scenario_seed);
    }
  });

  it("micro-lab maturity stable maps to lifecycle_status available", () => {
    const micro = getScenarioById("micro-lab");
    expect(micro).toBeDefined();
    expect(micro!.maturity).toBe("stable");
    expect(micro!.lifecycle_status).toBe("available");
  });

  it("metro-mega-city maturity experimental maps to lifecycle_status experimental", () => {
    const metro = getScenarioById("metro-mega-city");
    expect(metro).toBeDefined();
    expect(metro!.maturity).toBe("experimental");
    expect(metro!.lifecycle_status).toBe("experimental");
  });

  it("catalogue cap-guard does NOT throw on module load (smoke)", () => {
    // If we got here, the module loaded without throwing, so validation passed
    expect(SCENARIO_CATALOGUE).toBeDefined();
    expect(SCENARIO_CATALOGUE.length).toBe(5);
  });

  it("micro-lab has device_count: 3 and link_count: 2", () => {
    const microLab = getScenarioById("micro-lab");
    expect(microLab).toBeDefined();
    expect(microLab?.device_count).toBe(3);
    expect(microLab?.link_count).toBe(2);
  });

  it("branch-office has device_count: 8 and link_count: 10", () => {
    const branchOffice = getScenarioById("branch-office");
    expect(branchOffice).toBeDefined();
    expect(branchOffice?.device_count).toBe(8);
    expect(branchOffice?.link_count).toBe(10);
  });

  it("campus has device_count: 24 and link_count: 36", () => {
    const campus = getScenarioById("campus");
    expect(campus).toBeDefined();
    expect(campus?.device_count).toBe(24);
    expect(campus?.link_count).toBe(36);
  });

  it("datacenter-pod has device_count: 32 and link_count: 64", () => {
    const dc = getScenarioById("datacenter-pod");
    expect(dc).toBeDefined();
    expect(dc?.device_count).toBe(32);
    expect(dc?.link_count).toBe(64);
  });

  it("metro-mega-city has device_count: 96 and link_count: 240", () => {
    const metro = getScenarioById("metro-mega-city");
    expect(metro).toBeDefined();
    expect(metro?.device_count).toBe(96);
    expect(metro?.link_count).toBe(240);
  });

  it("branch-office, campus, datacenter-pod are all 'available'", () => {
    const branchOffice = getScenarioById("branch-office");
    const campus = getScenarioById("campus");
    const dc = getScenarioById("datacenter-pod");
    expect(branchOffice?.lifecycle_status).toBe("available");
    expect(campus?.lifecycle_status).toBe("available");
    expect(dc?.lifecycle_status).toBe("available");
  });

  it("metro-mega-city is 'experimental'", () => {
    const metro = getScenarioById("metro-mega-city");
    expect(metro?.lifecycle_status).toBe("experimental");
  });

  it("metro-mega-city has at least one limitation", () => {
    const metro = getScenarioById("metro-mega-city");
    expect(metro?.limitations.length).toBeGreaterThan(0);
  });

  it("catalogue is frozen", () => {
    expect(Object.isFrozen(SCENARIO_CATALOGUE)).toBe(true);
  });

  it("getScenarioById('micro-lab') returns the micro lab scenario", () => {
    const scenario = getScenarioById("micro-lab");
    expect(scenario).toBeDefined();
    expect(scenario?.scenario_id).toBe("micro-lab");
    expect(scenario?.name).toBe("Micro Lab");
  });

  it("getScenarioById('nonexistent') returns undefined", () => {
    const scenario = getScenarioById("nonexistent");
    expect(scenario).toBeUndefined();
  });

  it("requireScenarioById('nonexistent') throws", () => {
    expect(() => requireScenarioById("nonexistent")).toThrow("Scenario not found: nonexistent");
  });

  it("listScenarios returns the frozen catalogue", () => {
    const scenarios = listScenarios();
    expect(scenarios).toBe(SCENARIO_CATALOGUE);
    expect(Object.isFrozen(scenarios)).toBe(true);
  });

  it("all scenarios have valid target <= max for devices", () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      expect(scenario.target_device_count).toBeLessThanOrEqual(scenario.max_device_count);
    }
  });

  it("all scenarios have valid target <= max for links", () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      expect(scenario.target_link_count).toBeLessThanOrEqual(scenario.max_link_count);
    }
  });

  it("all scenarios have maturity field set", () => {
    for (const scenario of SCENARIO_CATALOGUE) {
      expect(scenario.maturity).toMatch(/^(stable|experimental|planned)$/);
    }
  });
});
