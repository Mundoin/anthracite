# Hardware Model — runtime contract

The runtime contract OCC implementers can rely on. Every model in the
kit is built by a single factory call:

```ts
const built: BuiltModel = buildHardwareModel(scene, profile, mats, {
  shadowGenerator,        // optional Babylon ShadowGenerator
});
```

`buildHardwareModel` lives in `src/buildHardwareModel.ts`; per-family
wrappers (`buildSwitchModels`, `buildRouterModels`,
`buildFirewallModels`, `buildSupportModels`) batch-build all profiles
in a family and return them as `Record<profileId, BuiltModel>`.

## BuiltModel

```ts
type BuiltModel = {
  profileId:    string;                    // 'access48', 'fw2u_ha', ...
  root:         BABYLON.TransformNode;     // dispose this to remove the model
  pickables:    BABYLON.AbstractMesh[];    // every clickable mesh
  zoneMap:      Map<string, ZoneTag>;      // mesh.id → { kind, index }
  setTelemetry: (state: TelemetryState) => void;
};
```

## Lifecycle

1. **Build** — one call per profile at scene init. The factory creates
   the chassis, faceplate fixtures, and child meshes parented under
   `root`. Cost: ~5 ms for 1U, ~20 ms for the 4U/blade families on a
   mid-range laptop.

2. **Show / hide** — `root.setEnabled(true|false)`. The kit ships all
   models in `setEnabled(false)`; the preview enables one at a time.

3. **Telemetry** — `setTelemetry(state)` swaps LED and port materials
   per the synthetic generator. In OCC, replace
   `telemetryDemo.ts::generateTelemetry` with the real subscription;
   `BuiltModel.setTelemetry` is the only external entrypoint, so
   nothing else changes.

4. **Dispose** — `root.dispose(false, true)` removes the entire model
   including child meshes and the StandardMaterial instances scoped to
   the model. Shared materials (the `mats` bag) survive.

## Scene scale

- **1 scene unit = 100 mm.** A 1U chassis is therefore ~4.83 × 0.44 ×
  3.0 units. Camera radius for a comfortable framing is
  `max(w,h,d) / 100 × 1.65 + 0.5`.

- Chassis is centred at the origin. Front face is at `+Z`.

## Materials

`materials.ts::buildMaterials(scene)` produces the shared material bag.
Three finishes (`darkMetal`, `lightMetal`, `glass`) plus fixtures
(`portCavity`, `bayOpening`, `moduleBody`), signal cyans
(`cyan`, `cyanSoft`), and five LED states (`ledOk`, `ledWarn`,
`ledErr`, `ledCrit`, `ledIdle`). All are tuned Babylon
`StandardMaterial` — no PBR, no HDR env, no external textures. The
high-fidelity feel comes from the lighting + SSAO2 combination, not
from material complexity.

## Lighting recipe

- One `HemisphericLight` from +Y at intensity 0.55 (fill).
- One `DirectionalLight` from (-0.4, -1.0, -0.5) at intensity 0.95
  (key).
- `ShadowGenerator` 1024² with `useBlurExponentialShadowMap` and
  `blurKernel = 32`.
- `SSAO2RenderingPipeline` (radius 0.6, totalStrength 1.1, samples 8)
  for ambient-occlusion-style depth. Falls back silently if MRT is
  unavailable.

OCC must not deviate from this recipe without a contract revision —
swapping in PBR or HDR changes the perceived character of every model.

## Performance budget

- Cold start (`buildHardwareModel` × 20): ≤ 200 ms on Windows.
- Steady state: 60 fps at 1920×1080 with one model enabled and 200+
  pickable meshes. (Multi-model rendering is out of scope for v0.)
- Memory: shadow buffer + 20 model meshes ≈ 25 MB GPU.

## Non-goals (v0)

- No GLTF/GLB load — every model is procedurally generated. (Optional
  `.glb` exports may land in `models/optional-glb/`.)
- No PBR materials.
- No external textures or fonts.
- No animation. (Fans don't spin; LEDs are static.)
- No multi-model rendering. One model per scene.
