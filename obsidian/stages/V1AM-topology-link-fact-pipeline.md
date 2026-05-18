# V1AM — Topology Link Fact Pipeline + First Edge Projection

**Arc:** TOPOLOGY-EDGES
**Date:** 2026-05-18
**Status:** complete

---

## Objective

Land the explicit link-fact ingestion pipeline in the Topology Engine. Make the socket 
that future parser-derived, manual, and imported fact sources plug into cleanly. Engine 
and tests prove the pipeline works; live command path remains zero-fact until a fact 
source connects in a later stage.

V1AM introduces `TopologyLinkFact` (the canonical fact struct), `project_edges_from_link_facts()` 
(deterministic edge projection from facts), and `TopologyEngine::project_with_facts()` 
(internal overload). `TopologyEdge` gains interface and evidence fields. `compute_adjacency_readiness` 
becomes data-driven from real fact counts. **Live UI still shows "0 reliable links" and NoneAvailable 
readiness** — V1AM prepares the socket; later stages provide the data.

---

## Scope in

**New files:**

- `obsidian/stages/V1AM-topology-link-fact-pipeline.md` — this note

**Edited files (architecture docs):**

- `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` — Add V1AM section covering 
  `TopologyLinkFact`, edge ID format, acceptance rules, projection helper, readiness 
  data-drive, live command path, scope-out, future hook
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — Add V1AM addition block to Topology 
  Engine section (new types, project_with_facts overload, additive TopologyEdge fields, 
  data-driven readiness, no new command, no parser/DeviceModel changes)
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` — V1AM bullet in "What is alive now" 
  section; "Next in Stage Group 2" updated to reflect parser-derived ingestion as the 
  remaining work
- `obsidian/ANTHRACITE_INDEX.md` — V1AM row added to stage map

**Rust (src-tauri/src/engines/topology.rs):**

- Add `TopologyLinkFact` struct: `source_kind`, `local_node_id`, `remote_node_id`, 
  `local_interface`, `remote_interface`, `evidence`, `source_label`
- Add `ProjectionStats` struct: `facts_total`, `facts_accepted`, `facts_rejected_unknown_node`, 
  `facts_rejected_self_link`, `facts_collapsed_duplicate`, `per_kind_counts`
- Add `project_edges_from_link_facts(nodes: &[TopologyNode], facts: &[TopologyLinkFact]) 
  -> (Vec<TopologyEdge>, ProjectionStats)` — deterministic projection helper
- Extend `TopologyEngine::project()` as a thin wrapper to internal `project_with_facts(env, 
  records, facts)` method (pass `&[]` for facts)
- Update `compute_adjacency_readiness(node_count, per_kind_counts)` to be data-driven 
  from real fact counts instead of hardcoded; state transitions: all-absent → NoneAvailable, 
  some-present → Partial, all-present → Ready
- Extend `TopologyEdge`: add `local_interface: Option<String>`, `remote_interface: Option<String>`, 
  `evidence: Vec<String>`
- Edge ID format: `topo-edge::{kind}::{lo_node}::{lo_iface_or_*}::{hi_node}::{hi_iface_or_*}` 
  where `(lo, hi)` is lex-min normalisation of `(local, remote)`, `None` iface sorts as `"*"`
- Acceptance rules: self-link reject, unknown-node reject, canonical-ID dedup with evidence append
- Final edge ordering: `(kind ordinal, id)` ascending (Lldp=0, Cdp=1, ConfigNeighbor=2, Manual=3)
- ~20 new unit tests covering self-link reject, unknown-node reject, dedup, edge ordering, 
  readiness data-drive

**TypeScript (src/types/topology.ts):**

- Add `TopologyLinkFact` interface: `source_kind`, `local_node_id`, `remote_node_id`, 
  `local_interface`, `remote_interface`, `evidence`, `source_label`
- Add `ProjectionStats` interface: all stats fields
- Extend `TopologyEdge` interface: add `local_interface`, `remote_interface`, `evidence` fields

**Frontend (src/modes/topology/TopologyMode.tsx):**

- No UI change (live still passes zero facts; UI still shows "0 reliable links" and NoneAvailable)
- Test fixtures updated to include `TopologyEdge` new fields + `ProjectionStats` in any 
  mock data

**Tests:**

- `src-tauri/src/engines/topology.rs` — ~20 new Rust unit tests
- `src/modes/topology/__tests__/TopologyMode.test.ts` — test fixtures updated to include 
  edge interface/evidence fields; cascade updates only (no new UI tests, live is unchanged)

---

## Scope out

- **No LLDP/CDP parser extraction.** `parser-lab/_adjacency/` stays prep-only. Parser 
  integration happens in a later stage.
- **No DeviceModel mutation.** Record schema unchanged.
- **No new Tauri command.** Existing `get_topology_view` still passes zero facts.
- **No live polling, SSH, SNMP.** Pure read-model projection.
- **No fake inference.** Hostname / VLAN / interface-name guessing forbidden forever.
- **No graph viz library.** No Three.js, D3, Cytoscape, Babylon integration.
- **Live UI unchanged.** Still shows "0 reliable links" and NoneAvailable readiness. 
  V1AM is infrastructure only.
- **No DataSourceState extension.** Union remains unchanged.
- **No ModeRail / MODE_STATUS changes.** Topology mode status unchanged.
- **No AGENTS.md / CLAUDE.md / parser-lab / `.codex/` touches.** Docs, ops, and prep untouched.

---

## Design decisions

**1. TopologyLinkFact is the canonical fact struct.**

Engine-owned, carrier of all adjacency-fact metadata. Future parser/manual/import stages all 
produce `&[TopologyLinkFact]` and call `project_with_facts()`. Single contract, no impedance 
mismatches.

**2. Edge ID format: deterministic, symmetric, dedup-safe.**

`topo-edge::{kind}::{lo_node}::{lo_iface_or_*}::{hi_node}::{hi_iface_or_*}` with lex-min 
normalisation ensures reverse-direction symmetric facts collapse to one edge. No duplicate-edge 
drift; evidence accumulates on the canonical edge.

**3. ProjectionStats owns the acceptance/rejection accounting.**

`facts_total`, `facts_accepted`, `facts_rejected_*`, `facts_collapsed_*`, `per_kind_counts` 
give engine caller full transparency into what happened to input facts. Future fact-ingestion 
stages will log these stats.

**4. compute_adjacency_readiness is now data-driven.**

Instead of hardcoded state, it reads real fact counts from `per_kind_counts`. State derives 
generically: all-absent → NoneAvailable, some-present → Partial, all-present → Ready. No future 
schema migration needed when fact sources land.

**5. TopologyEdge gains interface + evidence fields (additive).**

`local_interface`, `remote_interface`, `evidence` are new. Existing fields unchanged. Backward 
compatible extension; TS types mirror Rust.

**6. Live command path (get_topology_view) passes zero facts.**

No fact source is connected yet. The socket exists; future stages plug in. Engine doesn't fake 
facts; live UI stays honest.

**7. project_with_facts is internal; project() is the public face.**

Decouples live command from fact-ingestion plumbing. If a future stage needs to test fact 
projection, it calls `project_with_facts()` directly. Tests do the same.

---

## Pipe contract

```
persisted Discovery inventory (from V1AI)
  ↓
