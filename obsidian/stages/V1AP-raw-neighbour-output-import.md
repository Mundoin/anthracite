# V1AP — Raw Neighbour Output Import + Inventory Resolver

**Arc:** TOPOLOGY-EDGES
**Date:** 2026-05-18
**Status:** landed

---

## Objective

Land the first bounded, topology-owned parser that extracts neighbour adjacency facts from
raw vendor output (LLDP, CDP). Operator can paste raw `show lldp neighbors detail` (IOS-XE, EOS)
or `show cdp neighbors detail` (IOS-XE) into TopologyMode. Topology parsers recognize and extract
entries; exact inventory resolver matches local/remote nodes by hostname/record_id only (no fuzzy,
no IP/chassis fallback). Accepted evidence persists into the V1AO `TopologyEvidenceStore`,
projecting through V1AN/V1AM into live edges.

V1AP is a stepping stone. NX-OS/Junos and other formats are explicitly unsupported in V1AP and
honestly rejected. Future stages extend the same pipeline (same resolver, same store) to add
more formats.

---

## Scope in

**New files:**

- `obsidian/stages/V1AP-raw-neighbour-output-import.md` — this note
- `src-tauri/src/engines/topology_neighbor_output.rs` — new neighbour-output parsing module

**Edited files (architecture docs):**

