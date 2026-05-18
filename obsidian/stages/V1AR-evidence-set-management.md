# V1AR — Evidence Set Management + Merge Semantics

**Arc:** TOPOLOGY-EDGES
**Date:** 2026-05-18
**Status:** landed

---

## Objective

Land explicit import modes and deterministic merge semantics for the topology evidence store.
Operators build evidence gradually: paste LLDP from one device, append CDP from another,
merge duplicates with safe dedup. No-mutation safety guard prevents accidental wipes;
only explicit `clear_topology_neighbor_evidence` clears stored evidence. Evidence summary
exposes active counts, dedup'd source labels, per-kind breakdowns. Same V1AM/V1AN/V1AO/V1AP/V1AQ
pipeline unchanged downstream; V1AR sits between import and store as a managed evidence
layer ready for future live SSH and automated parser extraction.

---

## Scope in

**New types in `src-tauri/src/engines/topology_evidence_store.rs`:**

- `TopologyEvidenceImportMode` enum: `Replace`, `Append`, `Merge`.
- `TopologyEvidenceMutationResult` struct carrying `mode`, `previous_count`, `incoming_count`,
  `added_count`, `replaced_count`, `ignored_duplicate_count`, `final_count`, `evidence_set_id`,
  `source_labels` (Vec<String>), `store_mutated` (bool).
- `TopologyEvidenceSummary` struct carrying `environment_id`, `evidence_count`, `source_labels`,
  `source_kind_counts` (Vec of (TopologyAdjacencyFactSourceKind, u32)), `evidence_set_id`.

**New helpers in `src-tauri/src/engines/topology_evidence_store.rs`:**

- `replace_topology_evidence(existing: Vec, incoming: Vec) -> (Vec, MergeStats)` — discard existing, incoming becomes final.
- `append_topology_evidence(existing: Vec, incoming: Vec) -> (Vec, MergeStats)` — concatenate in order, no dedup at evidence layer.
- `merge_topology_evidence(existing: Vec, incoming: Vec) -> (Vec, MergeStats)` — iterate incoming in order; matching 5-tuple → merge in-place; non-matching → append.
- `summarize_topology_evidence(env_id: String, evidence: Vec, evidence_set_id: Option<String>) -> TopologyEvidenceSummary`.
- `apply_evidence_import(store: &dyn TopologyEvidenceStore, env_id: String, incoming: Vec, mode: TopologyEvidenceImportMode, source_label: Option<String>) -> Result<TopologyEvidenceMutationResult, TopologyEvidenceStoreError>`.

**Updated Tauri commands:**

- `import_topology_neighbor_evidence(env, evidence, source_label, mode: Option<TopologyEvidenceImportMode>) -> Result<TopologyEvidenceMutationResult, String>` — return type CHANGED from `TopologyEvidenceSet`.
- `clear_topology_neighbor_evidence(env) -> Result<TopologyEvidenceMutationResult, String>` — return type CHANGED from `()`.
- `import_topology_neighbor_output(request)` — `RawNeighborEvidenceImportRequest` gains `mode: Option<TopologyEvidenceImportMode>`; result shape unchanged.
- NEW `get_topology_evidence_summary(env) -> TopologyEvidenceSummary`.
- `get_topology_neighbor_evidence` UNCHANGED.

**UI surface (TopologyMode):**

- **Mode radio** (Replace / Append / Merge) above import-panel tabs. Default Replace. Mode shared by JSON and Raw forms.
- **Evidence Summary panel** showing active count, dedup'd source labels, per-kind counts, last mutation delta.
- **Clear button** with confirmation checkbox (must be checked to enable button).
- **Auto-refresh** of summary after import/clear.
- **Honest wording:** "Replace current evidence", "Append to current evidence", "Merge and deduplicate", "Active evidence", "Source labels", "Source kinds", "Last import", "Clear evidence for this environment" (confirmation: "I understand this will remove all evidence for this environment.").
- **NEVER:** "Auto-merge", "Smart dedup", "Polling", "Live discovery".
- All V1AO/V1AP/V1AQ testids preserved.

---

## Scope out

- **No new evidence store.** V1AO `JsonFileTopologyEvidenceStore` unchanged.
- **No second persistence layer, no history database, no audit log.**
- **No timestamps, no `imported_at`, no clock.** Deterministic only.
- **No vendor parser engine changes.** `parser-lab/` unchanged.
- **No `expected.json` changes, no parser version bumps.**
- **No DeviceModel mutation, no Discovery semantic change.**
- **No live polling / SSH / SNMP / scanning.**
- **No graph visualisation library.**
- **No fuzzy matching.** V1AP `resolve_node_id` UNCHANGED.
- **No V1AM / V1AN / V1AQ logic change.**
- **`TopologyEvidenceSet` (V1AO persisted shape) fields UNCHANGED.**
- **No AGENTS.md / CLAUDE.md / validator / rule pack / parser-lab / `.codex/` touches.**