Topology Engine: project(environment_id, records) → TopologyView
  [Internal: calls project_with_facts(env_id, records, &[])]
  ├── source_state: "real" | "empty"
  ├── summary: TopologySummary (nodes, edges: 0, source record count)
  ├── nodes: Vec<TopologyNode> (from Discovery records)
  ├── edges: Vec<TopologyEdge>  [0 in live path; infrastructure ready]
  ├── layers: Vec<TopologyLayer>
  └── adjacency_readiness: TopologyAdjacencyReadiness
      ├── fact_source_state: NoneAvailable (all sources absent)
      ├── fact_sources: [Lldp, Cdp, ConfigNeighbor, Manual] all present: false
      └── reason: "No adjacency fact sources available yet"
  ↓
TS API: getTopologyView(environmentId?) → TopologySourceView
  └── passes raw TopologyView; no adapter change needed
  ↓
TopologyMode.tsx renders
  └── Same surface as V1AL: nodes, summary, readiness section, "0 reliable links"
```

**Future fact ingestion (V1AN+):**

```
Parser-derived / manual / imported TopologyLinkFact []
  ↓
Topology Engine: project_with_facts(env_id, records, facts) → TopologyView
  ├── project_edges_from_link_facts(nodes, facts) → (edges, ProjectionStats)
  │   ├── Self-link reject (local_node_id == remote_node_id)
  │   ├── Unknown-node reject (node not in node set)
  │   ├── Canonical edge ID dedup + evidence append
  │   └── Deterministic edge ordering (kind, id)
  ├── edges: Vec<TopologyEdge> [populated]
  ├── adjacency_readiness: recompute with real fact counts
  │   ├── per_kind_counts from ProjectionStats
  │   ├── State auto-transitions (e.g., Partial if LLDP + CDP present)
  │   └── Reason updates (e.g., "2 of 4 adjacency fact sources connected")
  ├── summary.edges: incremented
  └── ...rest of view unchanged
  ↓