- `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` — Add V1AP section covering bounded parsers,
  resolver rules, rejection categories, store-write policy
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — Add V1AP addition block to Topology Engine
  section (parsers, resolver, orchestrator, Tauri command, UI tab, scope-out)
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` — V1AP bullet in "What is alive now";
  "Next in Stage Group 2" updated to reflect V1AP landed, V1AQ+ for vendor parser extraction
- `obsidian/ANTHRACITE_INDEX.md` — V1AP row added to stage map

**Rust (src-tauri/src/engines/topology_neighbor_output.rs) — NEW MODULE:**

- `RawNeighborSourceKind` enum: Lldp, Cdp
- `RawNeighborEvidenceImportRequest` struct: environment_id, local_node (hostname or record_id),
  source_kind, platform_hint (optional, carried to source_label), raw_text, source_label (optional)
- `RawNeighborRejectionReason` enum: UnresolvedLocal, UnresolvedRemote, SelfLink,
  UnsupportedFormat, ParseEmpty, MissingRequiredField
- `RawNeighborRejectedEntry` struct: reason, detail, raw_block
- `RawNeighborParsedEntry` struct: local_interface, remote_system_name, remote_port_id,
  remote_chassis_id, raw_block
- `RawNeighborEvidenceImportResult` struct: parsed_entries_total, accepted_evidence_count,
  rejected_count, unresolved_count, stored_evidence_count, evidence_set_id,
  accepted_evidence (Vec<TopologyNeighborEvidence>), rejected_entries (Vec<RawNeighborRejectedEntry>)
- Format-specific parsers: `parse_iosxe_lldp_detail`, `parse_iosxe_cdp_detail`, `parse_eos_lldp_detail`
- Generic dispatcher: `parse_raw_neighbor_output(source_kind, text) -> Vec<RawNeighborParsedEntry>`
- Exact-match resolver: `resolve_node_id(records, needle) -> Option<String>` (case-insensitive trim,
  matches hostname or record.id, no fuzzy, no fallback)
- Import orchestrator: `import_raw_neighbor_output(request, records, store) ->
  Result<RawNeighborEvidenceImportResult, TopologyEvidenceStoreError>` (parses, resolves, validates,
  calls store.store() only if accepted_evidence_count > 0)
- ~8-10 unit tests (format parsers, resolver exact-match, rejection categories, orchestrator paths)

**Tauri commands (src-tauri/src/lib.rs) — NEW:**

- `import_topology_neighbor_output(request: RawNeighborEvidenceImportRequest) ->
  Result<RawNeighborEvidenceImportResult, String>` — calls orchestrator, returns result with
  accepted evidence and rejection details

**TypeScript (src/types/topology.ts) — MODIFICATIONS:**

- Add `RawNeighborSourceKind` enum: Lldp = "lldp", Cdp = "cdp"
- Add `RawNeighborRejectionReason` enum: UnresolvedLocal, UnresolvedRemote, SelfLink,
  UnsupportedFormat, ParseEmpty, MissingRequiredField
- Add `RawNeighborRejectedEntry` interface: reason, detail, raw_block
- Add `RawNeighborEvidenceImportRequest` interface: environment_id, local_node, source_kind,
  platform_hint, raw_text, source_label
- Add `RawNeighborEvidenceImportResult` interface: parsed_entries_total, accepted_evidence_count,
  rejected_count, unresolved_count, stored_evidence_count, evidence_set_id, accepted_evidence,
  rejected_entries

**TypeScript API (src/api/topology.ts) — NEW:**

- `importTopologyNeighborOutput(request: RawNeighborEvidenceImportRequest) -> RawNeighborEvidenceImportResult`

**Frontend (src/modes/topology/TopologyMode.tsx) — NEW SECTIONS:**

- Evidence-import panel gains tabbed sub-section:
  - Tab 1: "Structured JSON" (V1AO preserved)
  - Tab 2: "Raw neighbour output" (V1AP)
    - Source kind radio: LLDP / CDP
    - Local node text input (hostname or record_id)
    - Raw text area (paste vendor output here)
    - Import button
    - Result summary: counts (parsed / accepted / rejected / unresolved / stored) + rejection
      list (capped at 5 items, showing reason + detail per entry)

**Tests:**

- `src-tauri/src/engines/topology_neighbor_output.rs` — ~8-10 unit tests (format parsers with
  sample output, resolver exact-match, resolver no-fuzzy, rejection categories, orchestrator
  zero-accepted skip, orchestrator multi-rejection)
- `src/api/topology.test.ts` — new tests for `importTopologyNeighborOutput` command (~3-5)
- `src/modes/topology/TopologyMode.test.tsx` — new tests for raw-output tab, result summary,
  rejection list rendering (~5-10)

---

## Scope out

- **No vendor parser changes.** Neighbour-output parsers are bounded, topology-owned shape
  recognizers — not edits to `parsers/cisco_iosxe.rs` or any vendor module.
- **No `expected.json`, no parser version bumps.**
- **No DeviceModel mutation.** Record schema unchanged; no new fields.
- **No `parser-lab/` changes.** Codex prep packs untouched.
- **No live polling / SSH / SNMP / scanning.**
- **No graph visualisation library.**
- **No fuzzy matching / hostname inference / IP/chassis fallback resolution.** Exact-match only
  (case-insensitive trim).
- **No second evidence store.** Reuse V1AO `TopologyEvidenceStore`.
- **No Tauri commands beyond `import_topology_neighbor_output`.**
- **Unsupported formats.** NX-OS, Junos, and any other format are explicitly unsupported in V1AP
  and honestly rejected with `UnsupportedFormat` or `ParseEmpty`.

---

## Design decisions

**1. Bounded format support (IOS-XE, EOS, LLDP/CDP only).**

V1AP proves the shape-parsing + resolution + evidence pipeline. IOS-XE and EOS cover the
immediate operator use case. NX-OS and Junos are deferred to future stages. Future stages
extend `RawNeighborSourceKind` enum without touching the resolver or store.

**2. Exact-match-only resolver protects against surprise topology.**

No fuzzy matching, no hostname inference, no IP/chassis fallback. Operator must supply
either hostname or record_id that exists in the Discovery inventory. Unknown nodes are
honestly rejected. Prevents silent topology guessing that would be wrong.

**3. Three rejection categories surface honest diagnostics.**

- `UnresolvedLocal` — local node (operator input) not found in inventory.
- `UnresolvedRemote` — remote node from vendor output not found in inventory.
- `SelfLink` — resolved local == resolved remote (topology invariant violation).

Plus `UnsupportedFormat`, `ParseEmpty`, and `MissingRequiredField` for input shape issues.

**4. Safety guard: zero-accepted prevents surprise clears.**

If `accepted_evidence_count == 0`, the orchestrator does NOT call `store.store()`. Prevents
operator from accidentally pasting malformed text and clearing all evidence. Operator sees
the rejection list and can re-paste.

**5. Format-specific parsers are topology-owned, not vendor-parser-owned.**

These are shape recognizers for raw CLI output, not integration with the vendor parser
pipeline. They live under `topology_neighbor_output.rs` and extract the minimal fields
needed to project edges: local interface, remote system name, remote port ID, remote
chassis ID.

**6. Honest wording throughout.**

"Raw neighbour output", "Imported evidence", "Resolved", "Unresolved", "Rejected" —
never "Live discovery", "Auto-discovery", "Scanned", "Polled". Operator always knows
the evidence came from a manual paste, not a live device.

---

## Parser contract (bounded formats)

### Cisco IOS-XE LLDP Detail

**Input:** `show lldp neighbors detail` output

**Extracted fields per neighbour:**
- `local_interface: String` (from "Local Intf:" line, normalized)
- `remote_system_name: String` (from "System Name:" line)
- `remote_port_id: String` (from "Port ID:" line)
- `remote_chassis_id: Option<String>` (from "Chassis ID:" line)

**Rejection:** If any required field absent → `MissingRequiredField`. If zero entries → `ParseEmpty`.

### Cisco IOS-XE CDP Detail

**Input:** `show cdp neighbors detail` output

**Extracted fields per neighbour:**
- `local_interface: String` (from "Local Interface:" line, normalized)
- `remote_system_name: String` (from "Device ID:" line)
- `remote_port_id: String` (from "Port ID" or "Interface ID" line)
- `remote_chassis_id: Option<String>` (not available in CDP detail; None)

**Rejection:** If any required field absent → `MissingRequiredField`. If zero entries → `ParseEmpty`.

### Arista EOS LLDP Detail

**Input:** `show lldp neighbors detail` output

**Extracted fields per neighbour:**
- `local_interface: String` (from "Local interface:" line)
- `remote_system_name: String` (from "System Name:" line)
- `remote_port_id: String` (from "Remote interface:" line)
- `remote_chassis_id: Option<String>` (from "Chassis id:" line)

**Rejection:** If any required field absent → `MissingRequiredField`. If zero entries → `ParseEmpty`.

---

## Resolver contract

**Input:** `records: &[DiscoveryDeviceRecord]`, `needle: &str` (operator input: hostname or record_id)

**Process:**

1. Lowercase + trim both needle and all candidates.
2. Check `record.device_model.identity.hostname` (if present and non-blank) for exact match.
3. Check `record.id` for exact match.
4. Return first matching `record.id` in iteration order.
5. No second-best guess, no IP match, no chassis fallback.

**Output:** `Option<String>` (matched record.id or None)

**Determinism:** Same records + same needle → same outcome, always. Pure function, no I/O.

---

## Import orchestrator flow

```
import_raw_neighbor_output(request, records, store)
  ↓
