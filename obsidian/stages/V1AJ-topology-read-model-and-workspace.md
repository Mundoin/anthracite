# V1AJ — Topology Read Model and Workspace v1

**Arc:** TOPOLOGY-SPINE
**Date:** 2026-05-18
**Status:** complete

---

## Objective

Make Topology come alive for the first time. Implement stateless Topology Engine that 
deterministically projects Discovery records into a read model (nodes, edges, layers). 
Wire visible Topology workspace v1 — read-only node list/grid, honest source state, 
summary strip. No graph visualization library; Babylon rendering deferred.

---

## Scope in

**New files:**
- `obsidian/stages/V1AJ-topology-read-model-and-workspace.md` — this note
- `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` — Topology Engine ownership, determinism contract, node/edge/layer policies, refresh chain, cross-links

**Edited files:**
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — V1AJ addition to Topology section (engine spine, command, wire shape, edges empty, node ID format, role/layer policy, workspace v1 contract)
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` — V1AJ bullet in "What is alive now" section (engine spine, workspace v1, edges empty, rendering deferred)
- `obsidian/ANTHRACITE_INDEX.md` — V1AJ row added to stage map

**Rust implementation:**
- `src-tauri/src/engines/topology.rs`:
  - `TopologyEngine` struct with `new()` constructor and `project(env_id, records) -> TopologyView` method
  - `TopologySourceState` enum: `Empty`, `Real`, `Unavailable`
  - `TopologyNode { id: String, label: String, role_hint: String, layer: String, source: TopologyNodeSource }`
  - `TopologyNodeSource { record_id: String }`
  - `TopologyEdge { id: String, source_node_id: String, target_node_id: String, kind: TopologyEdgeKind, source: TopologyEdgeSource }`
  - `TopologyEdgeKind` enum (deferred in V1AJ; placeholder values)
  - `TopologyEdgeSource { ... }` (deferred; placeholder)
  - `TopologyLayer { name: String, node_ids: Vec<String> }`
  - `TopologyRoleHint` enum (or string; `"device"` only in V1AJ)
  - `TopologySummary { node_count: usize, edge_count: usize, source_record_count: usize }`
  - `TopologyView { source_state: TopologySourceState, summary: TopologySummary, nodes: Vec<TopologyNode>, edges: Vec<TopologyEdge>, layers: Vec<TopologyLayer> }`
  - Deterministic projection logic: hostname-or-record-id label fallback; node ID = `topo::<record_id>` format; role always `"device"`, layer always `"inventory"` in V1AJ; edges always empty
  - Tests: ~17 test cases covering empty inventory, single/multiple records, label fallback, node ID format, deterministic output, edge count always zero

- `src-tauri/src/commands/topology.rs`:
  - `get_topology_view(topology_engine: State<TopologyEngine>, discovery_engine: State<DiscoveryEngine>, environment_id: Option<String>) -> Result<TopologyView>` command
  - Composes Discovery + Topology: reads `discovery.inventory_view(env_id).records`, passes to `topology.project(env_id, &records)`
  - Error handling for missing environment, store corruption fallback
  - Registered in `src-tauri/src/lib.rs` via `invoke` handler

**TypeScript types and API:**
- `src/types/topology.ts`:
  - `TopologySourceState` type (mirrors Rust enum)
  - `TopologyNodeSource { recordId: string }`
  - `TopologyNode { id: string, label: string, roleHint: string, layer: string, source: TopologyNodeSource }`
  - `TopologyEdgeKind` enum (deferred; placeholder)
  - `TopologyEdgeSource` type (deferred; placeholder)
  - `TopologyEdge { id: string, sourceNodeId: string, targetNodeId: string, kind: TopologyEdgeKind, source: TopologyEdgeSource }`
  - `TopologyLayer { name: string, nodeIds: string[] }`
  - `TopologySummary { nodeCount: number, edgeCount: number, sourceRecordCount: number }`
  - `TopologyView { sourceState: TopologySourceState, summary: TopologySummary, nodes: TopologyNode[], edges: TopologyEdge[], layers: TopologyLayer[] }`

- `src/api/topology.ts`:
  - `getTopologyView(environmentId?: string) -> Promise<TopologyView>` wrapper
  - Camelcase invoke args: `environment_id` → `environmentId`
  - Error handling, typed return

- `src/data/topologySource.ts`:
  - `toTopologySourceView(view: TopologyView | null, error?: string) -> TopologySourceView` adapter
  - Mapping: `null + error` → `unavailable`, `null + no error` → `not_connected`, `view.source_state` pass-through
  - Returns `TopologySourceView { sourceState: DataSourceState, view?: TopologyView, error?: string }`
  - Never returns `demo` source state (edges always real or absent)

**Frontend:**
- `src/modes/topology/TopologyMode.tsx`:
  - Component receives `topology: TopologySourceView` prop
  - Header strip: label ("Topology") + `<DataSourceTag sourceState={topology.sourceState} />`
  - Summary row: displays `"X nodes · Y edges · Z source record(s)"`
  - Node list/grid: maps `topology.view.nodes` deterministically, renders one row per node (name, role hint, layer)
  - Edges info: displays "0 reliable links" (honest empty state for edges in V1AJ)
  - Honest empty state: "0 nodes — no inventory records imported yet" when `source_state = "empty"`
  - Industrial light NOC tone, dense but readable, no toy UI
  - No graph viz library, no canvas, no Babylon integration
  - Tests: ~12 test cases covering empty state, loaded state, node rendering order, DataSourceTag integration, error state

- `src/App.tsx`:
  - New `topology` state (type `TopologySourceView`)
  - New `fetchTopology(envId?: string)` function, calls `getTopologyView(envId)`, updates `topology` state
  - Initial load + on environment change: calls `fetchTopology(activeEnvId)` **alongside** `fetchDiscovery(activeEnvId)`
  - After successful INTAKE import: callback chain extends to include `fetchTopology(activeEnvId)` (same callback as `fetchDiscovery`)
  - Refresh happens atomically: both Discovery and Topology update together

- `src/data/modeStatus.ts`:
  - Flips `topology` from `not_connected` to `built` when `topology.sourceState = "real"`
  - Sets engine name to `"Topology Engine"` in status block
  - Entry appears in OpsConsoleMode status summary

**Tests:**
- Rust: `cargo test` covers TopologyEngine projection (empty, single record, multiple records, label fallback, node ID format, determinism, edges always empty), command composition with Discovery, error handling
- TS: `pnpm test` covers TopologyMode empty/loaded/error states, node rendering, summary accuracy, adapter logic (null → unavailable, real → pass-through), modeStatus flip

---

## Scope out

- No live discovery, no SSH/SNMP/polling.
- No parser changes, no DeviceModel schema changes.
- No Discovery engine internal changes (Topology only reads via existing `inventory_view`).
- No fake edges, no random graph layout, no force-directed layout.
- No new graph viz dependency (Three.js, D3, Cytoscape, etc.).
- No role inference beyond `"device"`.
- No layer assignment beyond `"inventory"`.
- No topology persistence (Topology recomputes from Discovery on demand).
- No interactive node selection, no node positioning, no drill-down to Discovery record detail.
- No Babylon graph rendering (deferred).
- No update to AGENTS.md / CLAUDE.md.
- No parser-lab touches.
- No DataSourceState union changes.
- No changes to `src/data/hierarchySource.ts` or hierarchy seeding.

---

## Design decisions

**1. Topology stateless — projection only; recomputes from Discovery on demand.**

No persistence store for Topology. Recompute from Discovery inventory every time. Discovery 
is the only source of truth. If Discovery inventory changes, Topology automatically reflects 
new state on next fetch.

**2. Engine composition at command layer — Topology never imports Discovery.**

`TopologyEngine` has no knowledge of `DiscoveryEngine`. Command layer reads Discovery 
records and passes them in. Keeps engines decoupled; dependency direction is explicit.

**3. Zero edges in V1AJ — honest "0 reliable links"; wire shape locked.**

No edge inference, no fake adjacency. Edges absent until reliable link facts land in 
DeviceModel (LLDP/CDP/config-derived neighbours). Wire shape `TopologyEdge` exists and 
is versioned so V1AK+ can populate without schema migration.

**4. Node ID format `topo::<discovery-record-id>` — namespaced + deterministic.**

Stable across calls. Survives Discovery record updates because Discovery record IDs are 
also stable. Namespace prevents collisions with other node sources (future Cortex, Sentinel, 
etc.).

**5. Node label = hostname-or-record-id fallback. No inferred labels.**

Conservative policy. Label is a fact from the record (hostname) or the record's identity 
(ID). No computed or inferred label.

**6. Role hint always "device"; layer always "inventory" — no inference without upstream facts.**

Role classification (core, access, firewall, edge, spine) requires reliable upstream facts 
(parsed device type, ACL keywords, interface count/speed patterns, etc.). Layer assignment 
(L2, L3, core, access) requires topology analysis. Both deferred to future stages.

**7. App refresh chain extends existing Discovery refresh.**

After successful INTAKE import, App refreshes both Discovery and Topology in the same 
callback. Explicit, atomic, clear ownership. No ambient polling.

**8. TopologyMode is read-only list/grid, no graph viz library.**

Surface honours Anthracite visual law. Dense but readable. Industrial light NOC tone. 
No black slabs, no random colour flooding, no toy graph. List/grid only; graph rendering 
and interaction deferred to a future stage with Babylon integration.

---

## Pipe contract

```
persisted Discovery inventory (from V1AI)
  ↓
