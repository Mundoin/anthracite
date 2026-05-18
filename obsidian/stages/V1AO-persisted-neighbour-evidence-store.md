# V1AO — Persisted Neighbour Evidence Store + Live Topology Edges

**Arc:** TOPOLOGY-EDGES
**Date:** 2026-05-18
**Status:** landed

---

## Objective

Land the first persisted explicit-evidence source for the topology pipeline. `TopologyEvidenceStore` 
(trait + Null + JSON-file implementations) holds explicit `TopologyNeighborEvidence` per environment. 
`get_topology_view` now reads from the store and pipes evidence → facts → V1AM edges. With no stored 
evidence, behaviour matches V1AN byte-for-byte; with valid evidence, Topology shows real edges, real 
readiness counts, and rejection diagnostics.

V1AO enables operator-initiated evidence import (manual paste or file load) **without** vendor parser 
involvement. Future vendor parser stages (V1AP+) write to the same store, converging on a single 
evidence format. Manual operator workflow + automated parser ingestion share the same infrastructure 
from stage one.

---

## Scope in

**New files:**

- `obsidian/stages/V1AO-persisted-neighbour-evidence-store.md` — this note
- `src-tauri/src/engines/topology_evidence_store.rs` — new evidence store module

**Edited files (architecture docs):**

- `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` — Add V1AO section covering `TopologyEvidenceStore`, 
  store contract, live command path, operator UI surface
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — Add V1AO addition block to Topology Engine section 
  (trait, impls, `TopologyEvidenceSet`, new TopologyView fields, 3 new Tauri commands, UI surface)
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` — V1AO bullet in "What is alive now" section; 
  "Next in Stage Group 2" updated to reflect engine-alive arc closure and parser extraction deferred
- `obsidian/ANTHRACITE_INDEX.md` — V1AO row added to stage map

**Rust (src-tauri/src/engines/topology_evidence_store.rs) — NEW MODULE:**

- `TopologyEvidenceStore` trait: `load(env_id) -> Vec<TopologyNeighborEvidence>`, 
  `store(env_id, evidence, source_label) -> Result<TopologyEvidenceSet, Error>`, 
  `clear(env_id) -> Result<(), Error>`
- `NullTopologyEvidenceStore` — no-op impl (default, tests, cold-start)
- `JsonFileTopologyEvidenceStore` — JSON-file impl rooted at `{app_data}/topology_evidence/{env_id}.json`
- `TopologyEvidenceSet` struct: `schema_version: String` (`"v1"`), `environment_id`, `evidence_set_id` 
  (deterministic `"evset-{env_id}-{content_hash_hex}"`), `source_label: Option<String>`, 
  `evidence_count: u32`, `evidence: Vec<TopologyNeighborEvidence>`
- `TopologyEvidenceStoreError` enum (file I/O, corrupt JSON, schema version mismatch, etc.)
- Store-level persistence: JSON schema with version field for forward-compat
- Corrupt/missing/schema-mismatched load → returns empty Vec (honest empty, not error/panic)
- Import replaces env's evidence (not append; idempotent semantics)
- ~5 unit tests (load empty store, store and load, corrupt JSON handling, version mismatch)

**Rust (src-tauri/src/engines/topology.rs) — MODIFICATIONS:**

- Extend `TopologyView` struct with two new required fields (additive, snake_case wire):
  - `projection_stats: ProjectionStats`
  - `evidence_stats: NeighborEvidenceMappingStats`
- Modify `get_topology_view` implementation to read from injected `TopologyEvidenceStore` state 
  and call `project_with_neighbor_evidence(env, records, &evidence)` (instead of `project()` with zero evidence)
- No changes to `project()` or `project_with_neighbor_evidence()` signatures/internals

**Tauri state (src-tauri/src/main.rs):**

- Register `Box<dyn TopologyEvidenceStore>` as application state
- Production: `JsonFileTopologyEvidenceStore` rooted at app data dir
- Tests: `NullTopologyEvidenceStore`

**Tauri commands (src-tauri/src/commands/topology.rs) — NEW:**

- `import_topology_neighbor_evidence(environment_id: String, evidence: Vec<TopologyNeighborEvidence>, 
  source_label: Option<String>) -> Result<TopologyEvidenceSet, String>` — replaces env's evidence, 
  returns stored set with deterministic `evidence_set_id`
- `get_topology_neighbor_evidence(environment_id: String) -> Vec<TopologyNeighborEvidence>` — 
  reads current stored evidence for env
- `clear_topology_neighbor_evidence(environment_id: String) -> Result<(), String>` — clears env's 
  stored evidence

**TypeScript (src/types/topology.ts) — MODIFICATIONS:**

- Extend `TopologyView` interface with two new required fields:
  - `projection_stats: ProjectionStats`
  - `evidence_stats: NeighborEvidenceMappingStats`
- Add `TopologyEvidenceSet` interface: `schema_version`, `environment_id`, `evidence_set_id`, 
  `source_label`, `evidence_count`, `evidence`
- No changes to existing `TopologyNeighborEvidence`, `NeighborEvidenceMappingStats` (from V1AN)

**TypeScript API (src/api/topology.ts) — NEW:**

- `importTopologyNeighborEvidence(environmentId, evidence, sourceLabel) -> TopologyEvidenceSet`
- `getTopologyNeighborEvidence(environmentId) -> TopologyNeighborEvidence[]`
- `clearTopologyNeighborEvidence(environmentId) -> void`

**Frontend (src/modes/topology/TopologyMode.tsx) — NEW SECTIONS:**

- "Imported neighbour evidence" panel: textarea for evidence JSON + Import button (header intentionally 
  "Imported", never "Live discovery"/"Auto-discovery"/"Polling")
- Rejection-counts banner: `"{accepted} of {total} evidence entries accepted ({rejected} rejected — 
  see notes below)"` with breakdown by rejection category (`unknown_remote`, `unknown_local`, `self_link`)
