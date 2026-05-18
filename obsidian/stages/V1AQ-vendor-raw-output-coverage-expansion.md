# V1AQ — Vendor Raw Output Coverage Expansion

**Arc:** TOPOLOGY-EDGES
**Date:** 2026-05-18
**Status:** landed

---

## Objective

Extend the V1AP raw-output parser with multi-vendor LLDP/CDP support. Operator can paste
output from Cisco NX-OS, Juniper Junos, Cisco IOS-XR, and Arista EOS (CDP) into the same
TopologyMode raw-output tab. Platform hint dropdown routes parser selection deterministically.
Auto cascade fallback preserves V1AP's first-match behaviour. FortiOS and MikroTik produce
explicit `UnsupportedFormat` rejections with diagnostic detail. No new types, commands, or
resolver changes — V1AQ is a parser-coverage expansion layer plugging into the existing
V1AP/V1AN/V1AM/V1AO pipeline.

---

## Scope in

**New parsers in `src-tauri/src/engines/topology_neighbor_output.rs`:**

Primary support:

- `parse_nxos_lldp_detail(text)` — Cisco NX-OS `show lldp neighbors detail`
- `parse_nxos_cdp_detail(text)` — Cisco NX-OS `show cdp neighbors detail`
- `parse_junos_lldp_neighbors(text)` — Juniper Junos `show lldp neighbors` (terse table)
- `parse_iosxr_lldp_neighbors(text)` — Cisco IOS-XR `show lldp neighbors detail`
- `parse_eos_cdp_detail(text)` — Arista EOS `show cdp neighbors detail`

Secondary support (deferred in V1AQ — fixture confidence insufficient):

- Huawei VRP `display lldp neighbor` — dispatcher returns empty for `huawei_vrp` hint
- Nokia SR OS `show system lldp neighbor` — dispatcher returns empty for `nokia_sros` hint

Follow-up stage will land these once representative fixtures validate the field-label
disambiguation.

**Dispatcher refinement:**

Signature change: `parse_raw_neighbor_output(source_kind, platform_hint, text)`.

Routing rules:

- Explicit platform hints (e.g. "nxos", "junos", "iosxr", "huawei_vrp", "nokia_sros")
  select matching parser.
- Auto cascade (None | "other"): LLDP tries IOS-XE → EOS → NX-OS → Junos → IOS-XR
  (first non-empty wins). CDP tries IOS-XE → NX-OS → EOS.
- Unsupported hints ("fortios", "mikrotik") return empty; orchestrator detects and emits
  `UnsupportedFormat` with reason naming the platform.

**Orchestrator (`import_raw_neighbor_output`) refinement:**

- Passes `platform_hint` from request to dispatcher.
- When dispatcher returns empty AND hint is Some("fortios") or Some("mikrotik"):
  emit one `UnsupportedFormat` rejection with detail.
- Otherwise existing `ParseEmpty` path applies.

**UI surface (TopologyMode):**

Raw-output tab gains `<select data-testid="tm-raw-platform-hint">` between source-kind radio
and other fields.

Options:
- `Auto (cascade)` (value: empty string → `platform_hint: None`)
- `Cisco IOS-XE`, `Cisco NX-OS`, `Cisco IOS-XR`, `Arista EOS`, `Juniper Junos`
- `Huawei VRP`, `Nokia SR OS`
- `FortiOS (unsupported)`, `MikroTik (unsupported)`

Default: Auto (cascade).

All V1AP testids preserved. Selector wiring deterministic: value → `RawNeighborEvidenceImportRequest.platform_hint`.

---

## Scope out

- **No new types or commands.** `RawNeighborEvidenceImportRequest`, `RawNeighborEvidenceImportResult`,
  `import_topology_neighbor_output` all reused unchanged.
- **No vendor parser tree changes.** `parsers/*.rs` files (cisco_iosxe, cisco_nxos, juniper_junos,
  arista_eos, etc.) untouched.