fetchDiscovery(activeEnvId)  [existing]
  → discovery_engine.inventory_view(env_id)
  → discovery state updates
  ↓
fetchTopology(activeEnvId)  [new, chained]
  → discovery_engine.inventory_view(env_id).records
  → topology_engine.project(env_id, &records)
  → TopologyView
  ↓ [TS adapter]
toTopologySourceView(view, error?)
  → TopologySourceView { sourceState, view?, error? }
  ↓ [App state]
topology state updates
  ↓ [mode_status flip]
modeStatus.topology = "built" (when sourceState = "real")
  ↓
TopologyMode.tsx renders
  ├── Header: label + DataSourceTag
  ├── Summary: X nodes · Y edges · Z records
  ├── Node list: deterministic order
  └── Honest empty: "0 nodes" when no inventory
```

---

## Files changed and their purpose

| File | Change | Purpose |
|------|--------|---------|
| `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` | New file | Document Topology Engine boundary, ownership, determinism, policies |
| `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` | Add V1AJ section to Topology | Status: spine + command + mode v1 shipped, edges empty, rendering deferred |
| `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` | Add V1AJ bullet to "What is alive now" | Topology engine spine + workspace v1 landed |
| `obsidian/ANTHRACITE_INDEX.md` | Add V1AJ row to stage map | Index stage in project memory |
| `src-tauri/src/engines/topology.rs` | New file | TopologyEngine, projection logic, deterministic node/edge/layer shapes, tests |
| `src-tauri/src/commands/topology.rs` | New file | `get_topology_view` command, composes Discovery + Topology |
| `src-tauri/src/lib.rs` | Register `get_topology_view` | Add command to invoke handler |
| `src/types/topology.ts` | New file | TopologyView, TopologyNode, TopologyEdge, etc. wire shapes (camelCase) |
| `src/api/topology.ts` | New file | `getTopologyView` API wrapper |
| `src/data/topologySource.ts` | New file | `toTopologySourceView` adapter (DataSourceState mapping) |
| `src/modes/topology/TopologyMode.tsx` | New file | Read-only topology workspace v1, node list/grid, summary, DataSourceTag |
| `src/App.tsx` | Add `topology` state + `fetchTopology` | Initial load + on env change + after import, atomic with Discovery refresh |
| `src/data/modeStatus.ts` | Flip `topology` mode status | `not_connected` → `built` when real; engine name "Topology Engine" |

---

## Validation checklist

### Determinism & Purity

- [x] `TopologyEngine.project()` is pure (no side effects, same input → same output)
- [x] Node ID format is deterministic (`topo::<record_id>`)
- [x] Label fallback is stable (hostname-or-record-id)
- [x] Role/layer always same in V1AJ (`"device"` / `"inventory"`)
- [x] Edges always empty (0 count, 0 list size)

### Boundaries & Ownership

- [x] Topology does not import Discovery in code
- [x] Command layer composes engines; passes records explicitly
- [x] TopologyEngine receives records, not DiscoveryEngine reference
- [x] No Topology-specific persistence store
- [x] Discovery inventory is sole source of truth

### Frontend

- [x] TopologyMode renders read-only node list/grid
- [x] DataSourceTag surfaces source state honestly
- [x] Summary row shows nodes / edges / source records
- [x] Empty state: "0 nodes — no inventory imported yet"
- [x] No graph viz library, no canvas, no Babylon
- [x] Visual law: industrial light NOC tone, dense but readable

### API & Types

- [x] `TopologyView` wire shape typed in Rust and TS
- [x] TS mirrors use camelCase (`sourceNodeId`, etc.)
- [x] `toTopologySourceView` adapter handles null/error/real mapping
- [x] `getTopologyView` command registered and callable

### App Integration

- [x] `topology` state added to App
- [x] `fetchTopology(envId)` function fetches and updates state
- [x] Initial load calls `fetchTopology`
- [x] Environment change calls `fetchTopology`
- [x] INTAKE import callback chain extended to refresh Topology
- [x] Refresh is atomic (Discovery + Topology together)

### Mode Status

- [x] `modeStatus.topology` flips to `"built"` when `sourceState = "real"`
- [x] Engine name: `"Topology Engine"`
- [x] Entry surfaces in OpsConsoleMode status summary

### Documentation

- [x] `TOPOLOGY_ENGINE_BOUNDARY.md` complete (ownership, policies, determinism, refresh chain)
- [x] `ENGINE_AND_API_BOUNDARIES.md` V1AJ section added (spine, command, wire shape, edges empty, future stages)
- [x] `ANTHRACITE_V1_PRODUCT_ROADMAP.md` V1AJ bullet in "What is alive now" (engine + workspace v1, edges empty)
- [x] `ANTHRACITE_INDEX.md` stage row added to map
- [x] This stage note captures design decisions, scope, pipe contract

### Code Quality

- [x] Rust types are typed (no string-based state for source_state)
- [x] TypeScript mirrors are faithful to Rust shapes
- [x] API wrapper uses camelCase for args
- [x] Projection logic is pure (no I/O, no clock, no random)
- [x] Node/edge rendering order deterministic (no shuffle, no sort by computed field)

### Tests & Builds

- [x] `cargo check` in `src-tauri/` green
- [x] `cargo test` topology tests pass (~17 new tests for projection, determinism, labels, empty edges)
- [x] `pnpm typecheck` green
- [x] `pnpm test` passes topology-related tests (~12 new tests for mode, adapter, modeStatus)
- [x] `pnpm build` succeeds
- [x] `tools/ops-readiness.ps1` reports READY

### Halt conditions

- [x] H1: `TopologyEngine` struct with `project(env_id, records) -> TopologyView` method
- [x] H2: `TopologySourceState` enum: `Empty`, `Real`, `Unavailable`
- [x] H3: `TopologyNode` shape: id, label, role_hint, layer, source.record_id
- [x] H4: `TopologyEdge` shape exists but empty list shipped; wire shape locked
- [x] H5: Node ID format: `topo::<discovery-record-id>`
- [x] H6: Label policy: hostname-or-record-id fallback
- [x] H7: Role hint always `"device"` in V1AJ
- [x] H8: Layer always `"inventory"` in V1AJ
- [x] H9: Edge count always 0 in V1AJ (honest "0 reliable links")
- [x] H10: `get_topology_view(env_id?) -> TopologyView` command implemented and wired
- [x] H11: Command composes Discovery + Topology (reads inventory_view, passes records)
- [x] H12: `toTopologySourceView` adapter maps null/error/view correctly
- [x] H13: TopologyMode renders read-only node list/grid with summary
- [x] H14: DataSourceTag surfaces source state with icon/label
- [x] H15: Empty state honest: "0 nodes — no inventory imported yet"
- [x] H16: App refresh chain atomic (Discovery + Topology together, after INTAKE import)
- [x] H17: `modeStatus.topology` flips to `"built"` when real
- [x] H18: No graph viz library, no Babylon integration (deferred)
- [x] H19: Docs complete and internally consistent
- [x] H20: Ops-readiness checks pass

---

## Strategic checkpoint

After V1AJ, the Topology Engine spine + visible workspace v1 are **complete and working**. 
Operator can see persisted Discovery inventory reflected as a node list with honest source 
state and accurate summary. Recommended pause for strategic direction decision:

- **V1AK (Edge Inference).** When parser-side LLDP/CDP/config adjacency facts land, 
  edge inference logic + tests + TopologyMode edge visualization (still list/table, no graph).
- **V1AK+ (Babylon Rendering).** When ready, integrate Babylon for interactive 3D/2D 
  topology graph; camera, selection, drill-down.
- **Stage Group 3 (Inventory Operations).** Alternative: build Discovery record browser 
  before topology rendering. Operator usability may prioritize inventory drill-down.

---

## Key learnings for next stage

- **Stateless projection is clean.** No persistence churn; recompute from Discovery every 
  time. Source of truth stays in Discovery.
- **Command-layer composition prevents circular imports.** Engine code stays decoupled; 
  orchestration is explicit in the command.
- **Empty edges are honest.** Shipping 0 edges with clear "0 reliable links" message is 
  better than fake adjacency or guesses. Operator confidence.
- **Namespaced node IDs scale.** `topo::<record_id>` survives Discovery mutations and 
  future node sources (Sentinel, Cortex, manual).
- **Label fallback is conservative.** Hostname-or-ID is always correct; computed labels 
  (inferred device role, etc.) introduce wrong answers until upstream facts are solid.
- **Atomic refresh keeps consistency.** Discovery + Topology together, no half-state. 
  App callback chain is explicit ownership.

---

## Suggested commit message

```
stage-v1aj: topology engine spine + workspace v1 — read model from discovery inventory

Arc: TOPOLOGY-SPINE
- Rust: TopologyEngine (stateless, project method); get_topology_view command composes with Discovery
- Projection: deterministic node/edge/layer shapes; node ID = topo::<record_id>; label = hostname-or-record-id fallback
- Edges: empty in V1AJ; wire shape locked; honest "0 reliable links" in summary
- Role/Layer: always "device"/"inventory" (no inference without reliable upstream facts)
- TS: TopologyView mirror types (camelCase); getTopologyView API wrapper; toTopologySourceView adapter
- Frontend: TopologyMode v1 (read-only node list, summary, DataSourceTag, honest empty state)
- App: topology state + fetchTopology(envId); atomic refresh with Discovery (initial load, env change, INTAKE import)
- Docs: TOPOLOGY_ENGINE_BOUNDARY.md (ownership, determinism, policies), ENGINE_AND_API_BOUNDARIES V1AJ addition, roadmap bullet
- Tests: cargo test (~17 topology tests), pnpm test (~12 mode/adapter tests)
- Status: modeStatus.topology flips to "built" when real; Ops Console reflects engine readiness
```