- Edge list/table: one row per projected edge showing kind, local node, local interface, remote node, 
  remote interface, evidence note (no graph visualization library)
- Honest empty states: no evidence → `"No evidence loaded for this environment"`, all-rejected → 
  `"No edges projected — all imported evidence was rejected"`

**Tests:**

- `src-tauri/src/engines/topology_evidence_store.rs` — ~5 unit tests (load/store/clear, corrupt JSON, 
  schema version mismatch)
- `src-tauri/src/engines/topology.rs` — extend existing `get_topology_view` tests to verify evidence 
  store integration (~3-5 new/modified tests)
- `src/api/topology.test.ts` — new tests for 3 new import/read/clear commands (~3-5 new tests)
- `src/modes/topology/TopologyMode.test.tsx` — new tests for evidence import panel + rejection banner 
  + edge list (~5-10 new tests)

---

## Scope out

- **No vendor parser changes.** Parser code, extraction logic, vendor-specific rules untouched.
- **No parser-lab changes.** `_adjacency/`, `_edge_integration/`, `_neighbor_evidence/` stay prep-only. 
  Codex fixtures and notes untouched.
- **No live polling / SSH / SNMP / scanning.** Pure evidence intake; no device communication.
- **No graph visualisation library.** No Babylon.js, D3, Cytoscape, or force-directed layout in V1AO. 
  List/table only.
- **No hostname matching / hint resolution.** Evidence still requires concrete `remote_node_id`. 
  No fuzzy lookup, no `remote_node_hint` field.
- **No DeviceModel mutation.** Record schema unchanged; no new fields on discovery records.
- **No expected.json / parser version changes.** Golden files and parser versions locked.
- **No Validator / rule pack changes.** Rule packs untouched.
- **No AGENTS.md / CLAUDE.md / parser-lab / `.codex/` touches.** Infrastructure docs untouched.
- **Import does NOT trigger background scanning, polling, or device contact.**

