# V1AL — Topology Adjacency Readiness

**Arc:** TOPOLOGY-ADJACENCY
**Date:** 2026-05-18
**Status:** complete

---

## Objective

Prepare Topology for real edges without inventing fake links. Introduce a deterministic 
adjacency-readiness contract that answers the operator question: **Why are there no edges, 
and what future link-fact sources will populate them?**

V1AL ships all 4 fact-source categories (LLDP, CDP, config-neighbor, manual) with 
`present: false, count: 0`. State machine (NoneAvailable → Partial → Ready) auto-transitions 
when future fact-ingestion stages flip `present: true`. TopologyMode surface honestly 
displays readiness; "0 reliable links" preserved.

---

## Scope in

**New files:**

- `obsidian/stages/V1AL-topology-adjacency-readiness.md` — this note

**Edited files:**

- `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` — Add V1AL section covering 4 new types, 
  engine behaviour, TS mirror, TopologyMode UI section, determinism contract, state semantics, 
  future hook, operator visibility, scope-out, cross-links
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — Add V1AL addition block to Topology 
  Engine section (no new command, adjacency_readiness field, state machine auto-transition, 
  ready_node_count semantics, no parser/DeviceModel/ModeRail changes, cross-link)
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` — V1AL bullet in "What is alive now" 
  section; Stage Group 2 status updated (adjacency readiness declared, fact ingestion + 
  edge rendering next)
- `obsidian/ANTHRACITE_INDEX.md` — V1AL row added to stage map

**Rust (src-tauri/src/engines/topology.rs):**

- Add `TopologyAdjacencyFactSourceState` enum (NoneAvailable, Partial, Ready)
- Add `TopologyAdjacencyFactSourceKind` enum (Lldp, Cdp, ConfigNeighbor, Manual)
- Add `TopologyAdjacencyFactSource` struct (kind, present, count, note)
- Add `TopologyAdjacencyReadiness` struct (eligible_node_count, fact_source_state, 
  fact_sources, accepted_kinds, reason)
- Extend `TopologyView` with `adjacency_readiness: TopologyAdjacencyReadiness` field
- Add `compute_adjacency_readiness(node_count: usize) -> TopologyAdjacencyReadiness` 
  pure helper function
- Call helper in `project()` method; populate TopologyView.adjacency_readiness
- ~10 new unit tests covering state machine transitions (all-absent, mixed, all-present)

**TypeScript (src/types/topology.ts):**

- Add `TopologyAdjacencyFactSourceState` enum (none_available, partial, ready)
- Add `TopologyAdjacencyFactSourceKind` enum (lldp, cdp, config_neighbor, manual)
- Add `TopologyAdjacencyFactSource` interface (kind, present, count, note)
- Add `TopologyAdjacencyReadiness` interface (eligible_node_count, fact_source_state, 
  fact_sources, accepted_kinds, reason)
- Extend `TopologyView` interface with `adjacency_readiness: TopologyAdjacencyReadiness` field

**Frontend (src/modes/topology/TopologyMode.tsx):**

- Add new "Adjacency readiness" section rendering per-source rows
- Each row: [source kind label] · present/absent · count or em-dash · note
- Reason string displayed
- Eligible node count displayed
- Existing "0 reliable links" line preserved below

**Tests:**

- `src-tauri/src/engines/topology.rs` — ~10 new Rust unit tests
- `src/modes/topology/__tests__/TopologyMode.test.ts` — ~15 new TS tests covering:
  - Readiness section renders with all 4 sources absent (V1AL baseline)
  - State NoneAvailable renders "No adjacency fact sources available yet"
  - Eligible node count matches nodes.length
  - All kinds listed in accepted_kinds
  - Reason string stable per state
  - Detail pane renders full readiness struct
  - Existing "0 reliable links" summary preserved
  - Cascade fix: TopologyMode test fixtures updated to include adjacency_readiness

---

## Scope out

- **No edge inference.** Edges remain 0; no fake adjacency guessing.
- **No parser changes.** Parser engines untouched; no fact extraction logic.
- **No Discovery/Inventory changes.** Discovery Engine, Inventory Browser untouched.
- **No DeviceModel schema changes.** Record structure unchanged.
- **No new Tauri command.** Existing `get_topology_view` passes readiness field.
- **No graph viz library.** No Three.js, D3, Cytoscape, Babylon integration.
- **No live polling/SSH/SNMP.** Pure read-model projection.
- **No DataSourceState extension.** Union remains unchanged; no new variants.
- **No ModeRail / MODE_STATUS changes.** Topology mode status unchanged.
- **No AGENTS.md / CLAUDE.md / parser-lab / `.codex/` touches.** Docs, ops, and prep untouched.

---

## Design decisions

**1. Adjacency readiness is engine-side, not frontend shadow state.**

Single source of truth in Rust engine. Survives future fact-source plumbing without 
TopologyMode rewrites. Deterministic: same Discovery snapshot → same readiness bytes.

**2. Generic state derivation: all-absent → NoneAvailable; mixed → Partial; all-present → Ready.**

No hardcoded state per fact source. Future stages flip `present: true` on sources; state 
auto-transitions without TopologyView schema change. Scaling path is clean.

**3. All 4 fact sources ship V1AL with present: false, count: 0.**

Operator sees the closed contract at day one: "Topology knows these four categories." 
Honest about what's not built yet. No fake sources, no placeholder counts.

**4. eligible_node_count = nodes.len() in V1AL; future-stage tightening flagged.**

Every projected node can receive edges today. Future role/layer inference may constrain 
eligibility (e.g., firewalls don't have OSPF neighbors). Contract supports narrowing.

**5. accepted_kinds always lists all four — the closed, operator-visible contract.**

Operator reads: "Topology will accept link facts from LLDP, CDP, config-neighbor, manual 
sources when they arrive." Future stages don't add to this list; they flip `present: true` 
on existing sources.

**6. Reason strings are stable per state.**

V1AL: `"No adjacency fact sources available yet"`. Future Partial: 
`"Some adjacency fact sources online"`. Future Ready: `"All adjacency fact sources online"`. 
No clock, no generated messages, no filler.

**7. TopologyMode reads adjacency_readiness via existing topologySource.ts adapter.**

No new adapter scalar churn. App passes `topology` state; TopologyMode reads 
`topology.view?.adjacency_readiness` directly. Same pattern as V1AJ.

---

## Pipe contract

```
persisted Discovery inventory (from V1AI)
  ↓
