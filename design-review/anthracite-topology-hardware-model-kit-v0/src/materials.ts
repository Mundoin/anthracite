// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ NOTE FOR OCC IMPLEMENTERS                                                   │
// │ This file is the canonical TypeScript source. In the preview it is loaded   │
// │ via Babel-standalone with the `typescript` preset, which only strips type │
// │ annotations — it does not resolve ES module syntax. Cross-file linkage is  │
// │ therefore done through `window.Anthracite*` globals (see end of file).   │
// │ When integrating into a real bundler (Vite/esbuild/tsc), restore the       │
// │ `import` / `export` keywords as needed.                                 │
// └─────────────────────────────────────────────────────────────────────────────┘

// Anthracite — Hardware Model Kit · materials
//
// Material library for chassis finishes and faceplate fixtures.
// Tuned StandardMaterial — no PBR, no HDR env needed, no external textures.
// Looks credible under one DirectionalLight + one HemisphericLight + SSAO2.

declare const BABYLON: any;

type FinishKey = 'darkMetal' | 'lightMetal' | 'glass';

function buildMaterials(scene: any) {
  const C3 = BABYLON.Color3;

  const make = (
    name: string,
    diffuse: any, specular: any, specPower: number,
    opts: any = {}
  ) => {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor  = diffuse;
    m.specularColor = specular;
    m.specularPower = specPower;
    m.ambientColor  = opts.ambient  ?? new C3(0.5, 0.55, 0.6);
    m.emissiveColor = opts.emissive ?? new C3(0, 0, 0);
    if (opts.alpha !== undefined) m.alpha = opts.alpha;
    if (opts.backFaceCulling !== undefined) m.backFaceCulling = opts.backFaceCulling;
    return m;
  };

  return {
    // ── chassis finishes ───────────────────────────────────────────────────
    darkMetal:   make('mat.darkMetal',
                       new C3(0.18, 0.20, 0.22),
                       new C3(0.32, 0.34, 0.36), 64),
    lightMetal:  make('mat.lightMetal',
                       new C3(0.74, 0.76, 0.78),
                       new C3(0.55, 0.55, 0.55), 96),
    glass:       make('mat.glass',
                       new C3(0.30, 0.55, 0.65),
                       new C3(0.95, 0.95, 0.95), 256,
                       { alpha: 0.32, backFaceCulling: false }),

    // ── faceplate fixtures ─────────────────────────────────────────────────
    paper:       make('mat.paper',
                       new C3(0.94, 0.96, 0.97),
                       new C3(0.18, 0.18, 0.18), 32),
    portCavity:  make('mat.portCavity',
                       new C3(0.04, 0.06, 0.08),
                       new C3(0.04, 0.04, 0.04), 16),
    bayOpening:  make('mat.bayOpening',
                       new C3(0.08, 0.10, 0.12),
                       new C3(0.06, 0.06, 0.06), 24),
    moduleBody:  make('mat.moduleBody',
                       new C3(0.55, 0.58, 0.60),
                       new C3(0.40, 0.40, 0.40), 80),

    // ── LED states ────────────────────────────────────────────────────────
    ledOk:       make('mat.led.ok',     new C3(0.10, 0.55, 0.30),
                       new C3(0.1,0.1,0.1), 32,
                       { emissive: new C3(0.10, 0.45, 0.25) }),
    ledWarn:     make('mat.led.warn',   new C3(0.85, 0.50, 0.10),
                       new C3(0.1,0.1,0.1), 32,
                       { emissive: new C3(0.80, 0.45, 0.10) }),
    ledErr:      make('mat.led.err',    new C3(0.75, 0.18, 0.18),
                       new C3(0.1,0.1,0.1), 32,
                       { emissive: new C3(0.70, 0.18, 0.18) }),
    ledCrit:     make('mat.led.crit',   new C3(0.88, 0.16, 0.16),
                       new C3(0.1,0.1,0.1), 32,
                       { emissive: new C3(0.95, 0.16, 0.16) }),
    ledIdle:     make('mat.led.idle',   new C3(0.45, 0.50, 0.54),
                       new C3(0.1,0.1,0.1), 32),

    // ── signal cyan (live port, screen content, focus accents) ────────────
    cyan:        make('mat.cyan',       new C3(0.05, 0.45, 0.62),
                       new C3(0.2,0.2,0.2), 64,
                       { emissive: new C3(0.05, 0.30, 0.40) }),
    cyanSoft:    make('mat.cyanSoft',   new C3(0.78, 0.88, 0.92),
                       new C3(0.2,0.2,0.2), 64,
                       { emissive: new C3(0.12, 0.30, 0.38) }),

    // ── label / vendor plate type rendered as decals  ─────────────────────
    label:       make('mat.label',
                       new C3(0.08, 0.10, 0.12),
                       new C3(0.06, 0.06, 0.06), 8),
  };
}

// expose on window for cross-file consumers
(window as any).AnthraciteMaterials = { buildMaterials };
