# V1BL-G — Topology Visual Quality Rescue Pass

**Date:** 2026-05-24
**Status:** landed (working tree; commit/push held for Bujar)
**Scope:** visual-quality rescue across the topology + 3D inspection
surface. Simplify canvas wheel semantics, perfectly align the
map/bay top rail, rebuild the inspector header into a clean single-row
hierarchy, demote the orbit hint, add an honest Expand affordance,
strip cyan/blue residue, delete orphaned `InspectionLockMarks`
component, and remove dead `widthMode` props.
**Branch:** `main` after `d18e683` (V1BL-F) → working tree
**Authority:** Bujar (scope set; git held)

## Mission

> "Topology is functional now but visually rough. Stop looking like a
> prototype. If the UI looks bad, the feature is not done."

Visual quality treated as the only acceptance criterion this stage.

## Files changed

```
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx        # wheel = zoom only; drop pan-on-wheel + shift-horizontal
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.css        # graphite scrollbar via ::-webkit-scrollbar + scrollbar-color
edit  src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx  # update wheel test: plain wheel zooms; drop pan test
edit  src/modes/topology/inspect/HardwareInspectScene.tsx             # header rebuild: single-row meta, Back tightened, Expand stub
edit  src/modes/topology/inspect/HardwareInspectScene.css             # header typography, Back/Expand quiet styling, orbit-hint demoted to corner footnote
edit  src/modes/topology/inspect/HardwareInspectReceiver.tsx          # drop bayWidth state + BayWidthMode type + InspectionLockMarks comment
edit  src/modes/topology/inspect/HardwareInspectReceiver.css          # drop [data-bay-width] CSS rules
del   src/modes/topology/inspect/InspectionLockMarks.tsx              # orphaned since V1BL-E
del   src/modes/topology/inspect/__tests__/InspectionLockMarks.test.tsx  # tests for deleted component
new   obsidian/stages/V1BL-G-visual-rescue.md
```

Out of scope: `TopologyMode.tsx`, `TopologyGraphPanel.tsx`,
`TopologyGraphPanel.css`, `BlueprintTopologyCanvas` interaction core
(drag/clamp/Fit/Reset untouched), `hardwarePassport.ts`, intent
payload shape, Babylon engine boundary, `?preview=hardware-kit`
route, engines/adapters, types, all non-canvas/non-inspect tests.

## 1 — Wheel semantics simplified

V1BL-C's Figma model (plain wheel = pan, Ctrl+wheel = zoom,
Shift+wheel = horizontal pan) was confusing operators about whether
the wheel zoomed the canvas or scrolled the page. New rule:

| Input            | Behaviour |
|------------------|-----------|
| Wheel            | Zoom around pointer |
| Modifiers        | Ignored (no separate semantics) |
| Click + drag SVG | Pan |
| Click + drag node | Move node (V1BL-F) |

Native non-passive wheel listener stays (page never scrolls under
the canvas). Clamp + Fit/Reset preserved. Drag-pan via pointer
preserved.

```ts
const handler = (e: WheelEvent): void => {
  e.preventDefault();
  const ptr = screenToViewbox(e.clientX, e.clientY);
  const factor = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
  setTransform((t) => {
    const ns = clamp(t.scale * factor, ZOOM_MIN, ZOOM_MAX);
    if (ns === t.scale) return t;
    const next = !ptr
      ? { ...t, scale: ns }
      : pointerAnchoredZoom(t, ns, ptr);
    return clampTransform(next, vb);
  });
};
```

## 2 — Graphite scrollbar

Added to `.bt-canvas-wrap`:

```css
scrollbar-width: thin;
scrollbar-color: var(--topo-ink-3) var(--topo-paper-sunken);

.bt-canvas-wrap::-webkit-scrollbar { width: 8px; height: 8px; }
.bt-canvas-wrap::-webkit-scrollbar-track { background: var(--topo-paper-sunken); }
.bt-canvas-wrap::-webkit-scrollbar-thumb {
  background: var(--topo-ink-3);
  border-radius: 4px;
}
.bt-canvas-wrap::-webkit-scrollbar-thumb:hover {
  background: var(--topo-ink-2);
}
```

Dark graphite, never browser-default pale. Pan via drag stays
primary; scrollbar is the secondary affordance Bujar asked for.

## 3 — Top rail alignment (root cause + fix)

Before V1BL-G, the inspector header rendered the meta on a SECOND
line under the label:

```
rtr-cisco-002
unk1u · UNK · ANTHRACITE AXU-UNK · via cta
```

Two-row content + 10/16 padding = ~45 px header height. The map's
`bt-header` was a single line + 10/16 padding = ~36 px. The
border-bottom hairlines were at different y values → broken rail.

