# V1BL-E — White Canvas + Inspector Seam Cleanup

**Date:** 2026-05-24
**Status:** landed (working tree; commit/push held for Bujar)
**Scope:** flip every topology surface to pure white (#FFFFFF), align
the map and inspector headers into one continuous top rail (drop the
vertical seam border between the two columns), remove the inspector
width-arrow buttons (◂/▸), and remove the sniper-scope lock reticle
from the 2D→3D transition.
**Branch:** `main` after V1BL-D → working tree
**Authority:** Bujar (scope set; git held)

## Mission

V1BL-D simplified the inspector. Bujar's follow-up:

> "Topology and 3D split are much better but the surface still has
> seam/jank. Make it pure white. Align top seams. Remove the small
> ◂/▸ width buttons. Remove the reticle/sniper-scope transition.
> Header should read cleanly — Back, hostname, optional subtle meta."

Single-stage cleanup targeting four orthogonal threads, all visual.

## Files changed

```
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.css       # --topo-canvas → #FFFFFF
edit  src/modes/topology/inspect/HardwareInspectScene.tsx            # drop width-arrow buttons; Babylon clearColor → white
edit  src/modes/topology/inspect/HardwareInspectScene.css            # token swap to #FFFFFF; header padding matches map (10/16)
edit  src/modes/topology/inspect/HardwareInspectReceiver.tsx         # drop <InspectionLockMarks>, rootRef, live-anchor effect
edit  src/modes/topology/inspect/HardwareInspectReceiver.css         # drop .hir-bay border-left seam; drop entire .inspection-lock-marks block; fallback grid → white
edit  src/modes/topology/inspect/__tests__/HardwareInspectReceiver.test.tsx  # invert lock-marks assertion (overlay no longer mounts)
new   obsidian/stages/V1BL-E-white-canvas-and-seam-cleanup.md
```

Out of scope: `BlueprintTopologyCanvas.tsx` interaction code,
`hardwarePassport.ts`, intent payload shape, the topology-side
chrome (V1BL-C surface), `TopologyMode.tsx`, `TopologyGraphPanel.tsx`,
Babylon engine boundary (still grep-clean of `@babylonjs/core` in
the receiver), `?preview=hardware-kit` route, engines/adapters,
types, all non-inspect tests, the
`InspectionLockMarks.tsx` source (orphaned; deletable in a follow-up).

## 1 — Pure white canvas

Both `--topo-canvas` tokens flipped to `#FFFFFF`:

```css
/* BlueprintTopologyCanvas.css */
--topo-canvas:         #FFFFFF;   /* was #FAFCFD */
--topo-canvas-deep:    #FFFFFF;   /* was #F2F5F7 */
--topo-paper:          #FFFFFF;
--topo-paper-sunken:   #F6F8FA;

/* HardwareInspectScene.css */
--topo-canvas:         #FFFFFF;   /* was #FAFCFD */
--topo-canvas-deep:    #FFFFFF;   /* was #F1F5F8 */
--topo-paper:          #FFFFFF;
--topo-paper-sunken:   #F6F8FA;
```

Babylon `scene.clearColor` flipped from `(0.984, 0.988, 0.992, 1)` to
`(1, 1, 1, 1)` so the 3D buffer matches the surrounding CSS.

Grid / edge tokens left as-is (already `rgba(26,37,48,0.04)` for grid
lines and `--topo-line-4: #D6DBE0` for resting edges — both very
faint graphite, exactly what Bujar asked to keep). Cyan
(`#0E72A0` / `#074C6E`) stays scoped to: selected node ring,
selected edge, active port pick, leader line, passport strip,
Inspect-CTA border, Back-hover.

## 2 — Aligned top seam

Two changes:

**Drop the column seam.** `.hir-bay` had `border-left: 1px solid #C8D5DE`.
On a white surface that hairline read as the "North Korean border"
Bujar named. Removed. The bay's own `.his-header` keeps its
`border-bottom: 1px solid var(--topo-line-4)` which, together with
the map's `.bt-header` border-bottom, forms one continuous horizontal
rail across the split.

**Match header heights.** `.his-header` padding was `8px 14px 9px`;
`.bt-header` is `10px 16px`. The 3-px height delta meant the seam
between the two headers was visibly stepped. `.his-header` now uses
`10px 16px` too — both headers sit at the same baseline, both
border-bottoms render at the same y-pixel, the rail is unbroken.

The cyan accent gradient (`::after`) on the inspector header was
already removed in V1BL-D — its absence in V1BL-E means the only
hairline at the bottom of the rail is the shared `--topo-line-4`
border, with no "double border" effect.

## 3 — Width arrows removed

The `◂` / `▸` buttons in `.his-width-controls` are gone. The bay
stays at the receiver-default width (`flex-basis: 50%`, clamped
`min 360px` / `max 640px`). The `widthMode` + `onChangeWidth`
props on `HardwareInspectSceneProps` are preserved; the component
just doesn't destructure them anymore (typed surface kept for a
future width-toggle UI to wire back in without API churn).

