# V1BI — Inspection Theater Polish v0

**Date:** 2026-05-23
**Status:** landed
**Scope:** layer V1BH's working inspect bridge with theater-grade visual chrome — cyan reticles + corner lock marks + stencil sweep during transition; stronger 3D scene header/framing/orbit hint; floating leader-line callout for picks
**Branch:** `main` after V1BH → working tree
**Authority:** Bujar (scope set; git held)

## Mission

V1BH made it work. V1BI makes it feel intentional. Map → inspection
becomes a visible moment of lock; the 3D scene reads as a drafting
viewport; picks pop out as floating leader callouts.

## Files changed

```
new   src/modes/topology/inspect/InspectionLockMarks.tsx              # cyan reticle + corner brackets + stencil + sweep overlay
edit  src/modes/topology/inspect/HardwareInspectReceiver.tsx          # mount InspectionLockMarks
edit  src/modes/topology/inspect/HardwareInspectReceiver.css          # keyframes + overlay rules
rewrite src/modes/topology/inspect/HardwareInspectScene.tsx           # header chips, frame, orbit hint, floating callout
rewrite src/modes/topology/inspect/HardwareInspectScene.css           # all visual polish
new   src/modes/topology/inspect/__tests__/InspectionLockMarks.test.tsx  # 5 tests
edit  src/modes/topology/inspect/__tests__/HardwareInspectReceiver.test.tsx  # +1 lock-marks state test
new   obsidian/stages/V1BI-inspection-theater-polish-v0.md
```

Out of scope (explicit non-changes): `src/topology/hardware/*` (kit
untouched), `BlueprintTopologyCanvas` internals (passport + CTA + dblclick
intact), `src/preview/HardwareKitPreview*` (V1BE-A lazy boundary intact,
`?preview=hardware-kit` URL preserved), `vite.config.ts`,
`TopologyGraphPanel.tsx`, `App.tsx`, doctrine contracts, mesh ID format.

## Visual polish added

### Transition chrome — `InspectionLockMarks` overlay

Mounted by the receiver, fires by phase:

| phase     | stage     | renders                                             |
|-----------|-----------|-----------------------------------------------------|
| `map`     | —         | nothing (`null`)                                    |
| `entering`| `lock`    | corner brackets + central radial reticle (rings + cross-ticks + dot) + stencil "ENTERING HARDWARE INSPECTION" + 2 px cyan sweep traversing left → right |
| `scene`   | `settled` | corner brackets only at 55 % opacity, reticle + stencil hidden |
| `exiting` | `release` | corner brackets + reticle + stencil "RELEASING INSPECTION" + reversed sweep |

CSS keyframes:
- `ilm-lock-in` (240 ms) — opacity 0 → 1 → 0.55, scale 1.06 → 1.00
- `ilm-lock-out` (280 ms) — opacity 0.55 → 0.7 → 0, scale 1.00 → 1.06
- `ilm-sweep` (240/280 ms) — 2 px cyan vertical bar traverses the
  viewport with a 14 px cyan-soft halo

Pointer events disabled on the overlay so picks pass through to the
Babylon canvas during the `settled` stage.

### Scene framing

- **Header**: bottom cyan accent strip (gradient cyan → cyan-deep →
  transparent); 5 chips on a sunken paper background — `family`,
  `profile`, `model` (vendor·model), plus an `opened via` trigger chip
  pushed to the right with cyan border + cyan-soft fill so the
  operator always sees whether the inspect arrived via CTA or dblclick.
- **Frame**: 4 corner brackets (1.5 px ink) drafted 16 px inside the
  canvas wrap. Pure CSS, no SVG, no JS.
- **Orbit hint**: rounded pill at bottom-centre — `drag · orbit ·
  scroll · zoom · click · pick zone` in mono caps, 10 % alpha
  drop-shadow. `pointer-events: none` so it doesn't intercept clicks.

### Pick callout — floating leader

- Anchored to the pointer position captured from `PointerInfo.event`
  (clientX/clientY mapped to canvas-wrap coords).
- 240 px wide card with 3 px cyan top strip + ink border + drop shadow.
- Header shows `<modelId>.<zoneKind>.<index>` in mono on a cyan-soft
  background.
- Rows: `zone kind`, `index`, `port type` (when `kind === "port"` —
  RJ45 / SFP / QSFP derived from the index range), plus a metadata
  footer row with the profile id.
- Leader: inline SVG with a 6 px cyan ring around the pick anchor and
  a 1.5 px cyan line up to the callout's top-left corner.
- `pointer-events: none` so the callout never eats subsequent picks.

## Pick / callout behaviour

1. Click any pickable mesh in the scene.
2. Babylon's pick observable fires → resolves zone tag via `readZone`.
3. `setPickedZone` + `setCalloutAnchor` update React state from the
   pointer event's `clientX`/`clientY` minus the canvas-wrap rect.
4. React renders `<PickCallout>` absolutely positioned over the
   canvas, leader anchored to the pick.
5. Clicking blank canvas (no zone hit) clears both states.
6. The same `HighlightLayer` cyan outline from V1BH is preserved on
   the 3D mesh itself — the floating callout is additive chrome.

## Lazy chunk status

