# V1AN — Parser-Derived Neighbour Evidence Intake

**Arc:** TOPOLOGY-EDGES
**Date:** 2026-05-18
**Status:** landed

---

## Objective

Land the upstream intake layer that turns explicit parser-derived neighbour evidence (LLDP, CDP, 
config-neighbour, manual) into `TopologyLinkFact` records. Evidence → facts → V1AM 
`project_edges_from_link_facts` → deterministic edges. Live command path remains zero-evidence; 
a future stage connects a real evidence source.

V1AN introduces `TopologyNeighborEvidence` (the canonical evidence struct), `NeighborEvidenceMappingStats` 
(acceptance/rejection accounting), `map_neighbor_evidence_to_link_facts()` (deterministic mapper), and 
`TopologyEngine::project_with_neighbor_evidence()` (internal overload). **Live UI still shows "0 reliable 
links" and NoneAvailable readiness** — V1AN prepares the socket; vendor parser stages provide the data.

---

## Scope in

**New files:**

- `obsidian/stages/V1AN-parser-derived-neighbour-evidence-intake.md` — this note

**Edited files (architecture docs):**

- `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` — Add V1AN section covering 
  `TopologyNeighborEvidence`, evidence model fields, acceptance rules, mapper, live 
  command path, scope-out, future hook
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — Add V1AN addition block to Topology 
  Engine section (new types, mapper function, new engine overload, no command/parser 
  changes, no DeviceModel mutation)
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` — V1AN bullet in "What is alive now" 
  section; "Next in Stage Group 2" updated to reflect vendor parser extraction as the 
  remaining work
- `obsidian/ANTHRACITE_INDEX.md` — V1AN row added to stage map

**Rust (src-tauri/src/engines/topology.rs):**

- Add `TopologyNeighborEvidence` struct: `source_kind`, `local_node_id`, `local_interface`, 
  `remote_node_id`, `remote_interface`, `remote_chassis_id`, `remote_system_name`, 
  `remote_port_id`, `source_label`, `evidence_notes`
- Add `NeighborEvidenceMappingStats` struct: `evidence_total`, `accepted`, 
  `rejected_unknown_local`, `rejected_unknown_remote`, `rejected_self_link`
- Add `map_neighbor_evidence_to_link_facts(nodes: &[TopologyNode], evidence: 
  &[TopologyNeighborEvidence]) -> (Vec<TopologyLinkFact>, NeighborEvidenceMappingStats)` — 
  deterministic mapper
- Extend `TopologyEngine::project_with_neighbor_evidence(env, records, evidence)` — internal 
  overload that pipes evidence through mapper to `project_with_facts`
- Mapper rejection rules: self-link (local==remote), unknown-local, unknown-remote
- Evidence string format on produced `TopologyLinkFact.evidence`: 
  `"{kind}:remote_sys={sys}|chassis={chassis}|port={port}[|notes={notes}]"` with `"?"` 
  when None; `|notes=...` tail omitted when evidence_notes is None
- ~10 new unit tests covering self-link reject, unknown-local reject, unknown-remote reject, 
  evidence string format, deterministic ordering

**TypeScript (src/types/topology.ts):**

- Add `TopologyNeighborEvidence` interface: all evidence fields matching Rust
- Add `NeighborEvidenceMappingStats` interface: all stats fields
- No changes to `TopologyLinkFact` or `TopologyEdge` (V1AM contract unchanged)

**Frontend (src/modes/topology/TopologyMode.tsx):**

- No UI change (live still passes zero evidence; UI still shows "0 reliable links" and NoneAvailable)
- No test fixture changes (V1AM contracts already in place)

**Tests:**

- `src-tauri/src/engines/topology.rs` — ~10 new Rust unit tests
- No TS test changes (mapper is Rust-side; TS receives `TopologyLinkFact` from engine)

---

## Scope out

- **No hostname matching / hint resolution.** Caller must supply a real `remote_node_id`. 
  No `remote_node_hint` or fuzzy lookup in V1AN.
- **No vendor parser changes.** Parser code, extraction logic, and vendor-specific rules 
  unchanged. Parsers are untouched.
- **No parser-lab changes.** `_adjacency/`, `_edge_integration/` stay prep-only. Codex 
  fixtures and notes untouched.
- **No new Tauri command.** Existing `get_topology_view` still passes zero evidence.
- **No DeviceModel mutation.** Record schema unchanged.
- **No expected.json / parser version changes.** Golden files and parser versions locked.
- **No Validator / rule pack changes.** Rule packs untouched.
- **No UI changes.** TopologyMode.tsx untouched. Live still shows "0 reliable links" and 
  NoneAvailable readiness.
- **No live polling / SSH / SNMP.** Pure evidence intake; no device communication.
- **NeighborEvidenceMappingStats not surfaced in TopologyView.** Internal/test only. 
  TopologyView.adjacency_readiness remains unchanged from V1AL.

---

## Design decisions

**1. TopologyNeighborEvidence is the canonical evidence struct.**

Engine-owned, carrier of all raw neighbour evidence metadata (chassis ID, system name, 
port ID, etc.). Preserves raw fields verbatim. Future parser stages produce 
`Vec<TopologyNeighborEvidence>` and call `project_with_neighbor_evidence()`. Single 
contract, clean boundary between evidence intake and fact projection.

**2. Mapper is deterministic and stateless.**

`map_neighbor_evidence_to_link_facts(nodes, evidence)` takes frozen lists and returns 
facts + stats. No I/O, no clock, no randomness. Same evidence input → same fact output, 
same order. Mapper does NOT dedup; V1AM's `project_edges_from_link_facts` owns dedup 
downstream.

**3. Evidence string format is terse and snake-case.**

`"{kind}:remote_sys={sys}|chassis={chassis}|port={port}[|notes={notes}]"` preserves all 
raw LLDP/CDP fields in a single string, sortable and readable. `"?"` marks missing fields. 
`|notes=...` tail omitted when empty. Future stages can parse or filter on this string.

**4. Rejection rules are strict and engine-owned.**

Self-link (local==remote), unknown-local, unknown-remote evidence is rejected, not invented. 
No hints, no guessing. Stats track all rejections. Operator sees what was accepted / rejected.

**5. TopologyNeighborEvidence preserves raw fields.**

`remote_chassis_id`, `remote_system_name`, `remote_port_id` are copied verbatim from 
parser output. No normalisation, no cross-vendor inference. Future evidence-display stages 
can render raw values unchanged.

**6. Mapper output is ordered deterministically.**

Facts produced in input evidence order, no sort. Same evidence list → same fact list, 
same order. Tests can assert ordering.

**7. Live command path (get_topology_view) passes zero evidence.**

No evidence source is connected yet. The socket exists; future vendor parser stages plug 
in. Engine doesn't fake facts; live UI stays honest.

---

## Pipe contract

```
Parser-derived / manual / imported TopologyNeighborEvidence []
  ↓
