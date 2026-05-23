/**
 * Hardware kit port unit tests.
 *
 * Uses Babylon's NullEngine to exercise mesh construction without a
 * WebGL context — works under jsdom + vitest.
 */

import { describe, expect, it } from "vitest";
import { NullEngine, Scene } from "@babylonjs/core";

import {
  AllProfiles,
  buildHardwareModel,
  buildMaterials,
  findProfile,
  meshId,
  parseMeshId,
  readZone,
  type BuiltModel,
} from "..";

function withScene<T>(fn: (scene: Scene) => T): T {
  const engine = new NullEngine({
    renderWidth: 256,
    renderHeight: 256,
    textureSize: 256,
    deterministicLockstep: false,
    lockstepMaxSteps: 1,
  });
  const scene = new Scene(engine);
  try {
    return fn(scene);
  } finally {
    scene.dispose();
    engine.dispose();
  }
}

describe("hardware kit — mesh ID format", () => {
  it("composes <modelId>.<zoneKind>.<index>", () => {
    expect(meshId("access48", "port", 17)).toBe("access48.port.17");
    expect(meshId("core4u_rt", "blade", 2)).toBe("core4u_rt.blade.2");
    expect(meshId("unk1u", "chassis", 0)).toBe("unk1u.chassis.0");
  });

  it("round-trips via parseMeshId", () => {
    const tag = parseMeshId("fw2u_ha.psu.1");
    expect(tag).toEqual({ modelId: "fw2u_ha", kind: "psu", index: 1 });
  });

  it("rejects malformed ids", () => {
    expect(parseMeshId("not.an.id.extra")).toBeNull();
    expect(parseMeshId("missing-segments")).toBeNull();
    expect(parseMeshId("access48.port.NaN")).toBeNull();
  });
});

describe("hardware kit — port index ranges", () => {
  it("indexes RJ45 from 0, SFP from 1000, QSFP from 2000", () => {
    withScene((scene) => {
      const mats = buildMaterials(scene);
      const access48 = findProfile("access48");
      expect(access48).toBeDefined();
      const built = buildHardwareModel(scene, access48!, mats);
      const indices = collectPortIndices(built);
      // 48 RJ45 (24 cols × 2 rows) + 4 SFP
      const rj45 = indices.filter((i) => i < 1000);
      const sfp = indices.filter((i) => i >= 1000 && i < 2000);
      expect(rj45.length).toBe(48);
      expect(Math.max(...rj45)).toBe(47);
      expect(sfp.length).toBe(4);
      expect(sfp[0]).toBe(1000);
    });
  });

  it("indexes QSFP rows from 2000", () => {
    withScene((scene) => {
      const mats = buildMaterials(scene);
      const leaf = findProfile("leaf32q");
      expect(leaf).toBeDefined();
      const built = buildHardwareModel(scene, leaf!, mats);
      const qsfp = collectPortIndices(built).filter((i) => i >= 2000);
      // 16 + 16 QSFP across two rows
      expect(qsfp.length).toBe(32);
      expect(qsfp.every((i) => i >= 2000 && i < 3000)).toBe(true);
    });
  });
});

describe("hardware kit — unk1u resolves", () => {
  it("registers under AllProfiles with family=unknown", () => {
    const unk = findProfile("unk1u");
    expect(unk).toBeDefined();
    expect(unk!.family).toBe("unknown");
  });

  it("builds with a chassis zone and at least one pickable label", () => {
    withScene((scene) => {
      const mats = buildMaterials(scene);
      const built = buildHardwareModel(scene, findProfile("unk1u")!, mats);
      const kinds = new Set<string>();
      for (const v of built.zoneMap.values()) kinds.add(v.kind);
      expect(kinds.has("chassis")).toBe(true);
      expect(kinds.has("label")).toBe(true);
      expect(kinds.has("led")).toBe(true);
    });
  });
});

describe("hardware kit — zone tag round-trip via metadata", () => {
  it("readZone returns the same tag tagZone wrote", () => {
    withScene((scene) => {
      const mats = buildMaterials(scene);
      const built = buildHardwareModel(scene, findProfile("access24")!, mats);
      const port = built.pickables.find((m) => m.name === "access24.port.0");
      expect(port).toBeDefined();
      const tag = readZone(port!);
      expect(tag).toEqual({ modelId: "access24", kind: "port", index: 0 });
    });
  });
});

describe("hardware kit — every profile builds", () => {
  it("all 21 profiles produce a BuiltModel without throwing", () => {
    withScene((scene) => {
      const mats = buildMaterials(scene);
      expect(AllProfiles.length).toBe(21);
      for (const profile of AllProfiles) {
        const built = buildHardwareModel(scene, profile, mats);
        expect(built.profileId).toBe(profile.id);
        expect(built.pickables.length).toBeGreaterThan(0);
        expect(built.zoneMap.size).toBeGreaterThan(0);
        // chassis is always present
        expect(built.pickables.some((m) => m.name.endsWith(".chassis.0"))).toBe(true);
      }
    });
  });
});

describe("hardware kit — label dense indexing", () => {
  it("multiple non-vendor labels get sequential indices", () => {
    withScene((scene) => {
      const mats = buildMaterials(scene);
      const built = buildHardwareModel(scene, findProfile("unk1u")!, mats);
      const labels = Array.from(built.zoneMap.values()).filter(
        (z) => z.kind === "label",
      );
      // unk1u has a vendorPlate label (skipped) + one hostname label (index 0)
      expect(labels.length).toBe(1);
      expect(labels[0].index).toBe(0);
    });
  });
});

describe("hardware kit — telemetry seam", () => {
  it("setTelemetry runs across all states without throwing", () => {
    withScene((scene) => {
      const mats = buildMaterials(scene);
      const built = buildHardwareModel(scene, findProfile("access48")!, mats);
      for (const state of ["up", "warning", "critical", "down", "unknown"] as const) {
        expect(() => built.setTelemetry(state)).not.toThrow();
      }
    });
  });
});

function collectPortIndices(built: BuiltModel): number[] {
  const out: number[] = [];
  for (const [, v] of built.zoneMap) {
    if (v.kind === "port") out.push(v.index);
  }
  return out;
}
