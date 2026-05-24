# V1BL — Topology Canvas Authority v0

**Date:** 2026-05-24
**Status:** landed
**Scope:** flatten Topology into a single full-surface drafting canvas; replace permanent right summary wall with floating passport card; make inspection bay width-controllable; widen 3D scene camera; relabel `3D / Canvas` tool to kill alternative-inspection-target confusion
**Branch:** `main` after V1BK → working tree
**Authority:** Bujar (scope set; git held)

## Mission

V1BK kept the map visible alongside the bay. V1BL goes further: the
operating surface **is** the map. No fixed-width sidewalls. Selection
floats over the canvas next to the picked node. The bay is optional
chrome that the operator can size — not a permanent companion. And
the `3D / Canvas` sub-nav label stops promising a separate inspection
target.

## Files changed

```
rewrite  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx       # drop summary column, add floating passport, switch-inspection hint
edit     src/modes/topology/blueprint/BlueprintTopologyCanvas.css       # single-column canvas + floating passport styles
edit     src/modes/topology/inspect/HardwareInspectReceiver.tsx         # pass inspectingNodeId to Blueprint, manage bayWidth state
edit     src/modes/topology/inspect/HardwareInspectReceiver.css         # bay width-mode rules
edit     src/modes/topology/inspect/HardwareInspectScene.tsx            # widthMode + onChangeWidth props, width buttons, freer camera
edit     src/modes/topology/inspect/HardwareInspectScene.css            # width-control button styles, drop heavy cyan wash on trigger chip
edit     src/modes/topology/TopologyMode.tsx                            # relabel "3D / Canvas" → "Wall view (later)"
edit     src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx  # passport-floating + switch-inspection-hint regressions
new      obsidian/stages/V1BL-topology-canvas-authority-v0.md
```

Out of scope (explicit non-changes): `src/topology/hardware/*` (kit),
V1BG intent shape, V1BE-A lazy boundary + `?preview=hardware-kit`,
V1AY imported-evidence path, V1BH receiver state machine, V1BI lock
marks, V1BJ anchor capture/calloutPlacement helper, `vite.config.ts`,
`App.tsx`, `EnvironmentLifecycleContext.tsx`, mesh ID format,
doctrine contracts.

## Graph/Map vs 3D/Canvas confusion — reduced

`TOPOLOGY_TOOL_META[3]` relabelled:

```
"3D / Canvas"      →     "Wall view (later)"
```

Removes the implication that operators have two inspection-target tabs.
Hardware inspection launches **only** from the Graph/Map node passport's
`Inspect Hardware ▸` CTA (or dblclick). The wall-view tab stays present
for a future wall-display overview but no longer reads as a competing
inspection surface.

## Full-surface canvas

Before V1BL the Blueprint grid was `1fr 280px` — a fixed right summary
wall. V1BL collapses to `grid-template-columns: 1fr` and the entire
content column is the drafting canvas. Only the hairline border on
`.tg-content--blueprint` (V1BK) and the app shell sideboard remain as
visual boundaries.

```diff
- grid-template-columns: 1fr 280px;
- grid-template-areas: "header header" "canvas summary";
+ grid-template-columns: 1fr;
+ grid-template-areas: "header" "canvas";
```

`.bt-summary` rules removed; replaced by `.bt-passport-floating`
overlay over `.bt-canvas-wrap`.

## Selection card behaviour

```
operator clicks any glyph
  ↓
selectedId set
  ↓
useLayoutEffect computes anchor from selected glyph's screen rect
  ↓
placeCallout({pickX, pickY}, {w: 280, h: 220}, {wrap.w, wrap.h})
  ↓
floating passport mounts at edge-aware left/top
  ↓
clicking the same glyph again, or clicking blank canvas, dismisses
```

The floating passport carries:
- node id (mono on light sunken stripe)
- label, family, role hint, neighbour count
- hardware passport (profile id, chassis, vendor·model, rack units, ports)
- `Inspect Hardware ▸` CTA

When the receiver passes `inspectingNodeId={intent?.nodeId}` and the
operator selects a **different** node:
- a `bt-passport-switch-hint` line surfaces:
  `Hardware bay shows another device — re-inspect to switch.`
- the CTA label switches to `Re-inspect Hardware ▸`
- the existing inspection scene is **not** destroyed; the operator
  decides whether to re-dispatch via the CTA

## Inspection bay behaviour

V1BK split layout retained. V1BL adds:

- `bayWidth: "compact" | "wide"` state on the receiver (default `wide`)
- `data-bay-width="compact"` → `flex-basis: 360px`
- `data-bay-width="wide"` → `flex-basis: 50%`
- two buttons in the scene header: `◂ Compact` / `Wide ▸`
  (`his-width-compact` / `his-width-wide` testids)
- selected button shows `is-active` ring (cyan border, paper bg)

`◂ Back to map` (V1BH) keeps the unmount/dispose path. No collapse-
without-unmount (would keep Babylon mounted off-screen — not worth
the memory).