---

## Design decisions

**1. Evidence store is a trait with pluggable implementations.**

`TopologyEvidenceStore` is the engine-owned abstraction. Null impl for tests/cold-start, JSON-file 
impl for production. Future cloud-backed or database-backed impls possible without engine changes. 
Decouples evidence persistence from projection logic.

**2. One JSON file per environment under app data.**

Simple, flat structure: `{app_data}/topology_evidence/{env_id}.json`. No database, no complex query 
engine. Single-file per env means parallel operations on different envs never collide. Schema versioning 
(`"v1"`) allows future evolution.

**3. Corrupt/missing load returns empty Vec, not error.**

Honest empty-state semantics. If evidence file is corrupted or missing, `load()` returns `Vec::new()`. 
No panic, no error propagation that crashes the app. `get_topology_view` with empty evidence behaves 
identically to V1AN (zero edges, NoneAvailable readiness). Operator sees consistent honest behaviour.

**4. Import replaces, not appends.**

`store(env_id, evidence, source_label)` replaces the entire evidence set for that environment. No 
append, no merge, no multi-set bookkeeping in V1AO. Simpler semantics, easier to reason about. Future 
stages can add multi-set or diff/merge workflows if needed.

**5. evidence_set_id is deterministic.**

`evidence_set_id = "evset-{env_id}-{SHA256(evidence_json)_hex}"` — same input (env_id + evidence) 
always produces same id across runs. Enables deduplication, stable references, and auditing without 
side-effect clocks.

**6. TopologyView fields are additive, snake_case wire.**

`projection_stats` and `evidence_stats` are new required fields on `TopologyView`. No breaking 
changes to existing fields. Snake_case wire format matches Rust module structure. TS mirrors exactly.

**7. No skip_serializing_if; all fields always present.**

Explicit is better than implicit. Every field always serialized, even when empty. Honest empty counts 
(0 total, 0 accepted, 0 rejected) explicitly visible.

**8. Operator import panel header says "Imported", not "Live discovery".**

Linguistic precision. V1AO is pure **manual import**, no polling, no scanning, no automated data gathering. 
Header text "Imported neighbour evidence" signals to operator that this is a static evidence set they 
supplied.

---

## Store contract

**File layout:**

```
{app_data}/
  topology_evidence/
    {env_id}.json           # One file per environment
```

**JSON schema (v1):**

```json
{
  "schema_version": "v1",
  "environment_id": "prod-us-east",
  "evidence_set_id": "evset-prod-us-east-abc123def456...",
  "source_label": "manual import 2026-05-18 10:30 UTC",
  "evidence_count": 3,
  "evidence": [
    {
      "source_kind": "lldp",
      "local_node_id": "device-001",
      "local_interface": "Eth0/0",
      "remote_node_id": "device-002",
      "remote_interface": "Eth0/1",
      "remote_chassis_id": "00:11:22:33:44:55",
      "remote_system_name": "core-02",
      "remote_port_id": "Ethernet 0/1",
      "source_label": "parser:cisco-iosxe lldp neighbors",
      "evidence_notes": null
    },
    ...
  ]
}
```

**Version evolution:**

- `schema_version: "v1"` shipped in V1AO
- Mismatched or missing version field → load returns empty Vec (honest, no error)
- Future V2 schema changes in later stages will bump version; migration logic in store impl

**Corruption handling:**

- Invalid JSON → caught at parse, returns empty Vec (honest empty, no panic)
- Missing fields on evidence objects → serde default or rejection (empty Vec)
- File not found → empty Vec (honest empty, no error)
- File read permissions error → empty Vec (honest empty, no error notification in engine; 
  Tauri command layer may surface OS error to operator)

---

## Live command path (V1AO)

