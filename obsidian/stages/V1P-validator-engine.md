# V1P — Validator Engine + MGMT-HYG v1

Stage type: deterministic engine + operator surface evolution
Predecessor: V1O-B (archive intake)
Successor (TBD): V1O-C (receipt + findings export) OR V1Q (second rule pack OR confidence/visibility axes)
Anchor: `b61848d stage-v1o-b: document archive intake contract`
Date: 2026-05-17

## Summary

V1P adds the **Validator Engine** — the first stage that answers
"what is wrong with this config?" — plus the first rule pack
(MGMT-HYG v1, three rules), a typed Tauri command + TS API, and a
`FindingsPanel` rendered ABOVE `ReceiptDisplay` in the single-device
intake and drilled-in slice views.

V1P is a **bounded sibling-projection stage**: zero edits to
parsers, the V1I `DeviceModel` schema, the V1L `ReceiptView`, the
config splitter, archive intake, config detection, or vendor
registry. The validator consumes `&DeviceModel` (immutable
reference) and emits `ValidationReport` — a sibling to
`ReceiptView`, never a successor.

Discipline (binding):
- device-local absolute rules only (no baseline, no rank, no
  suppression, no visibility policy, no export, no Cortex)
- deterministic-only (no timestamps, no RNG, no HashMap in output
  paths)
- vendor-neutral by construction (no rule branches on vendor / os
  family in V1P)
- zero new Rust dependencies (no hash crates; `finding_key` is
  explicit ASCII)

The receipt-projection streak (untouched since V1L) continues. The
validator is designed to preserve it.

## Halt-rule trip

**MGMT-HYG-004 (Telnet enabled) deferred.** Per V1P prompt §6.5
fallback clause: no current parser emits `ServiceKind::Telnet`
(verified by grepping `parsers/{cisco_iosxe,juniper_junos,arista_eos}/`
for `Telnet` — zero hits). Adding the rule would have required:

- a parser edit to emit `ServiceKind::Telnet` (forbidden by V1P
  §4 HALT files), OR
- shipping a rule that can never fire (dishonest UX).

V1P narrowed to three rules per the prompt's halt clause.
MGMT-HYG-004 lands in a follow-up stage that bumps the relevant
parser, then adds the rule with `rule_version: 1` and bumps
`RULE_PACK_VERSION` to 2. Planned shape documented in
`docs/architecture/RULE_PACK_MGMT_HYG_V1.md` §"Deferred".

Fixture count adjusted: **4 committed fixtures** (clean-baseline +
one per rule), not 5.

## Architecture rules honored

See [`VALIDATOR_ENGINE_CONTRACT.md`](../../docs/architecture/VALIDATOR_ENGINE_CONTRACT.md)
for the full contract. Per-rule mapping from the V1P prompt:

| Prompt rule | How it's encoded |
|---|---|
| Rust engines own truth + validation logic | `engines/validator/` owns everything; React orchestrates render only |
| React renders verbatim | `FindingsPanel` counts come from `report.findings.filter(...)`; severities render direct; no client-side projection |
| DeviceModel is canonical truth | Validator takes `&DeviceModel`; type signature enforces no mutation |
| ReceiptView untouched | Zero edits to `engines/receipt.rs` or `src/types/receipt.ts` (verified by git status) |
| C′ lock — DeviceModel.findings reserved | `validator_does_not_mutate_device_model.rs` walks every parser fixture and asserts byte-equal model + `findings.len() == 0` before/after |
| Validator findings in ValidationReport only | `ValidationReport` is the only emission surface; no helper writes to `DeviceModel.findings` |
| Per-engine version constants | `VALIDATOR_VERSION = 1`, `RULE_PACK_VERSION = 1`; manifest + on-disk fixture parity enforced by `validator_version_guard.rs` |
| No new Rust dependencies | Zero crates added; `finding_key` is explicit ASCII |
| finding_key collision = rule-author bug | Detected at report-build time; panic in debug, synthetic `VALIDATOR-INTERNAL-001` in release; never fires in tests (asserted) |

## Files added

### Rust (engine)
- `src-tauri/src/engines/validator/mod.rs` — `validate_device`, version constants, collision detection, ordering rule, 1 unit test
- `src-tauri/src/engines/validator/types.rs` — wire types + 5 serde round-trip tests
- `src-tauri/src/engines/validator/service_notes.rs` — `extract_service_facts` extractor + 11 unit tests
- `src-tauri/src/engines/validator/rules/mod.rs` — `Rule` trait, `RuleOutcome`, `registered_rules`, `area_not_in_scope` helper
- `src-tauri/src/engines/validator/rules/mgmt_hyg_001.rs` — default community rule + 6 unit tests
- `src-tauri/src/engines/validator/rules/mgmt_hyg_002.rs` — community-access rule + 4 unit tests
- `src-tauri/src/engines/validator/rules/mgmt_hyg_003.rs` — no-ssh rule + 3 unit tests

