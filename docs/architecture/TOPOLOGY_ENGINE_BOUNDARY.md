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

## V1AL — Adjacency Readiness Contract

Topology projection needs to answer the operator question: **Why are there no edges, and
what future link-fact sources will populate them?** V1AL introduces deterministic
adjacency readiness tracking without inventing fake edges.

### What V1AL adds

**Four new Rust types:**

```rust
pub enum TopologyAdjacencyFactSourceState {
    NoneAvailable,      // V1AL: all fact sources absent (present: false, count: 0)
    Partial,             // Future: some sources ready, some absent
    Ready,              // Future: all sources online and ingesting
}

pub enum TopologyAdjacencyFactSourceKind {
    Lldp,               // LLDP neighbours from config parsing
    Cdp,                // CDP neighbours from config parsing
    ConfigNeighbor,     // Config-derived adjacency (static routes, BGP, OSPF, etc.)
    Manual,             // Operator-created / imported links
}

pub struct TopologyAdjacencyFactSource {
    pub kind: TopologyAdjacencyFactSourceKind,
    pub present: bool,              // Is this source currently ingesting facts?
    pub count: usize,               // How many adjacency facts from this source?
    pub note: String,               // Human-readable status or reason
}

pub struct TopologyAdjacencyReadiness {
    pub eligible_node_count: usize,
    pub fact_source_state: TopologyAdjacencyFactSourceState,
    pub fact_sources: Vec<TopologyAdjacencyFactSource>,
    pub accepted_kinds: Vec<TopologyAdjacencyFactSourceKind>,  // Closed contract
    pub reason: String,
}
```

**V1AL engine behaviour:**

- `compute_adjacency_readiness(node_count: usize) -> TopologyAdjacencyReadiness`
  helper (pure function, no I/O).
- All 4 fact sources ship with `present: false, count: 0`.
- State derived generically:
  - All absent → `NoneAvailable`.
  - Mixed present/absent → `Partial` (future).
  - All present → `Ready` (future).
- `eligible_node_count = nodes.len()` in V1AL (every projected node can receive edges).
  Future stages may tighten this once role/layer inference constrains eligibility.
- `accepted_kinds` always lists all four — the closed contract: "Topology knows
  these four link-fact categories; none ingested yet."
- Reason strings are stable per state (e.g. `"No adjacency fact sources available yet"`).

**TopologyView extension:**

```rust
pub struct TopologyView {
    pub source_state: TopologySourceState,  // existing
    pub summary: TopologySummary,           // existing
    pub nodes: Vec<TopologyNode>,           // existing
    pub edges: Vec<TopologyEdge>,           // existing (empty in V1AL)
    pub layers: Vec<TopologyLayer>,         // existing
    pub adjacency_readiness: TopologyAdjacencyReadiness,  // NEW
}
```

**TypeScript mirror (src/types/topology.ts):**

```typescript
export enum TopologyAdjacencyFactSourceState {
  NoneAvailable = "none_available",
  Partial = "partial",
  Ready = "ready",
}

export enum TopologyAdjacencyFactSourceKind {
  Lldp = "lldp",
  Cdp = "cdp",
  ConfigNeighbor = "config_neighbor",
  Manual = "manual",
}

export interface TopologyAdjacencyFactSource {
  kind: TopologyAdjacencyFactSourceKind;
  present: boolean;
  count: number;
  note: string;
}

export interface TopologyAdjacencyReadiness {
  eligible_node_count: number;
  fact_source_state: TopologyAdjacencyFactSourceState;
  fact_sources: TopologyAdjacencyFactSource[];
  accepted_kinds: TopologyAdjacencyFactSourceKind[];
  reason: string;
}

export interface TopologyView {
  source_state: TopologySourceState;
  summary: TopologySummary;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  layers: TopologyLayer[];
  adjacency_readiness: TopologyAdjacencyReadiness;  // NEW
}
```

**TS API (src/api/topology.ts):** No change — wire shape flows via existing
`get_topology_view` command.

**Frontend (src/modes/topology/TopologyMode.tsx):**

New "Adjacency readiness" section renders per-source rows:

```
Adjacency readiness

[LLDP]                absent     —
[CDP]                 absent     —
[Config neighbor]     absent     —
[Manual]              absent     —

Reason: No adjacency fact sources available yet
Eligible nodes: 42
```

Honest "0 reliable links" line preserved below.