```
get_topology_view(environment_id?)
  ↓
1. Load inventory via Discovery Engine: inventory_view(env_id) -> DiscoveryInventoryView
2. Load evidence via TopologyEvidenceStore: load(env_id) -> Vec<TopologyNeighborEvidence>
3. Call TopologyEngine::project_with_neighbor_evidence(env_id, records, &evidence)
   (same method as V1AN, but now receives real evidence from store instead of &[])
4. Return TopologyView with:
   - projection_stats populated (from V1AM's project_edges_from_link_facts)
   - evidence_stats populated (from V1AN's map_neighbor_evidence_to_link_facts)
   - edges: real projected edges (if evidence present)
   - adjacency_readiness: state machine updated per V1AL (if evidence present, fact sources flip 
     present: true)
   - summary: edge count accurate

With no environment scope (when env_id is None):
  -> evidence load returns empty (honest unscoped behaviour)
  -> edges: 0, state: NoneAvailable (same as V1AN)

With env scope and empty store:
  -> output byte-identical to V1AN (zero evidence, zero edges, zero accepted, all stats zero)
```

**Three new import/read/clear commands:**

```
import_topology_neighbor_evidence(environment_id, evidence, source_label)
  ↓
1. Call TopologyEvidenceStore::store(env_id, evidence, source_label)
2. Store impl writes to {app_data}/topology_evidence/{env_id}.json
3. Return TopologyEvidenceSet with deterministic evidence_set_id
4. (Optional) App may refresh Topology view to reflect new evidence

get_topology_neighbor_evidence(environment_id)
  ↓
1. Call TopologyEvidenceStore::load(env_id)
2. Return Vec<TopologyNeighborEvidence> (may be empty if store empty)

clear_topology_neighbor_evidence(environment_id)
  ↓
1. Call TopologyEvidenceStore::clear(env_id)
2. Deletes {app_data}/topology_evidence/{env_id}.json
3. Future get_topology_view calls on this env return zero evidence
```

---

## Operator UI surface

**Evidence import panel (new section in TopologyMode):**

Header: `"Imported neighbour evidence"` (NOT "Live discovery", "Auto-discovery", "Polling", etc.)

Layout:
- Textarea: operator pastes JSON array of `TopologyNeighborEvidence` objects
- Import button: triggers `import_topology_neighbor_evidence` command
- Success feedback: `"Imported {count} evidence entries for this environment"`
- Error feedback: displays parse error or command error

**Rejection-counts banner (appears after import if any evidence rejected):**

```
{accepted} of {total} evidence entries accepted ({rejected} rejected — see notes below)

Rejected by category:
  • Unknown remote node: {count}
  • Unknown local node: {count}
  • Self-link (local == remote): {count}
```

If all rejected: `"No edges projected — all imported evidence was rejected"`
If none rejected: banner hidden or shows `"All {total} evidence entries accepted"`

**Edge list/table (new section, renders actual projected edges):**

Columns: Kind | Local Node | Local Interface | Remote Node | Remote Interface | Evidence Note

One row per edge from `TopologyView.edges`:
- Kind: `lldp` | `cdp` | `config_neighbor` | `manual`
- Local Node: label from local node
- Local Interface: from edge's `local_interface` field (or `—` if None)
- Remote Node: label from remote node
- Remote Interface: from edge's `remote_interface` field (or `—` if None)
- Evidence Note: concatenated evidence strings (can be long; truncate with tooltip)

Sorting: by kind ordinal (Lldp < Cdp < ConfigNeighbor < Manual), then by edge ID

**Honest empty states:**

- No environment selected: TopologyMode shows `"Select an environment to view topology"` (existing)
- No inventory loaded: `"0 nodes — no inventory records imported yet"` (existing)
- No evidence loaded: `"No evidence loaded for this environment"` (explicit honest state)
  - Import panel visible (operator can import)
  - Edge list hidden or shows `"No edges — import evidence to begin"`
