# Babylon Implementation Notes

Engineering notes for OCC implementers. Targets Babylon.js 7, Tauri 2,
Windows-first. Do not deviate without an ADR.

## Scene composition

- One scene per inspection. The map is a 2D SVG/Canvas layer **outside**
  Babylon — Babylon is only spun up on transition #2 (FOCUSED → ORBIT).
- Engine: `Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true })`.
- Clear color: `var(--topo-canvas)` (#E6EDF1). No skybox, no environment.
- Camera: `ArcRotateCamera`. Alpha −Math.PI/2, beta 1.05, radius driven
  by primitive dims. `useFramingBehavior = false` — we frame manually.
- One `HemisphericLight` from +Y at 0.55 intensity. One
  `DirectionalLight` from (1, −0.6, 0.4) at 0.25 intensity. No shadows.
- No post-processing pipeline. No bloom. No SSAO. No DoF.

## Materials

All meshes use `StandardMaterial` with:

```ts
mat.specularColor   = new Color3(0.0, 0.0, 0.0);   // no specular
mat.emissiveColor   = new Color3(0.0, 0.0, 0.0);
mat.diffuseColor    = paperOrInk;                  // see token map
mat.backFaceCulling = true;
mat.wireframe       = false;
```

A second wireframe pass renders the hairlines as line meshes (1 px) using
`MeshBuilder.CreateLines`. This is what gives the drafting feel.

## Stable mesh IDs

Every PickableZone produces exactly one mesh. Mesh `id` MUST follow
the kit-canonical rule (ratified 2026-05-23, see
`anthracite-topology-hardware-model-kit-v0/contracts/pickable-zone-id-contract.md`):

```
<modelId>.<zoneKind>.<index>
```

Examples:

```
access48.port.17
access48.led.3
core4u_rt.blade.2
fw2u_ha.psu.1
vrouter.chassis.0
sfp_module.port.2000
unk1u.chassis.0
```

Where:
- `modelId`  = `HardwareProfile.id` from `hardwareProfiles.ts`
              (`access24`, `core4u_rt`, `fw2u_ha`, `vrouter`, `unk1u`, …)
- `zoneKind` ∈ the closed taxonomy (chassis | port | bay | module | led | psu | fan | blade | screen | label)
- `index`    = zero-based index within the (modelId, zoneKind) pair

**Port index ranges** (single `port` zoneKind, ranges keep types
distinguishable):
- RJ45: 0 … N − 1
- SFP:  1000 … 1000 + N − 1
- QSFP: 2000 … 2000 + N − 1

**IDs are stable across reloads, restarts, hot reloads, and Tauri
window recreations.** OCC may rely on them as event keys, undo-stack
keys, and selection-restore keys. Renaming requires a contract revision.

Mesh metadata mirrors the id structurally:

```ts
mesh.metadata.anthracite = { modelId: string, kind: ZoneKind, index: number }
```

Use `window.AnthraciteZones.readZone(mesh)` to read; never parse the
id string in product code.

## Picking

- One `PointerEventTypes.POINTERDOWN` handler at the scene level.
- Resolve hit via `scene.pickWithRay`; reject hits where
  `pickedMesh.metadata?.pickable !== true`.
- Decoration meshes have `metadata.pickable = false`.
- The hit zone's mesh `id` is the event key — emit it as-is to the
  React layer over the Tauri event bridge.

## Transition #2 (2D → 3D)

The 240 ms tween is **not** a Babylon animation. The SVG glyph and the
Babylon canvas crossfade at the React layer:

```
t=0   ms : SVG glyph at 1.0, Babylon canvas at 0.0
t=80  ms : SVG scales 1 → 2.4; Babylon canvas fades 0 → 1
t=240 ms : SVG removed; Babylon owns the viewport.
```

The state ring (an SVG `<rect>`) stays in the React layer, positioned
absolutely over the Babylon canvas. It never enters Babylon.

## Performance budget

- Cold-start to first inspection frame: ≤ 350 ms on Windows.
- Steady-state: 60 fps at 1920 × 1080 with a fully populated 4U
  chassis (4 line-cards, 48 ports each). No exceptions.
- Memory: one Babylon engine, disposed on ORBIT → MAP transition.

## Do not

- Do not import GLTF / OBJ / FBX. There are no models.
- Do not load fonts in Babylon. Vendor strips render as overlay HTML.
- Do not use `PBRMaterial`. Ever.
- Do not animate the camera with bezier easing inside Babylon — easing
  belongs in the React tween (`requestAnimationFrame`).