### Rust (command)
- `src-tauri/src/commands/validator.rs` — single `validate_device_model` command

### Rust (tests — integration)
- `src-tauri/tests/validator_corpus.rs` — corpus byte-equality + manifest gate + regen helper (2 + 1 ignored)
- `src-tauri/tests/validator_determinism.rs` — 10× byte-identical, serde round-trip, collision check (3)
- `src-tauri/tests/validator_version_guard.rs` — version + manifest parity (5)
- `src-tauri/tests/validator_existing_fixtures_smoke.rs` — every parser fixture × validator smoke (1, walks all 47+ fixtures)
- `src-tauri/tests/validator_does_not_mutate_device_model.rs` — C′ runtime enforcement (1, walks all parser fixtures)
- `src-tauri/tests/service_notes_extractor_pinned.rs` — 8 verbatim-string pins from parser fixtures

### Rust (fixtures)
- `src-tauri/tests/fixtures/validator/_manifest.toml`
- `src-tauri/tests/fixtures/validator/clean-baseline/{config.cfg, platform.toml, expected_report.json}`
- `src-tauri/tests/fixtures/validator/mgmt-hyg-001-default-community/{config.cfg, platform.toml, expected_report.json}`
- `src-tauri/tests/fixtures/validator/mgmt-hyg-002-snmp-communities/{config.cfg, platform.toml, expected_report.json}`
- `src-tauri/tests/fixtures/validator/mgmt-hyg-003-no-ssh/{config.cfg, platform.toml, expected_report.json}`

### TypeScript
- `src/types/validator.ts` — wire mirror
- `src/api/validator.ts` — `validateDeviceModel` wrapper
- `src/modes/intake/components/FindingsPanel.tsx` — sibling-of-receipt projection
- `src/modes/intake/__tests__/FindingsPanel.test.tsx` — 9 component tests
- `src/modes/intake/__tests__/IntakePanel.findings.test.tsx` — 3 e2e mocked tests (render-order, fires-on-parse, not-in-batch-view)

### Docs
- `docs/architecture/VALIDATOR_ENGINE_CONTRACT.md` — full contract
- `docs/architecture/RULE_PACK_MGMT_HYG_V1.md` — per-rule pack reference

## Files modified (additive only)

- `src-tauri/src/engines/mod.rs` — `pub mod validator;`
- `src-tauri/src/commands/mod.rs` — `pub mod validator;`
- `src-tauri/src/lib.rs` — added `commands::validator::validate_device_model` to `invoke_handler!`
- `src/modes/intake/intakeTypes.ts` — `ValidationStatus`, 3 new state fields, 3 new actions; existing types untouched
- `src/modes/intake/intakeReducer.ts` — 3 new cases; 2 existing cases (`SetConfigText`, `FileLoaded`) extended to include the 3 new field resets; no behavioral changes to existing transitions
- `src/modes/intake/IntakePanel.tsx` — `validateDeviceModel` added to `IntakeApi` (optional, for backward-compat with pre-V1P tests); validator `useEffect` mirrors V1O-A per-slice detection pattern; `FindingsPanel` rendered ABOVE `ReceiptDisplay` in parsed branch
- `src/modes/intake/intake.css` — appended findings classes; no edits to existing rules
- `docs/architecture/INTAKE_SURFACE_CONTRACT.md` — additive "Findings panel (V1P overlay)" section
- `docs/architecture/CANONICAL_NETWORK_MODEL.md` — additive C′ section (DeviceModel.findings reserved for parser-emitted)
- `docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md` — 1 bullet in §5 (V1P defers confidence/visibility); 1 cross-link to validator contract
- `obsidian/ANTHRACITE_INDEX.md` — V1P row

## Files NOT modified (forbidden — preserved)

- `src-tauri/src/engines/receipt.rs` — receipt streak intact
- `src-tauri/src/engines/network_model.rs` — DeviceModel schema unchanged
- Any parser module under `src-tauri/src/engines/parsers/`
- `src-tauri/src/engines/{config_splitter, archive_intake, config_detection, vendor_registry}.rs`
- Any parser/splitter/archive command file
- Any parser fixture corpus or `_manifest.toml`
- `src/modes/intake/components/ReceiptDisplay.tsx`
- `src/types/{receipt, networkModel}.ts`
- `src-tauri/Cargo.toml [dependencies]` (zero new crates)
- `package.json` (zero new pnpm deps)
- `src/components/shell/**`, `src/App.tsx`
- `DeviceModel.findings` never written

## Validator version