---

## Design decisions

**1. Deterministic dedup on 5-tuple, exact equality only.**

Merge is deterministic: same evidence in same order → byte-identical result. No fuzzy, no
heuristic matching. Dedup key captures the core adjacency fact:
`(source_kind, local_node_id, local_interface, remote_node_id, remote_interface)`.
Includes `Option::None == Option::None` for interface fields.

**2. No-mutation safety guard prevents wipe-by-accident.**

Empty incoming is rejected across all modes (Replace, Append, Merge). Accidental clipboard
clear or failed paste cannot trigger a silent store wipe. Only explicit
`clear_topology_neighbor_evidence` wipes the store.

**3. Merge field policy preserves evidence, joins with separators.**

- `source_label`: both Some + different → `"{a}; {b}"` lex-sorted. Identical → keep one. One Some, one None → Some. Both None → None.
- `evidence_notes`: same policy with `" | "` separator.
- `remote_chassis_id`, `remote_system_name`, `remote_port_id`: prefer existing if Some, else incoming if Some, else None.

**4. Default mode is Replace for backwards compat.**

V1AO / V1AP / V1AQ callers and tests that pass `mode: None` default to Replace, matching
prior one-import-clears-all semantics. Explicit mode choice is optional; legacy code
works unchanged.

**5. Summary readback exposes deterministic counts, no set-id reflection.**

`get_topology_evidence_summary(env)` returns counts, dedup'd labels (lex-sorted), per-kind
counts (always 4 kinds in stable order: Lldp, Cdp, ConfigNeighbor, Manual, even when 0),
and `evidence_set_id: None` (no set-id readback path through summary; mutation result
carries id when written).

---

## Import modes (semantics)

- **Replace:** Discard existing evidence; incoming becomes the final evidence set. Preserves
  V1AO behaviour when no mode passed (default). Suitable for replacing entire evidence batch
  from a fresh discovery run.
- **Append:** `existing + incoming` concatenated in order. No dedup at evidence layer.
  V1AM downstream still dedups at edge layer, so visible edges stay stable; evidence list
  grows. Suitable for accumulating evidence from multiple sources without losing old records.
- **Merge:** Iterate incoming in order; for each incoming entry, try to match its 5-tuple
  against existing entries. If match found, merge fields in-place at existing position. If
  no match, append to end after all existing. Same evidence in same order always produces
  same result (deterministic).

---

## Merge dedup key and field policy

**5-tuple exact equality:**

```
(source_kind, local_node_id, local_interface, remote_node_id, remote_interface)
```

- `source_kind`: enum comparison (Lldp, Cdp, ConfigNeighbor, Manual).
- `local_node_id`, `remote_node_id`: String exact match.
- `local_interface`, `remote_interface`: Option<String> exact match (including None == None).

**Field merge policy (when 5-tuple match found):**

- `source_label`: join non-identical Some values with `"; "` separator, lex-sort result.
- `evidence_notes`: join non-identical Some values with `" | "` separator, lex-sort result.
- `remote_chassis_id`, `remote_system_name`, `remote_port_id`: prefer existing if Some, else incoming if Some, else None.

**Result:** No data loss. Both old and new evidence co-exist in joined strings when different.
Duplicate fields (chassis, system, port) prefer non-None values in deterministic order.

---

## No-mutation safety guard (tightens V1AO)

**Safety rule:** If `incoming.is_empty()` for ANY mode (Replace, Append, Merge), the store
is NOT mutated. The mutation result reflects no change and `store_mutated: false`.

**Rationale:** V1AO's REPLACE semantics allowed `import([])` to wipe the store. V1AR forbids
accidental wipes through the import path. Operators must call explicit
`clear_topology_neighbor_evidence` to wipe.

**V1AO behaviour preserved:** For non-empty incoming with mode=Replace, behaviour is identical
to V1AO (existing evidence discarded, incoming becomes final).

---

## Command surface changes

**`import_topology_neighbor_evidence` signature (changed return type):**