Topology Engine: map_neighbor_evidence_to_link_facts(nodes, evidence)
  ├── Self-link reject (local_node_id == remote_node_id)
  ├── Unknown-local reject (local_node_id not in node set)
  ├── Unknown-remote reject (remote_node_id not in node set)
  ├── Otherwise → emit TopologyLinkFact with evidence string
  │   "{kind}:remote_sys={sys}|chassis={chassis}|port={port}[|notes={notes}]"
  ├── NeighborEvidenceMappingStats tracks all counts
  └── Return (facts, stats)
  ↓
Topology Engine: project_with_neighbor_evidence(env, records, evidence)
  ├── Call mapper to get (facts, stats)
  ├── Call project_with_facts(env, records, facts)
  └── Return TopologyView
  ↓
TopologyLinkFact [] fed to V1AM's project_edges_from_link_facts
  ├── Further dedup (V1AM owns this)
  ├── Edge projection (V1AM owns this)
  └── Return (edges, ProjectionStats) — V1AM's contract
  ↓
Live command path (unchanged):
  ├── get_topology_view(env_id) calls project(env_id, records)
  ├── project() calls project_with_facts(env_id, records, &[]) — zero evidence
  ├── Mapper sees empty evidence → zero facts returned
  ├── V1AM produces zero edges
  ├── TopologyView.edges: 0, state: NoneAvailable, "0 reliable links"
