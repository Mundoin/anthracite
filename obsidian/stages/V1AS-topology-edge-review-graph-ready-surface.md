# V1AS — Topology Edge Review + Graph-Ready Surface

**Arc:** TOPOLOGY-EDGES
**Date:** 2026-05-18
**Status:** landed

---

## Objective

Turn the projected topology edges from a flat visible list into a
serious operator review surface: evidence-backed, filterable,
inspectable, honest about rejected / unresolved evidence, and ready
for future graph rendering. V1AS is a pure-frontend display contract
stage. It does not add live collection, does not change topology
truth, and does not render a graph. It prepares future graph
rendering by introducing a renderer-agnostic display contract.

The Rust topology engine and evidence store remain authoritative. The
V1AR managed evidence store, the V1AM/V1AN projection pipeline, and
the V1AP/V1AQ raw-output import paths all stay unchanged.

---

## Scope in

**New module: `src/modes/topology/topologyReview.ts`** — pure adapter
layer with explicit, deterministic functions:

- `buildTopologyReviewModel(view: TopologyView | null): TopologyReviewModel`
- `buildGraphReadyTopologyView(view: TopologyView | null): GraphReadyTopologyView`
- `filterTopologyReviewRows(rows, filters): readonly TopologyReviewRow[]`
- `findSelectedTopologyEdge(model, edgeId): TopologyReviewRow | null`
- `deriveTopologyReviewStats(view): TopologyReviewStats`
- `deriveRejectionSummary(view): TopologyReviewRejectionSummary`
- `formatTopologyEdgeKind(kind): string`
- Constants: `DEFAULT_REVIEW_FILTERS`, `TOPOLOGY_REVIEW_KIND_OPTIONS`,
  `GRAPH_READY_DISPLAY_NOTE`.

**New tests: `src/modes/topology/__tests__/topologyReview.test.ts`** —
unit coverage of all adapters: empty view, populated view, missing
endpoints, missing evidence, missing interfaces, stats derivation,
rejection counters, graph-ready projection, kind filter, text filter
(case-insensitive, trimmed, multi-field), combined filters, selection
lookup, formatters.

**TopologyMode UI additions:**

- `<TopologyReviewSurface>` wraps the projected-edge table with:
  - **Review stats strip** (`tm-review-stats`) — projected edges,
    accepted evidence, rejected evidence, facts accepted, duplicate
    facts, per-source-kind counts.
  - **Review filters** (`tm-review-filters`) — kind select, text
    input, live match-count.
  - **Edge review table** — reuses existing `EdgeListTable` (and the
    `tm-edge-list` / `tm-edge-row-${id}` test IDs) with an added
    "Review" column whose buttons (`tm-review-row-select-${id}`)
    drive the inspector.
  - **Selected-edge inspector** (`tm-review-inspector`) — edge id,
    kind, local + remote node/vendor/interface, status note,
    evidence list. Honest empty state when nothing selected.
  - **Aggregate rejection summary** (`tm-review-rejection-summary`)
    — surfaces every counter the engine retains, plus the literal
    honesty note "Rejected entries are counted by the topology
    engine. Per-entry rejected evidence is not retained in this view
    yet."
  - **Graph-ready handoff note** (`tm-review-graph-ready-note`) —
    constant string: "Graph-ready display contract active — renderer
    not attached."

**TopologyMode.css additions** — review-surface styling using the
existing NOC-light token system; no new colour vocabulary; density
matches V1AR import panel.

**Test additions in `src/modes/topology/__tests__/TopologyMode.test.tsx`:**

- `makeView` helper now injects default `projection_stats` and
  `evidence_stats` so older fixtures continue to render the V1AS
  review surface without runtime undefined reads (V1AR
  conditional-vs-always-present discipline preserved).
- New `describe("V1AS — Topology Edge Review surface", …)` block
  covering: stats strip cells, filter render + match count, kind
  filter behaviour, text filter (case-insensitive), empty inspector
  state, edge selection populates inspector, missing-iface honesty,
  aggregate rejection counters and honesty note, "no rejections"
  honest empty state, graph-ready note text, regression of
  V1AO/V1AP/V1AQ/V1AR test IDs alongside the new surface, honest
  hidden-count message when filters match zero edges.