- **No `parser-lab/` changes.** Codex prep packs stay untouched.
- **No parser version bumps, no `expected.json` changes.**
- **No DeviceModel mutation.** Discovery engine and record schema unchanged.
- **No discovery semantics change.** No live polling, SSH, SNMP, probing, or device contact.
- **No graph visualisation library.** Babylon rendering deferred.
- **No fuzzy matching, inference, or fallback.** Exact hostname/record_id resolution only.
- **No append/merge evidence semantics.** Still REPLACES per-environment (V1AO unchanged).
- **No resolver change.** Same `resolve_node_id` from V1AP.
- **No store change.** Same V1AO `TopologyEvidenceStore`.
- **No pipeline change.** Same V1AN mapper, same V1AM projection.
- **No AGENTS.md / CLAUDE.md / validator / rule pack / parser-lab / `.codex/` touches.**

---

## Design decisions

**1. Platform hint instead of auto-detect.**

Dispatcher selection is deterministic and explicit. Operator chooses the platform or relies
on Auto cascade. No probe-based detection magic. Honest wording protects operator intent.

**2. Cascade order (Auto mode).**

When platform_hint is None or "other", cascade tries parsers in likelihood order:
- LLDP: IOS-XE (most common) → EOS → NX-OS → Junos → IOS-XR.
- CDP: IOS-XE → NX-OS → EOS.

First non-empty Vec wins. Same semantics as V1AP's single-parser default.

**3. Explicit unsupported rejection with detail.**

FortiOS and MikroTik produce one `UnsupportedFormat` rejection per import, not silent
ParseEmpty. Operator sees the reason: `"FortiOS not supported in V1AQ"`, `"MikroTik not
supported in V1AQ"`. Honest wording prevents re-paste confusion.

**4. Secondary vendor support (deferred in V1AQ).**

Huawei VRP and Nokia SR OS LLDP parsing was scoped but deferred. Without representative
real-output fixtures, the field-label disambiguation (`Port ID/subtype`, `Chassis ID/subtype`)
carries guessing risk. Honest deferral chosen over speculative parsers. UI keeps the platform
options visible (operator paste → `ParseEmpty` rejection signals "not yet supported"); a
follow-up stage adds these once fixtures validate.

**5. Parser locality and ownership.**

All parsers live in `topology_neighbor_output.rs` alongside V1AP parsers. Shape recognizers,
not vendor-parser-tree integration.

---

## Parser contract (expanded formats)

### Cisco NX-OS LLDP Detail

**Input:** `show lldp neighbors detail` output

**Extracted fields per neighbour:**
- `local_interface: String` (from "Local Intf:" line, normalized)
- `remote_system_name: String` (from "System Name:" line)
- `remote_port_id: String` (from "Port ID:" line)
- `remote_chassis_id: Option<String>` (from "Chassis ID:" line)

### Cisco NX-OS CDP Detail

**Input:** `show cdp neighbors detail` output

**Extracted fields per neighbour:**
- `local_interface: String` (from "Local Interface:" line)
- `remote_system_name: String` (from "Device ID:" line)
- `remote_port_id: String` (from "Port ID" line)
- `remote_chassis_id: Option<String>` (not available; None)

### Juniper Junos LLDP Neighbours (terse)

**Input:** `show lldp neighbors` output (terse table format)

**Extracted fields per neighbour:**
- `local_interface: String` (from interface column)
- `remote_system_name: String` (from remote-system-name column)
- `remote_port_id: String` (from remote-port-id column)
- `remote_chassis_id: Option<String>` (not available; None)

### Cisco IOS-XR LLDP Neighbours

**Input:** `show lldp neighbors detail` output

**Extracted fields per neighbour:**
- `local_interface: String` (from "Local Interface:" line)
- `remote_system_name: String` (from "System Name:" line)
- `remote_port_id: String` (from "Port ID:" line)
- `remote_chassis_id: Option<String>` (from "Chassis ID:" line)

### Arista EOS CDP Detail