```rust
pub async fn import_topology_neighbor_evidence(
    State(store): State<Box<dyn TopologyEvidenceStore>>,
    environment_id: String,
    evidence: Vec<TopologyNeighborEvidence>,
    source_label: Option<String>,
    mode: Option<TopologyEvidenceImportMode>,
) -> Result<TopologyEvidenceMutationResult, String>
```

Return type changed from `TopologyEvidenceSet` to `TopologyEvidenceMutationResult`.

**`clear_topology_neighbor_evidence` signature (changed return type):**

```rust
pub async fn clear_topology_neighbor_evidence(
    State(store): State<Box<dyn TopologyEvidenceStore>>,
    environment_id: String,
) -> Result<TopologyEvidenceMutationResult, String>
```

Return type changed from `()` to `TopologyEvidenceMutationResult` with
`{ mode: Replace, previous_count: existing.len, replaced_count: existing.len, final_count: 0, store_mutated: true }`.

**`import_topology_neighbor_output` (request schema change):**

```rust
pub struct RawNeighborEvidenceImportRequest {
    pub environment_id: String,
    pub local_node: String,
    pub source_kind: RawNeighborSourceKind,
    pub platform_hint: Option<String>,
    pub raw_text: String,
    pub source_label: Option<String>,
    pub mode: Option<TopologyEvidenceImportMode>,  // NEW
}
```

Result shape unchanged.

**NEW `get_topology_evidence_summary` command:**

```rust
pub async fn get_topology_evidence_summary(
    State(store): State<Box<dyn TopologyEvidenceStore>>,
    environment_id: String,
) -> Result<TopologyEvidenceSummary, String>
```

Returns `TopologyEvidenceSummary` with `environment_id`, `evidence_count`, dedup'd
`source_labels` (Vec, lex-sorted), `source_kind_counts` (Vec of (kind, u32) in stable order),
and `evidence_set_id: Option<String>` (None for V1AR).

**`get_topology_neighbor_evidence` UNCHANGED.**

---

## Summary readback contract

`TopologyEvidenceSummary` fields:

- `environment_id: String` — active scope.
- `evidence_count: u32` — total rows in store.
- `source_labels: Vec<String>` — all unique labels from evidence, dedup'd and lex-sorted.
- `source_kind_counts: Vec<(TopologyAdjacencyFactSourceKind, u32)>` — counts per kind
  (Lldp, Cdp, ConfigNeighbor, Manual in that order), always 4 entries even when 0 counts.
- `evidence_set_id: Option<String>` — None for V1AR (no set-id readback path through summary;
  mutation result carries id when written).

---

## UI layout and wording

**Mode radio (above tabs):**
- Three radio buttons: "Replace current evidence", "Append to current evidence", "Merge and deduplicate"
- Default: Replace
- Shared by JSON and Raw evidence import forms

**Evidence Summary panel (below import results):**
- Header: "Active evidence"
- Row 1: "Evidence count: {evidence_count}"
- Row 2: "Source labels: {labels joined by comma, or '—' if empty}"
- Row 3-6: Per-kind counts (Kind: count; Lldp, Cdp, ConfigNeighbor, Manual)
- Row 7: "Last import: {mode} ({delta summary, e.g. '+3 added, 2 replaced')"

**Clear button (below summary):**
- Checkbox: "I understand this will remove all evidence for this environment."
- Button: "Clear evidence for this environment" (disabled until checkbox checked)
- On click: call `clear_topology_neighbor_evidence`, auto-refresh summary

**Honest wording:**
- NEVER "Auto-merge", "Smart dedup", "Intelligent merge", "Polling", "Live discovery"
- Always "Replace", "Append", "Merge", "Evidence", "Source labels", "Clear"

**All V1AO/V1AP/V1AQ testids preserved:**
- `tm-raw-platform-hint` (from V1AQ)
- `tm-json-import-button`, `tm-raw-import-button` (from V1AO/V1AP)
- Result summary and rejection list rendering unchanged

---

## Files added/touched per Sonnet A lane

| File | Change | Purpose |
|------|--------|---------|
| `src-tauri/src/engines/topology_evidence_store.rs` | Add types, helpers, command refactor | Import modes, mutation result, summary, safety guard |
| `src-tauri/src/commands/topology.rs` | Update command signatures | Return type changes, new mode parameter, summary command |
| `src/types/topology.ts` | Add TS mirrors | TopologyEvidenceImportMode, TopologyEvidenceMutationResult, TopologyEvidenceSummary |
| `src/api/topology.ts` | Update API wrappers | Reflect new return types, new summary endpoint |
| `src/modes/topology/TopologyMode.tsx` | Add UI surface | Mode radio, Evidence Summary panel, Clear confirmation |
| `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` | Add V1AR section | Modes, dedup key, field merge policy, safety guard, commands, summary |
| `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` | Add V1AR block | Type additions, command changes, UI surface, scope-out |
| `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` | Add V1AR entry | Roadmap bullet in Stage Group 2 |
| `obsidian/ANTHRACITE_INDEX.md` | Add V1AR row | Index stage in project memory |

