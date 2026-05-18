# V1AW — Diagnose Seed / Operator Answers v1

**Arc:** DIAGNOSE
**Date:** 2026-05-19
**Status:** landed

---

## Objective

Stop adding scaffolding for absent features. Ship the first
operator-facing answer surface: deterministic rule-based diagnostic
answers from already-imported Discovery and Topology data. The
operator question Diagnose Seed answers:

> "What should I inspect first, and why?"

Six recent stages (V1AS / V1AT / V1AU / V1AV / Codex prep / project
map) shipped scaffolding without giving Bujar a new operator action.
V1AW is the pivot: a usable answer surface built entirely on
existing contracts, no new engine, no new wire types, no DeviceModel
expansion.

---

## Scope in

**New TS modules:**

- `src/modes/diagnose/diagnoseTypes.ts` — display contract:
  `DiagnoseAnswer`, `DiagnoseSeverity`, `DiagnoseCategory`,
  `DiagnoseEvidence`, `DiagnoseSummary`, `DiagnoseModel`.
- `src/modes/diagnose/diagnoseProjection.ts` — pure rules:
  `projectDiagnose({devices, topology, known_unsupported_platforms?})`
  → `DiagnoseModel`. Deterministic, sorted, no I/O.
- `src/modes/diagnose/DiagnoseMode.tsx` + `.css` — mode surface
  with summary strip, ranked answer list, selected-answer inspector,
  honest empty + clean states, `DataSourceTag` in header.

**Wiring:**

- `src/data/modeStatus.ts` — flips `diagnose` from `not_connected`
  → `built` (V1AD/V1AE pattern).
- `src/App.tsx` — adds the `activeMode === "diagnose"` branch
  consuming the existing `discovery` + `topology` state. No new
  callbacks, no new fetches.

**Tests:**

- `__tests__/diagnoseProjection.test.ts` — 20 tests (empty / clean
  / telnet / missing hostname / unknown admin state / described
  no-addressing / IPv6-only honesty / unsupported platform default
  + override / parser-scope / topology rejections / accepted-but-no-edges
  / no-adjacency-sources / sort order / summary parity /
  deterministic repeat).
- `__tests__/DiagnoseMode.test.tsx` — 6 tests (header + tagline +
  summary render, honest empty state, clean state, summary counts
  + cards render, click-to-inspector with evidence + suggested
  target + source label, honest scope line).

**Docs:**

- `docs/architecture/DIAGNOSE_SEED_CONTRACT.md` — purpose, input
  contracts, output contract, deterministic sort, supported answer
  groups, deferred groups, data honesty, boundaries.
- This stage note.
- `obsidian/ANTHRACITE_INDEX.md` V1AW row.

---

## Supported answer groups (V1AW)

| Category | Rule | Severity |
|---|---|---|
| `management_access` | telnet enabled | critical |
| `identity` | missing hostname | warning |
| `interfaces` | unspecified admin state | info |
| `interfaces` | description without IP addressing | info |
| `platform_support` | unsupported platform (default: iosxr, mikrotik) | warning |
| `parser_scope` | out-of-scope parser evidence | info |
| `topology_evidence` | rejections present | warning |
| `topology_evidence` | accepted evidence but no edges | warning |
| `topology_evidence` | no adjacency sources connected | info |

## Deferred answer groups

Vocabulary frozen in `DIAGNOSE_DEFERRED_GROUPS`; runtime does NOT
emit (no fabrication):

- `interface_mtu_outliers`
- `vlan_consistency`
- `vrf_route_target_alignment`
- `routing_protocol_neighbor_health`
- `policy_drift`

Each requires data not currently reachable without DeviceModel
expansion, validator engine consumption, or topology comparison
that isn't on the contract boundary today. Lands as V1AW-b when the
upstream data is reachable.

---

## Scope out

- No engine code, no Rust changes, no Tauri command, no new wire types.
- No DeviceModel schema expansion.
- No validator / rule-pack changes (Diagnose Seed is "what to inspect
  first", not "did this rule fail" — different concern from V1P).
- No FindingsPanel / FindingsDisplay contract duplication.
- No live collection, no SSH, no credentials, no polling, no
  scheduler, no background task.
- No graph renderer.
- No fuzzy matching, no resolver changes, no topology invention.
- No mutation of inputs.
- No filter / search / persistent state — wait until answer corpus
  shape is stable.
- No project-map refresh inside this stage.
- No `AGENTS.md` / `CLAUDE.md` / `parser-lab/**` edits.

---

## Architecture law respected

- React surface state only; no engine wiring inside the component.
- Pure projection — same input always yields same output.
- All sort keys deterministic.
- Honest empty + clean states; never fabricate answers.
- `source_label` always provenance, never invented.
- `affected_devices` falls back through `hostname → source_label →
  record.id`; never guesses.

---

## Validation

```
pnpm typecheck                                                clean
pnpm test --run (full)                                        638 passed (+20 projection, +6 UI)
pnpm build                                                    124 modules, ~460 ms
cargo check / cargo test                                      skipped — no Rust diff in V1AW
tools/ops-readiness.ps1                                       READY
```

---

## Risks / notes

- **Rules deliberately bounded.** Six device-scoped + three
  topology-scoped rules. Adding more without first watching Bujar
  use this surface = drift back into scaffolding. Wait for "I wish
  this told me X" feedback, then add X.
- **Per-rule one-answer-per-device cap.** Prevents flooding when a
  device has 200 unknown interfaces. Evidence carries the count;
  the inspector tells operator how many.
- **No persistence.** Selected-answer state is component-local. If
  Bujar wants persistent dismissal / mute / "I've seen this", that
  ships as V1AW-b.
- **Project-map refresh recommended** after Bujar commits because:
  Diagnose capability flips `not_connected` → `built`, MODE_STATUS
  row changes, and `current_state.production_edge_stage` becomes
  V1AW.

---

## Cross-links

- [`../../docs/architecture/DIAGNOSE_SEED_CONTRACT.md`](../../docs/architecture/DIAGNOSE_SEED_CONTRACT.md)
- `src/modes/diagnose/diagnoseTypes.ts`
- `src/modes/diagnose/diagnoseProjection.ts`
- `src/modes/diagnose/DiagnoseMode.tsx`
- `src/data/modeStatus.ts` (diagnose flip)
- `src/App.tsx` (diagnose branch wiring)
- [`V1AU-fixture-backed-live-collection-simulator.md`](./V1AU-fixture-backed-live-collection-simulator.md) — previous stage.
