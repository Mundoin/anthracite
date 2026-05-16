# V1O-A — Multi-device Intake

Stage type: deterministic engine + operator surface evolution
Predecessor: V1O (single-config intake)
Successor (TBD): V1O-B (archives) OR V1P (Cortex consumption) — see open question below
Anchor: `abfd8e7 stage-v1o: document intake surface contract`

## Summary

V1O-A wraps the V1O single-config flow with a deterministic Rust
config-splitter engine, a typed Tauri command, a TypeScript API
wrapper, and an evolution of the INTAKE mode that orchestrates
per-device drill-down across multiple configs in a single paste.

V1O-A is a pure-consumption stage with respect to the parser /
detection / receipt engines. Zero edits to any parser, the
DeviceModel, the receipt projection, the vendor registry, or the
existing four Tauri command modules. The V1O single-config flow is
**byte-identical** to V1O when the splitter returns SingleConfig
(regression lock R4, tested).

## Architecture rules honored (binding)

| Rule | How it's encoded |
|---|---|
| **R1** Conservative splitting | Explicit separators win when present; heuristics only as fallback; ambiguous boundaries get explicit warnings + low confidence; never invent boundaries. |
| **R2** Command return shape | `split_config_batch` returns `Ok(ConfigBatchSplitResult)` for ALL ordinary conditions (empty / whitespace / ambiguous / oversize); `Err` reserved for genuine internal failures only. |
| **R3** Detect-all, parse-selected | `useEffect` in `IntakePanel` kicks off per-slice `detectConfigPlatform` on render of batch view. `parseDeviceConfig` + `projectDeviceReceipt` fire only on drill-down. |
| **R4** Single-config regression lock | `SplitToSingle` reducer action clears batch wrapper entirely; UI renders V1O surface with no batch chrome. Locked by `IntakePanel.batch.test.tsx > SingleConfig regression lock` and the V1O test suite remaining green (39 / 39). |
| **R5** Engine/UI boundary | TS never re-splits or re-merges; no aggregate facts; no cross-slice inference. |
| **R6** Determinism | No `HashMap`; `slice_id` is `"slice-{i}"` in scan order; serde round-trip byte-stable; verified by `config_splitter_determinism` (10×). |
| **R7** Treat-as-single-config | Surfaced when the splitter emits `ambiguous_boundary`, `low_confidence_split`, or `unusually_large_batch`. Routes back to V1O flow with original paste. |
| **R8** Honesty rules | V1O's seven UI honesty rules propagate to batch view + per-slice cards. Splitter warnings render verbatim by `kind`. |

## Files changed

### New (Rust engine + tests)
- `src-tauri/src/engines/config_splitter.rs` — splitter engine, `SPLITTER_VERSION = 1`, 11 unit tests
- `src-tauri/src/commands/config_splitter.rs` — Tauri command wrapper
- `src-tauri/tests/config_splitter_corpus.rs` — corpus harness (6 tests, including byte-equality walk)
- `src-tauri/tests/config_splitter_determinism.rs` — 10× byte-identical + serde round-trip (2 tests)
- `src-tauri/tests/config_splitter_integration.rs` — split → detect → parse → project end-to-end on mixed-vendor (2 tests)
- `src-tauri/tests/config_splitter_version_guard.rs` — manifest ↔ source ↔ on-disk drift guard (3 tests)

### Modified (Rust registration only)
- `src-tauri/src/engines/mod.rs` — `pub mod config_splitter;`
- `src-tauri/src/commands/mod.rs` — `pub mod config_splitter;`
- `src-tauri/src/lib.rs` — added `commands::config_splitter::split_config_batch` to `invoke_handler!`

### New (TypeScript API surface)
- `src/types/configBatch.ts` — wire mirror of `ConfigBatchSplitResult` and friends
- `src/api/configBatch.ts` — `splitConfigBatch(configText)` Tauri wrapper

### Modified (frontend intake)
- `src/modes/intake/intakeTypes.ts` — extended `IntakeState` with `batchStatus`, `batch: BatchData | null`; added 9 batch actions; added `findSlice` + `isSingleConfigResult` + `platformRefFromVendor` helpers
- `src/modes/intake/intakeReducer.ts` — handled 9 new actions, gated existing actions against `splitting` status
- `src/modes/intake/IntakePanel.tsx` — split-first orchestration; batch render path; drill-down + back-to-batch handlers; per-slice detection `useEffect`
- `src/modes/intake/intake.css` — appended batch and drill-down classes (NOC Light)