| Chunk                         | V1BH         | V1BI          | Note |
|-------------------------------|--------------|---------------|------|
| `index-*.js` (main shell)     | 747.84 kB    | **749.32 kB** | +1.5 kB (lock marks SVG + overlay CSS) |
| `babylon-*.js`                | 5,105.94 kB  | 5,105.94 kB   | unchanged single deferred chunk |
| `HardwareInspectScene-*.js`   | 4.02 kB      | **5.72 kB**   | +1.7 kB (callout + framing logic) — still lazy |
| `HardwareInspectScene-*.css`  | 2.59 kB      | **4.52 kB**   | +1.9 kB (theater visual polish) — still lazy |
| `buildHardwareModel-*.js`     | 8.92 kB      | 8.92 kB       | unchanged shared chunk |
| `HardwareKitPreview-*.js`     | 6.14 kB      | 6.14 kB       | unchanged |
| `HardwareKitPreview-*.css`    | 2.63 kB      | 2.63 kB       | unchanged |
| `index-*.css`                 | 211.76 kB    | 214.18 kB     | +2.4 kB receiver overlay keyframes + framing |

Lock marks live eagerly in the shell because they wrap the existing
Blueprint canvas; the cost is ~1.5 kB of SVG + CSS keyframes. Babylon
remains 100 % deferred — asserted by the existing source-grep test
(`HardwareInspectReceiver.tsx` contains no `@babylonjs/core` import).

`?preview=hardware-kit` URL preserved — its lazy path is independent
of the inspect receiver and unchanged.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (213 files, 2341 tests, 0 failures, +6 new)
pnpm build       → green (tsc + vite build, 5.26s)
```

### Test surface (+6)

`InspectionLockMarks.test.tsx` (5 tests):
- map phase renders nothing
- entering → `data-stage="lock"` + stencil "ENTERING HARDWARE INSPECTION"
- exiting → `data-stage="release"` + stencil "RELEASING INSPECTION"
- scene → `data-stage="settled"` (corners only)
- source contains no `@babylonjs/core` import

`HardwareInspectReceiver.test.tsx` (+1):
- lock marks absent in map phase, `lock` stage when entering,
  `settled` stage after 240 ms tween

## Manual verify

```
pnpm dev          # Vite on :1420
# (or pnpm tauri:dev)
```

1. Environments mode → create `Branch Office` lab (8 devices), set
   active.
2. Topology → Graph / Map. Confirm Blueprint canvas renders 8 nodes at
   full density.
3. Click any node → passport populates with profile id, chassis,
   vendor·model, ports.
4. Click `Inspect Hardware ▸`. Confirm:
   - cyan radial reticle pulses at viewport centre
   - corner lock brackets fade in
   - cyan sweep bar travels left → right
   - stencil reads `ENTERING HARDWARE INSPECTION`
   - after 240 ms, reticle and stencil fade out; corner brackets settle
     at 55 % opacity around the 3D viewport
5. Scene header shows node label, family chip, profile chip,
   vendor·model chip, and a right-aligned cyan `opened via cta` chip.
6. Canvas frame: 4 ink corner brackets 16 px inside the viewport.
7. Bottom-centre pill: `drag · orbit · scroll · zoom · click · pick zone`.
8. Click a port / module / LED on the model. Confirm a floating
   callout pops above the click with cyan top strip, leader line, and
   `<modelId>.<zoneKind>.<index>` on a cyan-soft background.
9. Click `◂ Back to map`. Confirm reverse stencil
   `RELEASING INSPECTION` + reversed sweep + corner-brackets fade.
10. Double-click a different node → same theater sequence with the
    trigger chip showing `opened via doubleclick`.
11. On a fresh page load, open the Network tab and verify
    `babylon-*.js` only downloads on the first inspect. Normal map
    browsing must not fetch it.

## Caveats

1. **Reticle is screen-centred, not picked-glyph-centred.** Doctrine
   storyboard has the reticle morphing the glyph footprint; v0 keeps
   it pragmatic at centre. Tracking the glyph's screen rect across
   the Blueprint → scene handoff is a follow-up.
2. **Callout has no escape on screen edges.** When the pick is in the
   top-left ~64 px the callout clips against the canvas top via a
   simple `max(8, …)` clamp. Edge-aware repositioning lands when
   pick density grows.
3. **Orbit hint is static text.** No iconography or live state
   ("orbiting…"). Acceptable for v0.
4. **Trigger chip is decorative.** It surfaces the intent's `trigger`
   field but doesn't change behaviour. Useful for QA / debugging.
5. **Sweep + reticle do not slow down on long lazy-chunk fetches.**
   If the operator visits the inspect for the first time on a slow
   network, the sweep ends before Babylon loads and the Suspense
   fallback ("loading hardware scene…") shows briefly. Pragmatic.
6. **Babylon chunk size warning persists** on the deferred chunk —
   by design (V1BE-A note).

## Next candidate stages

1. **V1BJ — Glyph-anchored reticle.** Track the selected Blueprint
   glyph's screen rect; morph the reticle from glyph footprint to
   scene viewport for a continuous lock.
2. **V1BG-A — Smarter profile resolver** (still open).
3. **V1BF-A — Topology adapter interface** (still open).
4. **V1BI-A — Edge-aware callout placement.**

## AO orchestration report

- subagents: 0 (visual polish over fully-mapped surface; intent shape, lazy boundary, and scene recipe already in working context from V1BE/V1BE-A/V1BG/V1BH)
- Opus solo: 8 file writes / edits (1 new overlay component + scene rewrite + CSS overhaul + 2 test files + receiver wire-in)
- effectiveness: −20% tokens vs Sonnet review of the CSS surface; correct skip because the visual contract is documented in design-review/ contracts (cyan budget, drafting frame, corner brackets, 240 ms tween) and Opus had every relevant file from V1BH still in working memory
- recommendation: visual polish over fully-mapped surfaces stays Opus-solo; subagent budget reserved for novel surface investigation
