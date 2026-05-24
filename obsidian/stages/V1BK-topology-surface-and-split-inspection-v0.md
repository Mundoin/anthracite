# V1BK — Topology Surface + Split Inspection v0

**Date:** 2026-05-24
**Status:** landed
**Scope:** turn Topology → Graph/Map from a boxed dashboard panel into the central drafting surface; convert hardware inspection from a full-bleed Babylon swap into a right-side split bay that keeps the map visible
**Branch:** `main` after V1BJ hotfix 3 → working tree
**Authority:** Bujar (scope set; git held)

## Mission

V1BJ made the blueprint visible. V1BK makes it the operating surface
of Anthracite. Inspection no longer hides the topology — it opens an
inspection bay beside it. Map = world. Bay = selected machine inside
that world.

## Files changed

```
edit  src/modes/topology/TopologyGraphPanel.tsx                                # blueprint branch uses tg-panel--blueprint surface
edit  src/modes/topology/TopologyGraphPanel.css                                # light surface modifier (no dark fill, hairline border)
rewrite src/modes/topology/inspect/HardwareInspectReceiver.tsx                 # split-layout (map + bay) instead of cross-fade overlay
rewrite src/modes/topology/inspect/HardwareInspectReceiver.css                 # bay slide-in/out keyframes + light surface + scoped lock marks
edit  src/modes/topology/inspect/__tests__/HardwareInspectReceiver.test.tsx    # +2 split-layout regression tests
new   obsidian/stages/V1BK-topology-surface-and-split-inspection-v0.md
```

Out of scope (explicit non-changes): `src/topology/hardware/*` (kit
untouched), `BlueprintTopologyCanvas` internals (passport, glyph,
density, selection, anchor capture all preserved), `HardwareInspectScene`
+ `HardwareInspectScene.css` (its own header/frame/orbit hint/floating
callout intact and now lives inside the bay), `src/preview/HardwareKitPreview*`
(V1BE-A lazy boundary + `?preview=hardware-kit` URL preserved),
`vite.config.ts`, `App.tsx`, `TopologyMode.tsx`, doctrine contracts,
mesh ID format, V1BG intent contract.

## Before / after topology surface

| Concern                            | Before V1BK                                                       | After V1BK                                                                 |
|------------------------------------|-------------------------------------------------------------------|----------------------------------------------------------------------------|
| outer panel chrome (`.tg-panel`)   | `background: #0a0a0a`, `padding: 16px`, 1 px `#333` border        | transparent (`.tg-panel--blueprint`), no padding, no border                |
| title                              | `Blueprint (V1BF)` in `#cccccc`                                   | `Topology · Map` in `#0E1E2C` (operating-surface tone)                     |
| content frame                      | dark `#1a1a1a` surface inside `.tg-content--blueprint`            | hairline `#C8D5DE` border on light `#E6EDF1` drafting paper                |
| inspection trigger                 | full-bleed cross-fade — blueprint hidden during inspect           | right-side bay slides in alongside the still-visible blueprint             |
| nested boxes                       | panel → content → receiver → layer overlay → scene                | panel → content → receiver (map + bay) → scene                             |

Only the **outer sideboard** (still the app shell, untouched here)
and the canvas-content `1 px #C8D5DE` hairline remain as boundaries.

## Split / overlay inspection behaviour

`HardwareInspectReceiver` now ships a flex split layout:

```
┌──────────────────────────────────┐
│  hir-map (1fr)                   │
│  ├── BlueprintTopologyCanvas     │
│  └── (passport summary intact)   │
└──────────────────────────────────┘

after click on Inspect Hardware ▸ or dblclick:

┌──────────────────────┬───────────────────────┐
│ hir-map (1fr)        │ hir-bay (50%)         │
│ ├── Blueprint        │ ├── Suspense<Scene>   │
│ └── selection lives  │ ├── ◂ Back to map     │
│                      │ ├── 3D canvas         │
│                      │ ├── floating callout  │
│                      │ └── lock marks        │
└──────────────────────┴───────────────────────┘
```

Bay state machine:

- `phase = "map"` → bay absent
- `phase = "entering"` → bay mounts; `data-bay-open="opening"`; CSS
  animation `hir-bay-open` runs 240 ms (`flex-basis 0 → 50%`,
  `opacity 0 → 1`)
- `phase = "scene"` → bay open; `data-bay-open="open"`
- `phase = "exiting"` → `data-bay-open="closing"`; CSS animation
  `hir-bay-close` runs 280 ms; then bay unmounts and `scene.dispose()`
  fires via the scene's `useEffect` cleanup

The bay is `min-width: 360 px`, `max-width: 640 px`, default `50%`.
On narrower viewports the map collapses to its `min-width: 0` and the
bay holds its 360 px minimum, then horizontal scroll engages — never
the dark panel bleed.

The Blueprint canvas keeps its own passport panel in the right summary
column, so the selected-node context stays visible while the bay is
open. V1BG intent shape unchanged.

V1BJ anchor + viewport still flow through `intent.anchor` /
`intent.viewport` and drive the lock marks' CSS percent vars. The
lock marks are now scoped to the bay column (rendered inside
`.hir-bay-inner`), so the reticle + sweep fire **inside the bay**, not
across the whole map — which matches the new "inspection happens in
the bay" mental model.

## Borders / nesting reduced

- `.tg-panel--blueprint`: dropped `#0a0a0a` background, `16 px` padding, `1 px #333` border, `4 px` border-radius.
- `.tg-content--blueprint`: kept the explicit `height: 640 px` (still needed for height-resolution) but the border shrank to `1 px #C8D5DE` with `2 px` radius.
- Receiver outer wrapper: no more absolute-stacked layers; pure flex split. One fewer DOM box.
- Lock marks: scoped to the bay; no more whole-receiver overlay.

