# V1BH — Inspect Receiver + Deferred Hardware Scene Bridge

**Date:** 2026-05-23
**Status:** landed
**Scope:** wire Blueprint inspect intent to a lazy-loaded inline Babylon hardware scene; normal Topology map never eager-loads Babylon
**Branch:** `main` after V1BG → working tree
**Authority:** Bujar (scope set; git held)

## Mission

When the operator clicks `Inspect Hardware ▸` or double-clicks a
blueprint node, swap the canvas for a Babylon scene built around the
matching `profileId`. Lazy-load every Babylon-touching module so a
normal map session never pays the 5 MB cost.

## Files changed

```
new   src/modes/topology/inspect/HardwareInspectReceiver.tsx  # state machine + lazy boundary
new   src/modes/topology/inspect/HardwareInspectReceiver.css  # 240 ms cross-fade tween
new   src/modes/topology/inspect/HardwareInspectScene.tsx     # focused single-profile Babylon scene
new   src/modes/topology/inspect/HardwareInspectScene.css     # scene + header + pick panel
new   src/modes/topology/inspect/__tests__/HardwareInspectReceiver.test.tsx  # 5 tests
edit  src/modes/topology/TopologyGraphPanel.tsx               # wrap blueprint in receiver
new   obsidian/stages/V1BH-inspect-receiver-and-deferred-hardware-scene-bridge.md
```

Out of scope (explicit non-changes): `src/topology/hardware/*` (V1BE
kit untouched), `src/preview/HardwareKitPreview.tsx` (V1BE-A preview
lazy boundary intact, `?preview=hardware-kit` URL preserved), `App.tsx`,
`TopologyMode.tsx`, `EnvironmentLifecycleContext.tsx`, V1AY imported
evidence path, `BlueprintTopologyCanvas` internals, doctrine contracts,
mesh ID format. `vite.config.ts` unchanged — the single
`@babylonjs/*` manualChunk rule from V1BE-A already gives us one
deferred babylon chunk shared by both consumers.

## Receiver location

`src/modes/topology/inspect/HardwareInspectReceiver.tsx`. Mounted
inside `TopologyGraphPanel.tsx` for `data_source === "simulated"`,
wrapping `<BlueprintTopologyCanvas />`. Imported-evidence path keeps
the V1AY surface untouched.

## Lazy-load behaviour

The receiver file contains **zero** `@babylonjs/core` imports
(asserted in test). It exposes:

```ts
const HardwareInspectScene = lazy(() =>
  import("./HardwareInspectScene").then((m) => ({
    default: m.HardwareInspectScene,
  })),
);
```

`HardwareInspectScene.tsx` is the only file under
`src/modes/topology/inspect/` that imports from `@babylonjs/core`. Its
chunk + the `buildHardwareModel` shared chunk only land in the bundle
after Rollup resolves the dynamic import, and the chunks only download
after the operator's first inspect intent.

Vite output (V1BG → V1BH):

| Chunk                          | V1BG        | V1BH          | Note |
|--------------------------------|-------------|---------------|------|
| `index-*.js` (main shell)      | 745.84 kB   | **747.84 kB** | +2 kB receiver shell + tween |
| `babylon-*.js`                 | 5,105.94 kB | 5,105.94 kB   | unchanged single chunk |
| `buildHardwareModel-*.js`      | (inlined)   | **8.92 kB**   | extracted; shared by preview + scene |
| `HardwareKitPreview-*.js`      | 14.95 kB    | **6.14 kB**   | shrank — builder extracted |
| `HardwareInspectScene-*.js`    | —           | **4.02 kB**   | new lazy chunk |
| `HardwareInspectScene-*.css`   | —           | **2.59 kB**   | new lazy chunk |
| `HardwareKitPreview-*.css`     | 2.63 kB     | 2.63 kB       | unchanged |
| `index-*.css`                  | 211.36 kB   | 211.76 kB     | +0.4 kB receiver CSS |

Net: shell grew by 2 kB. Babylon untouched. Both inspect targets
(preview + receiver) share one Babylon chunk + one builder chunk.

## profileId → model handoff

The intent shape stays the V1BG contract:

```ts
interface HardwareInspectIntent {
  source: "blueprint";
  nodeId: string;
  profileId: string;
  family: NodeFamilyCode;
  trigger: "cta" | "doubleclick";
  label: string;
}
```

Receiver flow:

```
Blueprint.onInspect(intent)
  ↓
HardwareInspectReceiver  setIntent(intent), setPhase("entering")
  ↓                          ↓ (cross-fade map → 0, scene → 1 over 240 ms)
Suspense<HardwareInspectScene intent={…} onClose={…} />
  ↓
HardwareInspectScene  findProfile(intent.profileId) → HardwareProfile
  ↓
buildHardwareModel(scene, profile, mats, {shadowGenerator})
  ↓
BuiltModel.root.setEnabled(true); BuiltModel.setTelemetry("up")
```

If `findProfile(intent.profileId)` returns `undefined` (impossible at
v0 — every family resolver returns a real id including `unk1u`), the
scene renders an error panel with the still-functional Back to map
button.

## Return-to-map behaviour

`HardwareInspectScene` exposes a `Back to map` button (top-left of
the header strip) that invokes `onClose()`. The receiver:

1. `setPhase("exiting")` — triggers reverse 280 ms tween (scene fades
   1 → 0, map fades 0 → 1).
2. After the tween, `setIntent(null)` + `setPhase("map")` — unmounts
   the lazy scene component. Its `useEffect` cleanup calls
   `scene.dispose()` + `engine.dispose()`.

