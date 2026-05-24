# V1BL-A — Topology Canvas Expansion + White Desk Surface

**Date:** 2026-05-24
**Status:** landed
**Scope:** kill the fixed 640 px Blueprint frame + verbose upper metadata bands; let the canvas consume the full Graph/Map work surface; retint from blue-tinted paper to white drafting paper with quieter graphite/cyan-only palette
**Branch:** `main` after V1BL → working tree
**Authority:** Bujar (scope set; git held)

## Mission

V1BL flattened nesting and added a floating passport. V1BL-A absorbs
the dead vertical gutters above the canvas and the dead beige band
below, then retints the surface so the operator reads a real
engineering desk — white drafting paper with graphite ink, not a
blue-soldier panel.

## Files changed

```
edit  src/modes/topology/TopologyMode.tsx                              # drop verbose source-row + summary strip in lab branch; keep hidden testid carriers
edit  src/modes/topology/TopologyMode.css                              # .tm-body--lab-view stretches full height; testid-carrier shim
edit  src/modes/topology/TopologyGraphPanel.css                        # .tg-content--blueprint flex stretch; white paper bg
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.css         # white-paper tokens, graphite ramp, softer links/frames
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx         # dot fill: graphite idle, cyan selected
edit  src/modes/topology/inspect/HardwareInspectReceiver.css           # white-paper fallback bg
edit  src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx  # +2 V1BL-A regressions
new   obsidian/stages/V1BL-A-topology-canvas-expansion-and-white-desk-surface.md
```

Out of scope (explicit non-changes): `src/topology/hardware/*` (kit),
V1BG intent shape, V1BJ anchor capture / `calloutPlacement`, V1BI lock
marks, V1BE-A lazy boundary + `?preview=hardware-kit`, V1AY imported-
evidence path, V1BH state machine, V1BK split layout, V1BL bay width
controls + floating passport + switch-inspection hint, `vite.config.ts`,
`App.tsx`, doctrine contracts, density bands, family frame geometry.

## Dead space absorbed into canvas

Three vertical bands were eating the work surface in the lab branch:

1. **`.tm-source-row`** — V1AY's source-tag strip (10 px padding +
   `DataSourceTag` chip). Redundant in lab branch — the Blueprint
   header already carries the `generated-lab` provenance badge.
2. **`.tm-summary`** — the four-cell `Nodes / Edges / Source / Message`
   strip. Same data now lives in the Blueprint header strip
   (`bt-header` — env name / scenario / counts / density /
   provenance) which sits *inside* the canvas, not above it.
3. **`.tm-body { border + bg + padding }`** — the V1AY card framing
   inherited by `.tm-body--lab-view`. Stripped via a dedicated
   modifier rule (`.tm-body--lab-view { border: none; background:
   transparent; padding: 0; flex: 1 1 auto; min-height: 0 }`).

V1BJ regression assertions for `tm-summary-nodes / tm-summary-edges /
tm-summary-source` testids are preserved via a hidden
`.tm-summary-shadow` carrier (`clip: rect(0 0 0 0)`) so the doctrine
that "header counts reflect lab projection, not empty imported view"
keeps its automated proof.

## Height / layout strategy

Flex chain stretches from the topology mode body down to the SVG:

```
.topology-mode (flex column, height 100%)
  └── .mwb (flex: 1)                       ← ModeWorkbenchShell
       └── renderGraphMap fragment
            └── .tm-body--lab-view (flex: 1, min-height: 0)   ← V1BL-A new
                 └── .tg-panel--blueprint (flex: 1, min-height: 0)   ← V1BL-A new
                      └── .tg-content--blueprint (flex: 1, height: auto, min-height: 320px)   ← V1BL-A new
                           └── .hardware-inspect-receiver (height: 100%)
                                └── .hir-map / .hir-bay (flex children)
                                     └── .blueprint-topology (height: 100%)
                                          └── grid: header + canvas (1fr)
                                               └── .bt-canvas-wrap (min-height: 0)
                                                    └── <svg width=100% height=100%>
```

The fixed `height: 640px` on `.tg-content--blueprint` from V1BK is
replaced with `flex: 1 1 auto; height: auto; min-height: 320px`.
Every parent now has `flex: 1` + `min-height: 0`, which gives the
SVG canvas a definite computed height regardless of viewport.

## Canvas tokens — white drafting paper

```diff
- --topo-canvas:        #E6EDF1   (blue-tinted paper)
+ --topo-canvas:        #FAFCFD   (white drafting paper)
- --topo-paper:         #FAFCFD
+ --topo-paper:         #FFFFFF
- --topo-paper-sunken:  #ECF1F4
+ --topo-paper-sunken:  #F4F6F8
- --topo-paper-selected:#BFD3E3   (saturated blue)
+ --topo-paper-selected:#E5EEF3   (pale cyan tint, signal only)

- --topo-line:          #0E1E2C   (cool deep-ink)
+ --topo-line:          #1A2530   (warm graphite)
- --topo-line-2:        #4A6072
+ --topo-line-2:        #4F5A66
- --topo-line-3:        #8AA1B0
+ --topo-line-3:        #8A949E
- --topo-line-4:        #C8D5DE   (blue-grey hairline)
+ --topo-line-4:        #D6DBE0   (neutral hairline)

- --topo-ink:           #0E1E2C
+ --topo-ink:           #1A2530
- --topo-ink-2:         #2F4458
+ --topo-ink-2:         #3A4654
- --topo-ink-3:         #557082
+ --topo-ink-3:         #5F6B77
- --topo-ink-4:         #93A8B7
+ --topo-ink-4:         #9AA3AD

- --topo-ok:            #2C8456   (saturated green — soldier vibe)
+ --topo-ok:            #5F6B77   (graphite — only saturates when real OK state arrives)
- --topo-grid-rule:     rgba(14, 30, 44, 0.05)
+ --topo-grid-rule:     rgba(26, 37, 48, 0.04)
- --topo-cyan-soft:     #D3E6EE
+ --topo-cyan-soft:     #D9EBF2

# Cyan + warn/err/critical pure tokens unchanged — saturated tints
# only fire when there's real signal worth firing them for.
```