- Evidence loaded but all rejected: `"No edges projected — all imported evidence was rejected"`
  - Rejection-counts banner visible with full breakdown
  - Edge list hidden

---

## Files changed and their purpose

| File | Change | Purpose |
|------|--------|---------|
| `src-tauri/src/engines/topology_evidence_store.rs` | NEW MODULE | Evidence store trait + Null + JSON-file impls, TopologyEvidenceSet shape |
| `src-tauri/src/engines/topology.rs` | Extend TopologyView fields | Add projection_stats, evidence_stats; integrate store into get_topology_view |
| `src-tauri/src/main.rs` | Register store state | Add Box<dyn TopologyEvidenceStore> to Tauri app state |
| `src-tauri/src/commands/topology.rs` | Add 3 new commands | import/get/clear TopologyNeighborEvidence |
| `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` | Add V1AO section | Store contract, live command path, operator UI surface, future hook |
| `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` | Add V1AO block | Trait + impls, new commands, TopologyView extension, UI surface |
| `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` | Add V1AO bullet + update Next | V1AO in "What is alive now"; engine-alive arc closure noted; parser extraction deferred |
| `obsidian/ANTHRACITE_INDEX.md` | Add V1AO row | Index stage in project memory |
| `src/types/topology.ts` | Extend TopologyView + add TopologyEvidenceSet | TS mirrors of Rust types |
| `src/api/topology.ts` | Add 3 new API methods | TS wrappers for import/get/clear commands |
| `src/modes/topology/TopologyMode.tsx` | Add evidence import + rejection + edge list panels | UI sections for evidence intake and edge visualization |
| `src/modes/topology/TopologyMode.test.tsx` | Add UI tests | Import panel, rejection banner, edge list rendering |
| `src-tauri/src/engines/topology.rs` | Add/extend unit tests | Store integration, determinism, evidence → edge projection |
| `src/api/topology.test.ts` | Add API tests | import/get/clear command tests |

---

## Validation checklist

### Evidence Store & Persistence

- [ ] `TopologyEvidenceStore` trait defined with load/store/clear methods
- [ ] `NullTopologyEvidenceStore` impl: no-op (suitable for tests)
- [ ] `JsonFileTopologyEvidenceStore` impl: reads/writes `{app_data}/topology_evidence/{env_id}.json`
- [ ] `TopologyEvidenceSet` struct: schema_version, environment_id, evidence_set_id, source_label, 
  evidence_count, evidence array
- [ ] evidence_set_id deterministic: `"evset-{env_id}-{content_hash_hex}"` — same input always same id
- [ ] Corrupt JSON load: returns empty Vec (honest, no error/panic)
- [ ] Missing file load: returns empty Vec (honest)
- [ ] Schema version mismatch: returns empty Vec (honest forward-compat)
- [ ] Import replaces (not appends): new import replaces env's entire evidence set
- [ ] Tauri builder registers `Box<dyn TopologyEvidenceStore>` as state

### TopologyView Extension

- [ ] `TopologyView.projection_stats: ProjectionStats` added (additive)
- [ ] `TopologyView.evidence_stats: NeighborEvidenceMappingStats` added (additive)
- [ ] Both fields always present on wire (no skip_serializing_if)
- [ ] TS `TopologyView` interface mirrors Rust exactly

### Live Command Integration

- [ ] `get_topology_view(env_id?)` reads from store: `load(env_id)` -> Vec<TopologyNeighborEvidence>
- [ ] `get_topology_view` calls `project_with_neighbor_evidence(env, records, &evidence)` 
  (V1AN method, now with real evidence from store)
- [ ] With empty store, output byte-identical to V1AN (zero edges, NoneAvailable)
- [ ] With evidence in store, edges and readiness counts update accordingly
- [ ] No environment scope (env_id=None): evidence load returns empty (honest unscoped)

### Tauri Commands (3 new)

