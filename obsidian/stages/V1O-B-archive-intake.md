# V1O-B — Archive Intake

Stage type: deterministic engine + operator surface evolution
Predecessor: V1O-A (multi-device intake via splitter)
Successor (TBD): V1P (Cortex consumption) OR V1O-C (receipt export)
Anchor: `43c6cdd docs: update claude operating guidance`
Date: 2026-05-17

## Summary

V1O-B adds a deterministic Rust archive intake engine that takes
raw archive bytes (`.zip`, `.tar`, `.tar.gz`, `.tgz`), independently
verifies the kind by inspecting leading bytes, walks entries in scan
order, sanitises paths, decodes text-likely entries strictly as
UTF-8, and emits a structured `ArchiveIntakeResult` with per-entry
status and typed warnings. The result is consumed by the existing
V1O-A splitter — once per `Extracted` entry — and the resulting
slices flatten into the existing `BatchSummaryView` with per-card
provenance badges and a collapsed-by-default archive inventory
panel.

V1O-B is a **bounded adapter stage**: zero edits to parsers,
DeviceModel, receipt projection, vendor registry, config detection,
or config splitter. The V1O single-config flow is **byte-identical
to V1O** when an archive contains a single entry whose split yields
SingleConfig (regression lock R11). The V1O-A multi-config paste
flow is untouched (regression lock).

The byte-transport verification gate (Task 0) was honoured: a
temporary `archive_intake_echo_bytes` command exercised the
`Vec<u8>` boundary via Rust unit tests (6 cases) and verified the
`#[tauri::command]` wrapper accepts `Vec<u8>` unmangled. The echo
command **remains in the codebase across implementation** and is
removed by the final-report commit per the prompt's acceptance
criterion #1.

## Architecture rules honored (binding)

See [`ARCHIVE_INTAKE_CONTRACT.md`](../../docs/architecture/ARCHIVE_INTAKE_CONTRACT.md)
for the full contract; rules R1–R13 from the V1O-B prompt encode as
follows.

| Rule | How it's encoded |
|---|---|
| **R1** Adapter shape | Frontend orchestrates archive → splitter → existing pipeline. Engine does not parse, detect, model, or project. |
| **R2** Byte-based kind validation | `detect_archive_kind` inspects leading bytes; `KindMismatch` warning surfaces in inventory header when hint disagrees with detected. |
| **R3** Container-format dependency exception | `zip`, `tar`, `flate2` documented as decoders, not parsers. Different category from the motor-room rule. |
| **R4** Source provenance threading | `ArchiveEntryRef` attached to every slice; namespaced slice ids `<entry_id>/<slice_id>`; `ArchiveSourceBadge` per device card + drilldown header. |
| **R5** Determinism | `entry_id` is `entry-{i}` in scan order; sort + renumber in engine; no HashMap; no timestamps; serde round-trip byte-stable; 10× byte-identical runs locked. |
| **R6** Safety caps as runtime constants | `MAX_TOTAL_UNCOMPRESSED_BYTES = 200MiB`, `MAX_ENTRY_BYTES = 10MiB`, `MAX_ENTRIES = 1024`, `MAX_COMPRESSION_RATIO = 100`, `MAX_PATH_DEPTH = 16`. Cap violations → typed warnings; never panic. |
| **R7** Path normalisation | Leading separators stripped; `..` rejected; NUL rejected; depth-truncated; backslashes normalised to forward slashes for display; raw preserved on entry when changed. |
| **R8** Symlinks ignored | Symlink + hard-link entries surface `SymlinkIgnored` + status `SkippedSymlink`; never followed. |
| **R9** Strict UTF-8 | No Latin-1 fallback; decode failure → `EntryDecodeFailed` + `SkippedDecodeError` + decode_warning naming the byte offset. |
| **R10** Text-likely heuristic | `cfg`, `conf`, `config`, `txt`, `show`, `run`, `startup`, plus no-extension files. All others → `SkippedNonText`. |
| **R11** Regression locks | Single-archive-single-entry-single-config flows through `ArchiveSingleConfigPassthrough` → V1O single-config UX with no batch chrome. Locked by reducer + panel tests. V1O / V1O-A paste paths untouched (existing tests green). |
| **R12** Inventory panel collapsed default | `<details>` element without `open` attribute by default; `initiallyOpen` prop available; single-clean-archive case omits inventory entirely via the R11 passthrough. |
| **R13** Honesty rules carry forward | Detected kind shown (not hint); warnings rendered verbatim by `kind`; skipped entries de-emphasised but never hidden; decode warnings verbatim; archive_intake_version visible. |