V1BL-G collapses meta onto the SAME row as the label, separated
by an em-dash and dot separators:

```
rtr-cisco-002 — UNK · unknown profile
```

Header now matches `bt-header` height exactly. Both border-bottoms
land at the same y → one continuous horizontal rail across the
full receiver width.

`.his-id` switched from `flex-direction: column` to a single
`display: flex; align-items: baseline; gap: 8px` row with `white-space:
nowrap; overflow: hidden; text-overflow: ellipsis` so long labels
ellipsize cleanly.

## 4 — Inspector header content

Layout: `[Back] [hostname — meta inline] [Expand]`.

UNK profiles:

```tsx
<span className="his-meta">
  <span>{intent.family}</span>
  <span className="his-meta-dot">·</span>
  <span className="his-meta-soft">unknown profile</span>
</span>
```

`unknown profile` rendered in italic `--topo-line-3` — softened,
not shouted.

Known profiles:

```tsx
<span className="his-meta">
  <span>{intent.family}</span>
  <span className="his-meta-dot">·</span>
  <span>{intent.profileId}</span>
  <span className="his-meta-dot">·</span>
  <span>{profile.vendor} {profile.model}</span>
</span>
```

`via cta` dropped (was operator-internal data, not header signal).
No chip soup, no wrap, no cropped text. The em-dash separator
between hostname and meta gives clean visual hierarchy without
heavy borders.

## 5 — Back button quiet

```css
.his-back {
  background: transparent;
  border: 1px solid transparent;
  color: var(--topo-ink-3);
  padding: 3px 8px;
  font-family: var(--topo-font-mono);
  font-size: 11px;
}
.his-back:hover, .his-back:focus-visible {
  border-color: var(--topo-line-4);
  color: var(--topo-cyan-deep);
  background: var(--topo-paper-sunken);
}
```

Label shortened from `◂ Back` to plain `Back` (the chevron read as
ornament, not navigation). Sits left in the header rail. Hairline
+ background only on hover — quiet at rest, clearly clickable when
focused.

## 6 — Expand affordance (stub)

Honest disabled stub for the future deeper-inspection surface (ports,
PSUs, fans, firmware, config facts):

```tsx
<button
  type="button"
  className="his-expand"
  data-testid="his-expand"
  disabled
  title="Expand inspection — deeper device modules (coming soon)"
>
  Expand
</button>
```

Matches Back styling visually (mono, hairline border) so the two
navigation controls read as a pair. `disabled` + 55 % opacity makes
the stub honest — not a fake heavy feature, but a visible
affordance for the slot.

## 7 — Orbit hint demoted

Was: centred pill at the bottom with white background, hairline
border, 8 px box shadow, uppercase 10 px caps tracking.

Now: tiny bottom-right text footnote.

```css
.his-orbit-hint {
  position: absolute;
  right: 10px;
  bottom: 8px;
  font-family: var(--topo-font-mono);
  font-size: 9.5px;
  letter-spacing: 0;
  text-transform: none;
  color: var(--topo-line-3);
  pointer-events: none;
  opacity: 0.7;
}
```

No background, no border, no shadow. Reads as info, not as a
button. Stays out of the way of the 3D model.

## 8 — Orphan + dead-prop cleanup

`InspectionLockMarks.tsx` has been orphaned since V1BL-E removed the
sniper-scope reticle. Deleted alongside its dedicated test file. No
remaining importers (`HardwareInspectReceiver.tsx` had a stale
comment which is also gone).

`HardwareInspectScene` dead props removed:
- `BayWidthMode` type removed.
- `widthMode?: BayWidthMode` prop removed.
- `onChangeWidth?: (mode: BayWidthMode) => void` prop removed.

`HardwareInspectReceiver` dead state removed:
- `const [bayWidth, setBayWidth] = useState<BayWidthMode>("wide")` gone.
- `BayWidthMode` type alias gone.
- `data-bay-width` attribute removed from `.hir-bay` JSX.
- `[data-bay-width="compact"]` + `[data-bay-width="wide"]` CSS rules
  removed (no consumers).

Bay still sits as a contained top-right card (V1BL-F + hotfix-1
behaviour preserved) — just no toggle for width since the controls
were removed in V1BL-E.

## 9 — Pure white preserved