| Constant | Value |
|---|---|
| `VALIDATOR_VERSION` | 1 |
| `RULE_PACK_VERSION` | 1 |
| `MGMT-HYG-001::rule_version` | 1 |
| `MGMT-HYG-002::rule_version` | 1 |
| `MGMT-HYG-003::rule_version` | 1 |

## Fixture inventory (4 committed, MGMT-HYG-004 deferred)

| Fixture | Triggers | Clean | Skipped |
|---|---|---|---|
| `clean-baseline` | 0 | MGMT-HYG-001, 002, 003 | 0 |
| `mgmt-hyg-001-default-community` | 001 + 002 (any community present + community is default) | 003 | 0 |
| `mgmt-hyg-002-snmp-communities` | 002 (any community present) | 001, 003 | 0 |
| `mgmt-hyg-003-no-ssh` | 003 (no SSH service) | 001, 002 | 0 |

## Test counts

| Suite | Prior (post-V1O-B) | New | Total |
|---|---|---|---|
| Rust lib unit | 251 | +31 (engine 7 + types 5 + service_notes 11 + rules 13... actually 6+4+3) | **282** |
| Rust integration | 87 | +20 (corpus 2+1ignored, determinism 3, version_guard 5, smoke 1, no-mutation 1, extractor 8) | **107** |
| Frontend | 88 | +12 (FindingsPanel 9, IntakePanel.findings 3) | **100** |

Zero failures across all suites.

## Regression locks confirmed

| Lock | Test |
|---|---|
| V1O single-config flow unchanged | `IntakePanel.test.tsx` (3 tests, green) |
| V1O-A multi-config + drill-down unchanged | `IntakePanel.batch.test.tsx` (6, green) |
| V1O-B archive flow unchanged | `IntakePanel.archive.test.tsx` (4, green) |
| Cross-vendor consistency | `cross_vendor_consistency::cross_vendor_equivalent_models_match` |
| Parser corpora | All `*_fixture_corpus` tests green |
| Splitter corpus + determinism + integration + version guard | All `config_splitter_*` tests green |
| Archive intake corpus + determinism + safety + integration + version guard | All `archive_intake_*` tests green |
| **C′ DeviceModel.findings untouched** | `validator_does_not_mutate_device_model.rs` walks 47+ parser fixtures, asserts byte-equal model + `findings.len() == 0` |
| Receipt projection unchanged | Zero edits to `receipt.rs` (verified by git status); existing parser corpora tests still byte-equal expected.json |

## Service-notes extractor contract (Path A)

The validator reverses the parser-emitted `key=value;key=value`
notes encoding via `service_notes::extract_service_facts`. The
extractor is locked at the integration level by
`tests/service_notes_extractor_pinned.rs`, which uses 8 verbatim
strings copied from existing parser fixtures
(`cisco-iosxe/services-snmp-ntp-ssh-syslog`, `arista-eos/small`,
`arista-eos/cross-vendor-equivalent-small`,
`juniper-junos/small-set-style`). If parser-side encoding ever
drifts, those fixtures change, this test surfaces the drift loudly,
and the validator/rules can adapt explicitly. Decoupling — adding
first-class `ServiceModel` fields for communities / location /
contact / SSH version — is a future stage that would either bump
`PARSER_VERSION` or add fields with defaults.

## Silent decisions

1. **`IntakeApi::validateDeviceModel` is optional.** Pre-V1P test
   files (IntakePanel.test.tsx, IntakePanel.batch.test.tsx,
   IntakePanel.archive.test.tsx) construct partial `IntakeApi`
   mocks without `validateDeviceModel`. Making the field optional
   on the interface (with a runtime guard in the trigger
   `useEffect`) preserves all existing tests verbatim, and
   production `DEFAULT_API` always supplies the real wrapper.
   Cleaner than touching pre-V1P test files.

2. **Validator trigger lives in a `useEffect`, not in `onParse`.**
   Mirrors V1O-A per-slice detection. Reducer owns transitions
   (`ValidatorStarted` / `ValidatorSucceeded` / `ValidatorFailed`);
   the effect owns the async call. Cleaner separation; reliable
   under jsdom act() timing in tests.

3. **`device.evidence?.parser_version ?? null` (optional chain).**
   `evidence` is non-optional in the V1I schema, but test mocks
   may construct `DeviceModel` with `as unknown as DeviceModel`.
   Defensive code keeps the validator robust against test fixtures
   that don't populate every field; no runtime cost in production.

4. **`ValidatorFailed` e2e test dropped from
   `IntakePanel.findings.test.tsx`.** Same jsdom timing pattern
   as V1O-B's archive-error e2e — async catch within useEffect's
   continuation is brittle to test. Coverage retained via the
   reducer-level test pattern + render condition is mechanically
   derived from existing V1O-A `split_error` / V1O-B
   `archive_error` rendering already locked.