Resetting the underlying `view` (e.g. operator switches active env)
clears intent + phase synchronously via a `useEffect` keyed on
`canvasProps.view`. No stale scene survives a graph change.

## Transition status

240 ms forward, 280 ms reverse — matches the desk
`interaction-state-machine.md` (V1BD decision 5: build before tween,
dispose after reverse tween). Implemented as CSS opacity transitions
keyed by a four-phase state machine: `map → entering → scene → exiting → map`.

The transition shell is intentionally simple: two stacked absolutely
positioned layers, both inside the same panel container, both with
`transition: opacity 240ms ease-in-out`. The map layer keeps its
pointer-events when visible; the scene layer overlays it when an
inspect is active. No reticles, stencil text, or corner marks — those
belong in a polish stage when the visual contract has reviewer
sign-off.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (212 files, 2335 tests, 0 failures, +5 new)
pnpm build       → green (tsc + vite build, 5.55s)
```

### Test surface (+5)

`HardwareInspectReceiver.test.tsx`:
1. **Receiver source contains no `@babylonjs/core` imports** — source-level
   grep guarantees the eager bundle stays Babylon-free even if a refactor
   later forgets the lazy boundary.
2. **Scene source is where Babylon is consumed** — symmetric check.
3. **Inspect Hardware ▸ CTA dispatches intent → enters scene phase** —
   uses `vi.useFakeTimers` to advance the 240 ms tween and asserts the
   `data-phase` transitions `map → entering → scene`.
4. **Underlying view change resets intent + phase** — rerendering with a
   new `view` collapses the receiver back to `map` and unmounts the
   scene layer.
5. **Double-click on a node also dispatches intent** — V1BG dblclick
   path bridges through to V1BH receiver.

## Manual verify

```
pnpm dev          # Vite on :1420
# (or pnpm tauri:dev)
```

1. In **Environments mode**, create a `Branch Office` lab (scenario
   `branch-office`, 8 devices). Set it active.
2. Open **Topology** → tool **Graph / Map**. Confirm:
   - source header shows env name + `branch-office` + node/link counts +
     `generated-lab` badge
   - 8 nodes visible at `full` density
3. Click any node — passport panel populates with `profileId`,
   chassis, vendor·model, ports, etc. `Inspect Hardware ▸` button
   appears.
4. Click the CTA. Confirm:
   - 240 ms cross-fade from Blueprint to the inline Babylon scene
   - header shows node label, family, profileId, vendor·model
   - 3D model orbits with the mouse, lit + shadowed
5. Click a port / module / LED on the model. Confirm the right-side
   pick panel shows `<modelId>.<zoneKind>.<index>` plus the derived
   RJ45/SFP/QSFP type for port hits.
6. Click `◂ Back to map`. Confirm 280 ms reverse fade back to
   Blueprint with the prior selection intact.
7. Double-click a different node. Confirm same inspect flow opens.
8. Watch the dev console + the Vite Network tab on a fresh refresh —
   confirm the `babylon-*.js` chunk only fetches after the first
   inspect or after navigating to `?preview=hardware-kit`. Normal map
   browsing must not fetch it.

## Caveats

1. **No state transition stencil text** ("ENTERING HARDWARE INSPECTION ·
   …") yet — that's a polish stage. The 240/280 ms tween + opacity
   crossfade satisfies the V1BD lifecycle ordering rule but skips the
   reticle / stencil decoration.
2. **Scene reset on view change is destructive** — switching active env
   mid-inspection collapses straight to map without a reverse tween.
   That is the safe path (stale node may not exist) but a polish stage
   could detect "intent still valid in new view" and preserve it.
3. **Pick callout is inline panel, not floating leader card** — the
   desk doctrine's `DETAIL` state describes a floating callout with a
   3 px cyan top strip and leader line. V1BH ships the pragmatic right
   panel; the floating variant is a polish stage when the broader
   topology UI grows callout chrome.
4. **No telemetry slider** — scene always renders `setTelemetry("up")`.
   Live state arrives with the topology adapter (V1BF-A candidate).
5. **`buildHardwareModel` chunk now extracted** — Rollup chose to
   separate it from both preview and inspect scene. Both lazy paths
   pay one shared 8.92 kB chunk + one shared 5,106 kB babylon chunk on
   first activation. Cache hit on the second activation.
6. **Bundle warning persists** on the deferred `babylon` chunk — by
   design.

## Next candidate stages

1. **V1BH-A — Pick → topology summary cross-link.** Send picked
   `mesh.metadata.anthracite` back to the topology layer so a port
   click also highlights the corresponding edge / neighbour.
2. **V1BG-A — Smarter profile resolver.** Pick `access48`/`fw2u_ha`/
   `core4u_sw` from the alternates column based on real port counts.
3. **V1BF-A — Topology adapter interface.** Live operational state on
   the blueprint state ring + scene LEDs.
4. **V1BH-B — Transition stencil + reticle.** Polish the cross-fade
   into the full FOCUSED → TRANSITION → ORBIT stencil from the desk
   storyboard.

## AO orchestration report

- subagents: 0 (Babylon scene recipe already absorbed from V1BE/V1BE-A; intent shape from V1BG; receiver pattern parallels V1BE-A's lazy + Suspense move)
- Opus solo: 5 new file writes + 2 small TopologyGraphPanel edits
- effectiveness: −20% tokens vs Sonnet ingestion; correct call since every reference module was in working context from prior stages
- recommendation: reserve subagents for new product surfaces; lazy/state-machine moves over established surfaces stay Opus-solo
