# V1BF — Blueprint Topology Canvas v0

**Date:** 2026-05-23
**Status:** landed
**Scope:** 2D blueprint topology canvas + selection summary; consumed when no imported evidence overrides the active Lab Environment
**Branch:** `main` after V1BE-A → working tree
**Authority:** Bujar (scope set; git held)

## Mission

Make the active Environment render as a readable 2D blueprint topology canvas.
This is the map layer that the 3D hardware inspection (next stage) will
summon from. The existing V1AY graph surface stays in place for imported
evidence and other non-simulated sources — blueprint takes over only when
`data_source === "simulated"` (the lab-projection path).

## Files changed

```
new   src/modes/topology/blueprint/blueprintGlyph.ts            # family map + density bands
new   src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx  # SVG canvas + header + summary
new   src/modes/topology/blueprint/BlueprintTopologyCanvas.css  # scoped --topo-* tokens
new   src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx
edit  src/modes/topology/TopologyGraphPanel.tsx                 # route simulated → Blueprint
edit  src/modes/topology/TopologyGraphPanel.css                 # .tg-content--blueprint full-bleed
edit  src/state/EnvironmentLifecycleContext.tsx                 # export context for optional consumption
new   obsidian/stages/V1BF-blueprint-topology-canvas-v0.md
```

Out of scope (explicit non-changes): `src/topology/hardware/*` (V1BE kit
untouched), `src/preview/HardwareKitPreview*` (V1BE-A lazy boundary intact),
`vite.config.ts`, `package.json`, doctrine contracts under
`design-review/`, intake/discovery/parser engines, mesh ID format,
App.tsx route guard.

## How the active environment reaches Topology

Existing wiring is reused. The chain:

1. `EnvironmentLifecycleProvider` (App-level) → `useEnvironmentLifecycle()`
   exposes `active: LocalEnvironmentRecord | null`.
2. App initialises `topology: TopologySourceView` via
   `getTopologyView(activeEnvironmentId)` and passes it to
   `<TopologyMode topology={...} />`.
3. `TopologyMode` maps `topology.sourceState` to a `RenderGraphDataSource`:
   `"real" → "imported"`, anything else falls to `"simulated"` for the
   lab projection (via `activeRecordToGraphReadyView` in
   `src/engines/labTopologyActivation.ts`).
4. `<TopologyGraphPanel view={...} data_source={...} />` now branches:
   - `data_source === "simulated"` → `<BlueprintTopologyCanvas />`
   - everything else → existing V1AY surface + inspector

The Blueprint canvas itself reads `EnvironmentLifecycleContext` directly
(via `useContext`, not `useEnvironmentLifecycle`) so it gracefully
degrades when mounted outside the provider — falling back to
`view.environment_id` and the raw `dataSource` label. The shell always
mounts inside the provider, so production keeps the full pedigree.

## Density behaviour implemented

Per the desk design-board's `density-and-zoom-rules.md`, the canvas
adapts to *node count* (zoom slider lands later). The bands map to the
five canonical lab scenarios:

| nodes      | band         | renders                                          |
|------------|--------------|--------------------------------------------------|
| ≤ 8        | `full`       | frame + state ring + faceplate band + family code + hostname label |
| 9 – 24     | `faceplate`  | frame + state ring + faceplate band + family code (no label) |
| 25 – 48    | `silhouette` | frame + state ring + family code only            |
| > 48       | `dot`        | dot at state-ring colour                         |

Composition cap honoured: 1 role silhouette, 1 state ring, 1 faceplate
band, 1 meta strip (the hostname label, dropped past 8 nodes). No
multi-callout glyphs at v0.

State ring fixed to `var(--topo-ok)` at v0 — operational state slot
kept open in the contract; live state lands with the topology adapter
(V1BF-A or later).

Cyan budget honoured: cyan only fires on the focus ring (`1.5 px solid`
inside the state ring) and on connected-link highlight when a node is
selected.

## How to manually verify Micro / Branch / Campus / Datacenter / Metro

```
pnpm dev   # vite on :1420
# (or pnpm tauri:dev for the desktop shell)
```

In the running app:

1. Open Environments mode.
2. Create five labs by name — one per scenario:
   - **Micro**     (scenario `micro-lab`, 3 devices)
   - **Branch**    (scenario `branch-office`, 8 devices)
   - **Campus**    (scenario `campus-network`, 16 devices)
   - **Datacenter** (scenario `datacenter-pod`, 32 devices)
   - **Metro**     (scenario `metro-backbone`, 64 devices)