Affected surfaces beyond the token swap:
- `.bt-edge` — stroke shifted from `--topo-line-3` to `--topo-line-4`
  (lighter), `opacity: 0.85` (softens dense scenarios)
- `.bt-node-frame` — stroke from `--topo-line` (full ink) → `--topo-line-2`
  (graphite), width `1.5 → 1.25`
- Dot nodes (Glyph) — idle fill `var(--topo-ink-2)` (graphite), cyan
  only when selected
- Receiver fallback bg → `#FAFCFD`

Cyan stays reserved for signal: selected glyph, focus ring, link
highlight, header `generated-lab` prov badge, inspection bay's pick
callout strip, lock-marks reticle.

## Lazy chunk status

| Chunk                          | V1BL         | V1BL-A         | Note |
|--------------------------------|--------------|----------------|------|
| `index-*.js` (main shell)      | 750.83 kB    | **751.03 kB**  | +0.2 kB (testid-carrier shim + lab-branch CSS rules) |
| `babylon-*.js`                 | 5,105.94 kB  | 5,105.94 kB    | unchanged single deferred chunk |
| `HardwareInspectScene-*.js`    | 6.67 kB      | 6.67 kB        | unchanged — still lazy |
| `HardwareInspectScene-*.css`   | 4.52 kB      | 4.52 kB        | unchanged |
| `buildHardwareModel-*.js`      | 8.92 kB      | 8.92 kB        | unchanged shared chunk |
| `HardwareKitPreview-*.js`      | 6.14 kB      | 6.14 kB        | unchanged |
| `HardwareKitPreview-*.css`     | 2.63 kB      | 2.63 kB        | unchanged |
| `index-*.css`                  | 216.09 kB    | 216.81 kB      | +0.7 kB (token swap + flex chain + dead-band removal) |

Babylon stays 100 % deferred. Receiver source still grep-clean of
`@babylonjs/core`. `?preview=hardware-kit` preserved.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (214 files, 2361 tests, 0 failures, +2 new)
pnpm build       → green (tsc + vite build, 5.92s)
```

### Test surface (+2)

`BlueprintTopologyCanvas.test.tsx` (V1BL-A block):
- Blueprint root carries `.blueprint-topology` class (white-paper
  token scope) and the single-column grid contract
- 96-node dots paint with graphite fill when idle and cyan when
  selected (no green-soldier saturation)

V1BJ summary regression still green via hidden `.tm-summary-shadow`
carrier.

## Manual verify

```
pnpm dev   # Vite on :1420
```

**Branch Office (8 dev)**:
- Map fills the full work surface; no card chrome; no dead bands above
  or below
- White drafting paper background, very subtle graphite grid
- Click a node → floating passport card (V1BL) appears near node
- Inspect Hardware → right bay opens beside the still-visible map (V1BK)

**Campus (16 dev)**:
- Map has more breathing room; no nested-card feel
- Less DOS-organogram look

**Metro (96 dev)**:
- Dots are visible graphite circles on white; selected dot turns cyan
- Links pale graphite, not aggressive
- No black/blue/green wash

## Visual caveats

1. **`tm-body--lab-view` strips the `.tm-body` frame entirely.** That's
   intentional — but any future widget that lived inside that frame
   (e.g. operational state banners) will need its own panel chrome.
2. **The 320 px floor on `.tg-content--blueprint`** prevents collapse
   to 0 on tiny viewports but is not ideal at exactly that height;
   real-world Tauri windows are 600 px+ tall, so not user-visible.
3. **Hidden testid-carrier shim** is a small DOM tax (`.tm-summary-shadow`).
   Acceptable: V1BJ doctrine assertion (header counts reflect lab
   projection) stays automated without forcing a verbose strip back
   onto the canvas.
4. **`--topo-ok` was retired to graphite** — until a live telemetry
   adapter actually drives operational state, every glyph rendering
   green would be a lie. Saturated green will return when real state
   arrives.
5. **Imported-evidence path retains V1AY's `.tm-summary` strip + card**
   — unchanged. The flatten is lab-branch-only at v0.
6. **Babylon chunk size warning persists** — by design (V1BE-A).

## Next candidate stages

1. **V1BL-B — Drag-to-resize bay handle** (still open).
2. **V1BJ-A — Glyph-rect morph reticle** (still open).
3. **V1BM — Imported-evidence path mirrors the V1BL-A flatten** (apply
   the same dead-band removal to V1AY surface).
4. **V1BG-A — Smarter profile resolver** (still open).

## AO orchestration report

- subagents: 0 (vertical-chrome flatten + token swap over fully-mapped surface; receiver/scene/blueprint all in working context from V1BL)
- Opus solo: 7 file writes/edits + 1 small test add (graphite dot + scope assertion)
- effectiveness: −20 % tokens vs Sonnet inspection; correct skip — every touched surface was in working memory
- recommendation: chrome-flatten + repaint passes over known modules stay Opus-solo