### Determinism contract

Same Discovery records → same adjacency readiness bytes. No clock, random seed,
or I/O. Pure projection.

### State semantics (V1AL)

| State | Meaning | Future transition path |
|-------|---------|---|
| `NoneAvailable` | No adjacency fact sources online; 0 reliable links | Flip `present: true` on first ingestion source (likely parser-derived LLDP/CDP) → state → `Partial` |
| `Partial` | Mixed sources; some absent, some online | Flip remaining sources as their pipelines land → state → `Ready` |
| `Ready` | All four sources online; edge count is the sum of all four | (Terminal state in steady state) |

### Future hook

When a fact-ingestion path lands (parser-derived neighbor facts likely first):

1. Update the relevant source's `present: true` and supply real `count`.
2. Recompute state automatically (already transitions correctly).
3. TopologyMode re-renders without schema migration.

### Operator visibility

- All 4 accepted kinds visible at stage one, all marked absent.
- Operator sees the closed contract: "Topology knows what link facts look like."
- No fake edges. Honest "0 reliable links" co-exists with the readiness section.
- When facts arrive, count increments; state auto-transitions; operator reads
  "partial" or "ready" with specific source counts.

### Scope-out (V1AL strict)

- No edge inference, no fake adjacency, no topology guessing.
- No parser/validator/Discovery/Inventory-browser changes.
- No DeviceModel schema changes.
- No new Tauri command — existing `get_topology_view` passes the readiness field.
- No graph viz library, no Babylon.
- No live polling, SSH, SNMP.
- No DataSourceState extension or union changes.
- No ModeRail / MODE_STATUS changes.
- No AGENTS.md / CLAUDE.md / parser-lab / `.codex/` touches.

### Cross-links

- [`TOPOLOGY_ENGINE_BOUNDARY.md`](./TOPOLOGY_ENGINE_BOUNDARY.md) — Boundary and determinism.
- [`ENGINE_AND_API_BOUNDARIES.md`](./ENGINE_AND_API_BOUNDARIES.md) — Topology Engine
  extension section.
- `src-tauri/src/engines/topology.rs` — Rust implementation + adjacency readiness helper.
- `src/types/topology.ts` — TypeScript mirror.
- `src/modes/topology/TopologyMode.tsx` — UI section for readiness display.

---

## V1AM — Topology Link Fact Pipeline + First Edge Projection

### Status
V1AM lands the explicit-fact ingestion + edge projection layer in
the Topology Engine. Live command path remains zero-fact until a
later stage connects a real fact source. Engine and tests prove the
pipeline works.

### What V1AM adds
- `TopologyLinkFact` (engine-owned model for explicit adjacency facts).
- `project_edges_from_link_facts(nodes, facts) -> (edges, ProjectionStats)`
  — deterministic projection helper.
- `TopologyEngine::project_with_facts(env, records, facts)` — internal
  overload. `project()` is now a thin wrapper that passes `&[]`.
- `TopologyEdge` carries `local_interface`, `remote_interface`,
  `evidence` (Vec<String>).
- `compute_adjacency_readiness` is data-driven: per-source `present`
  and `count` reflect real ingested facts.
- `ProjectionStats` reports `facts_total`, `facts_accepted`,
  `facts_rejected_unknown_node`, `facts_rejected_self_link`,
  `facts_collapsed_duplicate`, and `per_kind_counts`.

### Edge ID format (deterministic, symmetric-dedup-safe)
`topo-edge::{kind}::{lo_node}::{lo_iface_or_*}::{hi_node}::{hi_iface_or_*}`
where `(lo, hi)` is the lex-min normalisation of `(local, remote)`.
`None` iface sorts as `"*"`. Reverse symmetric facts collapse to one
edge.

### Acceptance rules (engine-owned, no exceptions)
- `local_node_id == remote_node_id` → self-link, rejected.
- Either node id not in node set → unknown-node, rejected.
- Same canonical edge ID seen again → collapsed; evidence appended
  (deduped); `facts_collapsed_duplicate` increments.
- Otherwise → new edge, `confidence = None`, evidence carried, per-
  kind count incremented.
- Final edge ordering: `(kind ordinal, id)` ascending. Kind ordinal:
  Lldp=0, Cdp=1, ConfigNeighbor=2, Manual=3.

