import { describe, expect, it } from "vitest";
import {
  toFabricatorEnvironmentEntry,
  getFabricatorEnvironmentEntry,
  mergeWithFabricatorEnvironment,
  FABRICATOR_ENVIRONMENT_KIND,
} from "../fabricatorEnvironmentCatalogue";
import { generateFabricatorEnvironment } from "../../engines/fabricator";

describe("toFabricatorEnvironmentEntry", () => {
  it("maps environment_id to entry id", () => {
    const env = generateFabricatorEnvironment();
    const entry = toFabricatorEnvironmentEntry(env);
    expect(entry.id).toBe(env.environment_id);
  });

  it("maps device count correctly", () => {
    const env = generateFabricatorEnvironment();
    const entry = toFabricatorEnvironmentEntry(env);
    expect(entry.device_count).toBe(env.devices.length);
    expect(entry.device_count).toBe(3);
  });

  it("kind is FABRICATOR_ENVIRONMENT_KIND", () => {
    const env = generateFabricatorEnvironment();
    const entry = toFabricatorEnvironmentEntry(env);
    expect(entry.kind).toBe(FABRICATOR_ENVIRONMENT_KIND);
    expect(entry.kind).toBe("fabricated");
  });

  it("status is 'unknown' — honest, no live polling", () => {
    const env = generateFabricatorEnvironment();
    const entry = toFabricatorEnvironmentEntry(env);
    expect(entry.status).toBe("unknown");
  });

  it("summary contains provenance signal", () => {
    const env = generateFabricatorEnvironment();
    const entry = toFabricatorEnvironmentEntry(env);
    expect(entry.summary.toLowerCase()).toMatch(/fabricat|synthetic|demo/);
  });

  it("maps name from environment", () => {
    const env = generateFabricatorEnvironment();
    const entry = toFabricatorEnvironmentEntry(env);
    expect(entry.name).toBe(env.name);
  });
});

describe("getFabricatorEnvironmentEntry", () => {
  it("returns stable entry across calls", () => {
    const a = getFabricatorEnvironmentEntry();
    const b = getFabricatorEnvironmentEntry();
    expect(a).toBe(b);
  });

  it("entry id is env-fab-demo", () => {
    expect(getFabricatorEnvironmentEntry().id).toBe("env-fab-demo");
  });

  it("device_count is 3", () => {
    expect(getFabricatorEnvironmentEntry().device_count).toBe(3);
  });

  it("kind is fabricated", () => {
    expect(getFabricatorEnvironmentEntry().kind).toBe("fabricated");
  });

  it("status is unknown", () => {
    expect(getFabricatorEnvironmentEntry().status).toBe("unknown");
  });
});

describe("mergeWithFabricatorEnvironment", () => {
  it("prepends fabricated entry to empty list", () => {
    const result = mergeWithFabricatorEnvironment([]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("env-fab-demo");
  });

  it("prepends fabricated entry to real environments", () => {
    const real = [
      { id: "env-prod-eu1", name: "Prod EU1", kind: "production", device_count: 42, status: "healthy" as const, updated_at: "2026-01-01", summary: "" },
    ];
    const result = mergeWithFabricatorEnvironment(real);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("env-fab-demo");
    expect(result[1].id).toBe("env-prod-eu1");
  });

  it("does not duplicate if env-fab-demo already present", () => {
    const withFab = mergeWithFabricatorEnvironment([]);
    const again = mergeWithFabricatorEnvironment(withFab);
    expect(again.filter((e) => e.id === "env-fab-demo")).toHaveLength(1);
  });

  it("does not mutate the input array", () => {
    const real = [
      { id: "env-prod-eu1", name: "Prod EU1", kind: "production", device_count: 5, status: "healthy" as const, updated_at: "2026-01-01", summary: "" },
    ];
    const original = [...real];
    mergeWithFabricatorEnvironment(real);
    expect(real).toEqual(original);
  });

  it("preserves real environment data intact", () => {
    const real = [
      { id: "env-prod-eu1", name: "Prod EU1", kind: "production", device_count: 5, status: "healthy" as const, updated_at: "2026-01-01", summary: "ok" },
    ];
    const result = mergeWithFabricatorEnvironment(real);
    const prod = result.find((e) => e.id === "env-prod-eu1");
    expect(prod).toEqual(real[0]);
  });
});
