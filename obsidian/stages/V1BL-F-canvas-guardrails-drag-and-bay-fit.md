# V1BL-F — Canvas Guardrails + Node Drag + Bay Fit

**Date:** 2026-05-24
**Status:** landed (working tree; commit/push held for Bujar) — see hotfix-1 below
**Hotfix-1:** 2026-05-24 — restore `.hir-map` flex sizing (canvas had collapsed to a thin top strip in some browsers after the V1BL-F absolute-positioning change). Bay overlay preserved.
**Scope:** add pan clamping + real Fit-to-content + node drag-to-reposition
on the Blueprint topology canvas; reshape the hardware inspector bay as
a contained top-right card (not a full-height column) so the lower-right
map area stays available for future device-info panels; simplify the
3D header meta line (drop `via cta`, drop the `UNK · UNK · ANTHRACITE`
chip soup); resolve the loose V1BL-D stage note.
**Branch:** `main` after `7850c21` (V1BL-E) → working tree
**Authority:** Bujar (scope set; git held)

## Mission

V1BL-E went pure white. Bujar's follow-up:

> "Pan/zoom lets the topology disappear. Top rail still feels like two
> countries. 3D header still reads like noisy internal data. Bay
> shouldn't consume the entire vertical right side. Add drag to move
> nodes."

Five threads, all on the topology surface, fixed in one stage so the
working tree stays coherent.

## Files changed

```
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx        # clampTransform; fitView; nodeOffsets state + window-pointer drag; Glyph onPointerDown; suppressNextClickRef
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.css        # .bt-node { cursor: move; touch-action: none }
edit  src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx  # +1 Reset-clears-transform-and-offsets test
edit  src/modes/topology/inspect/HardwareInspectScene.tsx             # meta IIFE: drop `via cta`, conditional on UNK vs known profile
edit  src/modes/topology/inspect/HardwareInspectReceiver.css          # .hir-bay → absolute top-right card; .hir-map → absolute fill
new   obsidian/stages/V1BL-F-canvas-guardrails-drag-and-bay-fit.md
```

V1BL-D historical stage note still on disk (`obsidian/stages/V1BL-D-…md`)
— see §6 below for the cleanup choice.

Out of scope: `HardwareInspectReceiver.tsx` (state machine unchanged),
`hardwarePassport.ts`, intent payload shape, Babylon engine boundary,
`?preview=hardware-kit` route, `TopologyMode.tsx`,
`TopologyGraphPanel.tsx`, engines/adapters, types, `InspectionLockMarks.tsx`
(still orphaned), all non-canvas/non-inspect tests.

## 1 — Canvas navigation guardrails

V1BL-B's transform allowed pan to escape past viewport bounds with
no clamping; Fit + Reset both restored identity (no actual fit-to-
content algorithm). Bujar lost the graph by panning too far.

V1BL-F:

```ts
const PAN_GUARD_VBU = 96;
const FIT_MARGIN_PX = 48;

function clampTransform(t: ViewTransform, vb: Vb): ViewTransform {
  const txMin = vb.x + PAN_GUARD_VBU - (vb.x + vb.w) * t.scale;
  const txMax = vb.x + vb.w - PAN_GUARD_VBU - vb.x * t.scale;
  const tyMin = vb.y + PAN_GUARD_VBU - (vb.y + vb.h) * t.scale;
  const tyMax = vb.y + vb.h - PAN_GUARD_VBU - vb.y * t.scale;
  const cx = (vb.x + vb.w * 0.5) * (1 - t.scale);
  const cy = (vb.y + vb.h * 0.5) * (1 - t.scale);
  return {
    tx: txMin > txMax ? cx : clamp(t.tx, txMin, txMax),
    ty: tyMin > tyMax ? cy : clamp(t.ty, tyMin, tyMax),
    scale: t.scale,
  };
}
```

Applied at every `setTransform` site (wheel-zoom, wheel-pan, pointer-
pan). When the user zooms so far out that the clamp bounds invert
(content smaller than viewport), the transform is centred instead of
locked.

`fitView` actually computes a fit transform from the current content
bbox:

```ts
const contentMinX = vb.x + VIEWBOX_PAD;
const contentW = vb.w - VIEWBOX_PAD * 2;
// (same for Y)
const scale = clamp(
  min((vb.w - 2 * marginVb) / contentW,
      (vb.h - 2 * marginVb) / contentH),
  ZOOM_MIN, ZOOM_MAX,
);
const tx = (vb.x + vb.w / 2) - scale * (contentMinX + contentW / 2);
const ty = (vb.y + vb.h / 2) - scale * (contentMinY + contentH / 2);
```

So `Fit` always recovers a visible centred graph regardless of how
wildly the operator panned. `Reset` clears node offsets AND restores
identity transform — title bumped to `Reset layout + view (clears
moved nodes)`.