Topology Engine: project(environment_id, records) → TopologyView
  ├── ... existing fields (source_state, summary, nodes, edges, layers)
  └── adjacency_readiness: TopologyAdjacencyReadiness  [NEW]
      ├── eligible_node_count: usize
      ├── fact_source_state: NoneAvailable | Partial | Ready
      ├── fact_sources: [
      │     { kind: Lldp,           present: false, count: 0, note: "Not available yet" }
      │     { kind: Cdp,            present: false, count: 0, note: "Not available yet" }
      │     { kind: ConfigNeighbor, present: false, count: 0, note: "Not available yet" }
      │     { kind: Manual,         present: false, count: 0, note: "Not available yet" }
      │   ]
      ├── accepted_kinds: [Lldp, Cdp, ConfigNeighbor, Manual]
      └── reason: "No adjacency fact sources available yet"
  ↓
TS API: getTopologyView(environmentId?) → TopologySourceView
  └── already preserves raw view; no adapter change needed
  ↓
TopologyMode.tsx renders
  ├── "Adjacency readiness" section
  │   ├── Per-source row: [kind] · [present/absent] · [count/em-dash] · [note]
  │   ├── Reason: [reason string]
  │   └── Eligible nodes: [count]
  └── Existing "0 reliable links" summary preserved