**Input:** `show cdp neighbors detail` output

**Extracted fields per neighbour:**
- `local_interface: String` (from "Local Interface:" line)
- `remote_system_name: String` (from "Device ID:" line)
- `remote_port_id: String` (from "Port ID" line)
- `remote_chassis_id: Option<String>` (not available; None)

### Huawei VRP LLDP Neighbor — DEFERRED in V1AQ

`display lldp neighbor` parsing deferred to follow-up. Dispatcher returns empty for
`huawei_vrp` hint. Operator paste produces `ParseEmpty` rejection.

### Nokia SR OS LLDP Neighbor — DEFERRED in V1AQ

`show system lldp neighbor` parsing deferred to follow-up. Dispatcher returns empty for
`nokia_sros` hint. Operator paste produces `ParseEmpty` rejection.

---

## Dispatcher routing table

| Source Kind | Platform Hint | Parser | Fallback |
|---|---|---|---|
| LLDP | "iosxe" | `parse_iosxe_lldp_detail` | — |
| LLDP | "eos" | `parse_eos_lldp_detail` | — |
| LLDP | "nxos" | `parse_nxos_lldp_detail` | — |
| LLDP | "junos" | `parse_junos_lldp_neighbors` | — |
| LLDP | "iosxr" | `parse_iosxr_lldp_neighbors` | — |
| LLDP | "huawei_vrp" | `parse_huawei_vrp_lldp_neighbor` | — |
| LLDP | "nokia_sros" | `parse_nokia_sros_lldp_neighbor` | — |
| LLDP | "fortios" | empty | UnsupportedFormat |
| LLDP | "mikrotik" | empty | UnsupportedFormat |
| LLDP | None / "other" | cascade | IOS-XE → EOS → NX-OS → Junos → IOS-XR |
| CDP | "iosxe" | `parse_iosxe_cdp_detail` | — |
| CDP | "nxos" | `parse_nxos_cdp_detail` | — |
| CDP | "eos" | `parse_eos_cdp_detail` | — |
| CDP | None / "other" | cascade | IOS-XE → NX-OS → EOS |
| CDP | "junos" / others | empty | ParseEmpty or UnsupportedFormat |

---

## UI selector layout

Evidence-import raw-output tab gains platform-hint selector:

```
Source kind:  ◯ LLDP  ◯ CDP

Platform hint:  [Auto (cascade)  ▼]
  - Auto (cascade)
  - Cisco IOS-XE
  - Cisco NX-OS
  - Cisco IOS-XR
  - Arista EOS
  - Juniper Junos
  - Huawei VRP
  - Nokia SR OS
  - FortiOS (unsupported)
  - MikroTik (unsupported)

Local node:  [________________]
Raw output:  [________________]
[Import]
```

Selector testid: `tm-raw-platform-hint`. Value: empty string (Auto) or platform string (e.g. "nxos").

---

## Files added/touched per Sonnet A lane

| File | Change | Purpose |
|------|--------|---------|
| `src-tauri/src/engines/topology_neighbor_output.rs` | Add new parsers + dispatcher refinement | Primary/secondary format parsers + routing |
| `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` | Add V1AQ section | Dispatcher routing, unsupported rejection, future hook |
| `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` | Add V1AQ block | Parsers, dispatcher, UI selector, scope-out |
| `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` | Add V1AQ bullet | Roadmap entry in Stage Group 2 |
| `obsidian/ANTHRACITE_INDEX.md` | Add V1AQ row | Index stage in project memory |

---

## Validation checklist

### Parsers

- [ ] `parse_nxos_lldp_detail(text)` extracts local_interface, remote_system_name, remote_port_id,
  remote_chassis_id per entry