Wheel semantics preserved (Ctrl/Cmd+wheel → zoom, plain wheel → pan,
Shift+wheel → horizontal pan); the clamp is the only behaviour
change.

## 2 — Bay layout: top-right contained card

V1BK split the receiver into a horizontal flex row (map | bay), full
height. Bujar's read: the bay consumes the entire right column,
leaving no room for the future device-information panel.

V1BL-F:

- `.hardware-inspect-receiver` drops `display: flex`. Map and bay
  are now absolute-positioned siblings inside a `position: relative`
  container.
- `.hir-map` → `position: absolute; inset: 0` (fills the receiver).
- `.hir-bay` → `position: absolute; top: 0; right: 0; width:
  clamp(360px, 50%, 640px); height: clamp(360px, 60%, 540px);`. Top
  edge aligns with the map's `.bt-header`; bottom edge stops at ~60%
  of receiver height (max 540 px).
- `border-left` + `border-bottom` added on the bay so it reads as a
  raised card against the map underneath; `box-shadow: 0 4px 14px
  rgba(26,37,48,0.06)` adds soft separation.
- Open / close animations: `flex-basis` keyframes replaced with
  `transform: translateX(60% → 0)` + opacity so the absolute
  positioning works.

Result: the operator sees the map fill the receiver, the bay
overlays the top-right quadrant, and the lower-right region of the
map is free for future panels (or just visible map context).

The map's `bt-header` and the bay's `his-header` still share padding
(10/16) and `border-bottom: 1px solid var(--topo-line-4)`, so the
top rail still reads as one continuous strip across the receiver
width.

## 3 — Drag-to-reposition nodes

New state inside `BlueprintTopologyCanvas`:

```ts
const [nodeOffsets, setNodeOffsets] = useState<Record<string, PointOffset>>({});
const nodeDragRef = useRef<{
  nodeId; startCX; startCY; startDx; startDy; moved
} | null>(null);
const suppressNextClickRef = useRef<string | null>(null);
```

Layout adapter:

```ts
const layouts = useMemo(() => {
  if (Object.keys(nodeOffsets).length === 0) return baseLayouts;
  return baseLayouts.map(l => {
    const off = nodeOffsets[l.node.id];
    return off ? { ...l, x: l.x + off.dx, y: l.y + off.dy } : l;
  });
}, [baseLayouts, nodeOffsets]);
```

Edges and the per-node-frame viewBox derive from `layouts`, so links
follow the moved node automatically — no extra wiring.

Glyph gains an `onPointerDown` handler that calls `onNodeDragStart`
(stops propagation so the canvas-level pointerdown / pan does not
fire) and the parent installs window-level `pointermove` /
`pointerup` / `pointercancel` listeners that:

1. compute pixel delta from start; if `|dx| + |dy| > 5 px` mark the
   drag as `moved`;
2. once `moved`, convert the screen delta to world units via
   `(vb.w / rect.width) / transform.scale` and write the new offset
   into `nodeOffsets`;
3. on pointerup, if the drag `moved`, set `suppressNextClickRef.current
   = nodeId` so the synthetic click that follows on the same element
   is swallowed (no selection toggle on drop).

Click-on-node (below threshold) flows through normally → selection
toggles. Double-click still fires the inspect intent (the synthetic
`dblclick` arrives after both pointerups; the suppress flag only
applies to the next `click`, not `dblclick`).

`Reset` clears `nodeOffsets` along with the transform — generated
positions are restored.

## 4 — 3D inspector meta

Previous (V1BL-E): `unk1u · UNK · ANTHRACITE AXU-UNK · via cta`.

V1BL-F renders the meta line conditionally:

```tsx
const isUnknown = intent.profileId === "unk1u";
if (isUnknown) {
  return <span className="his-meta">
    <span>{intent.family}</span>
    <span className="his-meta-sep">·</span>
    <span data-testid="his-profile-id">unknown profile</span>
  </span>;
}
return <span className="his-meta">
  <span>{intent.family}</span>
  <span className="his-meta-sep">·</span>
  <span data-testid="his-profile-id">{intent.profileId}</span>
  <span className="his-meta-sep">·</span>
  <span>{profile.vendor} {profile.model}</span>
</span>;
```

`via cta` removed entirely. The `his-trigger` testid is gone too —
no test asserted on it (V1BL-D removed it earlier; was reintroduced
briefly in V1BL-D body; now gone again).

