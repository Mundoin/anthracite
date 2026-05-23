# V1BJ — Topology-to-Inspection Continuity v0

**Date:** 2026-05-24
**Status:** landed
**Scope:** anchor V1BI transition chrome to the selected blueprint node; make pick callout edge-aware; choreograph the Suspense fallback
**Branch:** `main` after V1BI → working tree
**Authority:** Bujar (scope set; git held)

## Mission

V1BI made the transition feel intentional. V1BJ makes it feel
**physically connected** — the reticle + sweep originate where the
operator clicked, the floating callout never clips against the
viewport, and a slow Babylon load reads as drafting equipment warming
up rather than a broken render.

## Files changed

```
edit  src/modes/topology/blueprint/hardwarePassport.ts                          # +anchor + viewport on intent
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx                  # capture selected node rect, pass on dispatch
edit  src/modes/topology/inspect/InspectionLockMarks.tsx                        # accept anchor + viewport, emit CSS percent vars
edit  src/modes/topology/inspect/HardwareInspectReceiver.tsx                    # forward intent.anchor / intent.viewport; choreographed fallback
edit  src/modes/topology/inspect/HardwareInspectReceiver.css                    # anchor-driven sweep keyframes + Suspense fallback styling
edit  src/modes/topology/inspect/HardwareInspectScene.tsx                       # PickCallout uses placeCallout helper; capture wrap size
new   src/modes/topology/inspect/calloutPlacement.ts                            # pure edge-aware placement geometry
new   src/modes/topology/inspect/__tests__/calloutPlacement.test.ts             # 6 tests
edit  src/modes/topology/inspect/__tests__/InspectionLockMarks.test.tsx         # +2 anchor / centre fallback tests
edit  src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx   # toMatchObject for new optional anchor fields
new   obsidian/stages/V1BJ-topology-to-inspection-continuity-v0.md
```

Out of scope: `src/topology/hardware/*` (kit untouched), Babylon chunk
strategy, `src/preview/HardwareKitPreview*` (V1BE-A lazy boundary +
URL preserved), `TopologyGraphPanel.tsx`, `App.tsx`, doctrine
contracts, mesh ID format.

## How the selected-node anchor is captured and passed

```
operator clicks Inspect Hardware ▸ OR double-clicks a node
  ↓
BlueprintTopologyCanvas.dispatchInspect(nodeId, trigger)
  ↓
  const nodeEl = rootRef.current.querySelector("[data-testid='bt-node-<id>']")
  const overlayEl = rootRef.current.closest(".hardware-inspect-receiver") ?? rootRef.current
  const nr = nodeEl.getBoundingClientRect()
  const or = overlayEl.getBoundingClientRect()
  anchor   = { x: nr.left - or.left, y: nr.top - or.top, w: nr.width, h: nr.height }
  viewport = { w: or.width, h: or.height }
  ↓
onInspect({ source, nodeId, profileId, family, trigger, label, anchor, viewport })
  ↓
HardwareInspectReceiver  setIntent(intent), setPhase("entering")
  ↓
<InspectionLockMarks phase={phase} anchor={intent.anchor} viewport={intent.viewport} />
```

Both fields are optional. When the node element can't be located (or
`closest` returns no receiver — happens when the canvas is rendered
standalone in tests), `anchor` and `viewport` are `undefined` and the
chrome falls back to viewport centre. Backward-compat for any
external `onInspect` consumer.

## Transition continuity behaviour

`InspectionLockMarks` exposes two CSS custom properties on the overlay
root, derived from the anchor centre as percentages of the viewport:

```ts
"--ilm-anchor-x": "{xPct}%"
"--ilm-anchor-y": "{yPct}%"
```

- The central reticle's `top`/`left` are pinned to those vars; falls
  back to `50%`/`50%` when not provided.
- The stencil rides directly under the reticle (`top: calc(var(--ilm-anchor-y) + 64px)`).
- A new keyframe `ilm-sweep-from-anchor` (240 ms forward / 280 ms
  reverse) starts the 2 px cyan sweep at the anchor column, then fans
  the bar outward to fill the viewport before fading. Anchored
  intents pick this keyframe automatically; centre fallback keeps the
  original left-to-right `ilm-sweep`.