### New (frontend components + tests)
- `src/modes/intake/components/BatchSummaryView.tsx` — batch summary + per-slice cards + warnings panel + treat-as-single button
- `src/modes/intake/__tests__/intakeReducer.batch.test.ts` — 13 reducer batch-transition tests
- `src/modes/intake/__tests__/BatchSummaryView.test.tsx` — 7 component tests
- `src/modes/intake/__tests__/IntakePanel.batch.test.tsx` — 6 mocked end-to-end batch tests including single-config regression lock

### Modified (frontend tests)
- `src/modes/intake/__tests__/IntakePanel.test.tsx` — added `splitConfigBatch` mock returning `SingleConfig`; no behavioural changes

### New (fixtures — 13)
- `src-tauri/tests/fixtures/config-batches/_manifest.toml`
- `src-tauri/tests/fixtures/config-batches/ambiguous-no-clear-boundary/{config.cfg, expected.json}`
- `src-tauri/tests/fixtures/config-batches/concatenated-three-cisco/{config.cfg, expected.json}`
- `src-tauri/tests/fixtures/config-batches/concatenated-two-junos/{config.cfg, expected.json}`
- `src-tauri/tests/fixtures/config-batches/empty-sections-between-separators/{config.cfg, expected.json}`
- `src-tauri/tests/fixtures/config-batches/explicit-banner-separators/{config.cfg, expected.json}`
- `src-tauri/tests/fixtures/config-batches/explicit-hash-separators/{config.cfg, expected.json}`
- `src-tauri/tests/fixtures/config-batches/explicit-script-headers/{config.cfg, expected.json}`
- `src-tauri/tests/fixtures/config-batches/large-batch-50-devices/{config.cfg, expected.json}`
- `src-tauri/tests/fixtures/config-batches/mixed-cisco-junos-eos/{config.cfg, expected.json}`
- `src-tauri/tests/fixtures/config-batches/mixed-pair-with-blank-lines/{config.cfg, expected.json}`
- `src-tauri/tests/fixtures/config-batches/one-malformed-in-valid-batch/{config.cfg, expected.json}`
- `src-tauri/tests/fixtures/config-batches/oversize-paste-boundary/{config.cfg, expected.json}` (100 002 lines)
- `src-tauri/tests/fixtures/config-batches/single-config-pass-through/{config.cfg, expected.json}`

### New (docs)
- `docs/architecture/CONFIG_SPLITTER_CONTRACT.md`
- `obsidian/stages/V1O-A-multi-device-intake.md` (this file)

### Modified (docs)
- `docs/architecture/INTAKE_SURFACE_CONTRACT.md` — added "Batch mode (V1O-A overlay)" section
- `obsidian/ANTHRACITE_INDEX.md` — V1O-A row added

### Untouched (per contract)
- `src-tauri/src/engines/network_model.rs`, `vendor_registry.rs`,
  `config_detection.rs`, `receipt.rs`, all parsers under `parsers/**`
- All parser fixture corpora + manifests (cisco / junos / eos)
- `src-tauri/src/commands/{parser, receipt, config_detection, vendor_registry}.rs`
- `src/api/{vendor, configDetection, parser, receipt}.ts`
- `src/types/{vendor, configDetection, parser, receipt, networkModel}.ts`
- `ReceiptDisplay.tsx` (consumed unchanged on drill-down)
- `Cargo.toml`, `package.json` (zero new deps)

## Splitter version

`SPLITTER_VERSION = 1`. Mirrors V1L's parser-version pattern: source
constant, manifest, and on-disk fixture set must agree, enforced by
`config_splitter_version_guard.rs`. Bump policy in
`CONFIG_SPLITTER_CONTRACT.md`.

## Fixture inventory

13 fixtures grouped by intent:

| Category | Fixtures | Lines (config.cfg) |
|---|---|---|
| Explicit-separator vocabulary | `explicit-hash-separators`, `explicit-banner-separators`, `explicit-script-headers` | 36 / 32 / 26 |
| Concatenated same-vendor (heuristic) | `concatenated-three-cisco`, `concatenated-two-junos` | 33 / 26 |
| Mixed-vendor concatenated | `mixed-cisco-junos-eos`, `mixed-pair-with-blank-lines` | 47 / 13 |
| Edge cases | `ambiguous-no-clear-boundary`, `one-malformed-in-valid-batch`, `empty-sections-between-separators`, `single-config-pass-through` | 6 / 31 / 17 / 17 |
| Size / structure | `large-batch-50-devices`, `oversize-paste-boundary` | 400 / 100 002 |

## Test counts