1. Call parse_raw_neighbor_output(request.source_kind, request.raw_text)
   → Vec<RawNeighborParsedEntry>
  ↓
2. For each parsed entry:
   a. Try resolve_node_id(records, request.local_node)
      → local_node_id or None (UnresolvedLocal rejection)
   b. Try resolve_node_id(records, entry.remote_system_name)
      → remote_node_id or None (UnresolvedRemote rejection)
   c. Check local_node_id == remote_node_id → SelfLink rejection
   d. Otherwise: emit TopologyNeighborEvidence with:
      - source_kind: (request.source_kind cast to TopologyAdjacencyFactSourceKind)
      - local_node_id: (resolved)
      - local_interface: (from parsed entry)
      - remote_node_id: (resolved)
      - remote_interface: None (not in raw output)
      - remote_chassis_id: (from parsed entry)
      - remote_system_name: (from parsed entry)
      - remote_port_id: (from parsed entry)
      - source_label: (request.source_label or auto-generated)
      - evidence_notes: None
  ↓
3. Build RawNeighborEvidenceImportResult:
   - parsed_entries_total = Vec length from step 1
   - accepted_evidence_count = count of non-rejected entries
   - rejected_count = count of rejected entries
   - unresolved_count = count of UnresolvedLocal + UnresolvedRemote
   - accepted_evidence: Vec<TopologyNeighborEvidence>
   - rejected_entries: Vec<RawNeighborRejectedEntry>
  ↓