- [ ] `parse_nxos_cdp_detail(text)` extracts same (remote_chassis_id = None)
- [ ] `parse_junos_lldp_neighbors(text)` extracts terse table entries (remote_chassis_id = None)
- [ ] `parse_iosxr_lldp_neighbors(text)` extracts detail entries
- [ ] `parse_eos_cdp_detail(text)` extracts detail entries (remote_chassis_id = None)
- [x] Secondary parsers (Huawei VRP, Nokia SR OS) deferred — dispatcher returns empty for those hints; follow-up stage will land them once fixtures validate
- [ ] Zero-entry input returns empty Vec
- [ ] Malformed input returns empty Vec

### Dispatcher

- [ ] `parse_raw_neighbor_output(source_kind, platform_hint, text)` signature updated
- [ ] Explicit hints route to matching parser
- [ ] Auto cascade (None) tries LLDP parsers in order; first non-empty wins
- [ ] Auto cascade (None) tries CDP parsers in order; first non-empty wins
- [ ] Unknown hint returns empty Vec
- [ ] Unsupported hints ("fortios", "mikrotik") return empty Vec

### Orchestrator

- [ ] `import_raw_neighbor_output(request, records, store)` passes platform_hint to dispatcher
- [ ] Empty result + Some("fortios") emits UnsupportedFormat with "FortiOS not supported" detail
- [ ] Empty result + Some("mikrotik") emits UnsupportedFormat with "MikroTik not supported" detail
- [ ] Empty result + other causes ParseEmpty rejection
- [ ] All V1AP orchestrator paths preserved (resolve, reject, store)

### Resolver

- [ ] `resolve_node_id(records, needle)` unchanged from V1AP
- [ ] Exact-match-only (case-insensitive trim)

### Store & Pipeline

- [ ] V1AO `TopologyEvidenceStore` unchanged (REPLACE per-environment)
- [ ] V1AN mapper unchanged
- [ ] V1AM projection unchanged
- [ ] Same safety guard: zero-accepted → no store.store() call

### UI Surface

- [ ] Raw-output tab selector present with testid `tm-raw-platform-hint`
- [ ] Options include all supported vendors + "(unsupported)" labels
- [ ] Default: "Auto (cascade)" (empty value)
- [ ] Selector value wired to `RawNeighborEvidenceImportRequest.platform_hint`
- [ ] All V1AP testids (source-kind radio, local-node text, raw-text area, Import button) preserved
- [ ] Result summary and rejection list rendering unchanged from V1AP

### Determinism

- [ ] Parse same raw text + same platform hint → same entries always
- [ ] Dispatcher same (kind, hint, text) → same parser selection always
- [ ] Resolve same records + needle → same node_id always
- [ ] Import same evidence → same accepted/rejected counts always

### Scope-out Confirmed

- [ ] No new types
- [ ] No new Tauri commands
- [ ] No vendor parser tree changes
- [ ] No parser-lab changes
- [ ] No parser version bumps, no expected.json changes
- [ ] No DeviceModel mutation
- [ ] No live polling / SSH / SNMP
- [ ] No graph library
- [ ] No fuzzy matching
- [ ] No append/merge semantics
- [ ] No resolver change
- [ ] No store change
- [ ] No AGENTS.md / CLAUDE.md / validator / rule pack / parser-lab touches

### Tests & Builds

- [ ] `cargo check` green
- [ ] `cargo test` includes:
  - New parsers: NX-OS LLDP/CDP, Junos terse, IOS-XR LLDP, EOS CDP samples (~5-7 tests)
  - Dispatcher: explicit hints, cascade, unsupported hints (~5-7 tests)
  - Orchestrator: UnsupportedFormat emission, empty handling (~2-3 tests)
- [ ] `pnpm typecheck` green (no TS changes needed; wire shape reused)
- [ ] `pnpm test` includes UI selector rendering (~2-3 tests)
- [ ] `pnpm build` green
- [ ] `tools/ops-readiness.ps1` reports READY

---

## Strategic checkpoint

After V1AQ, the raw-output ingestion path covers the majority of network devices operators
encounter:

- **LLDP support:** IOS-XE, EOS, NX-OS, Junos, IOS-XR (plus optional Huawei, Nokia).
- **CDP support:** IOS-XE, NX-OS, EOS.
- **Honest unsupported:** FortiOS, MikroTik (explicitly rejected).

