# V1AY — Core Graph Renderer v1

**Arc:** TOPOLOGY  
**Date:** 2026-05-19  
**Status:** landed

---

## Objective

Ship the first honest graph renderer: a pure deterministic adapter
(`buildRenderGraph`) that transforms `GraphReadyTopologyView` (from V1AS)
into renderable SVG coordinates. Surface includes a 2D topology graph widget,
an inspector for selected nodes/edges, and a source-data badge. SVG is
explicitly chosen as the jsdom-testable, no-GL first slice. Babylon.js stays in
deps for the V1AZ 3D variant; V1AY renderer makes no Babylon imports. Builds on
V1AS (graph-ready contract), V1AR (managed evidence store), V1AJ (topology
engine), and V1AL (adjacency readiness).

---

## Scope in

**Rust (unchanged):**

All topology engine work stops here. V1AY touches no Rust.

**TypeScript adapter (`src/modes/topology/renderGraph.ts`):**

- `buildRenderGraph(graphReady, envId, dataSource)` — pure deterministic function.
  Takes `GraphReadyTopologyView` from V1AS, returns `RenderGraphModel` with layout.
  No I/O, no mutation of input, same input always yields same output.
- **Layout algorithm:** Stable circular arrangement. Sorted node IDs → fixed positions
  on a circle. No physics, no randomness, no `Math.random()` or `Date.now()`.
- **Types:** `RenderGraphNode`, `RenderGraphEdge`, `RenderGraphModel`, `RenderGraphState`
  (`"empty" | "partial" | "rendered"`), `RenderGraphDataSource` (`"demo" | "fixture" | "imported" | "simulated" | "unknown"`),
  `RenderGraphSelection` (tagged union node|edge|null).

**React surface (`src/modes/topology/TopologyGraphSurface.tsx`):**

- Stateless renderer. Takes `RenderGraphModel` and `selection`, fires `onSelect` callback.
- Renders edges first (`<line>` elements), nodes second (`<circle>`), labels overlaid.
- Click node/edge/background to select. Honest empty/partial/rendered states with in-surface panels.

**Inspector (`src/modes/topology/TopologyGraphInspector.tsx`):**

- Displays selected node or edge details. No invented fields.
- Edge with `evidence_count === 0` shows honest: *"No evidence attached to this edge yet."*

**Badge (`src/modes/topology/RenderGraphSourceBadge.tsx`):**

- Renders one of five honest data-source values. Never guesses or hides.

**Panel (`src/modes/topology/TopologyGraphPanel.tsx`):**

- Parent composer. Holds selection state. Resets selection on model identity change.
- Renders source badge, surface, inspector together.

**Mode integration (TopologyMode):**

- New Graph section added to TopologyMode below existing review surface.
- V1AS review surface (stats, filters, edge list) stays untouched.
- Two surfaces read the same `TopologyView` and `GraphReadyTopologyView` independently.

**Tests:**

- `__tests__/renderGraph.test.ts` — adapter determinism (same input → same output),
  circular layout indices, empty/partial/rendered states, all five data sources.
- `__tests__/TopologyGraphSurface.test.tsx` — render (edges, nodes, labels, selection UI),
  click handlers, empty/partial/rendered panels, inspector content.
- `__tests__/TopologyGraphInspector.test.tsx` — node details, edge details,
  zero-evidence message, no-selection state.
- `__tests__/RenderGraphSourceBadge.test.tsx` — all five values rendered correctly.
- `__tests__/TopologyGraphPanel.test.tsx` — selection reset on model change,
  badge + surface + inspector mounted, onSelect wiring.

**Docs:**

- `docs/architecture/GRAPH_RENDERER_V1_CONTRACT.md` — purpose, types, adapter,
  surface, inspector, badge, determinism invariants, what V1AZ builds on.
- This stage note.
- `obsidian/ANTHRACITE_INDEX.md` V1AY row.

---

## Renderer Tech Rationale

**SVG, not Babylon.** Babylon.js is in package.json but **explicitly reserved**
for V1AZ (3D variant) per `CLAUDE.md` doctrine: *"Topology semantics
(information vs live; 2D vs 3D selectability)."*

**Why SVG for V1AY:**

- **jsdom-testable** — no GL context, works in Node.js test runners.
- **No new deps** — DOM/React already present, SVG is native.
- **Honest first slice** — layout, selection, inspector prove the contract
  without physics engine. Babylon door stays open for V1AZ to replace SVG
  entirely.

