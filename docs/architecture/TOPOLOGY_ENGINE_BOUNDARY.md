# Topology Engine Boundary — Anthracite V1

> Companion to `DISCOVERY_ENGINE_BOUNDARY.md` and `ENGINE_AND_API_BOUNDARIES.md`.
> Topology Engine owns the read-model projection; Discovery Engine owns the inventory facts.

## Why this doc exists

Topology and Discovery are **separate engines with a one-way dependency**: Topology reads from
Discovery, but Discovery never imports Topology. This document locks the boundary, ensuring
clean separation of concerns and preventing circular dependencies as both engines grow.

---

## What Topology owns

- **Projection logic.** Deterministic transformation of Discovery records into topology
  read model (nodes, edges, layers).
- **Node/edge wire shape.** `TopologyView`, `TopologyNode`, `TopologyEdge`, `TopologyLayer`,
  `TopologySummary`, role hints, layer assignments, source state tracking.
- **Topology read model.** The answer to "what is the topology?" given a frozen Discovery
  inventory.

---

## What Topology does NOT own

- **Discovery records.** Discovery Engine owns the canonical device inventory.
- **DeviceModel schema.** Defined once, owned by the parser and Discovery intake seam.
  Topology consumes it, never extends it.
- **Live state.** Polling, SSH, SNMP, monitoring snapshots belong to the Monitoring
  Engine. Topology is a read model over *persisted* Discovery records.
- **Persistence.** Topology recomputes from Discovery on demand; no topology-specific
  store. Discovery inventory is the only source.
- **Parser behaviour.** Record extraction, validation, normalisation — all Discovery
  and parser-side. Topology assumes records are well-formed.

---

## Pipeline (V1AJ baseline)

```
persisted Discovery inventory
  ↓
Discovery Engine: inventory_view(environment_id) → DiscoveryInventoryView
  ├── source_state: "real" | "empty"
  └── records: Vec<DiscoveryDeviceRecord>
  ↓
Topology Engine: project(environment_id, records) → TopologyView
  ├── source_state: "real" | "empty" | "unavailable"
  ├── summary: TopologySummary (nodes / edges / source record counts)
  └── nodes: Vec<TopologyNode>
  ├── edges: Vec<TopologyEdge> [empty in V1AJ]
  └── layers: Vec<TopologyLayer>
  ↓
TS API: getTopologyView(environmentId?) → TopologySourceView
  ├── adapter: null + error → unavailable
  ├── adapter: null + no error → not_connected
  ├── adapter: view.source_state → pass-through
  └── result: TopologySourceView { sourceState, view?, error? }
  ↓
App: fetchTopology(envId) → topology state
  ↓
TopologyMode.tsx renders nodes + edges + source state + summary
```

---

## Engine composition rule

**Command layer composes engines; engines never import each other.**

```rust
// Correct: command reads Discovery, passes records to Topology
let discovery_view = discovery.inventory_view(env_id)?;
let topology_view = topology.project(env_id, &discovery_view.records)?;

// Wrong: Topology imports Discovery
// ❌ topology.rs does NOT import discovery.rs or DiscoveryEngine
```

---

## Determinism contract

**Same Discovery records in same order → byte-identical TopologyView.**

No clock, no random seed, no I/O inside the engine. Topology is a pure projection.

- Input: `environment_id`, `Vec<DiscoveryDeviceRecord>`
- Output: `TopologyView`
- Replay: Same input, same output, always.

---

## Source state semantics (V1AJ)

| State | Meaning | Topology view | Example |
|-------|---------|---------------|---------|
| `Empty` | No records for this environment | 0 nodes, 0 edges, "source_state: empty" | Fresh environment, no INTAKE imports yet |
| `Real` | ≥1 record in scope | ≥1 node, edges (if any link facts), summary counts accurate | After successful INTAKE import |
| `Unavailable` | Reserved for future error paths | — | (Not used in V1AJ; reserved for engine-side I/O failures) |

---

## Node ID format (V1AJ)

**`topo::<discovery-record-id>`**

- Namespaced (prevents collisions with other node sources).
- Deterministic — derived from record ID, which is stable across Discovery updates.
- Survives Discovery record mutations because record IDs persist.

Example:
```
discovery record id:     "device-00001"
topology node id:        "topo::device-00001"
```

---

## Node label policy (V1AJ)

1. **If hostname is present AND non-blank:** Use hostname.
2. **Otherwise:** Fall back to record ID.

