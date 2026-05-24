# V1BL-D — Hardware Inspector Chrome Cleanup + Bay Fit

**Date:** 2026-05-24
**Status:** landed (working tree; commit/push held for Bujar)
**Scope:** stop the hardware inspect bay from clipping its header / 3D
canvas; replace the chip-soup header with one compact line; drop the
blue scene wash for a near-white drafting surface; remove the L-corner
brackets inside the 3D scene. Preserve Back-to-map, Compact/Wide
controls, pick callout, Babylon deferral, `?preview=hardware-kit`,
and the split-bay map-stays-visible behaviour.
**Branch:** `main` after V1BL-C → working tree
**Authority:** Bujar (scope set; git held)

## Mission

V1BL-C cleaned the topology canvas. Bujar's review of the hardware
bay:

> "3D bay is cropped on the right/top, header chips look messy,
> labels wrap badly, scene has unnecessary L-frame corner marks.
> Make the 3D inspector simpler, cleaner, white, and contained."

Single-stage fix across the bay header, scene background, and the
two ResizeObserver gaps that let the canvas escape the bay edge.

## Files changed

```
edit  src/modes/topology/inspect/HardwareInspectScene.tsx        # header restructure; engine ResizeObserver; near-white clearColor
edit  src/modes/topology/inspect/HardwareInspectScene.css        # white surface; grid header w/ ellipsis label + subtle meta; chip + frame rules removed
edit  src/modes/topology/inspect/HardwareInspectReceiver.css     # hide ilm-corner brackets in `settled` stage
new   obsidian/stages/V1BL-D-hardware-inspector-chrome-and-fit.md
```

Out of scope: `BlueprintTopologyCanvas.tsx`, `hardwarePassport.ts`,
intent payload shape, Babylon engine boundary (still grep-clean of
`@babylonjs/core` outside this module), `?preview=hardware-kit`
route, V1BG/J/K/L topology-side contracts, engines/adapters, types,
all tests outside the inspect module.

## 1 — Clipping fix

Two independent resize gaps:

**Header overflow.** V1BI built the header as `display:flex; gap:14px`
with no `flex-wrap` and four chip spans (`family`, `profile`,
`model`, `trigger`) plus the device label, Back button, and Compact /
Wide controls. At compact bay width (360 px) the chips push the
Compact/Wide pair off the right edge; flex-shrink squeezes the device
label down to its minimum word-width, wrapping `rtr-cisco-002` into
three rows.

V1BL-D replaces the flex row with a CSS grid header:

```css
.his-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 8px 14px 9px;
}
.his-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
```

Three named cells: Back / id+meta / width controls. The middle column
uses `minmax(0, 1fr)` + `min-width:0` on label + meta so they
ellipsize cleanly instead of wrapping. Width buttons stay locked to
the right edge.

**Canvas overflow.** `engine.resize()` was only bound to `window`
resize. Opening the bay (240 ms width animation) and toggling
Compact↔Wide change the canvas-wrap width without firing a window
event, so the Babylon backbuffer kept its initial pixel width — the
canvas visibly escaped the bay's right border for one re-paint.

```ts
let observer: ResizeObserver | null = null;
if (canvasWrapRef.current && typeof ResizeObserver !== "undefined") {
  observer = new ResizeObserver(() => engine.resize());
  observer.observe(canvasWrapRef.current);
}
// disposed alongside scene/engine
```

`box-sizing: border-box` is now declared on the scene root + all
descendants so the new padding values don't break the existing flex
sizing.

## 2 — Header restructure

Before (V1BI / V1BL): Back button + label + 4 chips (`FAMILY`,
`PROFILE`, `MODEL`, `OPENED VIA`) + `Compact` / `Wide` buttons
with full text labels.

After (V1BL-D):

```
[ ◂ Back ]  rtr-cisco-002                                      [ ◂ ] [ ▸ ]
            access24 · ACC-SW · ANTHRACITE AXS-124-G · via cta
```

- **Back button** shortened to `◂ Back` (was `◂ BACK TO MAP`), no
  uppercase tracking, lighter ink colour (cyan only on hover) so it
  stops competing with the device label.
- **Device label** owns the middle column. `white-space: nowrap` +
  ellipsis on overflow; full label still in `title` attribute for
  hover.
- **Subtle meta** sits under the label as a single mono line in
  `--topo-ink-3` (`#557082`) with `--topo-line-4` separators. No
  boxes, no uppercase eyebrow labels, no per-chip border.
- **Compact / Wide** become icon-only `◂` / `▸` (was full word labels
  with arrows). `title` attribute carries the accessible hint.

Test-id surface preserved where tests rely on it:
- `his-back`, `his-label`, `his-profile-id`, `his-width-controls`,
  `his-width-compact`, `his-width-wide`, `his-header`, `his-id`
- removed: `his-trigger-chip` (replaced by `his-trigger` inside `his-meta`)

## 3 — White scene

`scene.clearColor` was `(0.902, 0.929, 0.945)` — a pale blue wash.
The CSS canvas token `--topo-canvas` was the matching `#E6EDF1`.
Both flipped to a near-white drafting surface:

```ts
scene.clearColor = new Color4(0.984, 0.988, 0.992, 1);
scene.ambientColor = new Color3(0.42, 0.44, 0.46);
```

```css
--topo-canvas:        #FAFCFD;
--topo-canvas-deep:   #F1F5F8;
--topo-paper:         #FFFFFF;
--topo-paper-sunken:  #F4F7F9;
```

Cyan (`#0E72A0`) is preserved for:
- pick-zone highlight stroke in `HighlightLayer.addMesh`
- pick callout strip + leader line
- Back button hover state
- Compact/Wide active state