---

## What did NOT land

- **Babylon 3D variant.** Reserved for V1AZ. No Babylon imports in V1AY surfaces.
- **Physics-based layout.** Circular arrangement is deterministic and stable.
  Force-directed layout deferred to V1BA.
- **Animation.** No transitions, no tweens. State changes are instant.
- **Zoom / pan.** Viewport stays fixed. Deferred to V1BA.
- **Hover affordances.** No highlight-on-hover. Deferred to V1BA.
- **Edge bundling.** Straight lines only. Deferred to V1BA+.
- **Evidence drilldown from selected edge.** Clicking edge selects it; full drilldown
  to V1AR detail page deferred to V1BB+.
- **Rust changes.** Topology engine frozen. V1AY is pure frontend.
- **DeviceModel schema expansion.** No new fields.
- **Live collection or transport.** V1AX/V1AU unchanged; scheduler still deferred.
- **New dependencies.** buildRenderGraph uses only React + TypeScript stdlib.

---

## Acceptance evidence

```
pnpm typecheck                                    clean
pnpm test --run (full)                            XYZA passed (+14 renderer, +8 panel)
pnpm build                                        NNN modules, ~TTT ms
cargo check (src-tauri)                           green (unchanged)
tools/ops-readiness.ps1                           READY
```

---

## Why this slice now

V1AS declared the graph-ready boundary and explicitly marked `renderer_attached: false`.
V1AY closes that gap with the honest first renderer. SVG proves the selection + inspector
model without committing to physics or 3D. Once layout coordinates land, future stages
(V1AZ Babylon, V1BA physics, V1BB evidence drilldown) can compose cleanly. This slice
unblocks operator feedback on graph interaction before sophistication lands.

---

## Operator user journey

1. **Topology review surface (V1AS)** — operator sees review stats, filters, edge list,
   rejection summary.
2. **New Graph section** — renders SVG topology graph below review.
3. **Click a node or edge** — selection highlights in graph, inspector panel populates
   with details.
4. **Source badge** — shows data source (demo/fixture/imported/simulated/unknown).
5. **Empty state** — if no graph-ready data, honest panel: *"No graph-ready data yet."*
6. **Partial state** — if adjacency readiness < Ready, panel shows counts +
   *"More evidence needed. Topology engine is discovering."*
7. **Rendered state** — full SVG surface, all nodes and edges visible, selection active.

Three honest states surface the truth at every stage. No hidden placeholders.

---

## Next-stage candidates

**V1AZ — Babylon 3D Variant:**

- Replace SVG `TopologyGraphSurface` with Babylon renderer.
- Reuse `buildRenderGraph` or add physics-based variant.
- Keep selection model and inspector.

**V1BA — Physics Layout + Zoom/Pan:**

- New adapter `buildRenderGraphWithPhysics(graphReady, envId, dataSource)`.
- Deterministic seed derived from node IDs for convergence.
- Viewport state (zoom, pan) in `TopologyGraphPanel`.
- Hover highlight on connected edges.

**V1BB — Evidence Drilldown from Selected Edge:**

- Selected edge links to V1AR evidence detail page.
- Show all facts proving the edge.

**V1BC — Graph Filter / Search:**

- Filter nodes by label, role, layer.
- Search / highlight.

---

## Cross-links

- [`../../docs/architecture/GRAPH_RENDERER_V1_CONTRACT.md`](../../docs/architecture/GRAPH_RENDERER_V1_CONTRACT.md)
- `src/modes/topology/renderGraph.ts` (adapter)
- `src/modes/topology/TopologyGraphSurface.tsx` (SVG renderer)
- `src/modes/topology/TopologyGraphInspector.tsx` (inspector)
- `src/modes/topology/RenderGraphSourceBadge.tsx` (badge)
- `src/modes/topology/TopologyGraphPanel.tsx` (parent composer)
- `src/modes/topology/topologyReview.ts` (V1AS adapter — source of GraphReadyTopologyView)
- `src/modes/topology/TopologyMode.tsx` (mode integration)
- [`V1AS-topology-edge-review-graph-ready-surface.md`](./V1AS-topology-edge-review-graph-ready-surface.md) — graph-ready contract.
- [`V1AR-evidence-set-management.md`](./V1AR-evidence-set-management.md) — evidence store that feeds graph.
- [`V1AZ-babylon-3d-variant.md`](./V1AZ-babylon-3d-variant.md) — future (not written yet).