- [ ] `import_topology_neighbor_evidence(env_id, evidence, source_label) -> TopologyEvidenceSet`
  - Calls `store.store(env_id, evidence, source_label)`
  - Returns set with deterministic evidence_set_id
  - Replaces (not appends) env's evidence
- [ ] `get_topology_neighbor_evidence(env_id) -> Vec<TopologyNeighborEvidence>`
  - Calls `store.load(env_id)`
  - Returns current stored evidence (may be empty)
- [ ] `clear_topology_neighbor_evidence(env_id) -> Result<(), String>`
  - Calls `store.clear(env_id)`
  - Deletes evidence file

### TypeScript Types & API

- [ ] `TopologyNeighborEvidence` interface (unchanged from V1AN, re-exported)
- [ ] `NeighborEvidenceMappingStats` interface (unchanged from V1AN, re-exported)
- [ ] `TopologyView` interface extended with `projection_stats` and `evidence_stats`
- [ ] `TopologyEvidenceSet` interface added (mirrors Rust struct)
- [ ] `importTopologyNeighborEvidence(env_id, evidence, source_label) -> TopologyEvidenceSet`
- [ ] `getTopologyNeighborEvidence(env_id) -> TopologyNeighborEvidence[]`
- [ ] `clearTopologyNeighborEvidence(env_id) -> void`

### Frontend UI Surface

- [ ] Evidence import panel: textarea + Import button, header "Imported neighbour evidence"
- [ ] Rejection-counts banner: shows accepted/total + per-category breakdown (unknown_remote, 
  unknown_local, self_link)
- [ ] Edge list/table: one row per edge (kind, local node, local interface, remote node, 
  remote interface, evidence note)
- [ ] Honest empty states:
  - [ ] No evidence: `"No evidence loaded for this environment"`
  - [ ] All rejected: `"No edges projected — all imported evidence was rejected"`
- [ ] No graph visualization library (Babylon, D3, Cytoscape, etc.)
- [ ] Panel ordering and styling: industrial light NOC tone (matches V1AJ baseline)

### Determinism

- [ ] Store loads return same evidence in same order for same file
- [ ] evidence_set_id deterministic across runs (same input -> same id)
- [ ] Import with same evidence produces same TopologyEvidenceSet
- [ ] project_with_neighbor_evidence deterministic (V1AN property, unchanged)
- [ ] projection_stats and evidence_stats deterministic

### Backwards Compatibility

- [ ] Empty store (fresh env): `get_topology_view` returns same bytes as V1AN (zero evidence, 
  zero edges, NoneAvailable)
- [ ] Existing TopologyView consumers see two new required fields (additive, not breaking)
- [ ] get_topology_view command signature unchanged (store injected internally)

### Scope Out Confirmed

- [ ] No vendor parser changes
- [ ] No parser-lab changes (`_adjacency/`, `_edge_integration/`, `_neighbor_evidence/` prep-only)
- [ ] No live polling / SSH / SNMP / scanning
- [ ] No graph visualization library
- [ ] No hostname matching / no `remote_node_hint` field
- [ ] No DeviceModel mutation
- [ ] No expected.json / parser version changes
- [ ] No Validator / rule pack changes
- [ ] No AGENTS.md / CLAUDE.md / parser-lab / `.codex/` touches
- [ ] Import does NOT trigger background scanning, polling, or device contact

### Tests & Builds

- [ ] `cargo check` green
- [ ] `cargo test` includes:
  - Store: load empty, store and load round-trip, corrupt JSON handling, version mismatch (~5)
  - Engine: get_topology_view with/without evidence, determinism (~3-5)
- [ ] `pnpm typecheck` green
- [ ] `pnpm test` includes:
  - API: import/get/clear command tests (~3-5)
  - UI: import panel, rejection banner, edge list rendering (~5-10)
- [ ] `pnpm build` green
- [ ] `tools/ops-readiness.ps1` reports READY

