# Graph Renderer V1 Contract — Anthracite V1AY

**Stage:** V1AY — Core Graph Renderer v1  
**Date:** 2026-05-19

---

## Identity & Posture

V1AY ships the first honest graph renderer: a pure deterministic adapter that
transforms `GraphReadyTopologyView` (from V1AS) into renderable coordinates and
an SVG visual surface. Renderer never mutates topology truth. Builds on V1AS
(graph-ready contract), V1AR (managed evidence store), V1AJ (topology engine),
and V1AL (adjacency readiness). Ready to hand off coordinates to V1AZ (Babylon
3D variant) and future density-aware stages (V1BA+).

The renderer is a **consumer**, not a producer. It reads the honest state V1AS
declares — empty, partial, or rendered — and surfaces that truth. Selection
state lives in the surface, not in the model.

---

## Renderer Tech Choice: SVG

**Decision:** SVG for V1AY. Babylon.js **remains in package.json** but is
**explicitly reserved** for V1AZ (future 3D variant per `CLAUDE.md` doctrine:
*"Topology semantics (information vs live; 2D vs 3D selectability)"*).

**Rationale:**

- **jsdom-testable** — no GL context required, works in Node.js test runners.
- **No extra deps** — already have DOM/React, SVG is native HTML element.
- **Honest first slice** — layout, selection, inspector all work without physics
  engine, proving the contract before adding visual sophistication.
- **Babylon door stays open** — imports from V1AY surfaces are forbidden (no
  Babylon in `renderGraph.ts` or `TopologyGraphSurface.tsx`); the 3D stage can
  replace SVG entirely without touching the adapter or selection model.

---

## Contract Types

### Data Source (5-value enum)

```typescript
type RenderGraphDataSource = "demo" | "fixture" | "imported" | "simulated" | "unknown";
```

Mirrors the honest semantic from V1AS / V1AR. Badge renders one of these five
values. Never invents a sixth.

### Node & Edge (renderer-owned fields)

```typescript
interface RenderGraphNode {
  // From V1AS GraphReadyTopologyView
  id: string;                        // e.g., "topo::device-00001"
  label: string;                     // human readable
  role_hint?: string;                // "host" | "switch" | "router" | ...
  layer?: string;                    // "access" | "distribution" | ...

  // Deterministic layout (V1AY adds these)
  x: number;                         // cartesian x in viewbox
  y: number;                         // cartesian y in viewbox
}

interface RenderGraphEdge {
  // From V1AS GraphReadyTopologyView
  id: string;                        // e.g., "topo::edge-<from>-<to>"
  from_node_id: string;
  to_node_id: string;
  evidence_count: number;            // how many neighbour facts prove this edge
  evidence_kinds: string[];          // ["lldp", "cdp", ...] 

  // No layout fields — edges are drawn as straight lines SVG <line> elements
}
```

### Render Model (complete picture)

```typescript
interface RenderGraphModel {
  env_id: string;                    // which environment
  data_source: RenderGraphDataSource;
  state: RenderGraphState;           // "empty" | "partial" | "rendered"
  
  nodes: RenderGraphNode[];
  edges: RenderGraphEdge[];
  
  node_count: number;
  edge_count: number;
  
  viewbox: {
    min_x: number;
    min_y: number;
    width: number;
    height: number;
  };
}
```

### Selection (tagged union)

```typescript
type RenderGraphSelection =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;  // no selection
```

### State (honest three-value enum)

```typescript
type RenderGraphState = "empty" | "partial" | "rendered";
```

- **`empty`** — no graph-ready data. Display honest "No graph-ready data yet."
- **`partial`** — some nodes/edges, but adjacency readiness is not Ready. Display
  partial count + honest "More evidence needed."
- **`rendered`** — full node/edge set, adjacency readiness Ready. Display all.

---

## Adapter: `buildRenderGraph(input)`

Pure, deterministic, no side effects. Same input always yields same output.

```typescript
function buildRenderGraph(
  graphReady: GraphReadyTopologyView | null,
  envId: string,
  dataSource: RenderGraphDataSource
): RenderGraphModel
```

**Behavior:**

1. If `graphReady === null`, return `state: "empty"` model (empty node/edge arrays, stable viewbox).
2. If `graphReady.nodes.length === 0`, return `state: "empty"`.
3. If `graphReady.nodes.length > 0`:
   - Compute layout: **stable circular arrangement**. Sorted node IDs → fixed positions on a circle.
     No physics, no randomness, no `Math.random()`, no `Date.now()`. Same input always yields
     same circle.
   - Assign `(x, y)` to each node based on its index in sorted list.
   - Copy edges as-is; no coordinate computation.
   - State: `"partial"` if adjacency readiness < Ready; `"rendered"` otherwise.
4. Return complete `RenderGraphModel`.

**No mutations.** Input is never modified. Graph-ready contract stays untouched.

**Empty → partial → rendered.** Transitions only based on data content and readiness state,
never based on timer or animation frame.

---

## Surface: `TopologyGraphSurface`

React component. Renders SVG.

```typescript
interface TopologyGraphSurfaceProps {
  model: RenderGraphModel;
  selection: RenderGraphSelection;
  onSelect: (selection: RenderGraphSelection) => void;
}
```

**Render order:**

1. Edges first (`<line>` elements, light stroke, below nodes).
2. Nodes second (`<circle>` elements, dark fill, clickable).
3. Labels overlaid.

**Interaction:**

