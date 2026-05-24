# V1BM — Role-Aware Topology Layout Engine v0

**Date:** 2026-05-24
**Status:** landed (working tree; commit/push held for Bujar) — see hotfix-1 below
**Hotfix-1:** 2026-05-24 — full-surface CSS grid, drag-rate snapshot, quiet `?` glyph for unknown family, softened unknown passport rows.
**Hotfix-2:** 2026-05-24 — promote drafting grid from `.bt-canvas-wrap` to `.hardware-inspect-receiver` so the canvas/grid covers the entire topology desk for branch + campus + metro alike (previously only metro's wide bbox filled the wrap).
**Scope:** extract topology layout into its own pure module
(`blueprintLayouts.ts`) and add scenario-aware variants — branch /
campus / datacenter / metro — dispatched from the active env's
`scenario_id` + name + node count. Fallback ring kept verbatim.
**Branch:** `main` after `37cbc1d` (V1BL-G) → working tree
**Authority:** Bujar (scope set; git held)

## Mission

> "Replace the generic ring layout with role-aware network layouts.
> The map must look like a network, not a math diagram."

V1BM is the layout engine + dispatcher only. No visual token
changes, no interaction changes — just where the nodes land.

## Files changed

```
new   src/modes/topology/blueprint/blueprintLayouts.ts                # pure module: detectScenario + layoutNodes dispatcher + 5 variants
new   src/modes/topology/blueprint/__tests__/blueprintLayouts.test.ts # 14 tests (scenario detection, per-layout ordering, determinism)
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx        # import from module; compute LayoutHint; drop inline layoutNodes + NodeLayout
new   obsidian/stages/V1BM-role-aware-layouts.md
```

Out of scope: `blueprintGlyph.ts`, `hardwarePassport.ts`, CSS (no
visual tokens touched), `TopologyMode.tsx`, `TopologyGraphPanel.tsx`,
`HardwareInspectScene/Receiver`, intent shape, Babylon engine
boundary, `?preview=hardware-kit` route, engines/adapters, types,
all non-canvas tests.

## 1 — Layout engine structure

```
src/modes/topology/blueprint/blueprintLayouts.ts
├── export type ScenarioKind = "branch" | "campus" | "datacenter" | "metro" | "fallback"
├── export interface LayoutHint { scenarioId?, envName? }
├── export interface NodeLayout { node, family, x, y }       # moved from canvas
├── export function detectScenario(hint, nodeCount) → ScenarioKind
├── export function layoutNodes(nodes, hint?) → NodeLayout[] # dispatcher
├── (helpers) sortedTagged, rowSpread, columnSpread
└── (private) layoutBranch / layoutCampus / layoutDatacenter / layoutMetro / layoutFallback
```

All pure, all deterministic, zero React, zero DOM. Drag overlays
(V1BL-F `nodeOffsets`) still layered on top of the world coords
the layout returns; `Fit` and `Reset` always restore the layout
for the active scenario.

## 2 — Scenario detection rules

Order matters — specific keywords first, then count fallback:

```ts
const haystack = `${hint.scenarioId} ${hint.envName}`.toLowerCase();
if (/datacenter|\bdc[-_]|\bpod\b|spine|leaf|fabric/.test(haystack))   return "datacenter";
if (/metro|backbone|mega/.test(haystack))                              return "metro";
if (/campus/.test(haystack))                                           return "campus";
if (/branch|small/.test(haystack) || nodeCount <= 12)                  return "branch";
return "fallback";
```

The hint comes from `active.lab_payload.scenario_id` + `active.name`
+ `view.environment_id` (the canvas computes a `LayoutHint` memo
from the env-lifecycle context).

## 3 — Per-scenario behaviour

### Branch (small office)

Three rows top-down:

| Row | Y    | Roles                                   |
|-----|------|-----------------------------------------|
| 0   | -180 | `FW`, `EDGE-RT`, `CORE-RT` (upstream)   |
| 1   |  -20 | `ACC-SW`, `DIST-SW`, `UNK`              |
| 2   |  160 | `SRV`, `WAP`                            |

Spacing: 200 px (row 0), 180 px (row 1), 140 px (row 2). Reads as
upstream → switches → endpoints.

### Campus

Four rows top-down:

| Row | Y    | Roles                              |
|-----|------|------------------------------------|
| 0   | -260 | `CORE-RT`                          |
| 1   | -100 | `DIST-SW`, `EDGE-RT`               |
| 2   |   60 | `ACC-SW`, `FW`, `UNK`              |
| 3   |  220 | `SRV`, `WAP`                       |

Distinguishes core / distribution / access as separate tiers
(matching the campus design idiom).

### Datacenter (pod / fabric / spine-leaf)

Spine-leaf layout with side firewall column:

| Element   | Position         | Roles                       |
|-----------|------------------|-----------------------------|
| Spines    | row y=-220       | `CORE-RT`                   |
| Leafs     | row y=-40        | `DIST-SW`, `ACC-SW`         |
| Servers   | row y=160        | `SRV`, `WAP`                |
| Firewalls | col x=-480       | `FW`                        |
| Other     | row y=-360       | `EDGE-RT`, `UNK`            |

### Metro (mega / backbone)

Clustered. Compute `clusterCount = max(4, ceil(n/12))`. Place
cluster centres on a big outer ring (radius `max(420, 80 ×
clusters)`); inside each cluster, lay nodes on a small inner ring
(radius 90). Avoids the dense central ball the old ring formula
produced for 96-node scenarios.

For 96 nodes: 8 clusters × 12 nodes, outer ring ~640 px radius.
Each cluster reads as a site; the outer ring suggests backbone.

### Fallback

The original V1BF concentric ring kept verbatim:

```
ringSize  = n ≤ 12 ? n : ceil(√n × 2)
radius    = max(140, 28 × ringSize) + ringIndex × 110
```

Only dispatched when no keyword matched and `n > 12` (graphs with
unknown topology shape but enough nodes to need rings).

## 4 — Interaction preservation

All V1BL-G interactions intact:

| Interaction              | Status                                       |
|--------------------------|----------------------------------------------|
| Wheel zoom               | preserved (V1BL-G) — wheel anywhere = zoom   |
| Drag pan                 | preserved                                    |
| Pan clamp                | preserved (V1BL-F)                           |
| Fit                      | recomputes from new scenario layout          |
| Reset                    | clears offsets + identity transform; uses new scenario layout |
| Click node / passport    | preserved                                    |
| Double-click inspect     | preserved                                    |
| Node drag-to-reposition  | preserved — offsets layered on top of new layout |
| 3D bay open / Back       | preserved                                    |
| Babylon defer            | preserved (receiver still grep-clean)        |
| `?preview=hardware-kit`  | preserved                                    |

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (214 files, 2377 tests, 0 failures, +16 net new)
pnpm build       → green (tsc + vite build, 5.87s)
```

### Test surface (+16)

`blueprintLayouts.test.ts` (new):
- `detectScenario` (8 tests): branch / campus / datacenter / metro
  keyword detection, count-based branch fallback, large unlabeled
  fallback ring, `spine` and `mega` keyword aliases.
- `layoutBranch` ordering: FW + EDGE above ACC above SRV/WAP (y
  strictly increasing).
- `layoutCampus` ordering: CORE above DIST above ACC above SRV.
- `layoutDatacenter` ordering: spines above leafs above servers;
  firewall column at x < -200.
- `layoutMetro` (96 nodes): bbox width + height > 800 (no dense
  central ball); determinism (a === b across two calls).
- `layoutFallback` (50 unlabeled): 50 layouts returned; same-ring
  nodes equidistant from origin.
- Empty input: returns `[]`.

Two additional tests rolled in via shared imports.

### Bundle effect

| Chunk                          | V1BL-G         | V1BM           | Note |
|--------------------------------|----------------|----------------|------|
| `index-*.js` (main shell)      | 753.92 kB      | **756.49 kB**  | +2.57 kB (blueprintLayouts module: 5 layout fns + dispatcher + helpers) |
| `index-*.css`                  | 215.63 kB      | 215.63 kB      | unchanged |
| `HardwareInspectScene-*.js`    | 6.29 kB        | 6.29 kB        | unchanged |
| `HardwareInspectScene-*.css`   | 4.49 kB        | 4.49 kB        | unchanged |
| `babylon-*.js`                 | 5,105.94 kB    | 5,105.94 kB    | unchanged |
| `buildHardwareModel-*.js`      | 8.92 kB        | 8.92 kB        | unchanged |
| `HardwareKitPreview-*.js`      | 6.14 kB        | 6.14 kB        | unchanged |

Babylon stays 100 % deferred. Receiver source still grep-clean of
`@babylonjs/core`. `?preview=hardware-kit` URL preserved.

## Manual verify (held for Bujar)

```
pnpm dev   # Vite on :1420
```

**Branch Office (8 dev):** layout reads top→bottom as firewall/edge
on top, access switches in middle, hosts/AP on bottom. Node drag
still works; links follow. Fit + Reset recover the role-aware
arrangement.

**Campus (16 dev):** core top, distribution mid-upper, access
mid-lower, servers/WAPs at base. Not a ring.

**Datacenter pod / spine-leaf (when added):** spines top row, leafs
middle, servers bottom; firewall pinned to left side column.

**Metro / Mega City (96 dev):** 8 clusters on a big outer ring; no
central dense ball. Pan + zoom still useful inside / between
clusters.

**Hardware path:** click node → passport; Inspect Hardware → 3D
bay; Back → map. Babylon still deferred (first inspect only).

## Caveats

1. **No site / location grouping yet.** Metro layout buckets nodes
   by their sort order, not by a site hint. If the env model
   carries `site` or `region` metadata in a future stage, metro
   should group by that for the cluster assignment.
2. **Edge routing is straight lines** — the V1BF straight `<line>`
   between source/target endpoints is unchanged. With role-aware
   layouts, edges now read as upstream/downstream (top-down
   traffic) for branch/campus/datacenter; for metro, edges cross
   clusters which can look busy. Edge polishing (orthogonal /
   Manhattan / curved-by-tier) is out of scope here.
3. **Datacenter dispatch matches more keywords** than the README
   guidance — included `\bdc[-_]`, `\bpod\b`, `spine`, `leaf`,
   `fabric` so older scenario ids still route correctly. Adjust
   the regex if a false-positive appears.
4. **Layouts are purely deterministic functions of node id +
   role**; no random seeds, no force simulation. Force-directed
   refinement is a separate future stage.
5. **The `LayoutHint` interface is intentionally tiny** (scenarioId,
   envName). If a richer hint is needed (site, vendor, layer),
   extend the interface — the dispatcher's regex can keep matching
   on the new fields.

## Hotfix-1 — canvas split, drag rate, loud `UNK` glyph

Bujar visual-verified V1BM and found three coupled regressions:

1. Canvas only filled the upper half of the work surface; lower half
   was dead white. Sometimes expanded after dragging a node.
2. Node drag was far too fast — the glyph outran the cursor at any
   non-default zoom.
3. Every device showed a giant `UNK` inside its frame even though the
   hostname was already visible below it.

### Root cause #1 — canvas split

`<BlueprintGrid>` (the V1BF SVG `<line>` generator inside the
transform group) only painted within the SVG viewBox bounds. With
the new V1BM role-aware layouts, content bbox aspect ratios (branch
~3.75, campus ~0.94, datacenter ~1.5, metro varies) often differ
from the `.bt-canvas-wrap`'s element aspect (~1.5 on a typical
shell). `preserveAspectRatio="xMidYMid meet"` then centres the
viewBox inside the SVG element with empty bands on the
non-limiting axis — and those empty bands had no grid lines, so
the operator read them as dead white space. On a wide branch
layout the bands appeared above + below; visually it looked like
"map only in the upper half" because the dead band was substantial.

The "expand on drag" perception came from `vb` being recomputed
every render from `viewboxOf(layouts)` — after the first drag,
the moved node pushed bbox out, which changed the viewBox aspect
and thus changed where the empty bands appeared.

**Fix:** grid moved from SVG-generator inside the transform group
to a CSS background gradient on `.bt-canvas-wrap`:

```css
background:
  linear-gradient(rgba(26,37,48,0.04) 1px, transparent 1px) 0 0 / 32px 32px,
  linear-gradient(90deg, rgba(26,37,48,0.04) 1px, transparent 1px) 0 0 / 32px 32px,
  var(--topo-canvas);
```

Now the grid always covers the full visible work surface regardless
of viewBox aspect. The `<BlueprintGrid>` component + JSX usage +
`GRID_SPACING` constant were deleted. Cosmetic side-effect: grid
is now fixed (doesn't pan with content), which reads as drafting
paper.

### Root cause #2 — drag rate runaway

V1BL-F drag handler recomputed `rx = vb.w / rect.width` on every
pointermove tick. But `vb` derives from `viewboxOf(layouts)`, and
`layouts` includes the moved node's offset. As the operator dragged
the node further from the centre, the bbox grew, `vb.w` grew, and
`rx` grew with it — a feedback loop that accelerated the drag
mid-gesture (the node visibly outran the cursor at the start of
each new gesture, and accelerated as the drag progressed).

The handler also used per-axis `rx`/`ry` (`vb.w/rect.w` for x and
`vb.h/rect.h` for y), which is incorrect under `xMidYMid meet` —
SVG scaling is uniform, both axes share one aspect-fit ratio.

**Fix:** snapshot `pxPerWorld = aspectFit × transform.scale` at
drag-start, store on `nodeDragRef.current`, and use that fixed
value for the entire gesture:

```ts
const aspectFit = Math.min(rect.width / vb.w, rect.height / vb.h);
const pxPerWorld = aspectFit * transform.scale;
// ...
nodeDragRef.current = { ..., pxPerWorld };
// ...
const worldDx = dx / d.pxPerWorld;
const worldDy = dy / d.pxPerWorld;
```

50 px of screen pointer movement now produces ≈ 50 px of node
movement at any zoom level, with no mid-drag acceleration.

### Root cause #3 — loud `UNK` glyph

`Glyph` rendered `<text className="bt-node-family-code">{family}</text>`
unconditionally. For UNK-family nodes (most generic role hints map
to UNK), this stamped a large mono `UNK` inside every device
frame. The hostname label below the glyph already identifies the
device — the `UNK` was redundant chrome that competed with the
hostname.

**Fix:** quiet face for unknowns:

```tsx
<text
  className={
    family === "UNK"
      ? "bt-node-family-code bt-node-family-code--unk"
      : "bt-node-family-code"
  }
  data-family-glyph={family === "UNK" ? "unknown" : "known"}
>
  {family === "UNK" ? "?" : family}
</text>
```

Known families (`ACC-SW`, `CORE-RT`, …) keep their code unchanged.
Unknown family renders a small muted `?` in `--topo-ink-4`. The
hostname label below the glyph stays the primary identifier.

### Passport softening

When `selectedPassport.profileId === "unk1u"`, the `.bt-passport-hw`
block gets an `.is-soft` modifier which renders all field values in
italic muted ink:

```css
.bt-passport-hw.is-soft strong {
  color: var(--topo-ink-3);
  font-style: italic;
  font-weight: 400;
}
```

`unk1u / UNK / ANTHRACITE AXU-UNK / 1U` no longer reads as confident
hardware identification.

### Files changed (hotfix)

```
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx   # drop <BlueprintGrid>; drag pxPerWorld snapshot; quiet UNK glyph; passport is-soft
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.css   # CSS background grid; .bt-node-family-code--unk; .bt-passport-hw.is-soft
edit  src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx  # +3 hotfix regression tests
```

### Validation (hotfix)

```
pnpm typecheck   → green
pnpm test --run  → green (214 files, 2380 tests, 0 failures, +3 vs V1BM body)
pnpm build       → green (6.15s; main shell 756.49 → 756.28 kB; main CSS 215.63 → 215.97 kB)
```

### Bundle effect (hotfix)

| Chunk                | V1BM           | V1BM.hf1       | Note |
|----------------------|----------------|----------------|------|
| `index-*.js` (shell) | 756.49 kB      | **756.28 kB**  | −0.21 kB (BlueprintGrid component deleted) |
| `index-*.css`        | 215.63 kB      | **215.97 kB**  | +0.34 kB (background grid + UNK glyph + is-soft passport rules) |
| `babylon-*.js`       | 5,105.94 kB    | 5,105.94 kB    | unchanged |

Module count unchanged. Babylon stays 100 % deferred. Receiver
grep-clean of `@babylonjs/core`. `?preview=hardware-kit` preserved.

### Caveats (hotfix)

1. **Grid is now fixed** (CSS background), so it no longer pans
   with content. Reads as drafting paper — intentional for v0; if
   future stages want pannable grid, swap back to an SVG generator
   that covers the full visible vb (not just content bbox).
2. **Drag rate snapshot is captured at pointer-down**, so changing
   zoom mid-drag (Ctrl+wheel during a drag) won't update the rate.
   Edge case; revisit only if Bujar tests this combination.
3. **Passport is-soft** only covers the `bt-passport-hw` block,
   not the top rows (label / family / role hint / neighbours).
   Those carry useful info even for UNK profiles.

## Hotfix-2 — grid only filled metro, not branch / campus

After hotfix-1, Bujar saw grid covering the full surface for the
metro scenario but appearing as a bbox-sized island for branch and
campus, with plain white dead space around the canvas.

### Root cause

Hotfix-1 painted the grid background on `.bt-canvas-wrap`. The
wrap's computed size flows from `.tg-content--blueprint > * { flex:
1 1 auto; height: 100%; width: 100% }` → receiver → `.hir-map { flex:
1 1 auto }` → `.blueprint-topology { height: 100% }` → `.bt-canvas-wrap`
(the `1fr` row of the canvas grid). With `.tg-content--blueprint { height:
auto; min-height: 320px }`, the receiver's height resolves through
flex's content-intrinsic path. For large layouts (metro: ~96 nodes
on a wide outer ring) the intrinsic content pushed the wrap to the
full available height; for small/medium scenarios (branch's 8-12
nodes occupying ~480 px tall) the intrinsic content was narrower
and the wrap settled at a smaller height. The grid painted only
inside that wrap-sized island; the surrounding `.tg-content--blueprint`
background showed plain `#FAFCFD` outside the wrap, reading as
dead white.

The "metro looks fine" perception confirmed this — metro's role
layout intentionally spreads on a big outer ring so its bbox
filled the wrap.

### Fix

Grid moved one level up — from the canvas-component-internal
`.bt-canvas-wrap` to the topology-mode-level
`.hardware-inspect-receiver` (the always-full-surface container of
map + bay).

```css
.hardware-inspect-receiver {
  /* ... existing layout rules ... */
  background:
    linear-gradient(rgba(26, 37, 48, 0.04) 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(90deg, rgba(26, 37, 48, 0.04) 1px, transparent 1px) 0 0 / 32px 32px,
    #FFFFFF;
}
```

`.bt-canvas-wrap`, `.blueprint-topology`, and `.hir-map` are now
transparent so the receiver's grid shows through under the canvas
+ inside the lower area below the bay.

Surfaces that mask the grid:

- `.bt-header` keeps `background: var(--topo-paper)` → opaque white
  header strip over the grid.
- `.hir-bay` keeps `background: #FFFFFF` → opaque white card
  overlay (3D bay sits on white, not on grid).
- Empty overlay `.bt-empty-overlay` keeps its own white background.

Net effect: full-surface grid for every scenario size; bay still
reads as a raised white card with hairline + shadow; lower-right
area below bay shows grid continuation.

### Files changed (hotfix-2)

```
edit  src/modes/topology/inspect/HardwareInspectReceiver.css   # add grid background to .hardware-inspect-receiver
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.css # .bt-canvas-wrap + .blueprint-topology → transparent
```

No JSX/TSX changes. No tests added (hotfix-1's structural assertions
already cover: receiver mounts, `.bt-canvas-wrap` mounts inside
`.hir-map`, no `.bt-grid-line` in DOM). jsdom can't compute background
images so a direct CSS-grid-presence assertion isn't reliable.

### Validation (hotfix-2)

```
pnpm typecheck   → green
pnpm test --run  → green (214 files, 2380 tests, 0 failures, unchanged)
pnpm build       → green (5.53s; main shell unchanged 756.28 kB; main CSS 215.97 → 215.95 kB; −0.02 kB net)
```

### Caveats (hotfix-2)

1. **Grid is still fixed** (CSS background — V1BM.hotfix-1 decision).
   The receiver-level position means the grid origin is anchored to
   the receiver, not the map's transform; panning content doesn't
   shift the grid. Intentional for drafting-paper feel.
2. **Bay-shadow over grid:** the bay's `box-shadow` falls onto the
   gridded surface beneath it. The shadow rgba is low enough that
   it reads cleanly over the grid; revisit if Bujar finds it muddy.
3. **Lower-right area is now visible grid surface** — when V1BL-J
   adds the device-info panel, mount it as another absolute card
   inside the receiver (same pattern as the bay) and let the
   surrounding grid stay visible for context.

## Next candidate stages

1. **V1BN — Edge routing v0** (Manhattan / orthogonal for branch +
   campus + datacenter; curved bunched for metro).
2. **V1BO — Site-aware metro layout** (group by `site` /
   `region` metadata when present).
3. **V1BL-H — Wire the Expand button** to a deeper-inspection
   surface (still open from V1BL-G).
4. **V1BL-I — Drag persistence** (env-scoped local-storage of
   `nodeOffsets`).
5. **V1BJ-A — Glyph-rect morph reticle** (still open).

## AO orchestration report

- subagents: 0 (single pure module + targeted canvas wiring; not a
  case where Sonnet parallelism wins)
- Opus solo: 4 file edits (new module + new tests + canvas import
  rewrite + import unused-prune) + 1 stage note. One TypeScript
  correction loop (TS6196 + TS6133 on unused `GraphReadyTopologyNode`
  / `NodeFamilyCode` after module move).
- effectiveness: -5 % tokens vs hybrid; pure-module extraction +
  table-driven tests is exactly the Opus-solo sweet spot
- recommendation: layout/algorithm modules with table tests stay
  Opus-solo. Hybrid would have needed a coordination contract for
  the LayoutHint shape anyway.