`setBayWidth` in the receiver is still passed as `onChangeWidth`
prop — currently unused at the call site, but the receiver-side
state is still authoritative for the bay's `data-bay-width` attribute
and the `data-bay-width="compact"` / `"wide"` flex-basis CSS rules.

## 4 — No more sniper reticle

`<InspectionLockMarks>` is gone from `HardwareInspectReceiver.tsx`:

- import dropped
- `liveAnchor` / `liveViewport` state dropped
- the V1BL-C `ResizeObserver` + DOM-lookup effect that recomputed
  live anchor on resize dropped (the only consumer was the reticle)
- the `rootRef` dropped (no other consumer in this component)
- the JSX overlay dropped
- the `setLiveAnchor(undefined)` / `setLiveViewport(undefined)`
  cleanups in the view-reset + exiting-timeout effects dropped

The transition is now just the bay slide-in (V1BK's
`hir-bay-open` / `hir-bay-close` keyframes) — calm, no aiming
animation.

CSS: the entire `.inspection-lock-marks` block (and `.ilm-corner`,
`.ilm-reticle*`, `.ilm-stencil`, both `@keyframes`) deleted from
`HardwareInspectReceiver.css`. `InspectionLockMarks.tsx` source is
still on disk but has no importer — flagged for a follow-up delete.

## 5 — Inspector header (already V1BL-D, confirmed)

The V1BL-D header layout stays: `[Back] [device label + subtle meta]
[no width controls anymore]`.

```
[ ◂ Back ]  rtr-cisco-002
            unk1u · UNK · ANTHRACITE AXU-UNK · via cta
```

