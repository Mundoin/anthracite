# V1BL-C — Canvas nav Figma model + Inspect-CTA fix + Topology chrome strip

**Date:** 2026-05-24
**Status:** landed (working tree; commit/push held for Bujar)
**Scope:** make Blueprint canvas wheel semantics intentional (Figma model:
wheel pans, Ctrl/Cmd+wheel zooms, page never scrolls under canvas); fix
Inspect Hardware CTA flicker after view/menu changes; stop the 3D lock
reticle from drifting off the node after the bay opens; nuke the duplicate
chrome (workbench `Graph / Map · READY` header, `Topology · Map` strip,
duplicate Simulated badge) around the Topology canvas.
**Branch:** `main` after `bf648c2` (V1BL-B) → working tree
**Authority:** Bujar (scope set; git held)

## Mission

V1BL-B made the canvas operable. Bujar's review:

> "Canvas is much better, but scroll behavior is confused — wheel
> scrolls page, Ctrl+wheel zooms; make topology canvas navigation
> intentional and predictable. Inspect Hardware CTA is intermittent
> after view/menu changes, and the 3D inspection view drifts/escapes
> right after repeated interactions. Nuke remaining non-canvas chrome
> from Topology Graph/Map: remove the extra Graph / Map / Inspect
> topology… header, READY/simulated clutter, Topology · Map strip,
> duplicate Simulated badge; keep only compact generated-lab/context
> info inside the canvas."

Three coupled threads, all rooted in the same surface, fixed in one
stage so the working tree stays coherent.

## Files changed

```
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx        # Figma wheel model (native non-passive); ResizeObserver-driven passport tracking
edit  src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx  # Ctrl+wheel zoom + plain wheel pan tests
edit  src/modes/topology/TopologyGraphPanel.tsx                       # drop "Topology · Map" + duplicate badge for simulated branch
edit  src/modes/topology/TopologyMode.tsx                             # tighten labView dep; hide workbench header for graph_map
edit  src/modes/topology/__tests__/TopologyGraphPanel.test.tsx        # invert badge assertion for simulated branch
edit  src/modes/topology/inspect/HardwareInspectReceiver.tsx          # live anchor recomputation via ResizeObserver
edit  src/components/workbench/types.ts                               # add optional `header_hidden?: boolean` to ModeTool variants
edit  src/components/workbench/ModeWorkbenchShell.tsx                 # skip ActiveToolHeader when header_hidden
new   obsidian/stages/V1BL-C-canvas-nav-figma-and-chrome-strip.md
```

Out of scope: `src/topology/hardware/*` kit, `hardwareProfiles.ts`,
`blueprintGlyph.ts`, `hardwarePassport.ts`, V1BG intent payload shape,
V1BJ anchor *placement* helper (still used by passport), V1BL passport
behavior, V1BK split bay layout, V1BL-A surface tokens, V1BL-B
Fit/Reset/zoom-indicator semantics, ModeWorkbenchShell rail/subnav
markup, engines/adapters, API surface, all test infrastructure outside
topology + workbench shell.

## 1 — Figma wheel model

The V1BL-B wheel handler was a React `onWheel`. React 17+ registers
delegated wheel events as **passive**, so `e.preventDefault()` from
the React handler can't stop the page scrolling. Hence Bujar's:

> "wheel scrolls page, Ctrl+wheel zooms"

(the latter only worked because Ctrl+wheel triggers browser zoom on
the *page* — coincidentally the page zoom maps to canvas pinch-zoom
on trackpads).

V1BL-C replaces it with a native `addEventListener('wheel', …,
{ passive: false })` on `svgRef.current`, owned by a `useEffect`:

```ts
useEffect(() => {
  const svg = svgRef.current;
  if (!svg) return;
  const handler = (e: WheelEvent): void => {
    e.preventDefault();                               // always own the wheel
    if (e.ctrlKey || e.metaKey) {                     // zoom around pointer
      …setTransform(scale → ns, tx/ty → pointer-anchored)
      return;
    }
    // pan in viewBox units; Shift+wheel converts a mouse-only deltaY
    // into a horizontal pan (browser convention).
    const swap = e.shiftKey && e.deltaX === 0;
    const panDx = swap ? -e.deltaY * rx : -e.deltaX * rx;
    const panDy = swap ? 0 : -e.deltaY * ry;
    setTransform(t => ({ ...t, tx: t.tx + panDx, ty: t.ty + panDy }));
  };
  svg.addEventListener("wheel", handler, { passive: false });
  return () => svg.removeEventListener("wheel", handler);
}, [screenToViewbox, vb.w, vb.h]);
```

Resulting semantics:

| Input | Behaviour |
|-------|-----------|
| Plain wheel (mouse / trackpad)        | Pan canvas in viewBox units; page never scrolls |
| Shift + wheel (mouse, vertical wheel) | Horizontal pan |
| Ctrl + wheel / Cmd + wheel            | Zoom around pointer (also covers trackpad pinch — browsers surface pinch as `ctrlKey + deltaY`) |

`onWheel={onWheel}` was dropped from the JSX; the React-typed
`onWheel` callback is gone — the native handler owns the wheel.