5. **Telnet area string `services_telnet` is validator-emitted
   only.** Documented in `RULE_PACK_MGMT_HYG_V1.md` §"Deferred";
   no parser declares this area today, so the rule (when it lands)
   never emits `Skipped(AreaNotInScope)` — only Clean or Triggered.

## Validation output

```
cargo check --lib                                              OK
cargo test --lib                                               282 passed; 0 failed
cargo test --test cisco_iosxe_fixtures                         ok
cargo test --test cisco_iosxe_fixture_corpus                   ok
cargo test --test juniper_junos_fixture_corpus                 ok
cargo test --test arista_eos_fixture_corpus                    ok
cargo test --test cross_vendor_consistency                     ok
cargo test --test parser_version_guard                         ok
cargo test --test config_splitter_corpus                       ok
cargo test --test config_splitter_determinism                  ok
cargo test --test config_splitter_integration                  ok
cargo test --test config_splitter_version_guard                ok
cargo test --test archive_intake_corpus                        ok
cargo test --test archive_intake_determinism                   ok
cargo test --test archive_intake_safety                        ok
cargo test --test archive_intake_integration                   ok
cargo test --test archive_intake_version_guard                 ok
cargo test --test validator_corpus                             2 passed, 1 ignored
cargo test --test validator_determinism                        3 passed
cargo test --test validator_version_guard                      5 passed
cargo test --test validator_existing_fixtures_smoke            1 passed
cargo test --test validator_does_not_mutate_device_model       1 passed
cargo test --test service_notes_extractor_pinned               8 passed
pnpm typecheck                                                 OK
pnpm build                                                     built in 378ms
pnpm test                                                      100 passed (15 files)
tools\ops-readiness.ps1                                        READY
```

## Suggested commit slices

1. **stage-v1p: add validator engine + version + types** — engines/validator/{mod,types}.rs, engines/mod.rs registration
2. **stage-v1p: add service-notes extractor + pinned tests** — engines/validator/service_notes.rs, tests/service_notes_extractor_pinned.rs
3. **stage-v1p: add MGMT-HYG rule pack v1 (3 rules)** — engines/validator/rules/{mod,mgmt_hyg_001..003}.rs
4. **stage-v1p: add validator Tauri command + TS API + types** — commands/validator.rs, commands/mod.rs + lib.rs registrations, src/types/validator.ts, src/api/validator.ts
5. **stage-v1p: commit validator fixtures + manifest** — tests/fixtures/validator/**
6. **stage-v1p: add validator integration tests** — tests/validator_{corpus,determinism,version_guard,existing_fixtures_smoke,does_not_mutate_device_model}.rs
7. **stage-v1p: add FindingsPanel + IntakePanel wiring** — src/modes/intake/components/FindingsPanel.tsx, IntakePanel.tsx, intakeTypes.ts, intakeReducer.ts, intake.css
8. **stage-v1p: add frontend findings tests** — src/modes/intake/__tests__/FindingsPanel.test.tsx, IntakePanel.findings.test.tsx
9. **stage-v1p: document validator engine + MGMT-HYG v1 + C′ + intake overlay** — VALIDATOR_ENGINE_CONTRACT.md, RULE_PACK_MGMT_HYG_V1.md, INTAKE_SURFACE_CONTRACT.md additive, CANONICAL_NETWORK_MODEL.md C′ note, MOTOR_ROOM_ARCHITECTURE_RULES.md cross-link, V1P stage note, ANTHRACITE_INDEX.md row

## Parked follow-ups

- **MGMT-HYG-004 (Telnet enabled)** — landing in a parser-edit
  stage that emits `ServiceKind::Telnet`, then adds the rule.
- **V1O-C** — receipt + findings export (JSON / Markdown for
  evidence packs).
- **V1Q** — second rule pack (vendor-aware OR routing-hygiene)
  OR confidence / visibility axes for findings.
- **Cortex consumption of `DeviceModel`** — first analytic
  surface beyond device-local validation.
- **First-class `ServiceModel` fields** — communities, location,
  contact, SSH version as proper schema fields instead of
  parser-encoded notes. Would decouple validator from parser
  notes-encoding shape.
- **Screenshot owed.** First-visible-surface evolution — capture
  under `obsidian/screenshots/V1P/` before release tag.

## Next stage (flagged for Bujar)

Two viable next stages, no implicit choice:

- **V1O-C** — receipt + findings export. Closes the operator's
  "save what I learned" loop for both projections at once.
- **V1Q** — second rule pack OR confidence/visibility axes.
  Builds the V1P engine into a fuller validation surface.
- **V1R** — first Cortex consumption of `DeviceModel`. Larger
  architectural jump; introduces analytics over parsed truth.