```

---

## Files changed and their purpose

| File | Change | Purpose |
|------|--------|---------|
| `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` | Add V1AL section | Types, engine behaviour, state semantics, future hook, operator visibility |
| `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` | Add V1AL block to Topology | No command change; readiness field; auto-transition semantics |
| `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` | Add V1AL to "What is alive"; update Stage Group 2 status | Adjacency readiness declared; fact ingestion next |
| `obsidian/ANTHRACITE_INDEX.md` | Add V1AL row to stage map | Index stage in project memory |
| `src-tauri/src/engines/topology.rs` | Add 4 types, helper, readiness field, tests | Adjacency readiness projection + determinism |
| `src/types/topology.ts` | Add 4 types, extend TopologyView | TypeScript wire shape mirror |
| `src/modes/topology/TopologyMode.tsx` | Add "Adjacency readiness" section | UI display of readiness state, per-source rows |
| `src/modes/topology/__tests__/TopologyMode.test.ts` | Add ~15 new tests + cascade fixtures | All states, all sources, reason string, eligible count |

---

## Validation checklist

### Honesty & State Management

- [x] V1AL baseline: all 4 sources present: false, count: 0
- [x] State NoneAvailable: all sources absent
- [x] Reason string stable: "No adjacency fact sources available yet"
- [x] Eligible node count: nodes.len()
- [x] accepted_kinds: all 4 sources listed
- [x] "0 reliable links" summary preserved
- [x] No fake edges, no edge inference
- [x] No fake fact sources, no placeholder counts

### Engine & Determinism

- [x] compute_adjacency_readiness pure function (no I/O, no clock)
- [x] Same Discovery snapshot → same readiness bytes
- [x] Readiness field populated in project() method
- [x] No parser/Discovery/DeviceModel changes needed

### Frontend Integration

- [x] TopologyMode reads adjacency_readiness via existing adapter
- [x] "Adjacency readiness" section renders all 4 sources
- [x] Per-source row: kind · present/absent · count/em-dash · note
- [x] Reason string displayed
- [x] Eligible node count displayed
- [x] Existing summary ("0 reliable links") preserved

### Future Scaling

- [x] State machine auto-transitions on present: true flip
- [x] Future stages add no new sources; they flip existing ones
- [x] eligible_node_count supports future role/layer tightening
- [x] No schema migration needed when fact sources land

### Type Safety

- [x] Rust enums: TopologyAdjacencyFactSourceState, TopologyAdjacencyFactSourceKind
- [x] Rust structs: TopologyAdjacencyFactSource, TopologyAdjacencyReadiness
- [x] TS enums and interfaces mirror Rust exactly
- [x] TopologyView extended in both Rust and TS

### Tests & Builds

- [x] cargo check green
- [x] cargo test covers state transitions, helpers (~10 new tests)
- [x] pnpm typecheck green
- [x] pnpm test covers readiness section, all states (~15 new tests + cascades)
- [x] pnpm build green
- [x] tools/ops-readiness.ps1 reports READY
- [x] Existing TopologyMode tests updated with adjacency_readiness fixtures

### Scope Out Confirmed

- [x] No edge inference, no fake adjacency
- [x] No parser, validator, Discovery, Inventory changes
- [x] No DeviceModel schema changes
- [x] No new Tauri command
- [x] No graph viz library, Babylon
- [x] No live polling, SSH, SNMP
- [x] No DataSourceState changes
- [x] No ModeRail / MODE_STATUS changes
- [x] No AGENTS.md / CLAUDE.md / parser-lab / `.codex/` touches

### Halt conditions

- [x] H1: Four fact-source types defined (Lldp, Cdp, ConfigNeighbor, Manual)
- [x] H2: TopologyAdjacencyFactSourceState enum (NoneAvailable, Partial, Ready)
- [x] H3: TopologyAdjacencyReadiness struct with eligible_node_count, fact_source_state, fact_sources, accepted_kinds, reason
- [x] H4: All 4 fact sources ship V1AL with present: false, count: 0
- [x] H5: State derivation: all-absent → NoneAvailable; mixed → Partial; all-present → Ready
- [x] H6: eligible_node_count = nodes.len() in V1AL
- [x] H7: accepted_kinds always lists all four sources
- [x] H8: Reason strings stable per state
- [x] H9: TopologyView extended with adjacency_readiness field
- [x] H10: compute_adjacency_readiness pure helper in Rust engine
- [x] H11: project() populates TopologyView.adjacency_readiness
- [x] H12: TS types mirror Rust exactly
- [x] H13: TopologyMode renders "Adjacency readiness" section with per-source rows
- [x] H14: Per-source row: kind · present/absent · count/em-dash · note
- [x] H15: Reason string displayed
- [x] H16: Eligible node count displayed
- [x] H17: Existing "0 reliable links" line preserved
- [x] H18: No new Tauri command; existing get_topology_view passes readiness
- [x] H19: No parser/Discovery/DeviceModel/DataSourceState changes
- [x] H20: No ModeRail / MODE_STATUS changes
- [x] H21: Docs complete (TOPOLOGY_ENGINE_BOUNDARY.md V1AL section, ENGINE_AND_API_BOUNDARIES.md block, roadmap bullets, stage note)
- [x] H22: Rust tests cover state machine, helpers (~10 new tests)
- [x] H23: TS tests cover readiness section, all states (~15 new tests + cascade fixtures)
- [x] H24: Ops-readiness checks pass

---

## Strategic checkpoint

After V1AL, the adjacency-readiness contract is **live and transparent**. Operator sees 
four fact-source categories declared with `present: false`. Honest "0 reliable links" 
co-exists with the readiness section. State machine is ready to auto-transition when future 
stages flip sources online.

**Next in Stage Group 2:**

- **Edge Inference.** Implement parser-side fact-ingestion paths (LLDP/CDP neighbors likely first). 
  Flip `present: true` on relevant sources; Topology state auto-transitions; edge count increments.
- **Edge Rendering.** Babylon.js integration for interactive 2D/3D topology visualization.

---

## Key learnings for next stage

- **Engine-side state machines are deterministic.** No frontend shadow state, no clock, 
  no generated messages. Auto-transition on data flip is clean and scales.
- **Honest "what's coming" is better than fake progress.** Declaring all 4 sources 
  absent builds operator confidence. Operator knows what to expect when facts arrive.
- **Adjacency readiness is the bridge.** It connects "0 edges" (today's honest state) 
  to "N edges" (future, once facts land) without schema migration.
- **State machine support for future tightening.** `eligible_node_count` starts at 
  nodes.len(); future role/layer inference can narrow it. Contract is extensible.

---

## Suggested commit message

```
stage-v1al: topology adjacency readiness — deterministic contract for future link facts