- `data-anchored="true|false"` on the overlay root is the switch for
  the alternate keyframe + test assertion.

Net behaviour: clicking a node in the lower-right of the map locks
the reticle in the lower-right, fans out from there, then settles
into the scene. Reverse plays the same sweep from the same anchor
back to fade. The 240/280 ms timing from V1BD/V1BI is unchanged.

## Edge-aware callout behaviour

Extracted to a pure helper:

```ts
placeCallout(
  anchor:  { x, y },                  // pick in wrap-relative px
  size:    { w, h },                  // callout card dimensions
  wrap:    { w, h },                  // canvas wrap rect at click time
): {
  cardLeft, cardTop, side, leaderAttachX, leaderAttachY, pickX, pickY
}
```

Rules (proven by `calloutPlacement.test.ts`):

1. Default placement: `tr` (top-right of pick, 36 px offset).
2. If `cardLeft + width > wrapW - 8` → horizontal flip to `tl`/`bl`.
3. If `cardTop < 8` → vertical flip to `br`/`bl`.
4. Final clamp inside `(8, wrap - size - 8)` so the card never
   overflows.
5. Leader attaches at the card corner nearest the pick:
   - `tr` / `br` → card's left edge
   - `tl` / `bl` → card's right edge
   - `tr` / `tl` → card's bottom edge (above pick)
   - `br` / `bl` → card's top edge (below pick)

The scene's `PickCallout` renders the leader as an absolutely-
positioned SVG sized to the bounding box of `(pick, attach)`, then
draws a ring at the pick and a line to the attach point. The card
itself carries `data-side` for QA / future styling hooks.

`HardwareInspectScene` captures `wrap.getBoundingClientRect()` at the
moment of pick (alongside the existing pointer-event mapping) and
stores `{x, y, wrapW, wrapH}` on `calloutAnchor`. Re-renders use the
stored wrap size — no `ResizeObserver` needed at v0 (pick implies a
fresh measurement).

## Suspense fallback choreography

V1BH shipped an inline-styled `loading hardware scene…` placeholder.
V1BJ replaces it with a structured component:

- Drafting backdrop: 32 px grid (rgba ink 4 %) on the topology paper
  colour — identical to the Blueprint canvas grid.
- Cyan accent strip (3 px) at the top of the fallback area.
- Mono caps stencil card centred on the backdrop, with a 1400 ms
  ease-in-out opacity pulse so a slow chunk doesn't read as frozen.

This only shows when the lazy `HardwareInspectScene` chunk is still
arriving — typically invisible on local Tauri reloads, briefly
visible on the very first inspect over a slow network.

## Lazy chunk status

| Chunk                          | V1BI         | V1BJ          | Note |
|--------------------------------|--------------|---------------|------|
| `index-*.js` (main shell)      | 749.32 kB    | **750.06 kB** | +0.7 kB (placeCallout + anchor wiring) |
| `babylon-*.js`                 | 5,105.94 kB  | 5,105.94 kB   | unchanged single deferred chunk |
| `HardwareInspectScene-*.js`    | 5.72 kB      | **6.46 kB**   | +0.7 kB (callout helper consumer) — still lazy |
| `HardwareInspectScene-*.css`   | 4.52 kB      | 4.52 kB       | unchanged — still lazy |
| `buildHardwareModel-*.js`      | 8.92 kB      | 8.92 kB       | unchanged shared chunk |
| `HardwareKitPreview-*.js`      | 6.14 kB      | 6.14 kB       | unchanged |
| `HardwareKitPreview-*.css`     | 2.63 kB      | 2.63 kB       | unchanged |
| `index-*.css`                  | 214.18 kB    | 215.51 kB     | +1.3 kB (anchor sweep keyframes + fallback styling) |