### Live command path (V1AM)
`get_topology_view` still calls `project()`, which passes zero facts.
Live UI shows "0 reliable links" and NoneAvailable readiness. V1AM
makes the socket; later stages plug in real facts.

### Scope-out (V1AM strict)
- No LLDP/CDP parser extraction (`parser-lab/_adjacency/` stays
  prep-only).
- No DeviceModel mutation.
- No new Tauri command.
- No live polling.
- No fake inference (hostname / VLAN / iface-name guessing forbidden).
- No graph visualisation library.

### Future hook
Parser-derived ingestion, manual UI, or imported fact files all
produce `&[TopologyLinkFact]` and call `project_with_facts(env,
records, facts)`. No engine change needed in those stages.

### Cross-links
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md`
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md`
- `obsidian/stages/V1AM-topology-link-fact-pipeline.md`

---

## V1AN — Parser-Derived Neighbour Evidence Intake

### Status
V1AN lands the upstream intake layer that turns explicit parser-
derived neighbour evidence (LLDP, CDP, config-neighbour, manual)
into `TopologyLinkFact` records. Evidence → facts → V1AM
`project_edges_from_link_facts` → deterministic edges. Live command
path remains zero-evidence; a future stage connects a real evidence
source.

### What V1AN adds
- `TopologyNeighborEvidence` (engine-owned model for explicit
  parser-derived neighbour payloads).
- `NeighborEvidenceMappingStats` (acceptance/rejection counts).
- `map_neighbor_evidence_to_link_facts(nodes, evidence)` —
  deterministic mapper.
- `TopologyEngine::project_with_neighbor_evidence(env, records,
  evidence)` — internal overload that pipes evidence → facts →
  `project_with_facts`.

### Evidence model fields
- `source_kind: TopologyAdjacencyFactSourceKind` — lldp / cdp /
  config_neighbor / manual.
- `local_node_id: String` — device_record_id, required.
- `local_interface: Option<String>`.
- `remote_node_id: String` — REQUIRED. Caller resolves
  hostname→id upstream. No hint matching in V1AN.
- `remote_interface: Option<String>`.
- `remote_chassis_id: Option<String>` — raw LLDP/CDP field,
  preserved.
- `remote_system_name: Option<String>` — raw, preserved.
- `remote_port_id: Option<String>` — raw, preserved.
- `source_label: Option<String>` — e.g.
  `"parser:cisco-iosxe lldp neighbors"`.
- `evidence_notes: Option<String>` — free-form additional context.

### Acceptance rules (engine-owned)
- `local_node_id == remote_node_id` → self-link, rejected.
- `local_node_id` not in node set → unknown_local, rejected.
- `remote_node_id` not in node set → unknown_remote, rejected.
- Otherwise → emit a `TopologyLinkFact` with snake-case
  evidence string `"{kind}:remote_sys={sys}|chassis={chassis}|port={port}[|notes={notes}]"`
  (each placeholder filled with field value or `"?"` when None;
  `|notes=...` tail omitted when notes is None).
- Mapper does NOT dedup. V1AM's `project_edges_from_link_facts`
  handles edge-level collapse, evidence merging, and source-count
  bookkeeping downstream.
- Deterministic: same evidence input → same fact output, same order.

### Live command path (V1AN)
`get_topology_view` is unchanged. It calls `project()` →
`project_with_facts(env, records, &[])` → zero edges,
NoneAvailable readiness, "0 reliable links" message. V1AN provides
the socket; later stages connect a real evidence source.

### Scope-out (V1AN strict)
- No hostname matching / no hint resolution.
- No vendor parser changes.
- No parser-lab changes (`_adjacency/`, `_edge_integration/` stay
  untouched).
- No new Tauri command.
- No DeviceModel mutation, no expected.json, no parser version
  bump.
- No Validator / rule pack changes.
- No UI changes.
- No live polling / SSH / SNMP.
- `NeighborEvidenceMappingStats` not surfaced in `TopologyView` —
  internal/test only.

### Future hook
Vendor parser stages (e.g. cisco-iosxe LLDP extractor) produce
`Vec<TopologyNeighborEvidence>` and call
`TopologyEngine::project_with_neighbor_evidence(env, records,
evidence)`. No engine change needed in those stages. A future
"evidence persistence" stage may add a Tauri command and persist
evidence between sessions, but neither is V1AN.

### Cross-links
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md`
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md`
- `obsidian/stages/V1AN-parser-derived-neighbour-evidence-intake.md`

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