**Docs updates:**

- `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` — new V1AS section
  describing the adapter, the graph-ready contract, and what V1AS
  does and does not do.
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` — Stage Group 2
  V1AS marked COMPLETE; edge-rendering item updated to consume the
  V1AS `GraphReadyTopologyView` contract.
- `obsidian/ANTHRACITE_INDEX.md` — V1AS row added to stage map.
- This stage note.

---

## Scope out

- No graph renderer (no D3, Cytoscape, Babylon, canvas, force layout).
- No live SSH / SNMP / polling / scheduler.
- No new dependency.
- No Rust changes (no engine code, no command surface, no wire-type
  changes).
- No parser changes.
- No vendor parser fixtures or `expected.json` changes.
- No DeviceModel schema changes.
- No validator / rule-pack changes.
- No evidence-store semantic changes.
- No V1AR merge / replacement logic changes.
- No fuzzy matching, no hostname-substring matching, no management-IP
  fallback, no chassis-ID fallback, no interface-description
  promotion, no subnet / VLAN inference.
- No hidden store mutation; review surface is read-only.
- No AGENTS.md / CLAUDE.md edits.
- No parser-lab edits.

---

## Architecture law respected

- Rust engines own truth.
- TypeScript mirrors wire shapes; this stage adds no new wire types.
- React surfaces state only; no engine derivations happen in render
  paths beyond the pure adapter call.
- V1AS invents nothing. Unresolved endpoints stay null and the UI
  prints `(unresolved)`. Missing evidence prints "no evidence string
  retained". Missing interfaces print "—".
- V1AR evidence store and V1AM/V1AN projection pipeline remain
  authoritative.
- Exact inventory resolver remains exact.

---

## Honest wording (used)

- Edge Review · Projected edges · Accepted evidence · Rejected
  evidence · Evidence-backed · Selected edge · Evidence drilldown ·
  Graph-ready surface · No renderer yet.

## Dishonest wording (avoided)

- live discovery · polling · smart topology · smart merge · inferred
  link · auto-detect topology · magic graph · AI topology.

---

## Graph-ready contract

`GraphReadyTopologyView` is the renderer handoff:

- `environment_id: string | null`
- `nodes: GraphReadyTopologyNode[]` — id, label, vendor,
  platform_id, role_hint, layer. No coordinates. No positions. No
  layout. No physics.
- `edges: GraphReadyTopologyEdge[]` — id, source_node_id,
  target_node_id, kind, local_interface, remote_interface,
  evidence_count. No styling. No layout.
- `renderer_attached: false` (literal `false` in the type system so
  no caller can pretend a renderer is attached).
- `note`: constant `GRAPH_READY_DISPLAY_NOTE`.

A future renderer stage consumes this contract without touching the
engine. The boundary is named so it cannot be quietly crossed.

---

## Risks / notes

- The engine does not retain per-entry rejected evidence in
  `TopologyView`. The V1AS rejection drilldown therefore surfaces the
  aggregate counters from `ProjectionStats` +
  `NeighborEvidenceMappingStats` and prints an honest note explaining
  the limit. Adding per-entry rejected-evidence retention is a
  future engine-layer change; V1AS does not pre-empt it.
- Filter state and selected-edge state live in the
  `<TopologyReviewSurface>` component (`useState`). Persisting these
  across sessions is out of scope.
- The "Select" column is conditional on `onSelectEdge` being passed;
  legacy callers that render the plain `EdgeListTable` without
  selection still work (no broken test IDs).

---

## Cross-links

- [`../../docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`](../../docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md) — V1AS boundary section.
- [`../../docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md`](../../docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md) — Stage Group 2 V1AS COMPLETE.
- `src/modes/topology/topologyReview.ts` — pure adapter + graph-ready contract.
- `src/modes/topology/TopologyMode.tsx` — review surface integration.
- `src/modes/topology/TopologyMode.css` — review-surface styling.
- `src/modes/topology/__tests__/topologyReview.test.ts` — adapter unit tests.
- `src/modes/topology/__tests__/TopologyMode.test.tsx` — UI tests + regression coverage.
- [`V1AR-evidence-set-management.md`](./V1AR-evidence-set-management.md) — previous stage.
