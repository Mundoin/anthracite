# Babylon — integration notes

Engineering notes for OCC. Targets Babylon.js 7+ (tested at runtime
on the version pinned by CDN — currently v9). Tauri 2, Windows-first.

## File load order

The preview loads TypeScript sources via Babel-standalone's
`typescript` preset which **only strips type annotations** — it does
not link ES modules. Cross-file linkage is therefore via
`window.Anthracite*` globals.

When integrating into a real Vite / esbuild / tsc pipeline, the source
files restore to normal ES modules — every file already declares
explicit `import` / `export` shapes (commented out in the shipped
.ts for browser load). The `window.Anthracite*` assignments at the
bottom of each file are the only OCC-facing edits to undo.

## Scene composition

```ts
const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: false, stencil: true, antialias: true,
});
const scene  = new BABYLON.Scene(engine);
scene.clearColor   = new BABYLON.Color4(0.902, 0.929, 0.945, 1.0);
scene.ambientColor = new BABYLON.Color3(0.40, 0.42, 0.45);
```

## Camera

```ts
const cam = new BABYLON.ArcRotateCamera('cam',
  -Math.PI / 2 - 0.6, 1.10, 1.6,
  BABYLON.Vector3.Zero(), scene);
cam.attachControl(canvas, true);
cam.wheelPrecision   = 80;
cam.lowerRadiusLimit = 0.5;
cam.upperRadiusLimit = 6;
cam.minZ = 0.05;
cam.maxZ = 50;
```

`resetCamera` reads the current profile's dims and reframes:
`radius = max(w, h, d) / 100 × 1.65 + 0.5`. OCC may override the
multiplier to lean tighter or wider, but the framing call MUST run on
every model switch — otherwise large 4U / blade chassis fall outside
the camera's near/far planes.

## Picking

Use a single `scene.onPointerMove` / `scene.onPointerDown` pair.
Reject non-tagged meshes:

```ts
const pick = scene.pick(scene.pointerX, scene.pointerY);
const hit  = (pick?.hit && pick.pickedMesh?.metadata?.anthracite)
  ? pick.pickedMesh
  : null;
```

The `metadata.anthracite` shape is `{ modelId, kind, index }` — see
`pickable-zone-id-contract.md`.

## Selection highlight

A single `HighlightLayer` handles both hover and select:

- **Hover:** `hl.addMesh(mesh, new Color3(0.40, 0.74, 0.85))` — soft
  cyan, ~0.6× signal intensity.
- **Select:** `hl.addMesh(mesh, new Color3(0.05, 0.45, 0.62))` —
  full cyan signal.
- Remove via `hl.removeMesh(mesh)` on hover-out / deselect.

A mesh that is both hovered and selected stays at the select colour.

## Shadows

```ts
const shadow = new BABYLON.ShadowGenerator(1024, directionalLight);
shadow.useBlurExponentialShadowMap = true;
shadow.blurKernel = 32;
shadow.darkness   = 0.55;
for (const mesh of model.getChildMeshes()) {
  shadow.addShadowCaster(mesh);
  mesh.receiveShadows = true;
}
```

Floor receives shadows but does not cast.

## SSAO2 fallback

`SSAO2RenderingPipeline` requires MRT support. On older WebGL stacks
the constructor throws; wrap in try/catch and continue without AO. The
scene still reads as drafting-paper-with-shadows; just less depth in
recesses.

## Disposal

Switching models in the preview hides the old root (`setEnabled(false)`)
rather than disposing it, so re-selection is instant. For OCC's
ORBIT → MAP back transition, dispose the whole engine — every BuiltModel
becomes invalid the moment its scene is gone.

## Performance notes

- Babel-standalone in-browser TypeScript loader is for development /
  preview only. OCC ships precompiled. Do not benchmark cold start with
  Babel in the loop.
- The shadow map at 1024² is the right balance. 2048 hits frame budget
  on integrated GPUs; 512 makes corner reticles look ratty.
- `HighlightLayer` is more expensive than emissive material swaps but
  matches the design-board's cyan-as-signal language exactly. Keep it.

## What OCC must wire up

- The 2D topology map (out of this kit's scope).
- The transition tween (FOCUSED → ORBIT — 240 ms crossfade per the
  design board's interaction storyboard).
- The real telemetry subscription, replacing `telemetryDemo.ts`.
- The `detail card` payload (more fields than this preview shows —
  alarms history, neighbours, optics inventory, etc.).
- The "back to map" gesture (Esc or button) which disposes the engine.