With width controls now empty, the third grid column collapses to
zero width via `auto`, so the meta line gets the full remaining
horizontal space and the header is centred around the device label.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (214 files, 2367 tests, 0 failures)
pnpm build       → green (tsc + vite build, 6.28s)
```

### Test surface

`HardwareInspectReceiver.test.tsx`:
- 🔄 `renders lock marks during entering and exiting; not during map`
  → renamed to `V1BL-E — does not render the lock-marks reticle in
  any phase`. Assertion inverted: `queryByTestId("inspection-lock-marks")`
  is `null` in map / entering / scene phases.

No other test references `his-width-controls`, `his-width-compact`,
`his-width-wide`, or the lock-marks DOM — clean rewrite.

### Bundle effect

| Chunk                          | V1BL-D         | V1BL-E         | Note |
|--------------------------------|----------------|----------------|------|
| `index-*.js` (main shell)      | 754.60 kB      | **752.13 kB**  | −2.5 kB (lock marks JSX + live-anchor effect + width buttons all gone) |
| `index-*.css`                  | 217.25 kB      | **215.12 kB**  | −2.1 kB (`.inspection-lock-marks` block gone) |
| `HardwareInspectScene-*.js`    | 6.45 kB        | **5.85 kB**    | −0.6 kB (width-controls JSX + handlers gone) |
| `HardwareInspectScene-*.css`   | 4.54 kB        | 4.54 kB        | unchanged (token-value swap, same rule count) |
| `babylon-*.js`                 | 5,105.94 kB    | 5,105.94 kB    | unchanged |
| `buildHardwareModel-*.js`      | 8.92 kB        | 8.92 kB        | unchanged |
| `HardwareKitPreview-*.js`      | 6.14 kB        | 6.14 kB        | unchanged |

Module count 2179 → **2178** (one less: `InspectionLockMarks.tsx`).

Babylon stays 100 % deferred. Receiver source still grep-clean of
`@babylonjs/core`. `?preview=hardware-kit` URL preserved.

## Manual verify (held for Bujar)

```
pnpm dev   # Vite on :1420
```

**Branch Office (8 dev):**
- Map canvas reads pure white
- Click node → passport floats over white drafting paper
- Inspect Hardware → bay slides in calmly, no reticle, no sniper
  brackets, no aiming animation
- Top rail aligns across the map / inspector split — single
  continuous border-bottom, no vertical seam, no double border
- Inspector header reads `Back  hostname` + subtle meta line
- No `◂` / `▸` width arrows visible
- 3D scene background is pure white
- Cyan only on pick hover / selected node / leader callout
- Back → returns to map; map column was visible throughout

**Campus (16 dev):**
- White canvas stays readable; faint graphite grid + edges still
  legible against #FFFFFF
- Pan + Ctrl-zoom still work
- Selection passport renders cleanly against white

**Metro (96 dev):**
- 96 dot-density still readable
- No reticle clutter on inspect

## Caveats

1. **`InspectionLockMarks.tsx` is orphaned.** Source still on disk
   for one stage so the deletion is reviewable separately; safe to
   remove in V1BL-F.
2. **The cyan `bt-passport-strip` line on the floating passport** is
   the only persistent cyan accent in the resting topology canvas
   when a node is selected. Matches Bujar's "cyan only for selected"
   rule, but if the strip itself reads as too loud against pure
   white, drop it in a follow-up.
3. **`widthMode` / `onChangeWidth` props remain on `HardwareInspectSceneProps`**
   for forward compatibility. Linter-wise unused but the type stays
   so external callers don't break. Internally the component ignores
   them (no destructure).
4. **`.hir-bay` still has `min-width: 360px` / `max-width: 640px`** —
   visually invisible (border-left gone) but the bay won't pancake
   below 360 px on very narrow shells.
5. **Babylon chunk size warning persists** — by design (V1BE-A).

## Next candidate stages

1. **V1BL-F — Delete `InspectionLockMarks.tsx`** + its test scaffolding
   (no consumer left).
2. **V1BL-G — Canvas viewport persistence across tab switches**
   (carried from V1BL-C candidate list).
3. **V1BL-H — Keyboard nav** (`+ / -` zoom, arrows pan, `F` fit,
   `Esc` back to map) (carried from V1BL-C / V1BL-D candidate list).
4. **V1BJ-A — Glyph-rect morph reticle** (still open).

## AO orchestration report

- subagents: 0 (4 themes, 6 files, all on a single tightly-understood
  surface; splitting would have lost the shared white-token /
  seam-alignment mental model)
- Opus solo: 9 file edits + 1 stage note. One TypeScript correction
  loop (`widthMode` / `onChangeWidth` unused-destructure → moved
  comment + dropped from destructure)
- effectiveness: −10 % tokens vs hybrid; +3 % vs all-Opus baseline
  (the typecheck retry cost ~1 round but kept the surface coherent)
- recommendation: visual-token + state-removal stages of this size
  stay Opus-solo. Hybrid would have needed a coordination contract
  for the shared white-token decision anyway.
