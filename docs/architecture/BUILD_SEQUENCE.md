# Build Sequence — Anthracite V1

> Companion to `ANTHRACITE_V1_SOURCE_OF_TRUTH.md`,
> `MODES_AND_ENGINES_MAP.md`, and `ENGINE_AND_API_BOUNDARIES.md`.
> Foundation first. Modes deepen from shared engines, never the other way
> around.

---

## Why foundation first

Old Anthracite proves that the product works. The risk in V1 is not "can we
build a screen", it is "can the screens stay clean as capability grows".
The only way to keep them clean is to land the shared engines and typed
APIs **before** mode UIs grow opinions of their own.

A mode built before its engine becomes the engine. That is the failure
mode this sequence is designed to prevent.

---

## Principles

1. **Foundation before features.** Every engine ships with its typed API
   and a fixture-driven test before any mode consumes it for "real" work.
2. **No isolated mode builds.** Mode surfaces stub against the typed API
   from day one. They do not embed domain logic.
3. **No topology-first tunnel vision.** Babylon and Topology Engine are
   not the first thing built. They sit on top of inventory, discovery,
   and monitoring.
4. **Each layer ships a test.** Hard gate at every layer: a deterministic
   test exists and passes before the next layer starts.
5. **Each stage names its source-of-truth sections.** No stage starts
   without citing the sections of `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` it
   obeys.
6. **Vault and decisions are part of the work.** No "doc pass at the
   end".

---

## Dependency-first build order (high level)

| # | Layer | Output | Test gate |
|---|-------|--------|-----------|
| 1 | Source of truth / architecture docs | This doc set, decision 0003, stage V1B record | Docs reviewed by Bujar; existing top-level docs point here |
| 2 | App shell + environment context | Mode-aware shell; HOME stub; environment context wired | Shell loads HOME and renders a mode rail; environment state is read/write through Environment Engine API stub |
| 3 | AAA / operator session / audit model | Operator identity model, audit append API | Unit tests for permission decisions and audit append/query |
| 4 | Shared domain model | Typed core (IDs, env, device, interface, vendor primitives) | TS + Rust types compile cleanly; round-trip serialisation test |
| 5 | API bridge pattern | Tauri-bridge convention: one typed command, one TS client, one test | Round-trip call test; error contract test |
| 6 | Local persistence | Engine-owned local store interface | Read-after-write test; cold-start state survives |
| 7 | Vendor / device / inventory model | Inventory Engine + Vendor Model Engine first usable surface | Fixture-driven Inventory query test; vendor capability lookup test |
| 8 | Discovery facts | Discovery Engine producing typed facts | Replayed fixture produces stable fact graph |
| 9 | Topology graph model | Topology Engine producing graphs from inventory + discovery (+ later monitoring) | Deterministic graph build test; diff test |
| 10 | Monitoring / polling snapshots | Monitoring/Polling Engine with typed snapshots | Replayed poll stream produces stable downstream state |
| 11 | Config generation contracts | Config Generation Engine | Same inputs → byte-identical candidate |
| 12 | Config pull / diff contracts | Config Pull/Diff Engine | Pure-function diff test across vendors |
| 13 | Compliance rules | Compliance Engine + first rule catalogue slice | Rule evaluation produces stable findings on fixtures |
| 14 | Diagnostic evidence model | Diagnostic/Hypothesis Engine | Frozen-evidence-bundle reproducibility |
| 15 | Assessment orchestration | Assessment Engine, end-to-end fixture pass | Same policy + fixtures → same run graph + report |
| 16 | Mode surfaces deepen | BUILD / OPERATE / DIAGNOSE / INTELLIGENCE / FORGE / ASSESS deepen using only their declared engines | Each mode passes the visual law gate at its checkpoint |

Sentinel Engine, Reporting Engine, Forge/Knowledge Engine, and Cortex
Command Engine come in alongside their first real consumers — Sentinel
during OPERATE deepening, Reporting once Assessment and Diagnose have
real artifacts, Forge/Knowledge alongside FORGE mode deepening, Cortex
Command alongside HOME deepening.

---

## What must be true before modes go deep

Before any mode is allowed to grow past stub surface:

- The engine(s) it consumes are present with typed APIs and fixtures.
- The Tauri command pattern (typed Rust ↔ TS) is settled.
- Local persistence + environment context are real.
- The visual law gate has at least one approved screenshot for the mode
  shell.

Modes that try to grow deep without the engines underneath them get
reverted to stub. That is the rule.

---

## Testing at each layer

- **Engines.** Fixture-in / artifact-out determinism tests. No live device
  required. No network. No clock dependency unless explicitly modelled.
- **API bridge.** Round-trip command tests with typed payloads and
  typed error contracts.
- **Modes.** Surface tests against engine stubs; screenshot review
  against the visual law.
- **Cross-engine.** Assessment fixture pass exercises the full chain end
  to end.

---

## What this sequence rules out

- Starting with topology rendering and "filling in the backend later".
- Building a screen for any mode that depends on an engine which is not
  yet present.
- Stuffing domain logic into a React component "for now".
- Allowing two modes to invent the same fact in two places.
- Letting Babylon become the source of truth for graph state.