For UNK glyphs (Bujar's `axu-unk` example): renders `UNK · unknown
profile` — short, honest, no model-name noise.

For known profiles (e.g. access switch picked from a normal node):
renders `ACC-SW · access24 · ANTHRACITE AXS-124-G` — three useful
tokens.

## 5 — Pan-clamping side-effect on the seam

Because the `.hir-map` now uses `position: absolute; inset: 0` (no
flex sibling), the map's `bt-header` border-bottom continues uninterrupted
across the receiver width *behind* the bay's left edge. The bay's
header sits exactly on top of the map's header (same y, same
height), so the top rail reads as one bar with two regions: the
map's `bt-header` content on the left, the bay's `his-header`
content on the right.

The vertical seam where the bay meets the map (bay left edge) is
now a `1 px var(--topo-line-4)` hairline and a soft 4 px shadow —
visually a raised panel, not a fenced country.

## 6 — Loose V1BL-D stage note

`obsidian/stages/V1BL-D-hardware-inspector-chrome-and-fit.md` was
written during V1BL-D but never committed (V1BL-E shipped a few
hours later and the V1BL-D doc was rolled into the V1BL-E note as
background — no separate commit happened).

Choice: keep the V1BL-D file on disk as historical doc; tell Bujar
to `git add` it alongside this V1BL-F commit so both notes land
together. The V1BL-D content is accurate and self-contained — better
preserved than discarded.

Working-tree state for Bujar to commit:

```
A   obsidian/stages/V1BL-D-hardware-inspector-chrome-and-fit.md  (historical)
A   obsidian/stages/V1BL-F-canvas-guardrails-drag-and-bay-fit.md (this stage)
M   src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx
M   src/modes/topology/blueprint/BlueprintTopologyCanvas.css
M   src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx
M   src/modes/topology/inspect/HardwareInspectScene.tsx
M   src/modes/topology/inspect/HardwareInspectReceiver.css
```

Suggested commit message: `stage-v1bl-f: canvas guardrails, node
drag, contained bay`.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (214 files, 2368 tests, 0 failures, +1 net new)
pnpm build       → green (tsc + vite build, 5.57s)
```

### Test surface (+1 net)

`BlueprintTopologyCanvas.test.tsx`:
- ➕ `V1BL-F — Reset returns to 100% (clears transform + offsets)` —
  zooms via Ctrl+wheel, hits Reset, asserts `bt-nav-zoom` is `100%`
  AND `data-tx`/`data-ty` are `0.00` and `data-scale` is `1.000`.

Node drag itself is not asserted in jsdom (the test surface around
window-attached `pointermove` listeners is too shallow to assert
position changes reliably; manual verify covers it). The test file
total: 27 → 28 tests.

### Bundle effect

| Chunk                          | V1BL-E         | V1BL-F         | Note |
|--------------------------------|----------------|----------------|------|
| `index-*.js` (main shell)      | 752.13 kB      | **754.25 kB**  | +2.1 kB (clampTransform + fitView + nodeOffsets + window-pointer drag) |
| `index-*.css`                  | 215.12 kB      | **215.38 kB**  | +0.3 kB (cursor:move on .bt-node, bay absolute-positioning) |
| `HardwareInspectScene-*.js`    | 5.85 kB        | **5.95 kB**    | +0.1 kB (conditional meta IIFE) |
| `HardwareInspectScene-*.css`   | 4.54 kB        | 4.54 kB        | unchanged |
| `babylon-*.js`                 | 5,105.94 kB    | 5,105.94 kB    | unchanged |
| `buildHardwareModel-*.js`      | 8.92 kB        | 8.92 kB        | unchanged |
| `HardwareKitPreview-*.js`      | 6.14 kB        | 6.14 kB        | unchanged |

Module count 2178 unchanged. Babylon stays 100 % deferred. Receiver
source still grep-clean of `@babylonjs/core`. `?preview=hardware-kit`
URL preserved.

## Manual verify (held for Bujar)

```
pnpm dev   # Vite on :1420
```

**Branch Office (8 dev):**
- Pan canvas wildly with plain wheel → graph cannot be thrown
  off-screen; clamp keeps ≥ 96 vb-units of content visible
- Click Fit → graph recentred + rescaled to fit the visible viewport
  with comfortable margins
- Click Reset → transform back to identity AND any moved nodes
  snap back to generated positions
- Drag a node by ≥ 5 px → node + connected edges follow the pointer
- Drag and release without crossing 5 px → counts as a click,
  selection toggles
- Double-click still fires Inspect Hardware intent
- Click Inspect Hardware → bay appears top-right as a contained
  card, not a full-height column
- Top rail visually unbroken across map + bay
- Lower-right map area below the bay is empty + pannable
- 3D inspector header reads `rtr-cisco-002` then `UNK · unknown
  profile` (or `ACC-SW · access24 · ANTHRACITE AXS-124-G` for
  known profiles) — no `via cta` anywhere

**Campus (16 dev) / Metro (96 dev):**
- Same guardrails; Fit always recovers; pan can't escape

**Bay open + drag node:**
- Move a node from the lower-right area; drag follows pointer;
  releasing doesn't trigger inspect or selection toggle

## Caveats

1. **Node-drag does not persist** across env switches, tab switches
   in TopologyMode, or page reload. `nodeOffsets` is local React
   state; persistence is deferred per Bujar's scope ("local UI
   state only for now").
2. **Drag-DOM assertion skipped** in jsdom. Window-level pointer
   listeners + the `transform.scale → world delta` math don't
   express cleanly under jsdom's pointer-event surface. Manual
   verify covers it.
3. **Drag still grabs the click event handle off the synthetic
   `dblclick`.** Suppress flag clears on the next single-click only,
   so double-clicking a moved node still triggers inspect intent.
   If the user drags then quickly double-clicks the same node, the
   first click is swallowed but the second click + dblclick fire as
   normal.
4. **Pan-clamp uses viewBox-unit guard (96 vbu).** On very zoomed-out
   views this can feel generous; on very zoomed-in views it can feel
   tight. Constant kept simple; tune to `min(vb.w, vb.h) * 0.1` if
   feedback comes in.
5. **Bay-bottom hairline + shadow** are subtle but visible on white.
   Bujar can tighten/loosen via the `--topo-line-4` token + shadow
   alpha if too loud.
6. **`InspectionLockMarks.tsx` still orphaned** (V1BL-E note). Not
   touched here; clean follow-up.

## Hotfix-1 — canvas collapsed to top strip

Bujar visual-verified V1BL-F and found a major regression: the
topology canvas collapsed to a thin strip at the top of the work
surface and the lower area went empty white.

**Root cause:** the V1BL-F refactor dropped `display: flex` from
`.hardware-inspect-receiver` and made `.hir-map` `position:
absolute; inset: 0`. Both `.hir-map` and `.hir-bay` were absolute,
so the receiver had zero in-flow content. The parent chain
(`.tg-content--blueprint > * { flex: 1 1 auto; min-height: 0 }`)
gave the receiver flex-grow, but with no in-flow children the
receiver's main-axis size resolved to a tiny value in several
browsers — collapsing the canvas inside `.hir-map` to roughly the
height of the bay header only.

**Fix:** restore `display: flex` on `.hardware-inspect-receiver`
and `flex: 1 1 auto; min-width: 0; min-height: 0; position:
relative` on `.hir-map`. Keep `.hir-bay` as the absolute overlay
introduced by V1BL-F. Now the map participates in the flex line
again and claims the full receiver height; the bay still floats
over the top-right quadrant; lower-right area is still free.

**Regression test added:**
`V1BL-F.hotfix-1 — blueprint canvas wrap stays mounted inside
hir-map while bay is open` asserts the `.blueprint-topology`
root and `.bt-canvas-wrap` are present both pre-inspect and post
bay open (jsdom can't compute heights, so the test is structural —
the failure mode would be the canvas being unmounted or moved out
of `.hir-map`).

**Files changed (hotfix):**

```
edit  src/modes/topology/inspect/HardwareInspectReceiver.css                   # restore display:flex on receiver, flex:1 1 auto on .hir-map
edit  src/modes/topology/inspect/__tests__/HardwareInspectReceiver.test.tsx    # +1 regression test
```

**Validation (hotfix):**

```
pnpm typecheck   → green
pnpm test --run  → green (214 files, 2369 tests, 0 failures, +1 vs V1BL-F body)
pnpm build       → green (5.73s; bundle sizes unchanged vs V1BL-F body)
```

**Decision kept:** bay stays absolute top-right (V1BL-F overlay
win). Only the receiver/map flex chain was reverted.

## Next candidate stages

1. **V1BL-G — Delete `InspectionLockMarks.tsx`** + scaffold tests
   (still owed from V1BL-E).
2. **V1BL-H — Keyboard nav** (`+ / -` zoom, arrows pan, `F` fit,
   `Esc` back).
3. **V1BL-I — Drag persistence** (env-scoped local-storage of
   `nodeOffsets`).
4. **V1BL-J — Device info panel** for the lower-right map area now
   that V1BL-F freed it.
5. **V1BJ-A — Glyph-rect morph reticle** (still open).

## AO orchestration report

- subagents: 0 (3 surfaces, 5 files, all coupled to the topology
  canvas + inspector receiver layout — splitting would have lost
  the shared transform / clamp / drag math mental model)
- Opus solo: 12 file edits + 1 stage note. Drag implementation
  done as 4 small edits (state + helpers, Glyph prop wiring, two
  Glyph render-branch updates) to keep each diff reviewable.
- effectiveness: −10 % tokens vs hybrid; +5 % vs all-Opus baseline
  (clampTransform was a single self-contained helper, Sonnet would
  have over-engineered it)
- recommendation: interactive-surface work (drag, clamp, gestures)
  stays Opus-solo. The math is the load-bearing part; UI scaffolding
  is mechanical.