---

## Validation checklist

### Types

- [ ] `TopologyEvidenceImportMode` enum present with `Replace`, `Append`, `Merge` variants
- [ ] `TopologyEvidenceMutationResult` carries `mode`, counts, `evidence_set_id`, `source_labels`, `store_mutated`
- [ ] `TopologyEvidenceSummary` carries `environment_id`, `evidence_count`, dedup'd `source_labels`, per-kind counts, `evidence_set_id: None`

### Helpers

- [ ] `replace_topology_evidence(existing, incoming)` discards existing, incoming becomes final
- [ ] `append_topology_evidence(existing, incoming)` concatenates in order, no dedup at evidence layer
- [ ] `merge_topology_evidence(existing, incoming)` matches 5-tuple, merges in-place, appends non-matching
- [ ] `summarize_topology_evidence(env_id, evidence, evidence_set_id)` returns counts and dedup'd labels
- [ ] `apply_evidence_import(store, env_id, incoming, mode, source_label)` orchestrates import with safety guard

### Safety guard

- [ ] Empty incoming never writes store, all modes
- [ ] Mutation result reflects no change when incoming.is_empty()
- [ ] `store_mutated: false` when no mutation occurred

### Command changes

- [ ] `import_topology_neighbor_evidence` returns `TopologyEvidenceMutationResult`
- [ ] `clear_topology_neighbor_evidence` returns `TopologyEvidenceMutationResult` with counts
- [ ] `import_topology_neighbor_output` request gains `mode: Option<TopologyEvidenceImportMode>`
- [ ] NEW `get_topology_evidence_summary(env)` returns `TopologyEvidenceSummary`
- [ ] `get_topology_neighbor_evidence` unchanged

### Merge semantics

- [ ] 5-tuple exact equality: `(source_kind, local_node_id, local_interface, remote_node_id, remote_interface)`
- [ ] `source_label` joins with `"; "` separator, lex-sorted when both Some + different
- [ ] `evidence_notes` joins with `" | "` separator, lex-sorted when both Some + different
- [ ] `remote_chassis_id`, `remote_system_name`, `remote_port_id` prefer existing if Some, else incoming

### Default mode

- [ ] When `mode: None`, behaves as Replace
- [ ] Backwards compat with V1AO/V1AP/V1AQ callers preserved

### UI surface

- [ ] Mode radio above tabs (Replace / Append / Merge), default Replace
- [ ] Evidence Summary panel shows active count, labels, kinds, delta
- [ ] Clear button with confirmation checkbox (must check to enable)
- [ ] Auto-refresh of summary after import/clear
- [ ] All V1AO/V1AP/V1AQ testids preserved
- [ ] Honest wording: no "Auto-merge", "Smart dedup", "Polling", "Live discovery"

### Determinism

- [ ] Parse same evidence + same mode → same store always
- [ ] Merge same evidence in same order → same result always
- [ ] Summary same evidence → same counts/labels always

### Scope-out confirmed

- [ ] No new evidence store (V1AO unchanged)
- [ ] No history, no audit log, no timestamps
- [ ] No vendor parser changes
- [ ] No parser-lab changes
- [ ] No DeviceModel mutation
- [ ] No live polling / SSH / SNMP
- [ ] No graph library
- [ ] No fuzzy matching
- [ ] No V1AM / V1AN / V1AQ logic change
- [ ] No AGENTS.md / CLAUDE.md / validator / rule pack touches

### Pipeline reuse

- [ ] V1AM `project_edges_from_link_facts` unchanged
- [ ] V1AN `map_neighbor_evidence_to_link_facts` unchanged
- [ ] V1AO `TopologyEvidenceStore` persist contract unchanged
- [ ] V1AP raw-output parsers and resolver unchanged
- [ ] V1AQ dispatcher and platform-hint handling unchanged

### Tests & builds

- [ ] `cargo check` green
- [ ] `cargo test` includes:
  - New helpers: replace, append, merge (determinism + field merge policy ~8-12 tests)
  - Safety guard: empty incoming rejection (~2 tests)
  - Summary: counts, labels, kind ordering (~3 tests)