TS API: same contract, new data
  ↓
TopologyMode.tsx re-renders
  └── Readiness section updates per-source counts; edge count increments
```

---

## Files changed and their purpose

| File | Change | Purpose |
|------|--------|---------|
| `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` | Add V1AM section | `TopologyLinkFact`, edge ID format, acceptance rules, projection helper, live command path, future hook |
| `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` | Add V1AM block to Topology | Types, overload, additive fields, data-driven readiness, no command/parser changes |
| `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` | Add V1AM bullet + update "Next" | Infrastructure live; parser-derived ingestion is next work |
| `obsidian/ANTHRACITE_INDEX.md` | Add V1AM row to stage map | Index stage in project memory |
| `src-tauri/src/engines/topology.rs` | Add `TopologyLinkFact`, `ProjectionStats`, helper, overload, data-driven readiness, tests | Fact ingestion pipeline + determinism |
| `src/types/topology.ts` | Add `TopologyLinkFact`, `ProjectionStats`, extend `TopologyEdge` | TypeScript wire shape mirror |
| `src/modes/topology/__tests__/TopologyMode.test.ts` | Cascade fixture updates | Edge fields, stats in mocks |

---

## Validation checklist

### Engine & Determinism

- [x] `TopologyLinkFact` struct defined; carries all fact metadata
- [x] `project_edges_from_link_facts(nodes, facts) -> (edges, ProjectionStats)` pure helper
- [x] `TopologyEngine::project_with_facts(env, records, facts)` internal overload
- [x] `project()` is thin wrapper calling `project_with_facts(..., &[])`
- [x] Same Discovery snapshot + same facts → same edge bytes (deterministic)
- [x] No I/O, no clock, no randomness inside engine

### Edge Projection & Dedup

- [x] Self-link rejection (local_node_id == remote_node_id)
- [x] Unknown-node rejection (node not in node set)
- [x] Canonical edge ID dedup: `topo-edge::{kind}::{lo}::{lo_iface_or_*}::{hi}::{hi_iface_or_*}`
- [x] Lex-min normalisation of (local, remote) pairs
- [x] Reverse symmetric facts collapse to one edge
- [x] Evidence appended on dedup; facts_collapsed_duplicate increments
- [x] Edge ordering: (kind ordinal, id) ascending

### ProjectionStats Accounting

- [x] facts_total: input fact count
- [x] facts_accepted: edges emitted
- [x] facts_rejected_unknown_node: tracked
- [x] facts_rejected_self_link: tracked
- [x] facts_collapsed_duplicate: tracked
- [x] per_kind_counts: (source_kind, real_count) for each of 4 sources

### Adjacency Readiness (Data-Driven)

- [x] `compute_adjacency_readiness(node_count, per_kind_counts)` replaces hardcoded version
- [x] State derivation: all-absent → NoneAvailable, some → Partial, all → Ready
- [x] Reason updates per state (no clock, no filler)
- [x] eligible_node_count: nodes.len() (supports future tightening)
- [x] accepted_kinds: all 4 sources listed (closed contract)

### TopologyEdge Fields

- [x] `local_interface: Option<String>` added
- [x] `remote_interface: Option<String>` added
- [x] `evidence: Vec<String>` added
- [x] All additive; existing fields untouched
- [x] TS types mirror Rust exactly

### Live Command Path (Zero-Fact)

- [x] `get_topology_view` calls `project(env_id, records)`
- [x] Live edges remain 0 (empty Vec)
- [x] Live readiness state: NoneAvailable
- [x] Live summary.edges: 0
- [x] UI unchanged ("0 reliable links" still rendered)

### Type Safety

- [x] Rust: `TopologyLinkFact`, `ProjectionStats` structs
- [x] TS: `TopologyLinkFact`, `ProjectionStats` interfaces
- [x] TS mirrors Rust exactly (no impedance mismatch)
- [x] `TopologyEdge` extended in both Rust and TS

### Tests & Builds

- [x] `cargo check` green
- [x] `cargo test` covers self-link reject, unknown-node reject, dedup, ordering, 
  readiness data-drive (~20 new tests)
- [x] `pnpm typecheck` green
- [x] `pnpm test` cascade fixtures updated (edge fields, stats in mocks)
- [x] `pnpm build` green
- [x] `tools/ops-readiness.ps1` reports READY

### Scope Out Confirmed

- [x] No LLDP/CDP parser extraction; `parser-lab/_adjacency/` prep-only
- [x] No DeviceModel schema changes
- [x] No new Tauri command; existing `get_topology_view` passes zero facts
- [x] No live polling, SSH, SNMP
- [x] No fake inference (hostname / VLAN / iface-name guessing forbidden)
- [x] No graph viz library
- [x] Live UI unchanged; still shows "0 reliable links" and NoneAvailable
- [x] No DataSourceState extension
- [x] No ModeRail / MODE_STATUS changes
- [x] No AGENTS.md / CLAUDE.md / parser-lab / `.codex/` touches

### Halt conditions

- [x] H1: `TopologyLinkFact` struct with all metadata fields
- [x] H2: `ProjectionStats` struct with acceptance/rejection/kind-count accounting
- [x] H3: `project_edges_from_link_facts(nodes, facts) -> (edges, stats)` pure helper
- [x] H4: `TopologyEngine::project_with_facts(env, records, facts)` internal overload
- [x] H5: `project()` thin wrapper calling `project_with_facts(..., &[])`
- [x] H6: Self-link rejection (local_node_id == remote_node_id)
- [x] H7: Unknown-node rejection (node not in node set)
- [x] H8: Canonical edge ID: `topo-edge::{kind}::{lo}::{lo_iface_or_*}::{hi}::{hi_iface_or_*}`
- [x] H9: Lex-min normalisation; `None` iface sorts as `"*"`
- [x] H10: Reverse symmetric facts collapse to one edge; evidence appended
- [x] H11: Edge ordering: (kind ordinal, id) ascending
- [x] H12: `TopologyEdge` gains `local_interface`, `remote_interface`, `evidence` (additive)
- [x] H13: `compute_adjacency_readiness(node_count, per_kind_counts)` is data-driven
- [x] H14: State derivation: all-absent → NoneAvailable, some → Partial, all → Ready
- [x] H15: Reason updates per state (no clock, no filler)
- [x] H16: eligible_node_count: nodes.len() (supports future tightening)
- [x] H17: accepted_kinds: all 4 sources listed (closed contract)
- [x] H18: Live `get_topology_view` still passes zero facts; edges: 0, state: NoneAvailable
- [x] H19: TS types mirror Rust exactly
- [x] H20: No new Tauri command; no parser/DeviceModel/DataSourceState changes
- [x] H21: Docs complete (TOPOLOGY_ENGINE_BOUNDARY.md V1AM section, ENGINE_AND_API_BOUNDARIES.md block, roadmap bullets, stage note)
- [x] H22: Rust tests cover self-link reject, unknown-node reject, dedup, ordering, readiness data-drive (~20 new tests)
- [x] H23: TS test fixtures updated (edge fields, stats in mocks)
- [x] H24: Ops-readiness checks pass

---

## Strategic checkpoint

After V1AM, the explicit link-fact ingestion infrastructure is **live in the engine**. 
The socket exists; `TopologyLinkFact`, edge projection, dedup, and data-driven readiness 
all work. Live command path remains zero-fact — engine is ready to receive real facts 
from a future stage.

**Next in Stage Group 2:**

- **Parser-Derived Ingestion.** LLDP/CDP/config-neighbor fact extraction from vendor 
  parsers. Produce `&[TopologyLinkFact]`, call `project_with_facts()`. Flip `present: true` 
  on relevant sources; state auto-transitions; edge count increments.
- **Edge Rendering.** Babylon.js integration for interactive 2D/3D topology visualization.

---

## Key learnings for next stage

- **Fact struct is the contract.** `TopologyLinkFact` is the single interface all fact 
  sources speak. Future parser, manual, and import stages produce it cleanly.
- **Dedup via canonical edge ID is solid.** Lex-min normalisation + `None` iface sort 
  ensures no spurious duplicates. Reverse symmetric facts naturally collapse.
- **Data-driven readiness scales.** No schema migration needed when fact sources land. 
  Just populate `per_kind_counts`; state auto-transitions.
- **Live zero-fact is honest.** Engine doesn't fake edges. Socket exists, data doesn't. 
  Operator sees "0 reliable links" and NoneAvailable until facts arrive.
- **Infrastructure-first design wins.** By V1AM, the engine is ready; next stages only 
  need to produce facts and call the projection helper. No engine rewrites needed.

---

## Suggested commit message

```
stage-v1am: topology link fact pipeline — explicit fact ingestion infrastructure