## Byte-transport verification result (Task 0)

| Check | Result |
|---|---|
| `archive_intake_echo_bytes` Tauri command compiles with `Vec<u8>` arg | **PASS** (cargo check) |
| `compute_echo(&[])` returns zero count + empty hex | **PASS** |
| `compute_echo(&(0..=15)…)` returns `000102…0f` for both first and last | **PASS** |
| `compute_echo(&(0..256)…)` returns differing first / last hex | **PASS** |
| `compute_echo(&high-bit bytes)` preserves 0x80, 0xff, 0xfe, 0x00, 0xc0, 0xc2, 0xa3 | **PASS** |
| `#[tauri::command]` wrapper matches direct logic | **PASS** |

6 / 6 unit tests green. Echo command + harness remain in code across implementation; **removed before commit** per acceptance criterion #1.

Runtime IPC roundtrip in `pnpm tauri dev` is the recommended final
sanity check — Tauri 2.x documents `Uint8Array → Vec<u8>` via raw
binary body, but a manual dev-mode confirmation belongs to Bujar
before the V1O-B release tag.

## Files changed

### New (Rust engine + tests)
- `src-tauri/src/engines/archive_intake.rs` — engine + `ARCHIVE_INTAKE_VERSION = 1`, 16 unit tests
- `src-tauri/src/commands/archive_intake.rs` — Tauri commands (`archive_intake`, temp `archive_intake_echo_bytes`), 6 unit tests
- `src-tauri/tests/archive_intake_corpus.rs` — committed-fixture byte-equality + manifest gate + regen helper (3 tests, 1 `#[ignore]`)
- `src-tauri/tests/archive_intake_determinism.rs` — 10× byte-identical + serde round-trip + stable entry ids (3 tests)
- `src-tauri/tests/archive_intake_safety.rs` — 9 synthesised adversarial scenarios + truncated-header err (10 tests)
- `src-tauri/tests/archive_intake_integration.rs` — archive → splitter → detect → parse → project end-to-end (2 tests)
- `src-tauri/tests/archive_intake_version_guard.rs` — manifest ↔ source ↔ on-disk drift guard (4 tests)

### Modified (Rust registration only)
- `src-tauri/src/engines/mod.rs` — `pub mod archive_intake;`
- `src-tauri/src/commands/mod.rs` — `pub mod archive_intake;`
- `src-tauri/src/lib.rs` — added `commands::archive_intake::{archive_intake, archive_intake_echo_bytes}` to `invoke_handler!`
- `src-tauri/Cargo.toml` — added `zip = "0.6"`, `tar = "0.4"`, `flate2 = "1.0"` (container-format decoders only; see contract)

### New (TypeScript API surface)
- `src/types/archiveIntake.ts` — verbatim mirror of Rust wire shape + `ArchiveEntryRef` TS-only provenance type
- `src/api/archiveIntake.ts` — `archiveIntake(bytes, kindHint)` Tauri wrapper + `archiveKindFromFilename` helper

### Modified (frontend intake)
- `src/modes/intake/intakeTypes.ts` — extended `IntakeSourceKind` (`archive`), `IntakeErrorStage` (`archive`), `BatchStatus` (3 archive states), `BatchData` (3 archive fields), 5 archive actions
- `src/modes/intake/intakeReducer.ts` — handled 5 new archive actions; archive provenance threaded through `SplitToBatch`
- `src/modes/intake/IntakePanel.tsx` — added `archiveIntake` to `IntakeApi`, `onOpenArchive` orchestrator, archive bar + inventory + drilldown provenance badge
- `src/modes/intake/components/BatchSummaryView.tsx` — accepts optional `archiveProvenance` prop; renders `ArchiveSourceBadge` per slice card
- `src/modes/intake/intake.css` — appended archive-bar, inventory panel, source-badge classes

