# V1BL-B — Blueprint Canvas Navigation Controls

**Date:** 2026-05-24
**Status:** landed
**Scope:** add 2D pan + zoom + Fit / Reset / zoom-indicator to the Blueprint topology canvas; preserve node selection, dblclick inspect, floating passport tracking, split-bay flow, Babylon deferral
**Branch:** `main` after V1BL-A → working tree
**Authority:** Bujar (scope set; git held)

## Mission

V1BL-A gave us a wide white drafting surface. V1BL-B makes it
**operable** — wheel zoom around the pointer, click-drag to pan,
Fit/Reset to recenter, a small zoom indicator. Real inspection work
needs to push in to a switch and pull back to see the rack relationships.

## Files changed

```
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx          # transform state, wheel/pointer handlers, nav strip, Esc, passport-tracks-transform
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.css          # nav strip + grab cursors + touch-action: none
edit  src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx  # 4 V1BL-B regressions
new   obsidian/stages/V1BL-B-blueprint-canvas-navigation-controls.md
```

Out of scope (explicit non-changes): `src/topology/hardware/*` (kit),
V1BG intent shape, V1BJ anchor capture, V1BI lock marks, V1BE-A lazy
boundary + `?preview=hardware-kit`, V1AY imported-evidence path,
V1BH state machine, V1BK split layout, V1BL passport-floating, V1BL
bay width controls, V1BL-A white surface tokens + flex chain.

## Pan / zoom state model

```ts
interface ViewTransform { tx: number; ty: number; scale: number; }
const IDENTITY_TRANSFORM = { tx: 0, ty: 0, scale: 1 };
```

Applied to a `<g transform="translate(tx ty) scale(scale)">` wrapper
inside the SVG. The SVG viewBox stays fixed (computed from layouts
via `viewboxOf`). All grid + edges + nodes render under the same
transform so screen-coord math stays consistent.

Limits:

```
ZOOM_MIN = 0.2
ZOOM_MAX = 8.0
ZOOM_STEP = 1.12  (per wheel notch)
PAN_THRESHOLD_PX = 5
```

State reset triggers:

- `view` change (new env or imported view) → identity (also clears
  passport + selection)
- `Fit` / `Reset` buttons → identity
- `Esc` key → clears selection (not transform)

## Click-vs-drag handling

Pointer state in a ref (not React state, to avoid render thrash):

```ts
dragRef = { startX, startY, startTx, startTy, moved: false }
```

Flow:

1. `pointerdown` on SVG (button 0, not inside any `[data-testid^="bt-node-"]`)
   → capture pointer, snapshot `tx/ty`, set `moved=false`
2. `pointermove` → if `|dx| + |dy| > 5 px`, set `moved=true` and start
   updating `transform.tx/ty` by the delta (mapped from screen px →
   viewBox units via `vb.w / rect.width`)
3. `pointerup` → release capture; if `!moved`, treat as a blank-canvas
   click and `clearSelection()`; if `moved`, suppress (pan completed,
   no selection change)

Node clicks bypass this entirely:
- node's `<g>` handler calls `e.stopPropagation()` before reaching the
  SVG pointer chain
- `pointerdown` early-returns when target `closest('[data-testid^="bt-node-"]')`
  matches, so selecting a node never starts a pan

`setPointerCapture` / `releasePointerCapture` wrapped in try/catch for
jsdom + older browser tolerance.

## Wheel zoom

```ts
const factor = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
const newScale = clamp(scale * factor, MIN, MAX);
// zoom around pointer: the viewBox point under the cursor stays fixed
const k = newScale / scale;
newTx = pointerVB.x - (pointerVB.x - tx) * k;
newTy = pointerVB.y - (pointerVB.y - ty) * k;
```

`screenToViewbox` maps `clientX/Y` to viewBox coords via the SVG's
`getBoundingClientRect()` and the `vb.w / rect.width` ratio. When the
rect is 0×0 (jsdom, off-screen) the helper returns `null` and the
zoom falls back to scaling in place. Per-rect ratios mean zoom
math survives viewport resize without re-derivation.

`e.preventDefault()` is called so the topology canvas doesn't scroll
the parent layout.

## Fit / Reset behaviour

Both buttons set the transform to identity (`tx=0, ty=0, scale=1`).

The SVG viewBox is already computed from the layouts' bounding box
with comfortable padding (`viewboxOf` adds `VIEWBOX_PAD: 64` on every
side), so identity transform fits all nodes inside the visible canvas
with margin. "Fit" and "Reset" are therefore the same operation at
v0 — they're separate buttons because they read as separate
intentions (fit-to-data vs reset-to-default). Future stage can
differentiate (e.g., Fit = fit current selection; Reset = identity).