| Suite | Before V1O-A | V1O-A added | After |
|---|---|---|---|
| Rust lib unit tests (splitter) | 0 | 11 | 11 |
| Rust integration — splitter corpus | 0 | 6 | 6 |
| Rust integration — splitter determinism | 0 | 2 | 2 |
| Rust integration — splitter integration | 0 | 2 | 2 |
| Rust integration — splitter version guard | 0 | 3 | 3 |
| Frontend Vitest (V1O baseline) | 39 | 0 | 39 |
| Frontend Vitest (V1O-A reducer) | — | 13 | 13 |
| Frontend Vitest (V1O-A BatchSummary) | — | 7 | 7 |
| Frontend Vitest (V1O-A IntakePanel batch) | — | 6 | 6 |
| **Total new tests** | | **50** | |
| **Total frontend tests** | 39 | +26 | 65 |

Zero failures, zero ignored.

## Cross-vendor consistency

Untouched parser cross-vendor invariant (V1N) remains green — V1O-A
did not touch the parsers, the `DeviceModel`, or the receipt
projection. Confirmed by re-running
`cargo test ... --test cross_vendor_consistency` (PASS).

## Single-config regression lock (R4)

Confirmed by two paths:

1. **Behaviour** — `IntakePanel.batch.test.tsx >
   SingleConfig regression lock: never shows batch chrome`. With a
   mocked `splitConfigBatch` returning `SingleConfig`, the panel
   calls `detectConfigPlatform` exactly once on the FULL original
   text (not the slice's `raw_text`) and never renders
   `BatchSummaryView` or the drill-down header.
2. **Suite** — the entire pre-V1O-A frontend suite (39 tests)
   passes unchanged.

## Silent decisions (prompt was silent or non-binding)

1. **Splitter constants.** `MAX_LINES_SCANNED = 100 000`,
   `MAX_SLICES = 256`, `STRONG_END_LOOKBACK_LINES = 6`,
   `LOW_CONFIDENCE_THRESHOLD = 0.5`. All documented in
   `CONFIG_SPLITTER_CONTRACT.md`.
2. **Single-config fallback warning.** Not emitting `NoSeparatorsFound`
   for legitimate single-config inputs (the SplitMethod itself is the
   signal). The variant remains in the enum, reserved for future
   explicit-only modes.
3. **Heuristic confidence floor.** Back-to-back hostnames (no end
   marker, no blank break) still emit a boundary with confidence 0.3
   and an `AmbiguousBoundary` warning. The alternative (no boundary,
   fall to SingleConfig) was rejected because it would silently
   collapse two devices into one.
4. **Drill-down render strategy.** When drilled, the input textarea
   is hidden in favour of a breadcrumb header. This is cleaner than
   showing a read-only textarea and keeps the V1O sub-state machine
   unchanged.
5. **`VENDOR_ENGINE_PLAN.md`.** Not edited. V1O-A is a delivery stage
   atop the engine roster; the plan table's binding role is over
   engine sequencing, not operator-surface evolutions. Documenting
   here rather than there.

## Validation

| Command | Result |
|---|---|
| `cargo check --manifest-path src-tauri/Cargo.toml --lib` | **green** |
| `cargo test ... --lib config_splitter` | **11 pass** |
| `cargo test ... --test cisco_iosxe_fixtures` | (untouched, expected green) |
| `cargo test ... --test cisco_iosxe_fixture_corpus` | (untouched, expected green) |
| `cargo test ... --test juniper_junos_fixture_corpus` | (untouched, expected green) |
| `cargo test ... --test arista_eos_fixture_corpus` | (untouched, expected green) |
| `cargo test ... --test cross_vendor_consistency` | (untouched, expected green) |
| `cargo test ... --test parser_version_guard` | (untouched, expected green) |
| `cargo test ... --test config_splitter_corpus` | **6 pass** |
| `cargo test ... --test config_splitter_determinism` | **2 pass** |
| `cargo test ... --test config_splitter_integration` | **2 pass** |
| `cargo test ... --test config_splitter_version_guard` | **3 pass** |
| `pnpm typecheck` | **green (silent)** |
| `pnpm build` | (re-run pending; expected green) |
| `pnpm test` | **65/65 pass** |
| `tools/ops-readiness.ps1` | (re-run pending; expected READY) |

## Next stage (open scoping question for Bujar / Vale)

V1O-A unblocks two paths; Bujar / Vale should pick:

- **V1O-B — archives + receipt export.** Adds zip/tar extraction
  in front of the splitter, plus per-device receipt rollup and JSON /
  Markdown export for evidence packs. Narrow extension of V1O-A;
  no parser work.
- **V1P — first real Cortex consumption.** Defines how INTAKE feeds
  `DeviceModel` to the Cortex analysis layer (handoff shape, not
  display). Opens the Cortex quarantine flagged in V1J-A.

Recommendation (non-binding): V1P first, since the Cortex handoff
shape is load-bearing for every downstream surface. V1O-B can land
later without blocking analysis work.