No cyan in the resting scene. Materials in `buildMaterials` are
untouched — only the background hue changed.

## 4 — Frame clutter removed

Two L-shape corner bracket sets sat inside the 3D viewport:

- `.his-frame` + `.his-frame-corner--{tl,tr,bl,br}` in
  `HardwareInspectScene` — drafting-frame brackets, 18 × 18 px,
  inset 16 px, full-time visible while the bay was open.
- `.ilm-corner` in `InspectionLockMarks` — part of the lock-in
  reticle, intended as a 240 ms transition feedback, but the
  `settled` stage only hid `.ilm-reticle` + `.ilm-stencil`. The
  corner brackets persisted at `stroke-width: 1.5` + opacity `0.55`
  for the full duration the bay stayed open.

V1BL-D:

- `.his-frame` JSX + CSS deleted entirely (no fade, the brackets
  carried no signal post-lock).
- `InspectionLockMarks` settled-state rule extended to hide
  `.ilm-corner` alongside `.ilm-reticle` + `.ilm-stencil`. Lock-in
  brackets still play during the 240 ms `entering` phase and the
  280 ms `exiting` phase — kept as transition feedback, removed from
  the steady scene.

Pick callout, leader line, and orbit hint stay as-is.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (214 files, 2367 tests, 0 failures)
pnpm build       → green (tsc + vite build, 5.87s)
```

Test count unchanged. No assertion in the inspect-module tests
referenced the removed chip ids (`his-trigger-chip`), the removed
frame markup, or the orbit hint testid — the rewrite was free of
test churn.

### Bundle effect

| Chunk                          | V1BL-C         | V1BL-D         | Note |
|--------------------------------|----------------|----------------|------|
| `index-*.js` (main shell)      | 754.60 kB      | 754.60 kB      | unchanged |
| `babylon-*.js`                 | 5,105.94 kB    | 5,105.94 kB    | unchanged single deferred chunk |
| `HardwareInspectScene-*.js`    | 6.67 kB        | **6.45 kB**    | −0.22 kB (4 chip components + frame block dropped; meta inline cheaper) |
| `HardwareInspectScene-*.css`   | 5.08 kB        | **4.54 kB**    | −0.54 kB (chip + frame rules removed) |
| `buildHardwareModel-*.js`      | 8.92 kB        | 8.92 kB        | unchanged |
| `HardwareKitPreview-*.js`      | 6.14 kB        | 6.14 kB        | unchanged |
| `index-*.css`                  | 217.26 kB      | 217.25 kB      | unchanged |

Babylon stays 100 % deferred. Receiver source still grep-clean of
`@babylonjs/core`. `?preview=hardware-kit` URL preserved.

## Manual verify (held for Bujar)

```
pnpm dev   # Vite on :1420
```

**Branch Office (8 dev):**
- Select node → Inspect Hardware
- Bay opens; header stays inside the bay at both Compact and Wide
- Device label visible on one line; meta line subtle and readable
- No `OPENED VIA` / `FAMILY` / `PROFILE` boxed chips
- 3D scene background reads near-white, no blue wash
- No L-corner brackets in the scene after the 240 ms lock-in tween
- Back button returns to map; map stays visible throughout

**Compact ↔ Wide:**
- Click ◂ → bay shrinks to 360 px; canvas immediately matches new width
- Click ▸ → bay expands; canvas re-fits without escaping the right edge
- Both states keep the header controls inside the bay

**Pick + callout:**
- Click a port → cyan highlight + leader line + side card still works
- Long device names ellipsize cleanly; full label in tooltip

## Caveats

1. **Pick callout still uses a black hairline border** — matches the
   pre-V1BL-D contrast against the (then) pale-blue canvas. On the
   new near-white surface the border still reads fine; revisit if
   Bujar wants softer separation.
2. **Lock-in corner brackets still play during the 240 ms transition.**
   Kept as transition feedback (signals the bay is "locking onto"
   the chosen node). Trivially removable from `InspectionLockMarks`
   if Bujar wants it pure-fade.
3. **Mobile / very narrow shells** (< 320 px) will still ellipsize
   the device label to near-zero. Bay's `min-width: 360px` should
   keep this from happening in practice; revisit if a narrow shell
   ships.
4. **`his-trigger-chip` test id was removed** — no test asserted on
   it. The substitute `his-trigger` lives inside the new `his-meta`
   span.

## Next candidate stages

1. **V1BL-E — Keyboard nav for the canvas** (carried from V1BL-C
   candidate list; `+ / -` zoom, arrows pan, `F` fit, `Esc` Back).
2. **V1BL-F — Bay snap widths** (40 / 50 / 60 %) instead of binary
   Compact / Wide.
3. **V1BL-G — Topology canvas viewport persistence** across tab
   switches (still open from V1BL-C).
4. **V1BJ-A — Glyph-rect morph reticle** (still open from V1BJ).

## AO orchestration report

- subagents: 0 (3-file edit over a tightly understood surface; chips
  + frame + clearColor + ResizeObserver are one mental model — would
  have lost coherence across Sonnet workers)
- Opus solo: 5 file edits + 1 stage note (header `.tsx` split into
  two passes — scene + error path — to keep the diffs reviewable;
  CSS swapped as one block)
- effectiveness: −10 % tokens vs hybrid (the receiver / scene pair
  is small enough that the coordination cost beats the parallelism
  win)
- recommendation: visual chrome cleanup over a single component pair
  stays Opus-solo. Hybrid pays off when the diffs are independent
  per-file, not when they share a CSS token palette.