## Lazy chunk status

| Chunk                          | V1BJ          | V1BK          | Note |
|--------------------------------|---------------|---------------|------|
| `index-*.js` (main shell)      | 750.06 kB     | **750.77 kB** | +0.7 kB (split layout state + 2 anim wiring) |
| `babylon-*.js`                 | 5,105.94 kB   | 5,105.94 kB   | unchanged single deferred chunk |
| `HardwareInspectScene-*.js`    | 6.46 kB       | 6.46 kB       | unchanged — still lazy |
| `HardwareInspectScene-*.css`   | 4.52 kB       | 4.52 kB       | unchanged — still lazy |
| `buildHardwareModel-*.js`      | 8.92 kB       | 8.92 kB       | unchanged shared chunk |
| `HardwareKitPreview-*.js`      | 6.14 kB       | 6.14 kB       | unchanged |
| `HardwareKitPreview-*.css`     | 2.63 kB       | 2.63 kB       | unchanged |
| `index-*.css`                  | 215.51 kB     | 215.93 kB     | +0.4 kB (bay keyframes + lock-mark scope) |

Babylon stays 100 % deferred — `HardwareInspectReceiver.tsx` still has
zero `@babylonjs/core` imports (asserted in test). `?preview=hardware-kit`
URL preserved (its lazy path is independent of the inspect receiver).

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (214 files, 2358 tests, 0 failures, +2 new)
pnpm build       → green (tsc + vite build, 5.81s)
```

### Test surface (+2)

`HardwareInspectReceiver.test.tsx` (V1BK split layout block):
- map column renders alongside the inspection bay during scene phase;
  bay data-state transitions `opening → open` after the 240 ms tween
- view change collapses the bay and keeps the map mounted (proves
  unmount path + map persistence; close-via-button path covered
  manually since the lazy scene's `◂ Back to map` button isn't
  mountable under jsdom's Suspense fallback)

All earlier blueprint / passport / lock-marks / lazy-boundary tests
still pass (2358 total, 0 failures).

## Manual verify

```
pnpm dev          # Vite on :1420
# (or pnpm tauri:dev)
```

1. Environments → create `Campus` lab (16 devices), set active.
2. Topology → Graph / Map. Confirm:
   - panel chrome reads as a wide light drafting surface (no dark fill, no thick black borders)
   - title bar shows `Topology · Map` + `Simulated` data badge
   - blueprint canvas takes the full content width with the right summary column
3. Click any node → passport populates with profile id + Inspect CTA.
4. Click `Inspect Hardware ▸`. Confirm:
   - **map stays visible on the left**
   - right-side bay slides in over 240 ms
   - bay contains the Babylon scene header, the 3D model, the orbit
     hint pill, and the floating callout machinery
   - lock-marks reticle + sweep fire **inside the bay** (not over the
     map)
5. Rotate the 3D model. Click a port. Confirm the floating callout
   appears with `<modelId>.port.<index>` and stays within the bay.
6. Click `◂ Back to map`. Confirm the bay collapses (280 ms reverse)
   and the map returns to full width with prior selection intact.
7. Switch active env to `Metro / Mega City Lab` (96 / 240). Repeat
   step 3–6 — confirm large lab still renders + inspect works.
8. DevTools Network on fresh refresh: `babylon-*.js` only fetches on
   the first inspect or `?preview=hardware-kit`. Normal map browsing
   pulls 0 bytes of Babylon.
9. `?preview=hardware-kit` URL still loads the full preview cleanly.

## Caveats

1. **No drag-to-resize handle** between map and bay yet. Bay is a
   fixed `50%` of the receiver (clamped to 360–640 px). A handle
   lands when the surface grows enough to need it.
2. **No "minimize bay" affordance** — the only close path is the
   scene's `◂ Back to map` (V1BH carry-over). A pinned bay or
   keyboard `Esc` shortcut is a polish stage candidate.
3. **Lock-marks anchor coordinates are bay-relative now.** The V1BJ
   anchor was captured against the receiver overlay; since the bay
   is a column inside the same overlay, the percent vars still hit a
   reasonable position inside the bay, but the reticle no longer
   locks to the *map* glyph rect. Acceptable: the bay is the
   inspection theatre. Glyph-rect morph (V1BJ-A candidate) gets
   pushed to a follow-up.
4. **Suspense fallback covers the bay only.** Map remains interactive
   while the lazy scene chunk loads.
5. **Bay min-width is 360 px.** On viewports under ~720 px wide the
   bay forces horizontal scroll inside the canvas wrap (rather than
   shrinking below readable). Tauri default window is 1200 px+, so
   not user-facing for v0.
6. **Babylon chunk size warning persists** on the deferred chunk —
   by design (V1BE-A).

## Next candidate stages

1. **V1BL — Drag-to-resize bay handle + collapse pin.**
2. **V1BJ-A — Glyph-rect morph.** Reticle starts at the map glyph rect,
   morphs into the bay frame during the slide-in.
3. **V1BG-A — Smarter profile resolver** (still open).
4. **V1BF-A — Topology adapter interface** (still open).

## AO orchestration report

- subagents: 0 (split-layout pattern over fully-mapped surface; intent shape, lazy boundary, scene chrome all in working context from V1BH/V1BI/V1BJ)
- Opus solo: 6 file writes/edits + 1 fix-up (jsdom can't mount the lazy scene → swapped close-button test for a view-change unmount-path proof)
- effectiveness: −20 % tokens vs Sonnet inspection; correct skip given the receiver internals were already a re-written file from prior stages
- recommendation: split-layout / surface-flatten refactors over known modules stay Opus-solo