```

**Future vendor parser ingestion (V1AO+):**

```
Vendor parser extracts LLDP/CDP/config-neighbour neighbours
  ↓
Produces Vec<TopologyNeighborEvidence>
  ├── source_kind: Lldp | Cdp | ConfigNeighbor
  ├── local_node_id: device_record_id (from Discovery)
  ├── remote_node_id: resolved upstream (no hint matching in V1AN)
  ├── raw fields preserved: chassis_id, system_name, port_id
  └── source_label: "parser:cisco-iosxe lldp neighbors"
  ↓
Call TopologyEngine::project_with_neighbor_evidence(env_id, records, evidence)
  ├── No engine changes in vendor parser stage
  ├── Mapper handles intake; V1AM handles projection
  └── Return TopologyView with real edges
  ↓
TopologyMode re-renders
  └── Readiness section updates per-source counts; edge count increments
```

---

## Mapper contract

**Input:** `TopologyNeighborEvidence` struct

- `source_kind: TopologyAdjacencyFactSourceKind` — lldp | cdp | config_neighbor | manual
- `local_node_id: String` — device_record_id, required
- `local_interface: Option<String>` — optional interface name
- `remote_node_id: String` — REQUIRED; caller resolves hostname→id upstream
- `remote_interface: Option<String>` — optional interface name
- `remote_chassis_id: Option<String>` — raw LLDP/CDP field, preserved as-is
- `remote_system_name: Option<String>` — raw, preserved as-is
- `remote_port_id: Option<String>` — raw, preserved as-is
- `source_label: Option<String>` — e.g. `"parser:cisco-iosxe lldp neighbors"`, propagates to fact
- `evidence_notes: Option<String>` — free-form additional context

**Output:** `TopologyLinkFact` struct

- `source_kind` — copied verbatim
- `local_node_id` — copied from evidence (already validated as present in nodes)
- `remote_node_id` — copied from evidence (already validated as present in nodes)
- `local_interface` — copied from evidence, optional
- `remote_interface` — copied from evidence, optional
- `evidence` — constructed string: `"{kind}:remote_sys={sys}|chassis={chassis}|port={port}[|notes={notes}]"`
- `source_label` — copied from evidence, optional

**Evidence string format examples:**

- `"lldp:remote_sys=core-01|chassis=00:11:22:33:44:55|port=Eth1/1"`
- `"lldp:remote_sys=core-01|chassis=?|port=Eth1/1"` (no chassis ID)
- `"cdp:remote_sys=edge-02|chassis=?|port=?|notes=manual correction"` (raw fields missing, notes present)
- `"manual:remote_sys=?|chassis=?|port=?"` (all raw fields missing)

**Acceptance rules:**

1. `local_node_id == remote_node_id` → rejected as self-link; `rejected_self_link` increments
2. `local_node_id` not in node set → rejected as unknown_local; `rejected_unknown_local` increments
3. `remote_node_id` not in node set → rejected as unknown_remote; `rejected_unknown_remote` increments
4. Otherwise → accepted; emit `TopologyLinkFact` with evidence string; `accepted` increments

**Determinism:**

- Input order preserved in output fact order
- No sorting, no dedup at mapper level (V1AM owns dedup)
- Same evidence list → same fact list, identical bytes

**NeighborEvidenceMappingStats:**

- `evidence_total: u32` — input evidence count
- `accepted: u32` — facts emitted
- `rejected_unknown_local: u32` — local_node_id not in node set
- `rejected_unknown_remote: u32` — remote_node_id not in node set
- `rejected_self_link: u32` — local_node_id == remote_node_id

---

## Files changed and their purpose

| File | Change | Purpose |
|------|--------|---------|
| `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` | Add V1AN section | Evidence model, mapper rules, live command path, future hook |
| `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` | Add V1AN block to Topology | Types, mapper function, engine overload, no command/parser changes |
| `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` | Add V1AN bullet + update "Next" | Evidence intake socket live; vendor parser extraction is next |
| `obsidian/ANTHRACITE_INDEX.md` | Add V1AN row to stage map | Index stage in project memory |
| `src-tauri/src/engines/topology.rs` | Add `TopologyNeighborEvidence`, `NeighborEvidenceMappingStats`, mapper, overload, tests | Evidence intake pipeline |
| `src/types/topology.ts` | Add `TopologyNeighborEvidence`, `NeighborEvidenceMappingStats` interfaces | TypeScript wire shape mirror |

---

## Validation checklist

### Evidence Model & Mapper

- [ ] `TopologyNeighborEvidence` struct defined; carries all raw evidence metadata
- [ ] `NeighborEvidenceMappingStats` struct defined; tracks acceptance/rejection counts
- [ ] `map_neighbor_evidence_to_link_facts(nodes, evidence) -> (facts, stats)` pure helper
- [ ] Mapper rejection rules: self-link, unknown-local, unknown-remote (engine-owned)
- [ ] Evidence string format: `"{kind}:remote_sys={sys}|chassis={chassis}|port={port}[|notes={notes}]"`
- [ ] `"?"` fills missing fields; `|notes=...` omitted when None
- [ ] Mapper output deterministic: input order → output order, no sort
- [ ] Same evidence list → same fact list, identical bytes

### Engine Overload

- [ ] `TopologyEngine::project_with_neighbor_evidence(env, records, evidence)` internal overload
- [ ] Pipes evidence through mapper to `project_with_facts`
- [ ] Returns `TopologyView` (same contract as `project()`)
- [ ] No change to `project()` public method

### Determinism

- [ ] Mapper is pure: no I/O, no clock, no randomness
- [ ] Facts produced in evidence input order
- [ ] No mapper-level dedup (V1AM owns dedup downstream)
- [ ] Same inputs → same bytes

### Acceptance / Rejection Accounting

- [ ] `evidence_total`: input evidence count
- [ ] `accepted`: facts emitted
- [ ] `rejected_unknown_local`: local_node_id not in node set
- [ ] `rejected_unknown_remote`: remote_node_id not in node set
- [ ] `rejected_self_link`: local_node_id == remote_node_id
- [ ] All counts sum to `evidence_total`

### Live Command Path (Zero-Evidence)

- [ ] `get_topology_view` calls `project(env_id, records)` (unchanged)
- [ ] `project()` calls `project_with_facts(env_id, records, &[])` (unchanged)
- [ ] Live evidence: zero; live facts: zero; live edges: zero
- [ ] Live readiness state: NoneAvailable (unchanged from V1AL)
- [ ] UI shows "0 reliable links" (unchanged)

### Type Safety

- [ ] Rust: `TopologyNeighborEvidence`, `NeighborEvidenceMappingStats` structs
- [ ] TS: `TopologyNeighborEvidence`, `NeighborEvidenceMappingStats` interfaces
- [ ] TS mirrors Rust exactly (no impedance mismatch)
- [ ] No changes to `TopologyLinkFact`, `TopologyEdge` (V1AM contracts locked)

### Tests & Builds

- [ ] `cargo check` green
- [ ] `cargo test` covers self-link reject, unknown-local reject, unknown-remote reject, 
  evidence string format, deterministic ordering (~10 new tests)
- [ ] `pnpm typecheck` green
- [ ] `pnpm test` (no TS test changes; mapper is Rust-side)
- [ ] `pnpm build` green
- [ ] `tools/ops-readiness.ps1` reports READY

### Scope Out Confirmed

- [ ] No hostname matching / hint resolution
- [ ] No vendor parser changes
- [ ] No parser-lab changes (`_adjacency/`, `_edge_integration/` prep-only)
- [ ] No new Tauri command; existing `get_topology_view` unchanged
- [ ] No DeviceModel mutation
- [ ] No expected.json / parser version changes
- [ ] No Validator / rule pack changes
- [ ] No UI changes; TopologyMode.tsx untouched
- [ ] No live polling / SSH / SNMP
- [ ] `NeighborEvidenceMappingStats` not surfaced in `TopologyView` — internal/test only
- [ ] No AGENTS.md / CLAUDE.md / parser-lab / `.codex/` touches

---

## Strategic checkpoint

After V1AN, the explicit neighbour evidence intake infrastructure is **live in the engine**. 
`TopologyNeighborEvidence`, the mapper, rejection rules, and evidence string format are 
all locked. Live command path remains zero-evidence — engine is ready to receive real 
evidence from future vendor parser stages.

**Next in Stage Group 2:**

- **Vendor Parser LLDP/CDP/Config-Neighbour Extraction.** Vendor parsers produce 
  `Vec<TopologyNeighborEvidence>` from their own extraction logic. Call 
  `TopologyEngine::project_with_neighbor_evidence(env, records, evidence)`. Flip `present: true` 
  on relevant sources; state auto-transitions; edge count increments. No topology projection 
  changes needed.
- **Edge Rendering.** Babylon.js integration for interactive 2D/3D topology visualization.

---

## Key learnings for next stage

- **Evidence struct is the evidence contract.** `TopologyNeighborEvidence` is the single 
  interface all evidence sources (parser, manual, import) speak. Vendor parsers produce it 
  cleanly from their extractors.
- **Mapper is separate from projector.** V1AN maps evidence → facts; V1AM projects facts 
  → edges. Clean separation of concerns. Future vendor stages only need to produce evidence; 
  no engine changes needed.
- **Raw field preservation is key.** Chassis ID, system name, port ID are preserved 
  verbatim in evidence strings. Future display / debug stages can render raw LLDP/CDP 
  output unchanged.
- **Rejection rules are strict.** No hint matching, no hostname guessing. If a remote node 
  is unknown, the evidence is rejected. Operator sees exactly what was accepted / rejected.
- **Evidence string format is readable.** `"{kind}:remote_sys=|chassis=|port=[|notes=]"` 
  is sortable, parseable, and human-readable. Future filtering and display is straightforward.

---

## Suggested commit message

```
stage-v1an: parser-derived neighbour evidence intake — explicit evidence ingestion socket

