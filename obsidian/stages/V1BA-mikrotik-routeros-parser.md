# V1BA — MikroTik RouterOS parser baseline

**Arc:** MOTOR-ROOM / PARSER-COVERAGE  
**Date:** 2026-05-19  
**Status:** landed

---

## Objective

Close the first MikroTik RouterOS parser slice without changing the
parser framework. This stage adds a deterministic `mikrotik-routeros`
parser, wires it into parser dispatch, and lands a bounded fixture
corpus with version-guard coverage.

The slice is intentionally bounded. It covers the current low-bar
parity target used by the existing bounded parsers, not full RouterOS
feature completeness.

---

## Parser gap matrix

| platform | vendor_registry | config_detection | parser module | this stage |
|---|---|---|---|---|
| cisco-iosxe | ✓ | ✓ | ✓ | — |
| juniper-junos | ✓ | ✓ | ✓ | — |
| arista-eos | ✓ | ✓ | ✓ | — |
| cisco-nxos | ✓ | ✓ | ✓ | — |
| huawei-vrp | ✓ | ✓ | ✓ | — |
| fortinet-fortios | ✓ | ✓ | ✓ | — |
| mikrotik-routeros | ✓ | ✓ | ✓ (V1BA v1) | **✓ this stage** |

---

## Scope in

**Rust parser module** —
`src-tauri/src/engines/parsers/mikrotik_routeros.rs`
(single-file bounded parser with inline tests). Coverage:

- identity (`/system identity set name=...`)
- platform metadata (`platform_id`, `vendor`, `os_family`,
  `detection_confidence`)
- interface renames and physical interface inventory
- bridge interfaces and bridge membership
- VLAN interfaces and bridge VLAN membership
- routed interface IPv4 addressing
- static routes
- management-plane hints for SSH, SNMP, and NTP
- honest unknown trail with `UnsupportedKeyword`, `OutOfScope`,
  and `ParseError`

**Dispatch wiring** —
`src-tauri/src/engines/parsers/mod.rs` includes
`pub mod mikrotik_routeros;` and the
`"mikrotik-routeros" => Ok(mikrotik_routeros::parse(...))`
match arm. A parser-dispatch unit test confirms the platform id
round-trips to a hostname-bearing model.

**Fixture corpus** —
`src-tauri/tests/fixtures/mikrotik-routeros/` with three prepared
fixtures:

- `routeros-system-interface-001`
- `routeros-vlan-bridge-002`
- `routeros-note-rich-003`

Each fixture has a committed `expected.json` snapshot and is covered by
the new corpus harness.

**Corpus harness** —
`src-tauri/tests/mikrotik_routeros_fixture_corpus.rs` mirrors the
existing vendor-corpus pattern: manifest ↔ on-disk consistency,
parser-version parity, byte-equal `expected.json` walk, and
ten-pass determinism. Recapture command:
`ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test mikrotik_routeros_fixture_corpus`.

**Version guard** —
`src-tauri/tests/parser_version_guard.rs` now includes the
MikroTik fixture root and source version check.

**Prep corpus** —
`parser-lab/mikrotik-routeros/` provided the RouterOS syntax notes,
fixture intents, and handoff baseline used to shape the first parser
slice.

---

## Scope out

- No full RouterOS feature completeness yet.
- No firewall rule engine.
- No NAT, QoS, AAA, wireless, tunnels, VPN, or routing-protocol
  parser coverage.
- No new vendor additions beyond this RouterOS slice.
- No parser framework refactor.
- No schema expansion in `DeviceModel`.
- No frontend changes.

---

## Validation

```
ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test mikrotik_routeros_fixture_corpus
                                                  5 passed
cargo test --test mikrotik_routeros_fixture_corpus 5 passed
cargo test --manifest-path src-tauri/Cargo.toml --lib mikrotik_routeros
                                                  14 passed
cargo test --test parser_version_guard             21 passed
```

---

## Risks / notes

- `/ip service set api ...` is intentionally not modeled as a first-class
  service; it remains honest evidence via `UnsupportedKeyword`.
- Bridge and VLAN semantics are shaped by the current prep corpus.
  RouterOS exports with richer bridge topologies can extend this slice
  later.
- The parser reports `ParserMaturityObserved::L2Topology` because it
  now models bridges, VLANs, and routed interfaces, but the overall
  slice is still bounded.

---

## Cross-links

- [`../../src-tauri/src/engines/parsers/mikrotik_routeros.rs`](../../src-tauri/src/engines/parsers/mikrotik_routeros.rs)
- [`../../src-tauri/src/engines/parsers/mod.rs`](../../src-tauri/src/engines/parsers/mod.rs)
- [`../../src-tauri/src/engines/config_detection.rs`](../../src-tauri/src/engines/config_detection.rs)
- [`../../src-tauri/tests/mikrotik_routeros_fixture_corpus.rs`](../../src-tauri/tests/mikrotik_routeros_fixture_corpus.rs)
- [`../../src-tauri/tests/parser_version_guard.rs`](../../src-tauri/tests/parser_version_guard.rs)
- [`../../src-tauri/tests/fixtures/mikrotik-routeros/_manifest.toml`](../../src-tauri/tests/fixtures/mikrotik-routeros/_manifest.toml)
- [`../../parser-lab/mikrotik-routeros/HANDOFF.md`](../../parser-lab/mikrotik-routeros/HANDOFF.md)