3. Select each lab in turn as the active environment.
4. Switch to Topology mode → tool **Graph / Map**.
5. Confirm for each lab:
   - source header shows env name + scenario id + node/link counts + `generated-lab` provenance
   - density label matches expected band (Micro → `full`, Branch → `full`,
     Campus → `faceplate`, Datacenter → `silhouette`, Metro → `dot`)
   - clicking any node engages a cyan focus ring inside the state ring,
     paints connected links cyan, and populates the right-side summary
   - clicking blank canvas clears selection
6. Cross-check imported-evidence path still works: Topology tool
   **Evidence Import** → import a fixture → confirm the V1AY surface
   (not Blueprint) renders.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (210 files, 2311 tests, 0 failures, +8 new)
pnpm build       → green (tsc + vite build, 5.22s)
```

Bundle effect:

| Chunk                       | V1BE-A      | V1BF        | Δ              |
|-----------------------------|-------------|-------------|----------------|
| `index-*.js` (main shell)   | 724.11 kB   | **731.42 kB** | +7.3 kB (Blueprint module) |
| `babylon-*.js`              | 5,105.94 kB | 5,105.94 kB | unchanged (no eager Babylon) |
| `HardwareKitPreview-*.js`   | 25.35 kB    | 25.35 kB    | unchanged (V1BE-A boundary intact) |
| `HardwareKitPreview-*.css`  | 2.63 kB     | 2.63 kB     | unchanged |

The Blueprint canvas is SVG + scoped CSS — no Babylon, no new deps. The
`babylon` chunk stays deferred behind the lazy preview boundary.

## Test surface (8 new)

- `blueprintGlyph` — density band selection at the 5 scenario sizes (3/8/24/32/96)
- `blueprintGlyph` — role_hint → 8-family mapping (ACC-SW, DIST-SW, CORE-RT, EDGE-RT, FW, SRV, WAP, UNK)
- header shows active env name + scenario + counts + provenance
- header falls back to `view.environment_id` when no provider mounted
- click node → summary populates; second click clears
- node selection highlights connected edges with `is-active` class
- 3-node scenario renders at full density with hostname labels
- 96-node scenario renders as dots (no faceplate, no labels)

## Caveats

1. **No zoom control yet.** Density adapts to node count rather than a
   user-driven zoom slider. The slider lands when interaction-state-machine
   wiring arrives (V1BG).
2. **Operational state fixed to `ok`.** State ring slot is wired but
   every node renders green until a topology adapter feeds live state
   (V1BF-A candidate).
3. **Selection summary is informational only.** No "Inspect ▸" CTA yet —
   that bridges to the 3D ORBIT scene, which is the next stage.
4. **Layout is concentric circles** sorted deterministically by node id.
   No force-directed or grouping by family at v0. Readable through
   the 64-node Metro scenario; rebake required for >128.
5. **`babylon` chunk warning persists.** By design — the chunk stays
   deferred. V1BE-A note carries this caveat.
6. **`EnvironmentLifecycleContext` is now exported.** Production code
   should continue to use `useEnvironmentLifecycle()` for the strict
   "must be inside provider" contract; `useContext(EnvironmentLifecycleContext)`
   is reserved for components that legitimately render in both wrapped
   and standalone contexts (like Blueprint, which also runs under
   minimal test harnesses).

## Next candidate stages

1. **V1BG — Double-click 3D bridge.** Wire MAP (Blueprint) → FOCUSED →
   TRANSITION → ORBIT (`HardwareKitPreview` re-housed inside Topology)
   per the desk interaction-state-machine.
2. **V1BF-A — Topology adapter interface.** Implement
   `topologyAdapter.live(modelId, kind, index)` so the state ring
   carries real operational state.
3. **V1BF-B — Zoom slider.** User-driven zoom in addition to count-driven
   density degradation.

## AO orchestration report

- subagents: 2× Sonnet parallel readers (topology render path + active-env projection); one wrote a stray repo-root mapping doc that was deleted before any edits
- Opus solo: 4 file writes (glyph helpers, canvas, css, tests) + 4 fix-up edits (typecheck unused var, vi.mock → real provider wrapper, context export, optional context consumption)
- effectiveness: −25% tokens vs cold Opus read; correct call — both readers produced contradictory claims (Reader B said `labTopologyActivation` doesn't exist; Reader A correctly placed it at `src/engines/labTopologyActivation.ts`), so Opus had to verify by direct file reads anyway
- recommendation: for cross-cutting state/context investigations, dispatch 1 reader + reserve Opus token budget for verification reads; parallel readers without source-pinpoint quotes can be net-negative