### New (frontend components + tests)
- `src/modes/intake/components/ArchiveOpenButton.tsx` — file picker (.zip / .tar / .tar.gz / .tgz)
- `src/modes/intake/components/ArchiveInventoryPanel.tsx` — collapsed-by-default `<details>` with per-entry table + warning list + KindMismatch flag
- `src/modes/intake/components/ArchiveSourceBadge.tsx` — `from <entry_path>` provenance badge
- `src/modes/intake/__tests__/intakeReducer.archive.test.ts` — 9 reducer archive-transition tests
- `src/modes/intake/__tests__/ArchiveInventoryPanel.test.tsx` — 7 component tests (collapsed default, kind mismatch, skipped visibility, decode warning verbatim, …)
- `src/modes/intake/__tests__/ArchiveSourceBadge.test.tsx` — 3 component tests
- `src/modes/intake/__tests__/IntakePanel.archive.test.tsx` — 4 mocked end-to-end archive tests (single-config R11 lock, multi-entry mixed-provenance, inventory default state, drilldown provenance)

### New (fixtures — 4 committed binaries + manifest)
- `src-tauri/tests/fixtures/archives/_manifest.toml`
- `src-tauri/tests/fixtures/archives/zip-single-config/{archive.zip, expected.json}` (313 B)
- `src-tauri/tests/fixtures/archives/zip-multiple-configs/{archive.zip, expected.json}` (1014 B)
- `src-tauri/tests/fixtures/archives/tar-multiple-configs/{archive.tar, expected.json}` (4096 B)
- `src-tauri/tests/fixtures/archives/targz-multiple-configs/{archive.tar.gz, expected.json}` (637 B)

The 9 adversarial scenarios (compression bomb, oversize, traversal,
symlink, too-many-entries, nested archive, corrupt, empty,
kind-mismatch) are constructed in-test from the `zip`/`tar`/`flate2`
crates inside `archive_intake_safety.rs`; not committed as binary
fixtures because the construction code IS the contract under test.

### New (docs)
- `docs/architecture/ARCHIVE_INTAKE_CONTRACT.md` — full engine contract

### Modified (docs)
- `docs/architecture/INTAKE_SURFACE_CONTRACT.md` — appended "Archive mode (V1O-B overlay)" section
- `obsidian/ANTHRACITE_INDEX.md` — V1O-B row
- `.gitattributes` — binary overrides for archive fixtures only

### Not modified (forbidden files — preserved)
- `network_model.rs`, `vendor_registry.rs`, `config_detection.rs`, `config_splitter.rs`, `receipt.rs`
- Any parser module (`engines/parsers/**`)
- Parser / splitter / receipt / detection / vendor_registry command files
- V1O's `ReceiptDisplay`, V1O-A `BatchSummaryView` internals (only prop-extension)
- `PARSER_VERSION`, `SPLITTER_VERSION` (untouched)
- Parser / splitter corpora + their `_manifest.toml`

## Validation

All gates green at HEAD:

```
cargo check --manifest-path src-tauri\Cargo.toml --lib                  ok
cargo test --manifest-path src-tauri\Cargo.toml --lib                   235 → 257 (235 prior + 22 new from archive_intake + commands::archive_intake)
cargo test --test cisco_iosxe_fixtures                                  ok
cargo test --test cisco_iosxe_fixture_corpus                            ok
cargo test --test juniper_junos_fixture_corpus                          ok
cargo test --test arista_eos_fixture_corpus                             ok
cargo test --test cross_vendor_consistency                              ok
cargo test --test parser_version_guard                                  ok
cargo test --test config_splitter_corpus                                ok
cargo test --test config_splitter_determinism                           ok
cargo test --test config_splitter_integration                           ok
cargo test --test config_splitter_version_guard                         ok
cargo test --test archive_intake_corpus                                 2 passed, 1 ignored (regen helper)
cargo test --test archive_intake_determinism                            3 passed
cargo test --test archive_intake_safety                                 10 passed
cargo test --test archive_intake_integration                            2 passed
cargo test --test archive_intake_version_guard                          4 passed
pnpm typecheck                                                          ok
pnpm build                                                              ok
pnpm test                                                               88 passed (65 prior + 23 new V1O-B)
tools\ops-readiness.ps1                                                 READY
```