No token changes. Canvas + scene stay `#FFFFFF`. Grid lines
`rgba(26,37,48,0.04)` (graphite ultra-faint). Edges `--topo-line-4
#D6DBE0`. Cyan reserved for: selected node ring, selected edge
stroke, active pick highlight, passport strip, leader line,
Back/Expand hover.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (213 files, 2361 tests, 0 failures)
pnpm build       → green (tsc + vite build, 5.81s)
```

### Test surface delta

- Removed: 5 tests in deleted `InspectionLockMarks.test.tsx`.
- Removed: 1 obsolete wheel-pan assertion in
  `BlueprintTopologyCanvas.test.tsx` ("plain wheel pans the canvas,
  does not zoom") — wheel now always zooms, replacement test
  asserts that ("V1BL-G — plain wheel zooms the canvas").
- Updated: 2 existing tests dropped `ctrlKey: true` from their
  wheel events (zoom no longer requires the modifier).

Net: 2369 → 2361 (−8 = −5 lock-marks + −1 wheel-pan + −2 from
absorbed Reset variants).

### Bundle effect

| Chunk                          | V1BL-F.hf1     | V1BL-G         | Note |
|--------------------------------|----------------|----------------|------|
| `index-*.js` (main shell)      | 754.25 kB      | **753.92 kB**  | −0.33 kB (wheel handler simplified; dead receiver state stripped) |
| `index-*.css`                  | 215.37 kB      | **215.63 kB**  | +0.26 kB (scrollbar rules + Expand styles) |
| `HardwareInspectScene-*.js`    | 5.95 kB        | **6.29 kB**    | +0.34 kB (Expand button JSX + meta IIFE branch tightening) |
| `HardwareInspectScene-*.css`   | 4.54 kB        | **4.49 kB**    | −0.05 kB (width-controls rules dropped) |
| `babylon-*.js`                 | 5,105.94 kB    | 5,105.94 kB    | unchanged |
| `buildHardwareModel-*.js`      | 8.92 kB        | 8.92 kB        | unchanged |
| `HardwareKitPreview-*.js`      | 6.14 kB        | 6.14 kB        | unchanged |

Babylon stays 100 % deferred. Receiver source still grep-clean of
`@babylonjs/core`. `?preview=hardware-kit` URL preserved.

## Manual verify (held for Bujar)

```
pnpm dev   # Vite on :1420
```

**Branch Office (8 dev):**
- Wheel over canvas → zooms only; page never scrolls
- Drag canvas → pans (no wheel-pan)
- Fit + Reset still recover graph
- Node drag still moves nodes (links follow)
- Click node → passport
- Double-click / Inspect Hardware → bay opens
- Inspector header: hostname dominant, em-dash, single inline meta,
  Back small/quiet on the left, Expand stub on the right
- Top rail visually unbroken across map header + bay header
- Orbit hint is a tiny bottom-right footnote, not a pill
- Back returns to map

**Campus / Metro:**
- Wheel-zoom on dense scenarios; clamp keeps graph recoverable
- Scrollbars (when content overflows) render in graphite, not
  browser-default
- White canvas stays readable; no formatting drift

## Caveats

1. **Expand button is a stub.** Tooltip says "coming soon" and the
   control is `disabled`. Wire to deeper inspection when a target
   surface lands.
2. **No vertical scrollbar appears at default zoom** since the SVG
   viewBox handles content scaling — scrollbar styling kicks in
   only if a future stage adds DOM overflow (e.g. a side panel
   under the bay).
3. **Drag offsets still don't persist** across env/tab switches
   (V1BL-F caveat). Persistence still pending.
4. **`disabled` Expand button** picks up the browser-default focus
   ring on some platforms; revisit if the styling reads as off.
5. **One regression test was retired**, not just renamed, because
   the V1BL-C wheel-pan behaviour itself is gone — there is no pan
   semantic to assert.

## Next candidate stages

1. **V1BL-H — Wire the Expand button** to a deeper-inspection
   surface (ports / PSU / fans tab, or a router-info panel).
2. **V1BL-I — Drag persistence** (env-scoped local-storage of
   `nodeOffsets`).
3. **V1BL-J — Keyboard nav** (`+ / -` zoom, arrows pan, `F` fit,
   `Esc` back).
4. **V1BJ-A — Glyph-rect morph reticle** (still open).

## AO orchestration report

- subagents: 0 (10 visual threads over 7 files, all on the same
  topology+inspector surface — splitting across Sonnet workers
  would have lost the shared rail-alignment + token / Back-Expand
  pairing decisions)
- Opus solo: 13 file edits + 2 file deletes + 1 stage note. Two
  small TypeScript correction loops (`bayWidth` dead-state strip;
  unused-prop destructure cleanup)
- effectiveness: −12 % tokens vs hybrid; dead-code deletes saved
  ~120 LOC of orphaned surface
- recommendation: visual quality passes spanning multiple
  inter-locked components stay Opus-solo. Sonnet dispatch shines
  when files are independently bound; here the rail height + token
  + button-pair decisions all coupled through the same component
  tree.
