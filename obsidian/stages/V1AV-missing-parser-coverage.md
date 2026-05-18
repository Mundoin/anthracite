# V1AV — Missing Parser Coverage (Huawei VRP + FortiOS)

**Arc:** MOTOR-ROOM / PARSER-COVERAGE
**Date:** 2026-05-18
**Status:** landed

---

## Objective

Fill in the highest-priority missing parser from the existing
Anthracite parser architecture without redesigning the framework.
This stage adds bounded **Huawei VRP** and **FortiOS** parser
coverage at `PARSER_VERSION = 1` without redesigning the framework.
Both platforms were already grounded by vendor registry and config
detection. The parser-coverage expansion lane is now open; Cisco
IOS-XR and MikroTik RouterOS remain missing and are the next grounded
platforms to evaluate after this slice.

---

## Parser gap matrix (verified)

| platform | vendor_registry | config_detection | parser module | this stage |
|---|---|---|---|---|
| cisco-iosxe | ✓ | ✓ | ✓ (V4) | — |
| cisco-nxos | ✓ | ✓ | ✓ (V2) | — |
| arista-eos | ✓ | ✓ | ✓ | — |
| juniper-junos | ✓ | ✓ | ✓ | — |
| cisco-iosxr | ✓ | ✓ | **missing** | deferred / next grounded candidate |
| huawei-vrp | ✓ | ✓ | ✓ (V1AV v1) | **✓ this stage** |
| fortinet-fortios | ✓ | ✓ | ✓ (V1AV v1) | **✓ this stage** |
| mikrotik-routeros | ✓ | ✓ | **missing** | deferred / next grounded candidate |

---

## Scope in

**Rust parser modules** —
`src-tauri/src/engines/parsers/huawei_vrp.rs` and
`src-tauri/src/engines/parsers/fortinet_fortios.rs`
(single-file parsers with inline tests). Coverage:

- identity (`sysname` → hostname)
- platform metadata (`platform_id`, `vendor`, `os_family`,
  `os_version_raw`, `os_version_normalized`, `detection_confidence`)
- interfaces (`interface <Name>` blocks with `description`,
  `shutdown`/`undo shutdown` → admin state, `ip binding
  vpn-instance` → vrf)
- ip addressing (dotted-decimal mask + numeric prefix forms)
- static routes (`ip route-static <dest> <mask|prefix> <next-hop>`)
- services_telnet (vty-block `protocol inbound telnet|all`)
- unknown trail with reasons: `OutOfScope`, `UnsupportedKeyword`,
  `ParseError`

**Dispatch wiring** — `src-tauri/src/engines/parsers/mod.rs` gains
`pub mod huawei_vrp;`, `pub mod fortinet_fortios;`, and matching
`"huawei-vrp" => Ok(huawei_vrp::parse(...))` /
`"fortinet-fortios" => Ok(fortinet_fortios::parse(...))` match arms.
New dispatch unit tests `huawei_vrp_platform_id_dispatches_ok` and
`fortios_platform_id_dispatches_ok`.

**Inline parser tests** — Huawei: 14 tests covering version constant,
empty config, sysname/version capture, interface block with admin
state and description, IP address (dotted mask and prefix forms),
static route, telnet service, out-of-scope honest recording, warnings
sorted + deduped, interfaces sorted, deterministic repeated parse,
prefix-length-form static route, `ip binding vpn-instance` vrf
capture. FortiOS: parser dispatch plus fixture-corpus coverage for
empty / small / interface-heavy / truncated / out-of-scope inputs.

**Fixture corpora** —
`src-tauri/tests/fixtures/huawei-vrp/_manifest.toml` +
`near-empty/`, `small/`, `truncated/` and
`src-tauri/tests/fixtures/fortinet-fortios/_manifest.toml` +
`near-empty/`, `small/`, `interface-heavy/`,
`out-of-scope-vocabulary/`, `truncated/` (each with `config.cfg` and
captured `expected.json`).

**Corpus harnesses** —
`src-tauri/tests/huawei_vrp_fixture_corpus.rs` and
`src-tauri/tests/fortinet_fortios_fixture_corpus.rs`
(mirror the existing vendor corpus pattern): manifest ↔ on-disk
consistency, parser-version guard parity, byte-equal walk over
`expected.json`, ten-pass determinism. Re-capture commands:
`ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test huawei_vrp_fixture_corpus`
and
`ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test fortinet_fortios_fixture_corpus`.

**Docs** —
`docs/architecture/PARSER_HUAWEI_VRP.md` and
`docs/architecture/PARSER_FORTINET_FORTIOS.md` (parser contracts),
`obsidian/ANTHRACITE_INDEX.md` (V1AV row), this stage note.