Arc: TOPOLOGY-EDGES
- New: TopologyLinkFact struct (source_kind, local/remote node/interface, evidence, label)
- New: ProjectionStats struct (facts_total, facts_accepted, rejection counts, per_kind_counts)
- New: project_edges_from_link_facts(nodes, facts) -> (edges, ProjectionStats) helper
- Engine: TopologyEngine::project_with_facts(env, records, facts) internal overload
- Wrapper: project() now calls project_with_facts(..., &[]) — zero-fact by default
- Acceptance rules: self-link reject, unknown-node reject, canonical-ID dedup
- Edge ID format: topo-edge::{kind}::{lo_node}::{lo_iface_or_*}::{hi_node}::{hi_iface_or_*}
- Dedup: reverse symmetric facts collapse to one edge; evidence appended
- Ordering: (kind ordinal, id) ascending — deterministic
- TopologyEdge gains: local_interface, remote_interface, evidence (additive)
- Readiness: compute_adjacency_readiness now data-driven from per_kind_counts
- State machine: all-absent → NoneAvailable, some-present → Partial, all → Ready
- Live command path: still passes zero facts; edges: 0, state: NoneAvailable, "0 reliable links"
- Socket ready: future parser/manual/import stages produce TopologyLinkFact and call project_with_facts()
- Types: TS mirrors Rust exactly (no impedance mismatch)
- Tests: ~20 Rust tests (dedup, self-link reject, unknown-node reject, ordering, readiness)
- Docs: TOPOLOGY_ENGINE_BOUNDARY.md V1AM section, ENGINE_AND_API_BOUNDARIES.md block, roadmap updated
- Scope-out: no parser changes, no LLDP/CDP extraction, no DeviceModel mutation, no new Tauri command
- Future hook: when parser-derived ingestion lands, produce TopologyLinkFact; no engine change needed
```