Babylon stays 100 % deferred — `HardwareInspectReceiver.tsx` still
has zero `@babylonjs/core` imports (existing source-grep test
preserved). `?preview=hardware-kit` URL preserved.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (214 files, 2349 tests, 0 failures, +8 new)
pnpm build       → green (tsc + vite build, 5.88s)
```

### Test surface (+8)

`calloutPlacement.test.ts` (6 tests):
- default `tr` when there is room
- horizontal flip → `tl` on right overflow
- vertical flip → `br` on top overflow
- both-flip → `bl` corner
- clamps to wrap interior on bottom-left edge
- preserves pick anchor for renderer

`InspectionLockMarks.test.tsx` (+2 tests):
- anchor + viewport produce `data-anchored="true"` + correct CSS
  percent vars
- absent anchor falls back to centre (`50%`/`50%`)

`BlueprintTopologyCanvas.test.tsx` (CTA intent test):
- relaxed exact `toEqual` to `toMatchObject` so the new optional
  `anchor` / `viewport` fields on the intent don't break the existing
  V1BG assertion

## Manual visual-review checklist

Open `pnpm dev` (or `pnpm tauri:dev`):

1. Environments → create `Branch Office` (8 devices) → set active.
2. Topology → Graph / Map. Confirm blueprint renders 8 nodes at full
   density.
3. Click a node near the **right edge** of the canvas.
   - Inspect Hardware ▸ → reticle locks at the **right edge**, not
     centre.
   - Sweep fans outward from the right edge.
   - Stencil sits just below the reticle.
   - Corner brackets remain anchored to the four canvas corners.
4. Back to map → reverse sweep starts at the same right-edge anchor.
5. Repeat with a node near the **top-left** → reticle locks top-left.
6. Repeat with a node near the **bottom-centre** → reticle locks
   bottom-centre.
7. Inside the 3D scene, click ports near each canvas corner.
   - Top-left port → callout flips to `br` (below-right of pick).
   - Top-right port → callout flips to `bl`.
   - Bottom-left port → callout flips to `tr`.
   - Bottom-right port → callout flips to `tl`.
   - In every case the card stays fully inside the canvas wrap and
     the leader line connects to the nearest card corner.
8. Throttle network → first inspect on a fresh page reveals the
   drafting-grid fallback with the cyan strip + pulsing stencil for
   a beat before the scene mounts.
9. Confirm DevTools Network tab: `babylon-*.js` only fetches on the
   first inspect or `?preview=hardware-kit`.
10. `?preview=hardware-kit` still loads the full preview cleanly.

## Caveats

1. **Anchor measurement is one-shot.** Captured at dispatch time only.
   If the operator resizes the window mid-transition, the anchor pct
   stays valid (it's a percentage of viewport at capture time), but
   the absolute glyph position may have shifted. Acceptable for
   240/280 ms.
2. **Callout height is estimated, not measured.** `CALLOUT_H_EST = 140`.
   Works for the v0 row set (id strip + 3-4 rows + meta footer).
   When rows grow conditionally beyond this height the bottom edge
   may flip earlier than visually needed. Real measurement via
   `useLayoutEffect` lands when row content becomes variable.
3. **Sweep "from anchor" expands width via keyframe** — Chromium
   handles this cleanly, Webkit/Firefox should too, but visual QA on
   non-Chromium browsers is a polish task.
4. **Reticle still doesn't morph from glyph footprint.** V1BJ pins
   position; full glyph-rect morph (size + radius) is a larger
   choreography stage (V1BJ-A candidate).
5. **Babylon chunk size warning persists** on the deferred chunk —
   by design (V1BE-A).

## Next candidate stages

1. **V1BJ-A — Glyph-rect morph.** Reticle starts as the glyph's exact
   width/height/radius, morphs to the centred radial during the
   240 ms tween.
2. **V1BG-A — Smarter profile resolver** (still open).
3. **V1BF-A — Topology adapter interface** (still open).
4. **V1BI-A — Callout dimension measurement** via `useLayoutEffect`.

## AO orchestration report

- subagents: 0 (visual continuity over fully-mapped surface; intent shape from V1BG, receiver topology from V1BH, theater chrome from V1BI all in working context)
- Opus solo: 8 file writes/edits + 3 fix-ups (typecheck: none; tests: `toMatchObject` for relaxed intent, style attr regex, floating-point yPct match)
- effectiveness: −25% tokens vs Sonnet ingestion; correct skip — every surface was already in working memory and the new geometry helper was a small pure module
- recommendation: incremental continuity polish over known surfaces stays Opus-solo; reserve subagents for new product surfaces
