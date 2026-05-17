# V1AA — Hierarchy Honesty Contract + `DataSourceState`

**Arc:** HONEST-HIERARCHY (first stage).
**Tier:** docs-first (+ one tiny TS type module).
**HEAD at start:** `2c9a780 stage-v1z-a: retire telnet and ntp hygiene rules`.
**HEAD at end:** uncommitted (Bujar commits).

## Objective

Lock the contract that "honest hierarchy" means
classifying every visible operational value on the hierarchy
surface as one of `real | demo | empty | unavailable |
not_connected`, with an adjacent provenance marker for any
non-`real` value. Enumerate every seeded literal with
`file:line` citations against HEAD `2c9a780`. Land the
`DataSourceState` discriminated union + `SOURCE_LABEL` copy
map + `HIERARCHY_HONESTY_CONTRACT_VERSION = 1` constant so
V1AB has a typed contract to wire.

No UI change. No rendering wiring. No engine work.

## Scope — IN

- `docs/architecture/HIERARCHY_HONESTY_CONTRACT.md` (new).
- `src/types/dataSource.ts` (new, 20 LOC).
- `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md` —
  one subsection pointer near §6 (Engine / API rule) or §10
  (Visual law) linking the contract.
- `obsidian/stages/V1AA-hierarchy-honesty-contract.md` (this file).
- `obsidian/ANTHRACITE_INDEX.md` — V1AA row.

## Scope — OUT (frozen)

- INTAKE (`src/modes/intake/**`, intake-side types/APIs).
- ASSESS (`src/modes/assess/**`).
- Parsers, validator, fixtures.
- DeviceModel, Receipt, BatchRun export, service_notes.
- `ModeRail` IDs, `src/styles/**`.
- `src-tauri/src/engines/environment.rs` (Rust engine).
- Findings display contract.
- Deps: `package.json`, `pnpm-lock.yaml`, Cargo files.

## Files touched

| Path | Action | Purpose |
|------|--------|---------|
| `docs/architecture/HIERARCHY_HONESTY_CONTRACT.md` | new | Clauses H1..H6, vocabulary, seed inventory (24 rows), MODE_VOCABULARY_DRIFT note, non-goals |
| `src/types/dataSource.ts` | new | `DataSourceState` union, `HIERARCHY_HONESTY_CONTRACT_VERSION = 1`, `SOURCE_LABEL` record (20 LOC) |
| `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md` | edit | One-paragraph pointer to the contract |
| `obsidian/stages/V1AA-hierarchy-honesty-contract.md` | new | This stage note |
| `obsidian/ANTHRACITE_INDEX.md` | edit | V1AA row in stage table |

## Validation

- `pnpm typecheck` — must be clean (`dataSource.ts` is
  pure types + const, no runtime).
- `pnpm test` — count unchanged (no new test; V1AB lands
  the first test on `<ProvenanceTag>`).
- `pnpm build` — clean.
- `cd src-tauri && cargo check --lib` — clean (no Rust diff).
- `cargo test` — skipped (no Rust diff).
- `pwsh tools/ops-readiness.ps1` — READY.
- Protected-path diff — limited to the five paths above.

## Halt conditions

- H1: any rendering change leaked in.
- H2: a contract clause required a Rust constant / schema field.
- H3: a clause required a schema change to `Environment` /
  `EnvironmentReadiness`.
- H4: a dependency change was required.
- H5: `src/types/dataSource.ts` > 40 LOC.
- H6: prior-art grep surfaced an existing data-state
  discriminator we should reuse instead of inventing.
- H7: `MODES_AND_ENGINES_MAP.md` /
  `ENGINE_AND_API_BOUNDARIES.md` contradicted a clause.

None fired.

## Lessons applied (from prior stages)

- **V1Y** — grepped `__tests__/` + adjacent type files for
  hidden consumers before adding the new type module.
  Found INTAKE-side `source_provenance` / `ArchiveSourceBadge`
  (record-source provenance, distinct concept) and the
  `--anth-role-provenance` token. None collide with
  `DataSourceState` / `SOURCE_LABEL` /
  `HIERARCHY_HONESTY_CONTRACT_VERSION`. Documented the
  distinction in the contract preamble.
- **V1Z-A** — re-verified every cited `file:line` in
  `src/App.tsx`, `StatusBar.tsx`, `OpsStrip.tsx` directly
  before writing the inventory table. PK had drifted
  (`ROW_SEEDS` actually 98, not 102; inspector health
  actually 375–382, not 388–392). Inventory cites verified
  numbers.
- **V1Z** — centralised honest-absence labels. V1Z used
  `MISSING_METADATA_LABEL = "not recorded"` for ASSESS
  metadata; V1AA uses `SOURCE_LABEL[state]` as the hierarchy
  analogue. Same discipline.

## Lessons captured (for V1AB)

- **Provenance vocabulary collision.** INTAKE already
  ships `source_provenance` (record-source: which
  file/archive a parsed device came from), `ArchiveSourceBadge`,
  and `--anth-role-provenance` (copper). `DataSourceState`
  is data-state classification — a different question. V1AB
  must name its UI affordance to avoid collision. Suggested
  name: `<DataSourceTag>` or `<SourceStateTag>` rather than
  `<ProvenanceTag>` to keep the vocabularies separate.
  The `--anth-role-provenance` token is **reusable** for the
  data-state marker (single muted/copper hairline matches H5).
- **`OpsStrip` is not currently mounted by `App.tsx`.** V1AB
  should confirm whether `OpsStrip` is rendered by any
  shell composition before editing copy. If not mounted,
  defer V1AB OpsStrip edits to whatever stage actually
  mounts it.
- **Aggregate classification under H1.** `rows` is built
  from `ROW_SEEDS` with selective overlay from
  `getActiveEnvironment` results. Under H1, the aggregate
  is **demo**. V1AB must therefore tag the rows table as
  demo even though the *status* and *device count* columns
  partially carry real data. Don't try to per-cell-classify
  inside a demo aggregate — H1 forbids it.
- **`statusLeft` mixes real + seeded.** The `inventory`
  cell uses `readiness?.total_devices` (real) when present
  but falls back to a sum over seeded `rows`. Under H1 the
  cell is **demo** until the rows aggregate becomes real.

## Next stage handoff (V1AB)

Safe to assume:
- `DataSourceState`, `SOURCE_LABEL`,
  `HIERARCHY_HONESTY_CONTRACT_VERSION` exist at
  `src/types/dataSource.ts`.
- Contract clauses H1..H6 are the binding rules.
- Seed inventory table in the contract is verified against
  HEAD `2c9a780`. If V1AB starts from a later commit it
  must re-verify the file:lines (V1Z-A lesson).

V1AB must re-verify:
- Whether `OpsStrip` is mounted in any AppShell composition
  before editing copy (note above).
- That `EnvironmentCentreD1` and `EnvironmentDetailD2`
  remain pure presentation components with no inline demo
  data before adding `source` props.
- That no existing test asserts on the literal strings the
  V1AB tag copy would change; mechanical text updates are
  fine, behavioural breakage is a halt.

## Commit message (for Bujar)

```
stage-v1aa: hierarchy honesty contract and DataSourceState
```