---

## Strategic checkpoint

After V1AO, the explicit neighbour evidence storage and ingestion infrastructure is **operator-visible 
and live**. Operator can:

1. Paste or upload `TopologyNeighborEvidence` JSON.
2. Import into the topology evidence store.
3. See real edges projected from that evidence.
4. See readiness counts and rejection diagnostics.

**Engine-alive arc (V1AJ → V1AN → V1AO) is now complete.** Topology engine reads persisted 
Discovery records, reads persisted evidence, projects deterministic topology. Operator has real 
edges + honest readiness tracking + rejection visibility.

**Manual operator import workflow is the first evidence ingestion path.** Vendor parser stages 
(V1AP+) will write to the same store, converging on the same `TopologyNeighborEvidence` format. 
No engine changes needed in those stages — they simply produce evidence and call import.

---

## Key learnings for next stage

- **Evidence store is the evidence contract.** `TopologyEvidenceStore` is the single interface 
  all evidence sources (manual, parser, import) will use. Trait-based design allows future 
  implementations (cloud-backed, database-backed) without engine changes.
- **Store state is injected, not baked.** Tauri state injection keeps engine side-effect-free. 
  Engine owns projection logic; store owns persistence. Clean separation.
- **Deterministic evidence_set_id enables auditing.** Content-hash id allows future stages to 
  deduplicate, diff, or audit evidence sets without timestamps or external identifiers.
- **Honest empty Vec on corruption is better than errors.** App stays responsive; operator sees 
  consistent empty state. No exception handling cascades. Future version-mismatch detection is 
  transparent.
- **Rejection-counts transparency is critical.** Operator imports evidence and immediately sees 
  what was accepted/rejected and why. No silent data loss. Operator knows the projection is 
  based on the subset that passed validation.

---

## Suggested commit message

```
stage-v1ao: persisted neighbour evidence store + live topology edges

Arc: TOPOLOGY-EDGES
- New: TopologyEvidenceStore trait (load/store/clear contract)
- New: NullTopologyEvidenceStore (no-op; tests, cold-start)
- New: JsonFileTopologyEvidenceStore (JSON files at {app_data}/topology_evidence/{env_id}.json)
- New: TopologyEvidenceSet struct (schema_version, env_id, evidence_set_id, source_label, evidence)
- New: evidence_set_id deterministic format evset-{env_id}-{content_hash_hex}
- New: TopologyView.projection_stats and TopologyView.evidence_stats (additive fields)
- Modify: get_topology_view reads from injected TopologyEvidenceStore state
- Modify: get_topology_view calls project_with_neighbor_evidence with real evidence from store
- New: import_topology_neighbor_evidence(env_id, evidence, source_label) Tauri command
- New: get_topology_neighbor_evidence(env_id) Tauri command
- New: clear_topology_neighbor_evidence(env_id) Tauri command
- Store contract: one JSON file per environment, schema v1, corrupt/missing → empty Vec (honest)
- Store semantics: import replaces (not appends); evidence_set_id deterministic
- Backwards-compat: empty store → V1AN behaviour byte-for-byte
- UI: Imported evidence panel (textarea + Import), rejection-counts banner, edge list/table
- UI: Honest empty states (no evidence, all rejected)
- Determinism: same evidence input → same edges, same readiness, same evidence_set_id
- Scope-out: no parser changes, no polling, no graph lib, no hostname matching
- Future hook: vendor parser stages write same TopologyNeighborEvidence format; no engine changes
- Test coverage: store load/store/clear, project_with_evidence, UI panels (~20 new tests)
- Docs: TOPOLOGY_ENGINE_BOUNDARY.md V1AO section, ENGINE_AND_API_BOUNDARIES.md block, roadmap updated
- Strategic: Engine-alive arc complete; Stage Group 2 checkpoint (operator can import evidence and see real edges)
```