Conservative — no inferred or computed labels. Labels are facts from the record, or the
record's identity.

Example:
```
record { id: "device-00001", hostname: "core-1" } → label: "core-1"
record { id: "device-00002", hostname: "" }       → label: "device-00002"
record { id: "device-00003", hostname: null }     → label: "device-00003"
```

---

## Role hint policy (V1AJ)

**Role is always `"device"` in V1AJ.**

No role inference engine yet. No core / access / firewall / edge / spine classification.
Role hint exists in the wire shape so future stages can populate it without breaking
the contract.

---

## Layer policy (V1AJ)

**Layer is always `"inventory"` in V1AJ.**

No L2/L3/core/access layering yet. No layer assignment engine. Layer field exists in
`TopologyLayer` so future stages can surface real layering without schema churn.

---

## Edge policy (V1AJ)

**Zero edges shipped. Honest `"0 reliable links"` in summary.**

No edge inference, no fake adjacency, no topology guessing. Edges are absent until
reliable link facts land in DeviceModel:

- **LLDP neighbours** (from config parsing).
- **CDP neighbours** (from config parsing).
- **Config-derived adjacency** (static routes, BGP neighbours, OSPF neighbours, etc.).

Wire shape `TopologyEdge` exists and is versioned so V1AK+ stages can populate edges
without schema migration.

---

## TopologyMode surface contract (V1AJ)

### Visual tone
Strict Anthracite industrial light NOC baseline. Dense but readable. No black slabs,
no random colour flooding, no toy graph, no temporary UI.

### Content
- **Header strip:** label + `<DataSourceTag>` showing source state.
- **Summary row:** Node count / Edge count / Source record count.
- **Node list/grid:** Deterministic order from `view.nodes`. One row per node.
  - Name (label).
  - Role hint.
  - Layer.
  - Record ID (for drill-down, future).
- **Honest states:**
  - Empty: "0 nodes — no inventory records imported yet".
  - Partial: Shows N nodes, edge count accurate (0 in V1AJ).
  - Loaded: Shows N nodes, summary.
- **Edge count:** Always "0 reliable links" in V1AJ because edges are empty.

### No graph visualization library
No Three.js, no D3, no Cytoscape, no force-directed layout, no random positioning.
List/grid only. Graph rendering is deferred to a future stage with Babylon integration.

---

## Refresh chain (V1AJ)

1. App calls `fetchDiscovery(activeEnvId)`.
2. Discovery Engine returns `inventory_view(envId)`.
3. App **also calls** `fetchTopology(activeEnvId)` (new, chained).
4. Topology Engine receives same `envId`, reads latest Discovery, projects.
5. Both `discovery` and `topology` state update together.

**Trigger points:**
- Initial app load.
- Environment switch.
- After successful INTAKE import (via `onDiscoveryImported` callback).
- Manual refresh (future).

---

## Future stages (deferred, NOT V1AJ)

- **V1AK+: Edge inference.** LLDP/CDP neighbours from config. Parser-side adjacency facts.
  Edges populate deterministically.
- **V1AK+: Layer/role inference.** Device role classification (core, access, firewall,
  edge, spine). L2/L3 layering.
- **V1AK+: Interactive selection.** Nodes selectable, properties displayed, drill-down
  to Discovery record details.
- **V1AK+: Babylon graph rendering.** 2D/3D topology canvas, camera, node/edge styling,
  live highlight.
- **V1AK+: Topology mutation.** Custom node positioning, manual edge creation (for
  operator intent), saved layouts.

---

## Cross-links

- [`DISCOVERY_ENGINE_BOUNDARY.md`](./DISCOVERY_ENGINE_BOUNDARY.md) — Discovery Engine
  inventory semantics, record schema, persistence.
- [`ENGINE_AND_API_BOUNDARIES.md`](./ENGINE_AND_API_BOUNDARIES.md) — All engines, API
  contracts, composition rules.
- `src-tauri/src/engines/topology.rs` — Rust TopologyEngine implementation.
- `src-tauri/src/commands/topology.rs` — `get_topology_view` command.
- `src/types/topology.ts` — TypeScript wire shape mirrors.
- `src/api/topology.ts` — TypeScript API wrapper.
- `src/data/topologySource.ts` — `toTopologySourceView` adapter (DataSourceState mapping).
- `src/modes/topology/TopologyMode.tsx` — Frontend surface.