Arc: TOPOLOGY-EDGES
- New: TopologyNeighborEvidence struct (source_kind, local/remote node/interface, raw fields, notes)
- New: NeighborEvidenceMappingStats struct (evidence_total, accepted, rejection counts)
- New: map_neighbor_evidence_to_link_facts(nodes, evidence) -> (facts, stats) helper
- Mapper: deterministic intake layer; turns evidence into TopologyLinkFact records
- Engine: TopologyEngine::project_with_neighbor_evidence(env, records, evidence) overload
- Mapper flow: evidence → validate (reject self-link, unknown-local, unknown-remote) → fact
- Evidence string: "{kind}:remote_sys={sys}|chassis={chassis}|port={port}[|notes={notes}]"
- Raw fields: chassis_id, system_name, port_id preserved verbatim from LLDP/CDP
- Determinism: input order → output order, no sort, no mapper-level dedup (V1AM owns dedup)
- Acceptance rules: strict engine-owned validation; no hints, no guessing
- Live command path: still passes zero evidence; edges: 0, state: NoneAvailable, "0 reliable links"
- Socket ready: future vendor parser stages produce TopologyNeighborEvidence; call project_with_neighbor_evidence()
- Types: TS mirrors Rust exactly (no impedance mismatch)
- Tests: ~10 Rust tests (self-link reject, unknown-local reject, unknown-remote reject, format, ordering)
- Docs: TOPOLOGY_ENGINE_BOUNDARY.md V1AN section, ENGINE_AND_API_BOUNDARIES.md block, roadmap updated
- Scope-out: no parser changes, no DeviceModel mutation, no new Tauri command, no hint matching
- Future hook: vendor parser extraction stages produce evidence; no engine change needed in those stages
```