4. IF accepted_evidence_count == 0:
     Return result WITHOUT calling store.store() (safety guard)
   ELSE:
     Call store.store(request.environment_id, accepted_evidence, request.source_label)
     → evidence_set_id deterministic
     Populate result.stored_evidence_count and evidence_set_id
  ↓
5. Return RawNeighborEvidenceImportResult
```

---

## Rejection categories + reasons

| Category | Reason | When it fires |
|----------|--------|---|
| `UnresolvedLocal` | "Local node '{local_node}' not found in inventory" | `resolve_node_id(records, request.local_node)` returns None |
| `UnresolvedRemote` | "Remote node '{remote_system_name}' not found in inventory" | `resolve_node_id(records, entry.remote_system_name)` returns None |
| `SelfLink` | "Local and remote node resolve to the same device" | resolved local == resolved remote |
| `UnsupportedFormat` | "Source kind not supported in V1AP" | `source_kind` not in (Lldp, Cdp) |
| `ParseEmpty` | "No entries parsed from raw output" | `parse_raw_neighbor_output` returns zero entries |
| `MissingRequiredField` | "Required field absent in parsed entry (e.g. remote_system_name)" | Field expected by parser not found |

---

## Operator UI tab layout

**Evidence-import panel (TopologyMode) — updated:**

Before V1AP, one textarea for "Structured JSON". V1AP adds a tab control:

- **Tab 1: "Structured JSON"** (V1AO preserved)
  - Textarea for JSON array of `TopologyNeighborEvidence` objects
  - Import button
  - Success/error feedback

- **Tab 2: "Raw neighbour output"** (V1AP)
  - Source kind radio buttons: ◯ LLDP  ◯ CDP
  - "Local node" text input (placeholder: "hostname or record_id from inventory")
  - "Raw output" textarea (placeholder: "paste `show lldp neighbors detail` here")
  - "Import" button
  - Result summary (after import):
    - Line 1: `"{accepted} of {parsed} entries accepted"`
    - Line 2 (if rejected): `"{rejected} rejected, {unresolved} unresolved"`
    - Line 3 (if stored): `"{stored} evidence entries stored"`
    - Rejection list (capped at 5 items):
      ```
      Rejected entries:
      • {reason}: {detail}
      • {reason}: {detail}
      ...
      ```

---

## Files changed and their purpose

| File | Change | Purpose |
|------|--------|---------|
| `src-tauri/src/engines/topology_neighbor_output.rs` | NEW MODULE | Format parsers, resolver, orchestrator |
| `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` | Add V1AP section | Bounded formats, resolver rules, store policy, future hook |
| `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` | Add V1AP block | Parsers, resolver, orchestrator, command, UI tab, scope-out |
| `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` | Add V1AP bullet + update Next | V1AP in "What is alive now"; "Next in Stage Group 2" reflects V1AP landed |
| `obsidian/ANTHRACITE_INDEX.md` | Add V1AP row | Index stage in project memory |
| `src/types/topology.ts` | Add V1AP types | TS mirrors of Rust enums/structs |
| `src/api/topology.ts` | Add import method | TS wrapper for import command |
| `src/modes/topology/TopologyMode.tsx` | Add raw-output tab | Tab control, source-kind radio, local-node text, raw-text area, result summary |
| `src/modes/topology/TopologyMode.test.tsx` | Add tab UI tests | Raw-output tab rendering, result summary, rejection list |
| `src-tauri/src/engines/topology_neighbor_output.rs` | Add unit tests | Format parsers, resolver, orchestrator paths |
| `src/api/topology.test.ts` | Add command tests | import_topology_neighbor_output calls and result handling |

---

## Validation checklist

### Format Parsers

- [ ] `parse_iosxe_lldp_detail(text)` extracts local_interface, remote_system_name,
  remote_port_id, remote_chassis_id per entry
- [ ] `parse_iosxe_cdp_detail(text)` extracts same fields (remote_chassis_id = None)
- [ ] `parse_eos_lldp_detail(text)` extracts same fields
- [ ] `parse_raw_neighbor_output(source_kind, text)` dispatches to format-specific parser
- [ ] Zero-entry input returns empty Vec (ParseEmpty rejection)
- [ ] Malformed input returns empty Vec (ParseEmpty rejection)

### Resolver

- [ ] `resolve_node_id(records, needle)` returns exact-match record.id (case-insensitive trim)
- [ ] No fuzzy matching, no substring, no fallback
- [ ] Same records + same needle → same outcome always (pure function)
- [ ] Unknown needle → None (honest)

### Import Orchestrator

- [ ] Parses raw output → entries
- [ ] Resolves local node (UnresolvedLocal if not found)
- [ ] For each entry, resolves remote node (UnresolvedRemote if not found)
- [ ] Checks self-link (SelfLink if local == remote)
- [ ] Builds TopologyNeighborEvidence for accepted entries
- [ ] Tracks parsed / accepted / rejected / unresolved counts
- [ ] Zero accepted → does NOT call store.store() (safety guard)
- [ ] Non-zero accepted → calls store.store(), populates evidence_set_id
- [ ] Returns RawNeighborEvidenceImportResult with all counts + lists

### Tauri Command

- [ ] `import_topology_neighbor_output(request) -> Result<RawNeighborEvidenceImportResult, String>`
- [ ] Calls orchestrator, returns result or error string

### TypeScript Types & API

- [ ] `RawNeighborSourceKind` enum (Lldp, Cdp)
- [ ] `RawNeighborRejectionReason` enum (all 6 categories)
- [ ] `RawNeighborEvidenceImportRequest` interface
- [ ] `RawNeighborEvidenceImportResult` interface
- [ ] `importTopologyNeighborOutput(request) -> RawNeighborEvidenceImportResult`

### Frontend UI Surface

- [ ] Evidence-import panel has tab control (Structured JSON, Raw neighbour output)
- [ ] Raw-output tab: source-kind radio (LLDP/CDP)
- [ ] Raw-output tab: local-node text input
- [ ] Raw-output tab: raw-output textarea
- [ ] Raw-output tab: Import button
- [ ] After import: result summary (counts + rejection list capped at 5)
- [ ] Honest empty states: no evidence, all rejected (existing from V1AO)

### Determinism

- [ ] Parse same raw text → same entries always
- [ ] Resolve same records + needle → same node_id always
- [ ] Import same evidence → same accepted/rejected/unresolved counts always
- [ ] Same result → same evidence_set_id always (from V1AO store)

### Scope Out Confirmed

- [ ] No vendor parser changes
- [ ] No parser-lab changes
- [ ] No live polling / SSH / SNMP
- [ ] No graph library
- [ ] No fuzzy matching
- [ ] No DeviceModel mutation
- [ ] No expected.json changes
- [ ] No validator/rule pack changes
- [ ] No AGENTS.md / CLAUDE.md / parser-lab / `.codex/` touches
- [ ] Unsupported formats (NX-OS, Junos, etc.) explicitly rejected

### Tests & Builds

- [ ] `cargo check` green
- [ ] `cargo test` includes:
  - Format parsers: IOS-XE LLDP/CDP, EOS LLDP with sample outputs (~6)
  - Resolver: exact match, case-insensitive, no-fuzzy (~3)
  - Orchestrator: accepted, rejected, unresolved, zero-accepted guard (~4-5)
- [ ] `pnpm typecheck` green
- [ ] `pnpm test` includes:
  - API: `importTopologyNeighborOutput` command (~3)
  - UI: tab rendering, result summary, rejection list (~5-10)
- [ ] `pnpm build` green
- [ ] `tools/ops-readiness.ps1` reports READY

---

## Strategic checkpoint

After V1AP, the raw-neighbour-output ingestion path is **operator-visible and live**. Operator can:

1. Paste raw `show lldp/cdp neighbors detail` output (IOS-XE, EOS).
2. Specify local node (hostname or record_id).
3. Import into the topology evidence store.
4. See real edges projected from that evidence.

**Topology is now operator-usable from raw vendor output, not just JSON.** The exact-match-only
resolver and bounded format support protect against surprise topology. NX-OS/Junos and other
formats are honestly rejected.

**Engine-alive arc remains complete (V1AJ → V1AN → V1AO → V1AP).** Topology engine reads
persisted Discovery records, reads persisted evidence (from manual import or future automated
ingestion), projects deterministic topology, and surfaces rejection diagnostics.

**Manual raw-output paste and future vendor-parser ingestion use the same pipeline.** Future
stages extend format support (NX-OS, Junos) without engine changes — same resolver, same store,
same projection logic.

---

## Key learnings for next stage

- **Bounded formats prove the pipeline.** V1AP is not "all LLDP/CDP forever" — it's the
  minimal set that covers immediate use cases and proves the architecture. Future stages
  extend without touching resolver or store.
- **Exact-match-only resolver prevents silent topology.** When a node cannot be resolved,
  the operator sees why (honest rejection). No guessing, no inference. Protects against
  surprise topology that would fail silently in a downstream stage.
- **Safety guard (zero-accepted skip) is critical.** Operator pastes malformed text →
  zero accepted → no store.store() call → no data loss. Operator sees the rejection list
  and can re-paste or investigate. Prevents accidental clears.
- **Topology-owned parsers ≠ vendor-parser integration.** These bounded parsers live in
  the topology engine module, not the vendor parser tree. They are shape recognizers, not
  extractors for a full DeviceModel. Future vendor-parser LLDP/CDP integration may reuse
  these parsers or replace them with deeper extraction — that's a future decision, not V1AP.

---

## Suggested commit message

```
stage-v1ap: raw neighbour output import + inventory resolver