---

## Scope out

- No other parser added beyond the two bounded slices in this stage.
  IOS-XR and MikroTik remain missing and stay in the follow-on lane.
- No DeviceModel schema expansion.
- No parser trait / framework refactor.
- No `vendor_registry.rs` / `config_detection.rs` edits — both
  already carried `huawei-vrp` and `fortinet-fortios` entries.
- No validator / rule-pack changes.
- No frontend changes.
- No live collection.
- No credentials / SSH / sockets / transport.
- No polling / scheduler / background tasks.
- No graph renderer.
- No fuzzy matching / resolver changes.
- No `AGENTS.md` / `CLAUDE.md` edits.
- No `parser-lab/**` edits.
- No project-map update in this stage.
- No new runtime dependency.

---

## Architecture law respected

- Rust engines own truth.
- Parser is deterministic, never panics.
- BTreeMap-only for keyed accumulators; sorted Vec outputs.
- No float arithmetic except the single rounded `ParseConfidence.score`.
- Malformed / truncated input degrades to `unknown_lines[]` +
  `ParseConfidence.warnings`.
- `IN_SCOPE_AREAS` exposed publicly so docs and downstream consumers
  can introspect.
- Fixture-corpus harness enforces byte-equal `expected.json` and
  parser-version guard.

---

## Validation

```
cargo check --manifest-path src-tauri/Cargo.toml --lib   0 warnings/errors
cargo test --manifest-path src-tauri/Cargo.toml --lib    537 passed
cargo test --manifest-path src-tauri/Cargo.toml --test huawei_vrp_fixture_corpus
                                                          5 passed
cargo test --manifest-path src-tauri/Cargo.toml --test fortinet_fortios_fixture_corpus
                                                          5 passed
cargo test --manifest-path src-tauri/Cargo.toml --tests   all parser/corpus/version-guard
                                                          harnesses green
pnpm typecheck                                            clean
pnpm test --run                                           618 passed (frontend untouched)
pnpm build                                                123 modules transformed, 475 ms
tools/ops-readiness.ps1                                   READY
```

---

## Risks / notes

- **Bounded coverage by design.** The cisco-iosxe / cisco-nxos / etc.
  parsers carry 1300-1600 LOC across multiple submodules; V1AV ships
  Huawei VRP at the V1K-minimum-viable scale (single file, narrow
  area set). Out-of-scope areas are honest, not invisible. Future
  V1AV-b / V1AV-c stages bump `PARSER_VERSION` and re-capture
  fixtures as coverage expands.
- **Fixture coverage is intentionally small** — Huawei ships 3
  fixtures (near-empty, small, truncated). FortiOS ships 5 fixtures
  (near-empty, small, interface-heavy, out-of-scope-vocabulary,
  truncated). Future expansions should add at minimum:
  large-interface-count, dual-stack-edge, and a
  cross-vendor-equivalent-small companion if one of the bounded
  slices grows into the full L1/L2 cross-vendor set.
- **No project-map refresh in this stage.** Recommend the project
  map (`parser-lab/_project_status_map/anthracite-status-map-source.json`)
  flip Huawei VRP and FortiOS from "deferred" to "covered (V1AV
  initial)" after Bujar commits, then regenerate
  `docs/project-map/anthracite-project-map.html`.

---

## Cross-links

- [`../../docs/architecture/PARSER_HUAWEI_VRP.md`](../../docs/architecture/PARSER_HUAWEI_VRP.md)
- [`../../docs/architecture/PARSER_FORTINET_FORTIOS.md`](../../docs/architecture/PARSER_FORTINET_FORTIOS.md)
- [`../../docs/architecture/PARSER_COMMAND_CONTRACT.md`](../../docs/architecture/PARSER_COMMAND_CONTRACT.md)
- [`../../docs/architecture/PARSER_CONTRACT_INVARIANTS.md`](../../docs/architecture/PARSER_CONTRACT_INVARIANTS.md)
- [`../../docs/architecture/PARSER_COVERAGE_AREAS.md`](../../docs/architecture/PARSER_COVERAGE_AREAS.md)
- [`../../docs/architecture/PARSER_VERSIONING.md`](../../docs/architecture/PARSER_VERSIONING.md)
- `src-tauri/src/engines/parsers/huawei_vrp.rs`
- `src-tauri/tests/huawei_vrp_fixture_corpus.rs`
- `src-tauri/tests/fixtures/huawei-vrp/`
- `src-tauri/tests/fixtures/fortinet-fortios/`