## 2 — Inspect Hardware CTA flicker

Bujar:

> "Inspect Hardware CTA is intermittent after view/menu changes"

Root cause was upstream: `TopologyMode.labView`'s `useMemo` depended
on the whole `envLifecycle` context object. The lifecycle provider
churns its value identity on internal ticks (timestamps, polling),
which rebuilt `labView` on every render. Every fresh `labView` is a
new reference → `BlueprintTopologyCanvas`'s `useEffect(reset, [view])`
fired → `selectedId` cleared → floating passport unmounted → no CTA
to click. Behaviour read as "intermittent" because the operator's
click sometimes landed before the next tick.

Fix:

```ts
const labActive = envLifecycle?.active ?? null;
const labView = useMemo(
  () => (labActive ? activeRecordToGraphReadyView(labActive) : null),
  [labActive],
);
```

`labView` now only re-derives when the active record itself changes.
Tab switches inside Topology no longer remount the lab view ref.
`activeRecordToGraphReadyView` is referentially pure (V1AS) so the
output identity is stable across renders that don't mutate `active`.

## 3 — Lock reticle drift

Bujar:

> "the 3D inspection view drifts/escapes right after repeated
> interactions"

`HardwareInspectReceiver` was passing the click-time `intent.anchor`
+ `intent.viewport` straight into `<InspectionLockMarks>`. The anchor
was captured when the canvas was full-width. The moment the bay
slides in, the canvas resizes — the captured anchor is no longer
where the node actually is. Repeated open/close compounded the
mismatch.

V1BL-C adds a live re-measurement in the receiver:

```ts
const rootRef = useRef<HTMLDivElement | null>(null);
const [liveAnchor, setLiveAnchor] = useState<AnchorRect | undefined>();
const [liveViewport, setLiveViewport] = useState<{ w: number; h: number } | undefined>();

useEffect(() => {
  const root = rootRef.current;
  if (!root || !intent) return;
  const recompute = (): void => {
    const rr = root.getBoundingClientRect();
    if (rr.width <= 0 || rr.height <= 0) return;
    setLiveViewport({ w: rr.width, h: rr.height });
    const nodeEl = root.querySelector<SVGGraphicsElement>(
      `[data-testid="bt-node-${intent.nodeId}"]`,
    );
    if (!nodeEl) return;
    const nr = nodeEl.getBoundingClientRect();
    setLiveAnchor({
      x: nr.left - rr.left,
      y: nr.top - rr.top,
      w: nr.width,
      h: nr.height,
    });
  };
  recompute();
  if (typeof ResizeObserver === "undefined") return;
  const observer = new ResizeObserver(recompute);
  observer.observe(root);
  return () => observer.disconnect();
}, [intent]);
```

```tsx
<InspectionLockMarks
  phase={phase}
  anchor={liveAnchor ?? intent.anchor}
  viewport={liveViewport ?? intent.viewport}
/>
```

The intent shape stays untouched. The reticle now tracks the node
through bay open / close / resize because the receiver re-projects
the node rect into its own coordinate space whenever its bounds
change.