- Click on a node → `onSelect({ kind: "node", id })`.
- Click on an edge → `onSelect({ kind: "edge", id })`.
- Click on background (empty SVG) → `onSelect(null)`.

**Honest states:**

- `state === "empty"` → Display centered panel: "No graph-ready data yet."
- `state === "partial"` → Display edge/node counts + centered panel: "More evidence needed. Topology engine is discovering."
- `state === "rendered"` → Display full SVG surface. Selection UI active.

---

## Inspector: `TopologyGraphInspector`

React component. Displays selected node or edge details.

```typescript
interface TopologyGraphInspectorProps {
  model: RenderGraphModel;
  selection: RenderGraphSelection;
}
```

**Behavior:**

- Selection is null → Empty state: "No selection."
- Selection is node → Show node label, role_hint, layer, ID. No invented fields.
- Selection is edge → Show "From → To" pair, edge ID, evidence count, evidence kinds.
  - If `evidence_count === 0` → Show honest message: *"No evidence attached to this edge yet."*

---

## Source Badge: `RenderGraphSourceBadge`

Tiny component. Renders one of the five honest values.

```typescript
interface RenderGraphSourceBadgeProps {
  dataSource: RenderGraphDataSource;
}
```

Output: `[demo]`, `[fixture]`, `[imported]`, `[simulated]`, or `[unknown]`.

Never guesses. Never hides. If backend sends `"unknown"`, badge shows `[unknown]`.

---

## Selection Model & Panel

**Selection state lives in `TopologyGraphPanel` (the parent).** Not in the model.

```typescript
const [selection, setSelection] = useState<RenderGraphSelection>(null);
```

**Safety invariant:** When the `RenderGraphModel` identity changes (new environment,
fresh import, etc.), reset selection to `null`. Stale selections cannot point to nodes
in a different graph.

**`TopologyGraphPanel` wiring:**

1. Renders source badge.
2. Mounts `TopologyGraphSurface` with current `model` and `selection`.
3. Mounts `TopologyGraphInspector` with current `model` and `selection`.
4. Passes `onSelect` callback down to surface.

---

## Integration with V1AS (Review Surface Unchanged)

**V1AS surface stays untouched.** The review surface (stats strip, filters, edge
list, drilldown) continues to live in TopologyMode.

**New section added to TopologyMode:**

- **Graph Section** — renders `TopologyGraphPanel` below the review surface.
- **Source badge** — displayed in graph header.
- **Selection inspector** — shows what was clicked in the graph.
- **Handoff note** — *"Graph-ready display contract active."*

The two surfaces (review + graph) read the same `TopologyView` and `GraphReadyTopologyView`
independently. No shared state between them except the environment ID.

---

## Determinism & Safety Invariants

**Model invariants (buildRenderGraph contract):**

- Pure function. No I/O, no network, no timers.
- No mutations of input `GraphReadyTopologyView`.
- No global state, no closure over timestamps.
- Same input (same node/edge set, same readiness state) always yields same output.

**Surface invariants (React component contract):**

- No animation frames, no setTimeout, no setInterval in the render path.
- Click handlers are synchronous.
- Selection state reset on model identity change.
- No Babylon imports (reserved for V1AZ).
- No new dependencies beyond React/TypeScript.

**Data source integrity:**

- Renderer never mutates `GraphReadyTopologyView`.
- Renderer never calls Tauri commands to write evidence or topology.
- Renderer reads only — no side effects.

---

## What V1AZ Can Build on This

**Babylon 3D variant:**

- Replace SVG `TopologyGraphSurface` with a Babylon renderer.
- Keep `buildRenderGraph` adapter (reuse circular layout or compute new physics layout).
- Keep selection model and inspector.
- Keep source badge.

**Physics-based layout (V1BA):**

- New adapter `buildRenderGraphWithPhysics(graphReady, envId, dataSource)`.
- Deterministic seed (derived from sorted node IDs) so physics converges to same layout.
- Replace circular layout; same model structure.

**Edge bundling (V1BA+):**

- Extend edge render path. Add bundling spline logic.

**Zoom / pan (V1BA+):**

- Viewport state in `TopologyGraphPanel`.
- SVG viewBox transforms, no model changes.

**Hover affordances (V1BA+):**

- Highlight connected edges on node hover.
- No model state.

**Evidence drilldown from selected edge (V1BB+):**

- Selected edge triggers link to V1AR evidence detail page.
- No graph model changes.

---

## References

- [`TOPOLOGY_ENGINE_BOUNDARY.md`](./TOPOLOGY_ENGINE_BOUNDARY.md) — V1AS section (graph-ready
  contract, review surface).
- `src/modes/topology/topologyReview.ts` — V1AS adapter (source of `GraphReadyTopologyView`).
- `src/modes/topology/TopologyMode.tsx` — mode integration (existing review surface).
- `src-tauri/src/engines/topology.rs` — topology engine (V1AJ+).
- [`CLAUDE.md`](../../CLAUDE.md) — *"Topology semantics (information vs live; 2D vs 3D
  selectability)"* doctrine.
- [`INDUSTRIAL_VISUAL_LAW.md`](./INDUSTRIAL_VISUAL_LAW.md) — visual/color/typography baseline.
- `obsidian/stages/V1AS-topology-edge-review-graph-ready-surface.md` — graph-ready origin.
- `obsidian/stages/V1AZ-babylon-3d-variant.md` — future (not written yet).
