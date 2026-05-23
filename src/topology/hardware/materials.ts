/**
 * Material catalog for the hardware kit.
 *
 * Ported from design-review/anthracite-topology-hardware-model-kit-v0/src/materials.ts
 * in stage V1BE. StandardMaterial only — no PBR per babylon-integration-notes.
 */

import { Color3, Scene, StandardMaterial } from "@babylonjs/core";

interface MakeOpts {
  ambient?: Color3;
  emissive?: Color3;
  alpha?: number;
  backFaceCulling?: boolean;
}

function make(
  scene: Scene,
  name: string,
  diffuse: Color3,
  specular: Color3,
  specPower: number,
  opts: MakeOpts = {},
): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = diffuse;
  m.specularColor = specular;
  m.specularPower = specPower;
  m.ambientColor = opts.ambient ?? new Color3(0.5, 0.55, 0.6);
  m.emissiveColor = opts.emissive ?? new Color3(0, 0, 0);
  if (opts.alpha !== undefined) m.alpha = opts.alpha;
  if (opts.backFaceCulling !== undefined) m.backFaceCulling = opts.backFaceCulling;
  return m;
}

export interface HardwareMaterials {
  darkMetal: StandardMaterial;
  lightMetal: StandardMaterial;
  glass: StandardMaterial;
  paper: StandardMaterial;
  portCavity: StandardMaterial;
  bayOpening: StandardMaterial;
  moduleBody: StandardMaterial;
  ledOk: StandardMaterial;
  ledWarn: StandardMaterial;
  ledErr: StandardMaterial;
  ledCrit: StandardMaterial;
  ledIdle: StandardMaterial;
  cyan: StandardMaterial;
  cyanSoft: StandardMaterial;
  label: StandardMaterial;
}

export function buildMaterials(scene: Scene): HardwareMaterials {
  return {
    darkMetal: make(
      scene,
      "mat.darkMetal",
      new Color3(0.18, 0.20, 0.22),
      new Color3(0.32, 0.34, 0.36),
      64,
    ),
    lightMetal: make(
      scene,
      "mat.lightMetal",
      new Color3(0.74, 0.76, 0.78),
      new Color3(0.55, 0.55, 0.55),
      96,
    ),
    glass: make(
      scene,
      "mat.glass",
      new Color3(0.30, 0.55, 0.65),
      new Color3(0.95, 0.95, 0.95),
      256,
      { alpha: 0.32, backFaceCulling: false },
    ),
    paper: make(
      scene,
      "mat.paper",
      new Color3(0.94, 0.96, 0.97),
      new Color3(0.18, 0.18, 0.18),
      32,
    ),
    portCavity: make(
      scene,
      "mat.portCavity",
      new Color3(0.04, 0.06, 0.08),
      new Color3(0.04, 0.04, 0.04),
      16,
    ),
    bayOpening: make(
      scene,
      "mat.bayOpening",
      new Color3(0.08, 0.10, 0.12),
      new Color3(0.06, 0.06, 0.06),
      24,
    ),
    moduleBody: make(
      scene,
      "mat.moduleBody",
      new Color3(0.55, 0.58, 0.60),
      new Color3(0.40, 0.40, 0.40),
      80,
    ),
    ledOk: make(
      scene,
      "mat.led.ok",
      new Color3(0.10, 0.55, 0.30),
      new Color3(0.1, 0.1, 0.1),
      32,
      { emissive: new Color3(0.10, 0.45, 0.25) },
    ),
    ledWarn: make(
      scene,
      "mat.led.warn",
      new Color3(0.85, 0.50, 0.10),
      new Color3(0.1, 0.1, 0.1),
      32,
      { emissive: new Color3(0.80, 0.45, 0.10) },
    ),
    ledErr: make(
      scene,
      "mat.led.err",
      new Color3(0.75, 0.18, 0.18),
      new Color3(0.1, 0.1, 0.1),
      32,
      { emissive: new Color3(0.70, 0.18, 0.18) },
    ),
    ledCrit: make(
      scene,
      "mat.led.crit",
      new Color3(0.88, 0.16, 0.16),
      new Color3(0.1, 0.1, 0.1),
      32,
      { emissive: new Color3(0.95, 0.16, 0.16) },
    ),
    ledIdle: make(
      scene,
      "mat.led.idle",
      new Color3(0.45, 0.50, 0.54),
      new Color3(0.1, 0.1, 0.1),
      32,
    ),
    cyan: make(
      scene,
      "mat.cyan",
      new Color3(0.05, 0.45, 0.62),
      new Color3(0.2, 0.2, 0.2),
      64,
      { emissive: new Color3(0.05, 0.30, 0.40) },
    ),
    cyanSoft: make(
      scene,
      "mat.cyanSoft",
      new Color3(0.78, 0.88, 0.92),
      new Color3(0.2, 0.2, 0.2),
      64,
      { emissive: new Color3(0.12, 0.30, 0.38) },
    ),
    label: make(
      scene,
      "mat.label",
      new Color3(0.08, 0.10, 0.12),
      new Color3(0.06, 0.06, 0.06),
      8,
    ),
  };
}