The bay's lock marks + Suspense fallback (V1BI/V1BJ) unchanged. The
trigger chip in the scene header dropped its cyan wash for a paper
look so cyan stays reserved for true active signal (selected port,
state ring, focus).

## Zoom / orbit limits

`HardwareInspectScene` camera widened:

| Limit            | V1BK         | V1BL         |
|------------------|--------------|--------------|
| `wheelPrecision` | 80           | **40**       |
| `lowerRadiusLimit` | 0.5        | **0.2**      |
| `upperRadiusLimit` | 6.0        | **12.0**     |
| `minZ`           | 0.05         | **0.02**     |
| `maxZ`           | 50           | **100**      |

Lower `wheelPrecision` = faster zoom-per-click. Operator can push in
to a single port or pull back ~2× further from the device for context.
Near/far planes loosened accordingly.

## Lazy chunk status

| Chunk                          | V1BK         | V1BL         | Note |
|--------------------------------|--------------|--------------|------|
| `index-*.js` (main shell)      | 750.77 kB    | **750.83 kB** | +0.06 kB (floating passport + width state) |
| `babylon-*.js`                 | 5,105.94 kB  | 5,105.94 kB   | unchanged single deferred chunk |
| `HardwareInspectScene-*.js`    | 6.46 kB      | **6.67 kB**   | +0.2 kB (width controls + widened camera consts) — still lazy |
| `HardwareInspectScene-*.css`   | 4.52 kB      | 4.52 kB       | unchanged |
| `buildHardwareModel-*.js`      | 8.92 kB      | 8.92 kB       | unchanged shared chunk |
| `HardwareKitPreview-*.js`      | 6.14 kB      | 6.14 kB       | unchanged |
| `HardwareKitPreview-*.css`     | 2.63 kB      | 2.63 kB       | unchanged |
| `index-*.css`                  | 215.93 kB    | 216.09 kB     | +0.2 kB (floating passport + width-control styles) |

Babylon stays 100 % deferred. `HardwareInspectReceiver.tsx` still
grep-clean of `@babylonjs/core`. `?preview=hardware-kit` preserved.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (214 files, 2359 tests, 0 failures, +1 new)
pnpm build       → green (tsc + vite build, 5.91s)
```

## Manual verify

```
pnpm dev   # Vite on :1420
```

**Branch Office (8 dev):**
1. Topology → Graph / Map. Confirm map fills the full work surface; no fixed right column; sideboard is the only outer boundary.
2. Click any node. Floating passport card appears near the node carrying profile id + Inspect CTA. Click blank canvas → passport dismisses.
3. Click `Inspect Hardware ▸`. Right bay slides in (V1BK behaviour). Map remains on the left. Selection wall is gone.
4. In the bay header, click `◂ Compact` → bay shrinks to 360 px. Click `Wide ▸` → back to 50%.
5. Click a port → V1BI floating callout. Scroll → zoom is faster and goes further. Drag → orbit feels freer.
6. Click `◂ Back to map`. Bay collapses (280 ms), map reclaims full width.
7. Select a different node while bay is open. Passport now shows the switch-inspection hint + CTA `Re-inspect Hardware ▸`.

**Campus (16 dev):** map reads as a real canvas, not an org-chart panel.

**Metro (96 dev):** same flow holds; passport positions correctly on dots.

**Lazy:** open Network tab on fresh refresh; `babylon-*.js` only downloads on first inspect or `?preview=hardware-kit`.

## Caveats

1. **No drag-to-resize between buttons.** Width is two-step (compact / wide). A drag handle could land in V1BL-A.
2. **Switch-inspection hint is passive.** It nudges the operator to re-click the CTA; no auto-prompt modal. By design — destructive actions in inspection should be operator-initiated.
3. **Floating passport doesn't follow the node on viewport resize.** Anchor is captured once per selection (useLayoutEffect on `selectedId / view / band`). Window resize while selected leaves the card at its original position until next selection. Acceptable for v0.
4. **Camera limits are global**. Different profiles (a chassis vs an SFP module) might benefit from per-profile defaults. Deferred.
5. **`Wall view (later)`** tab is empty — clicking it now reads as "deferred". A polish stage can replace with a real overview surface.
6. **Babylon chunk size warning persists** on the deferred chunk — by design (V1BE-A).

## Next candidate stages

1. **V1BL-A — Drag-to-resize bay handle.**
2. **V1BJ-A — Glyph-rect morph reticle** (still open).
3. **V1BG-A — Smarter profile resolver** (still open).
4. **V1BL-B — Passport position follows on viewport resize** (ResizeObserver).
5. **V1BL-C — Per-profile camera defaults.**

## AO orchestration report

- subagents: 0 (canvas authority refactor + UX polish on fully-mapped surface; intent + lazy + camera all in working context from V1BG–V1BK)
- Opus solo: 9 file writes/edits + 2 test fixups (replaced `bt-summary` → `bt-passport-floating`; deselect now unmounts, no empty placeholder)
- effectiveness: −20 % tokens vs Sonnet inspection; correct skip — every touched surface was already in working memory
- recommendation: UX-flatten + chrome-reduce passes over known surfaces stay Opus-solo