**Multi-vendor raw import is now operator-viable.** Operator chooses platform or auto-cascades.
Same resolver, same store, same projection — no downstream topology changes needed.

**Engine-alive arc remains complete (V1AJ → V1AN → V1AO → V1AP → V1AQ).** Future stages
(V1AR+) can:

- Add append/merge evidence-set management.
- Connect vendor-parser automatic extraction.
- Add SSH-based live collection.
- Expand to new vendors.

All plug into the same pipeline. No orchestrator or resolver rework needed.

---

## Key learnings for next stage

- **Cascade order matters.** V1AQ preserves V1AP's "first-match wins" semantics for Auto mode.
  When adding new vendors, consider likelihood and parser maturity in cascade order.
- **Explicit unsupported beats silent ParseEmpty.** FortiOS/MikroTik rejection with reason
  prevents operator confusion. Future unsupported formats should do the same.
- **Platform hint is honest.** It routes deterministically; it is not detection. Operator
  controls the choice. Honest wording ("Platform hint", "Auto cascade") prevents expectation
  drift.
- **Parser locality is clean.** Shape recognizers in `topology_neighbor_output.rs`, not
  vendor-parser-tree. Future vendor-parser LLDP/CDP extractors may hook into the same
  dispatcher or replace it — that's a future design decision, not enforced now.

---

## Suggested commit message

```
stage-v1aq: vendor raw output coverage expansion

Arc: TOPOLOGY-EDGES
- New: parse_nxos_lldp_detail, parse_nxos_cdp_detail (Cisco NX-OS LLDP/CDP parsers)
- New: parse_junos_lldp_neighbors (Juniper Junos LLDP terse format parser)
- New: parse_iosxr_lldp_neighbors (Cisco IOS-XR LLDP parser)
- New: parse_eos_cdp_detail (Arista EOS CDP parser)
- Deferred: Huawei VRP + Nokia SR OS LLDP parsers (fixture confidence insufficient;
  dispatcher returns empty for those hints; follow-up stage adds them)
- Dispatcher: parse_raw_neighbor_output(source_kind, platform_hint, text) signature
  accepts platform_hint for deterministic router selection
- Routing: explicit hints (e.g. "nxos", "junos", "iosxr") select matching parser;
  Auto cascade (None/"other") tries LLDP parsers in order for LLDP, CDP parsers
  for CDP; first non-empty wins
- Unsupported: FortiOS and MikroTik produce UnsupportedFormat rejection with
  diagnostic detail; no silent ParseEmpty
- Orchestrator: passes platform_hint to dispatcher; detects empty + unsupported
  hint and emits UnsupportedFormat with reason
- UI: platform-hint selector in raw-output tab (default "Auto (cascade)");
  options include all supported vendors plus "(unsupported)" labels
- Resolver: unchanged from V1AP (exact-match-only, case-insensitive trim)
- Store, pipeline, safety guard: unchanged from V1AP
- Scope-out: no new types/commands, no vendor parser changes, no parser-lab,
  no DeviceModel mutation, no live polling, no graph library, no fuzzy matching
- Honest wording: "Platform hint", "Auto (cascade)", "(unsupported)" — never
  "Auto-detect"/"Smart routing"/"Discovery"
- Determinism: same input + hint → same output always
- Backwards-compat: empty cascade matches V1AP single-parser default
- Future hook: append/merge evidence, vendor-parser extraction, SSH-based live
  collection all plug into same pipeline
- Docs: TOPOLOGY_ENGINE_BOUNDARY.md V1AQ section, ENGINE_AND_API_BOUNDARIES.md
  block, roadmap V1AQ entry, ANTHRACITE_INDEX.md stage row
- Strategic: Multi-vendor raw import now operator-viable; honest unsupported
  rejection prevents confusion; future stages extend without orchestrator/resolver rework
```