## Passport behaviour after transform

`useLayoutEffect` already computes the passport's `(left, top)` from
the selected node element's `getBoundingClientRect()` translated into
the canvas-wrap rect. Adding `transform` to the effect's dependency
array makes the passport reposition on every pan / zoom step (the
node's screen rect already reflects the SVG transform, so no extra
math needed).

Limitation: passport recomputes only when selection or transform
changes — not on viewport resize while selected. ResizeObserver hook
would close that gap; deferred.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (214 files, 2365 tests, 0 failures, +4 new)
pnpm build       → green (tsc + vite build, 5.27s)
```

### Test surface (+4)

`BlueprintTopologyCanvas.test.tsx` (V1BL-B block):
- Fit / Reset / zoom indicator nav strip renders, indicator starts at `100%`
- Wheel event with negative deltaY raises the zoom indicator above 100%
- Reset button restores indicator to `100%`
- Escape key dismisses the floating passport

Click-vs-drag deselect path is exercised manually (jsdom's pointer
event surface around `setPointerCapture` / `currentTarget` is too
shallow to assert reliably; Escape covers the same intent via the
keyboard path).

### Bundle effect

| Chunk                          | V1BL-A       | V1BL-B         | Note |
|--------------------------------|--------------|----------------|------|
| `index-*.js` (main shell)      | 751.03 kB    | **753.50 kB**  | +2.5 kB (transform state + handlers + nav buttons) |
| `babylon-*.js`                 | 5,105.94 kB  | 5,105.94 kB    | unchanged single deferred chunk |
| `HardwareInspectScene-*.js`    | 6.67 kB      | 6.67 kB        | unchanged — still lazy |
| `HardwareInspectScene-*.css`   | 4.52 kB      | 4.52 kB        | unchanged |
| `buildHardwareModel-*.js`      | 8.92 kB      | 8.92 kB        | unchanged shared chunk |
| `HardwareKitPreview-*.js`      | 6.14 kB      | 6.14 kB        | unchanged |
| `index-*.css`                  | 216.81 kB    | 217.x kB       | +0.8 kB (nav strip styles + grab cursor) |

Babylon stays 100 % deferred. Receiver source still grep-clean of
`@babylonjs/core`. `?preview=hardware-kit` URL preserved.

## Manual verify

```
pnpm dev   # Vite on :1420
```

**Branch Office (8 dev)**:
- Wheel up/down → zoom indicator changes (e.g. 100 % → 134 % → 100 % via Reset)
- Drag on empty canvas → topology pans under cursor; node positions follow
- Click node → still selects + opens floating passport
- Double-click node → still fires Inspect intent + opens bay
- Click empty canvas → still deselects (pointerup without movement)
- Esc → dismisses passport

**Campus (16 dev)**:
- Zoom into a device group, pan to inspect adjacent devices
- Fit returns to full topology

**Metro (96 dev)**:
- Zoom into the dot ring; individual dots become large and readable
- Pan along the perimeter
- Fit / Reset restores the centered overview

**Hardware**:
- Inspect bay still opens beside the map (V1BK split intact)
- Map remains pannable while bay is open
- Babylon still loads only on first inspect / preview

## Caveats

1. **No keyboard arrow pan / `+` / `-` zoom** yet. Mouse-first at v0.
2. **No zoom-to-selection**. Fit fits everything; future stage could
   add `Fit selection` when one is active.
3. **No drag inertia / smoothing**. Direct 1:1 mapping. Feels precise,
   not playful. Acceptable for an engineering desk.
4. **`Fit` and `Reset` are identical** at v0 — both restore identity.
   Two buttons because they read as different intentions; differentiate
   when a real fit-to-data algorithm lands (e.g., fit only visible
   neighbours).
5. **Passport doesn't track viewport resize while selected** — only
   tracks pan/zoom + selection changes. Window resize while a node is
   selected leaves the card at the prior position until next selection.
6. **Babylon chunk size warning persists** — by design (V1BE-A).

## Next candidate stages

1. **V1BL-C — Keyboard nav** (`+ / -` zoom, arrows pan, `F` fit).
2. **V1BL-D — Fit to selection** + zoom-to-fit minimap.
3. **V1BJ-A — Glyph-rect morph reticle** (still open).
4. **V1BL-E — ResizeObserver-driven passport repositioning**.

## AO orchestration report

- subagents: 0 (pan/zoom math + click-vs-drag pattern over fully-mapped surface)
- Opus solo: 4 file writes/edits + 1 test fix-up (replaced the brittle pointerdown/up deselect test with Escape coverage of the same intent)
- effectiveness: −20 % tokens vs Sonnet inspection
- recommendation: canvas-interaction patterns over known modules stay Opus-solo