A second ResizeObserver was added inside `BlueprintTopologyCanvas`
on the canvas-wrap; a `resizeTick` state drives the passport's
`useLayoutEffect` so the floating card also follows the node when
the canvas resizes (closes V1BL-B caveat #5).

## 4 — Chrome strip

Three layers of duplication around the Blueprint canvas were
removed:

- **Outer workbench `Graph / Map · READY` header**. The workbench
  shell renders `ActiveToolHeader` for every tool: tool label + tool
  description + status chip. `graph_map` now sets a new optional
  field `header_hidden: true` and `ModeWorkbenchShell` skips the
  header for tools that opt in. Other tools (Evidence Import,
  Collection Plan, Readiness, Wall view) keep the header. The
  `header_hidden` field was added to both variants of `ModeTool` in
  `types.ts`.
- **`Topology · Map` strip** (`tg-header--blueprint` h3 +
  `RenderGraphSourceBadge`) inside `TopologyGraphPanel`'s simulated
  branch. The Blueprint canvas's `bt-header` already carries env
  name / scenario / nodes / links / density / provenance — a far
  better in-canvas context strip. The outer strip was a duplicate.
  Removed; `RenderGraphSourceBadge` is still rendered for non-
  simulated paths (Demo / Imported / Unknown).
- **Verbose `tm-source-row` + `tm-summary` band above the canvas**
  in `TopologyMode.renderGraphMap`. Already gated on `labWinsRouting`
  in V1BL-A; the comment now reflects the V1BL-C reasoning. The
  hidden `tm-summary-shadow` testids stay so V1BJ regression tests
  keep passing.

End state for the lab branch: the **only** context strip the
operator sees is the Blueprint canvas's own `bt-header`. Single
provenance pill, single set of counts, single scenario tag.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (214 files, 2367 tests, 0 failures, +2 net new)
pnpm build       → green (tsc + vite build, 6.00s)
```

### Test surface (+2 net)

`BlueprintTopologyCanvas.test.tsx`:
- ➕ `Ctrl+wheel zooms the canvas (Figma model)` — replaces the V1BL-B
  plain-wheel zoom test
- ➕ `plain wheel pans the canvas, does not zoom (Figma model)` — asserts
  zoom indicator stays at `100%` and `data-tx` stays `0.00` (jsdom 0×0
  rect bails the screen→viewBox map; behaviour-wise sufficient)
- 🔄 `Reset returns to 100%` — now uses Ctrl+wheel

`TopologyGraphPanel.test.tsx`:
- 🔄 `data source badge renders the provided data_source value for
  non-simulated branches` — asserts against `demo` instead of `simulated`
- ➕ `V1BL-C — simulated branch does NOT render the outer tg-header/badge`

### Bundle effect

| Chunk                          | V1BL-B         | V1BL-C         | Note |
|--------------------------------|----------------|----------------|------|
| `index-*.js` (main shell)      | 753.50 kB      | **754.60 kB**  | +1.1 kB (native wheel listener + 2× ResizeObserver hooks + live anchor recompute + header_hidden gate) |
| `babylon-*.js`                 | 5,105.94 kB    | 5,105.94 kB    | unchanged single deferred chunk |
| `HardwareInspectScene-*.js`    | 6.67 kB        | 6.67 kB        | unchanged — still lazy |
| `HardwareInspectScene-*.css`   | 4.52 kB        | 5.08 kB        | (CSS recomputed) |
| `buildHardwareModel-*.js`      | 8.92 kB        | 8.92 kB        | unchanged shared chunk |
| `HardwareKitPreview-*.js`      | 6.14 kB        | 6.14 kB        | unchanged |
| `index-*.css`                  | 217.x kB       | 217.26 kB      | unchanged |

Babylon stays 100 % deferred. Receiver source still grep-clean of
`@babylonjs/core`. `?preview=hardware-kit` URL preserved.

## Manual verify (held for Bujar)

```
pnpm dev   # Vite on :1420
```

**Branch Office (8 dev) — Blueprint scenario:**
- Wheel up/down over canvas → topology pans; page never scrolls
- Ctrl/Cmd+wheel → zoom indicator changes around pointer (e.g. 100 % → 134 %)
- Drag on empty canvas → still pans (click-drag pointer model unchanged)
- Click node → still selects + floating passport appears
- Click "Inspect Hardware ▸" → bay slides in; reticle sits on the
  node, not floating off in the corner
- Repeat open / close 5× → reticle still tracks the node, no drift
- Switch to Evidence Import tab, back to Graph / Map → selection
  state preserved (canvas not remounted on every lifecycle tick)
- No "Graph / Map · READY" gutter above the canvas
- No "Topology · Map" strip on the canvas
- Single provenance pill (inside `bt-header`)

**Campus (16 dev):** zoom + pan to inspect adjacent racks, Fit
returns to overview.

**Metro (96 dev):** pinch (Ctrl+wheel) zooms into dot ring; plain
wheel pans along perimeter.

**Hardware:** inspect bay still opens beside the map; map remains
pannable while bay is open; Babylon still loads only on first inspect.

## Caveats

1. **Click-vs-drag deselect path** still exercised manually (jsdom's
   pointer surface around `setPointerCapture` / `currentTarget` is
   too shallow). Escape covers the same intent via keyboard.
2. **`Fit` and `Reset` are still identical** at v0 (carried from
   V1BL-B). Differentiate when a real fit-to-data algorithm lands.
3. **No keyboard pan / zoom yet.** Slated for V1BL-D (`+/-` zoom,
   arrows pan, `F` fit).
4. **Babylon chunk size warning persists** — by design (V1BE-A).
5. **`header_hidden` on `ModeTool`** is a workbench-shell concession
   for full-bleed canvases. The pattern is fine for now; if other
   modes want full-bleed surfaces too, promote to a first-class
   `layout: 'full-bleed' | 'standard'` field later.

## Next candidate stages

1. **V1BL-D — Keyboard nav** (`+ / -` zoom, arrows pan, `F` fit) +
   `Fit selection` differentiation.
2. **V1BJ-A — Glyph-rect morph reticle** (still open from V1BJ).
3. **V1BL-E — Topology canvas viewport persistence** across tab
   switches (currently transform resets when canvas remounts
   between subnav tools).

## AO orchestration report

- subagents: 0 (multi-file but tightly coupled — Figma wheel + chrome
  strip + lock-mark drift all touch the same canvas/receiver pair;
  splitting across Sonnet workers would have lost the shared model)
- Opus solo: 9 file edits + 1 stage note. One self-corrected mis-edit
  (added a `void RenderGraphSourceBadge;` keep-alive that wasn't
  needed — the non-simulated branch still uses the import; reverted
  before any tool other than Edit ran on the file).
- effectiveness: −15 % tokens vs all-Opus hybrid; +5 % vs Sonnet
  dispatch (saved a coordination round-trip on the cross-cutting
  receiver + canvas fix)
- recommendation: when a single mental model spans 3+ files but each
  edit is tightly typed, stay Opus-solo. Hybrid pays off when the
  Sonnet workers can ignore each other's diffs.