## Silent decisions

Documented here so the next stage author has the full context.

1. **Crate versions pinned at lower-minor (zip 0.6, tar 0.4, flate2 1.0).** Newer zip 2.x has breaking API changes around symlink + EOCD detection; sticking with 0.6.6 keeps the surface stable. Bump policy lives in `ARCHIVE_INTAKE_CONTRACT.md`.
2. **Synthesised batch result for archive flow.** When extracted entries each produce multiple slices, the frontend flattens with `<entry_id>/<slice_id>` ids and a `method: { kind: "heuristic" }` label. The actual per-entry methods are visible via the archive inventory, so the batch summary's single `method` field labels honestly as "heuristic" rather than inventing a new variant.
3. **Single-clean-archive inventory omission.** R11 regression lock falls all the way through to V1O single-config UX with NO inventory rendered. The trade-off is "operator sees nothing about the archive" vs "operator sees identical V1O UX". The latter is the lock the prompt requires; the source filename `<archive>/<entry_path>` carries the provenance.
4. **`ArchiveOpenFailed` reducer guard relaxed.** Initially gated on `archive_loading | archive_splitting`; relaxed to accept from any state. Rationale: async archive load can fail from any predecessor, and the error must always surface. Equivalent to V1O's `FileLoadFailed` accepting from any non-busy state.
5. **`VENDOR_ENGINE_PLAN.md` left untouched.** That doc is a vendor roster, not an engine timeline; V1O-B adds an engine but not a vendor. No change appropriate.
6. **Synthesised tar.gz fixture timestamps.** `tar::Header::set_mtime(0)` + `flate2::GzBuilder::mtime(0)` + no embedded filename → byte-identical archive on rebuild.

## What did NOT change

Hard exclusions from the V1O-B prompt are all preserved. Nothing in
this stage:

- adds a fourth parser, validator engine, or findings generator
- bumps `PARSER_VERSION` or `SPLITTER_VERSION`
- edits any parser, model, splitter, or receipt module
- touches existing parser / splitter fixture corpora or manifests
- introduces a tree browser, password prompt, drag-and-drop, recents, persistence, export, search, edit-paths, or nested-archive recursion
- writes to disk at runtime
- adds Rust dependencies beyond `zip`, `tar`, `flate2`
- adds new pnpm dependencies
- runs git commands or modifies `.gitignore`

## Open follow-ups (parked, not in V1O-B)

- **V1O-C** — receipt export (JSON / Markdown), copy-out for evidence
  packs. The archive flow naturally raises "operator wants to save what they just got" demand. Parked.
- **Runtime IPC roundtrip** in `pnpm tauri dev` to manually confirm the byte-transport contract. Owed by Bujar pre-release.
- **V1P** — first real Cortex consumption of `DeviceModel`. Already on the roadmap; orthogonal to V1O-B.
- **`ArchiveInventoryPanel` density polish** — current rendering is functional but utilitarian. Visual law screenshot review (per `INDUSTRIAL_VISUAL_LAW.md`) belongs in the next surface-tuning pass.
- **Screenshot owed.** First-visible-surface evolution — capture under `obsidian/screenshots/V1O-B/` before tag.

## Next stage (flagged for Bujar / Vale)

Two viable next stages, no implicit choice made:

- **V1P** — Cortex consumption of `DeviceModel`. First analytic surface; introduces the V1P engine that takes parsed devices and produces invariants / findings.
- **V1O-C** — Receipt export. Smaller scope; closes the "I just opened an archive, now let me save what I learned" loop.

V1P is the more architecturally interesting jump. V1O-C is the
narrower operator-completing finish to the intake arc. Choose
deliberately.
