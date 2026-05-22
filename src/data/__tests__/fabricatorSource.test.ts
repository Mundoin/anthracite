import { describe, expect, it } from "vitest";
import { toFabricatorSourceView } from "../fabricatorSource";
import { generateFabricatorEnvironment } from "../../engines/fabricator";

describe("generateFabricatorEnvironment", () => {
  it("returns identical output on repeated calls (determinism)", () => {
    const a = generateFabricatorEnvironment();
    const b = generateFabricatorEnvironment();
    expect(a).toEqual(b);
  });

  it("produces at least 3 devices", () => {
    const env = generateFabricatorEnvironment();
    expect(env.devices.length).toBeGreaterThanOrEqual(3);
  });

  it("produces at least 2 links", () => {
    const env = generateFabricatorEnvironment();
    expect(env.links.length).toBeGreaterThanOrEqual(2);
  });

  it("all device IDs are stable across calls", () => {
    const a = generateFabricatorEnvironment();
    const b = generateFabricatorEnvironment();
    const idsA = a.devices.map((d) => d.id).sort();
    const idsB = b.devices.map((d) => d.id).sort();
    expect(idsA).toEqual(idsB);
  });

  it("all link IDs are stable across calls", () => {
    const a = generateFabricatorEnvironment();
    const b = generateFabricatorEnvironment();
    const idsA = a.links.map((l) => l.id).sort();
    const idsB = b.links.map((l) => l.id).sort();
    expect(idsA).toEqual(idsB);
  });

  it("device IDs are unique within the environment", () => {
    const env = generateFabricatorEnvironment();
    const ids = env.devices.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("link IDs are unique within the environment", () => {
    const env = generateFabricatorEnvironment();
    const ids = env.links.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all links reference valid device IDs", () => {
    const env = generateFabricatorEnvironment();
    const deviceIds = new Set(env.devices.map((d) => d.id));
    for (const link of env.links) {
      expect(deviceIds.has(link.source_device_id)).toBe(true);
      expect(deviceIds.has(link.target_device_id)).toBe(true);
    }
  });

  it("provenance is 'fabricated'", () => {
    const env = generateFabricatorEnvironment();
    expect(env.provenance).toBe("fabricated");
  });

  it("environment_id is stable", () => {
    const a = generateFabricatorEnvironment();
    const b = generateFabricatorEnvironment();
    expect(a.environment_id).toBe(b.environment_id);
    expect(a.environment_id).toBeTruthy();
  });

  it("all devices carry source='fabricated'", () => {
    const env = generateFabricatorEnvironment();
    for (const d of env.devices) {
      expect(d.source).toBe("fabricated");
    }
  });

  it("all links carry source='fabricated'", () => {
    const env = generateFabricatorEnvironment();
    for (const l of env.links) {
      expect(l.source).toBe("fabricated");
    }
  });

  it("devices have non-empty names and vendor hints", () => {
    const env = generateFabricatorEnvironment();
    for (const d of env.devices) {
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.vendor.length).toBeGreaterThan(0);
    }
  });
});

describe("toFabricatorSourceView", () => {
  it("always returns sourceState 'demo'", () => {
    const env = generateFabricatorEnvironment();
    const view = toFabricatorSourceView(env);
    expect(view.sourceState).toBe("demo");
  });

  it("reflects device and link counts", () => {
    const env = generateFabricatorEnvironment();
    const view = toFabricatorSourceView(env);
    expect(view.deviceCount).toBe(env.devices.length);
    expect(view.linkCount).toBe(env.links.length);
  });

  it("is never empty", () => {
    const env = generateFabricatorEnvironment();
    const view = toFabricatorSourceView(env);
    expect(view.isEmpty).toBe(false);
  });

  it("preserves environmentId", () => {
    const env = generateFabricatorEnvironment();
    const view = toFabricatorSourceView(env);
    expect(view.environmentId).toBe(env.environment_id);
  });

  it("preserves the environment reference", () => {
    const env = generateFabricatorEnvironment();
    const view = toFabricatorSourceView(env);
    expect(view.environment).toBe(env);
  });

  it("message is non-empty", () => {
    const env = generateFabricatorEnvironment();
    const view = toFabricatorSourceView(env);
    expect(view.message.length).toBeGreaterThan(0);
  });

  it("null input returns not_connected view", () => {
    const view = toFabricatorSourceView(null);
    expect(view.sourceState).toBe("not_connected");
    expect(view.deviceCount).toBe(0);
    expect(view.linkCount).toBe(0);
    expect(view.environment).toBe(null);
    expect(view.isEmpty).toBe(false);
  });
});