Arc: TOPOLOGY-ADJACENCY
- New: TopologyAdjacencyFactSourceState enum (NoneAvailable | Partial | Ready)
- New: TopologyAdjacencyFactSourceKind enum (Lldp | Cdp | ConfigNeighbor | Manual)
- New: TopologyAdjacencyFactSource and TopologyAdjacencyReadiness structs
- Engine: compute_adjacency_readiness pure helper + TopologyView extension
- State: all-absent → NoneAvailable; mixed → Partial; all-present → Ready (auto-transitions)
- V1AL baseline: all 4 fact sources ship with present: false, count: 0
- eligible_node_count: nodes.len() in V1AL; supports future role/layer tightening
- accepted_kinds: all four sources listed; closed contract visible to operator
- Reason strings: stable per state, no clock or filler
- Frontend: TopologyMode adds "Adjacency readiness" section with per-source rows
- UI: kind · present/absent · count/em-dash · note; reason; eligible count
- Honesty: "0 reliable links" preserved; no fake edges, no fake sources
- Types: TS mirrors Rust exactly (no impedance mismatch)
- Tests: ~10 Rust tests (state transitions, helpers) + ~15 TS tests (all states, section rendering)
- Docs: TOPOLOGY_ENGINE_BOUNDARY.md V1AL section, ENGINE_AND_API_BOUNDARIES.md block, roadmap updated
- Scope-out: no parser changes, no edge inference, no DeviceModel/DataSourceState/ModeRail touches
- Future hook: when fact-ingestion stages land, flip present: true; state auto-transitions
```