Arc: TOPOLOGY-EDGES
- New: topology_neighbor_output.rs module (bounded format parsers + resolver + orchestrator)
- New: parse_iosxe_lldp_detail, parse_iosxe_cdp_detail, parse_eos_lldp_detail parsers
- New: parse_raw_neighbor_output dispatcher
- New: resolve_node_id exact-match-only resolver (case-insensitive trim, no fuzzy)
- New: import_raw_neighbor_output orchestrator (parse → resolve → validate → store)
- New: RawNeighborSourceKind enum (Lldp, Cdp)
- New: RawNeighborEvidenceImportRequest struct (environment_id, local_node, source_kind,
  platform_hint, raw_text, source_label)
- New: RawNeighborRejectionReason enum (UnresolvedLocal, UnresolvedRemote, SelfLink,
  UnsupportedFormat, ParseEmpty, MissingRequiredField)
- New: RawNeighborEvidenceImportResult struct (counts + accepted/rejected entries)
- New: import_topology_neighbor_output Tauri command
- Resolver: exact-match-only (case-insensitive trim) against hostname or record_id; no fuzzy,
  no fallback
- Rejection: UnresolvedLocal/Remote, SelfLink, UnsupportedFormat, ParseEmpty, MissingRequiredField
- Store-write: REPLACE per-environment (V1AO semantics); zero-accepted safety guard
- Supported formats: IOS-XE LLDP/CDP, EOS LLDP (V1AP bounded)
- Unsupported: NX-OS, Junos, others (explicitly rejected, honest diagnostics)
- UI: TabControl in evidence-import panel — Tab 1 Structured JSON (V1AO), Tab 2 Raw
  neighbour output (V1AP) with source-kind radio, local-node text, raw-text area, result summary
- Honest wording: "Raw neighbour output", "Imported evidence", "Resolved", "Unresolved", "Rejected"
  (never "Live discovery"/"Polling"/"Scanning")
- Scope-out: no vendor parser changes, no parser version bumps, no DeviceModel mutation, no
  parser-lab changes, no live polling, no graph library, no fuzzy matching
- Determinism: same input → same output always (pure resolve, pure parse, deterministic
  evidence_set_id from store)
- Backwards-compat: empty raw output → ParseEmpty rejection, no surprise clears
- Future hook: NX-OS/Junos parsers plug into same pipeline; no orchestrator/resolver changes needed
- Test coverage: format parsers (6), resolver (3), orchestrator (4-5), UI (5-10) tests
- Docs: TOPOLOGY_ENGINE_BOUNDARY.md V1AP section, ENGINE_AND_API_BOUNDARIES.md block,
  roadmap V1AP entry
- Strategic: Topology now operator-usable from raw vendor output; exact-match resolver protects
  against surprise topology; bounded formats prove architecture for future extension
```