- [ ] `pnpm typecheck` green
- [ ] `pnpm test` includes UI radio + summary panel rendering (~3 tests)
- [ ] `pnpm build` green
- [ ] `tools/ops-readiness.ps1` reports READY

---

## Strategic checkpoint

After V1AR, the topology evidence management arc is operator-mature:

- **Gradual evidence building:** Paste LLDP → append CDP → merge corrected entries, all safe.
- **Safe imports:** Empty/rejected imports never wipe existing evidence; explicit clear is the only wipe path.
- **Inspectable evidence:** Counts, labels, kinds, and last mutation visible to operator.
- **Ready for automation:** Future live SSH and automated parser extraction call same import path with explicit mode.

**Same V1AM/V1AN/V1AO/V1AP/V1AQ pipeline downstream — no rework needed.** Topology edges continue
to project deterministically from stored evidence. Readiness auto-transitions as fact sources flip
`present: true`.

**Engine-alive arc complete (V1AJ → V1AN → V1AO → V1AP → V1AQ → V1AR).** Future stages (V1AS+) can:

- Add SSH-based live evidence collection (calls import with mode=Append/Merge).
- Connect vendor-parser automatic extraction (produces evidence, calls import).
- Add evidence versioning / audit trail (wrapper over V1AR's deterministic merges).
- Expand to new vendors (same import pipeline).

All plug into the same store. No orchestrator or resolver rework needed.

---

## Key learnings for next stage

- **Empty-import safety prevents wipes-by-mistake.** A future stage adding timestamps or
  scheduled polling must preserve this guard — only explicit clear wipes.
- **Lex-sorted joins protect determinism.** When merging evidence from multiple sources,
  deterministic field ordering (lex-sort source_label, evidence_notes) ensures replay consistency.
- **5-tuple dedup key is the right granularity.** Future stages may add higher-level
  adjacency merge (e.g. collapse duplicate symmetric edges), but evidence-layer dedup
  should stay at the (kind, local, local_iface, remote, remote_iface) level.
- **Explicit mode beats guessing.** Operators see "Replace / Append / Merge" radio buttons,
  not "Auto-merge with intelligence". Deterministic choice + clear semantics win.

---

## Suggested commit message

```
stage-v1ar: evidence set management + merge semantics

Arc: TOPOLOGY-EDGES
- New: TopologyEvidenceImportMode enum (Replace | Append | Merge)
- New: TopologyEvidenceMutationResult struct (mode, counts, set_id, store_mutated)
- New: TopologyEvidenceSummary struct (env_id, evidence_count, dedup'd labels, per-kind counts)
- New: helpers replace_topology_evidence, append_topology_evidence, merge_topology_evidence,
  summarize_topology_evidence, apply_evidence_import
- Merge dedup key: 5-tuple (source_kind, local_node_id, local_interface, remote_node_id,
  remote_interface) with exact equality
- Merge field policy: source_label and evidence_notes join with separators (lex-sorted);
  remote_chassis_id/system_name/port_id prefer non-None
- No-mutation safety guard: empty incoming never writes store, all modes (tightens V1AO
  which allowed import([]) to wipe)
- Command changes: import_topology_neighbor_evidence and clear_topology_neighbor_evidence
  return TopologyEvidenceMutationResult instead of prior types; import_topology_neighbor_output
  request gains mode parameter; NEW get_topology_evidence_summary(env) returns summary
- Default mode: Replace (backwards compat with V1AO/V1AP/V1AQ callers)
- UI: mode radio above tabs (Replace/Append/Merge), Evidence Summary panel (counts, labels,
  kinds, delta), Clear button with confirmation checkbox
- Honest wording: "Replace", "Append", "Merge", never "Auto-merge"/"Smart dedup"
- V1AM/V1AN/V1AO/V1AP/V1AQ pipeline reused unchanged downstream
- Scope-out: no new store, no history, no timestamps, no vendor parser changes, no DeviceModel
  mutation, no live polling, no graph library, no fuzzy matching
- TopologyEvidenceSet (V1AO persisted shape) fields unchanged; evidence_set_id in mutation
  result, not in summary
- Determinism: same evidence + same mode → same result always
- Future hook: live SSH and automated parser ingestion plug into managed store via Append/Merge
  instead of blind REPLACE
- Docs: TOPOLOGY_ENGINE_BOUNDARY.md V1AR section, ENGINE_AND_API_BOUNDARIES.md block,
  roadmap V1AR entry, ANTHRACITE_INDEX.md stage row
- Strategic: evidence management arc operator-mature; topology pipeline ready for automation
```
