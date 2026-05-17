# V1U — DIAG-HYG Rule Pack v1 + Cisco NX-OS Parser (4th vendor)

**Status:** complete
**Date:** 2026-05-17
**Predecessor:** V1T — Mixed archive corpus + BatchRun density proof
**Successor (planned):** to-be-named (sort/filter UI or next rule pack)

## Why

V1U delivered two independent expansions in one stage:

**Phase A — DIAG-HYG Rule Pack v1:** The MGMT-HYG pack (V1P) established
the validator engine contract. DIAG-HYG is the second domain pack —
three diagnostic hygiene rules that check for clock synchronisation,
in-band log delivery, and DNS resolver presence. Phase A also bumped
the validator version to v2, added a `validator_version_guard` test,
and wrote `RULE_PACK_DIAG_HYG_V1.md`.

**Phase B — Cisco NX-OS parser:** Anthracite ships four L1/L2 parsers
as of V1U. The NX-OS parser proves the engine generalises to Cisco's
datacenter OS with its distinct feature-gate model, `vrf context` blocks,
and lowercase interface naming. The cross-vendor consistency invariant
now covers all four vendors.

## What changed

### Phase A — DIAG-HYG Rule Pack

- `src-tauri/src/engines/validators/rule_packs/diag_hyg_001.rs` — NTP
  synchronisation check (DIAG-HYG-001).
- `src-tauri/src/engines/validators/rule_packs/diag_hyg_002.rs` — syslog
  delivery check (DIAG-HYG-002).
- `src-tauri/src/engines/validators/rule_packs/diag_hyg_003.rs` — DNS
  resolver presence check (DIAG-HYG-003).
- `src-tauri/src/engines/validators/rule_packs/mod.rs` — wired all three
  rules into the rule registry.
- `src-tauri/tests/fixtures/diag-hyg/` — `_manifest.toml` + 3 fixtures
  (`ntp-present`, `syslog-present`, `dns-present`) with `expected_report.json`.
- `docs/architecture/RULE_PACK_DIAG_HYG_V1.md` — rule pack contract doc.
- `RULE_PACK_VERSION` in the validator engine bumped to 2.

### Phase B — Cisco NX-OS parser (12 new source files)

- `src-tauri/src/engines/parsers/cisco_nxos/mod.rs` — orchestrator,
  `PARSER_VERSION = 1`, NX-OS dispatch, feature-gate model, vrf-context
  ip-route binding, finalize(), 14 unit tests.
- `src-tauri/src/engines/parsers/cisco_nxos/lexer.rs`
- `src-tauri/src/engines/parsers/cisco_nxos/identity.rs`
- `src-tauri/src/engines/parsers/cisco_nxos/interfaces.rs` — lowercase
  loopback/port-channel, mgmt0 → Management kind.
- `src-tauri/src/engines/parsers/cisco_nxos/ip_addressing.rs`
- `src-tauri/src/engines/parsers/cisco_nxos/vlans.rs`
- `src-tauri/src/engines/parsers/cisco_nxos/vrfs.rs` — `vrf context`
  opener (not `definition` or `instance`).
- `src-tauri/src/engines/parsers/cisco_nxos/static_routes.rs` —
  `parse_ip_route(args, vrf_override)` for routes inside vrf blocks.
- `src-tauri/src/engines/parsers/cisco_nxos/lag.rs` — `lag_name(id)`
  returns `port-channel{id}` (lowercase).
- `src-tauri/src/engines/parsers/cisco_nxos/services.rs` — `feature ssh`
  model; `use-vrf NAME` token drain for NTP and DNS.
- `src-tauri/src/engines/parsers/cisco_nxos/features.rs`
- `src-tauri/src/engines/parsers/cisco_nxos/unknown.rs`
- `src-tauri/src/engines/parsers/mod.rs` — `"cisco-nxos"` dispatch arm added.

### Fixtures

- `src-tauri/tests/fixtures/cisco-nxos/_manifest.toml` — 10 fixtures.
- `src-tauri/tests/fixtures/cisco-nxos/<name>/config.cfg` — all 10
  fixture configs.
- `src-tauri/tests/fixtures/cisco-nxos/<name>/expected.json` — all 10
  seeded via `ANTHRACITE_UPDATE_FIXTURES=1`.

Fixture set:
`cross-vendor-equivalent-small`, `feature-commands`, `large-interface-count`,
`near-empty`, `nxos-divergence-from-iosxe`, `services-ssh-ntp-syslog`,
`small`, `truncated`, `vlan-database`, `vrf-segmentation`.

### Tests

- `src-tauri/tests/cisco_nxos_fixture_corpus.rs` — 8 corpus tests
  (manifest consistency, byte-equal walk, serde round-trip, determinism,
  receipt round-trip).
- `src-tauri/tests/cisco_nxos_fixtures.rs` — 29 targeted tests
  (fixture byte-equal gates, determinism, negative, NX-OS behavioural
  invariants, registry integrity).
- `src-tauri/tests/parser_version_guard.rs` — 3 NX-OS guard tests added
  (12 total across 4 vendors).
- `src-tauri/tests/cross_vendor_consistency.rs` — extended
  `cross_vendor_equivalent_models_match` to 4th vendor (cisco-nxos).

### Docs

- `docs/architecture/NXOS_VS_IOSXE_DIVERGENCES.md` — full NX-OS
  divergence catalogue (9 sections: SSH feature gate, vrf context,
  in-block routes, interface naming, LAG naming, NTP use-vrf, DNS
  use-vrf, version command, feature-gated services).
- `docs/architecture/PARSER_CONTRACT_INVARIANTS.md` — updated to
  four-parser state.
- `docs/architecture/PARSER_COVERAGE_AREAS.md` — NX-OS coverage matrix
  added; cross-vendor consistency note updated to 4 vendors.
- `docs/architecture/INTERFACE_NAMING.md` — NX-OS section added
  (lowercase loopback, port-channel, mgmt0).

## Key NX-OS divergences captured

1. **SSH via `feature ssh`** — not `ip ssh version 2`. SshAccum is a
   boolean gate, not a version parser.
2. **`vrf context NAME`** — not `vrf definition` (IOS-XE) or `vrf
   instance` (EOS).
3. **`ip route` inside vrf block** — VRF binding from enclosing block,
   passed as `vrf_override` to `parse_ip_route()`.
4. **Lowercase interface names** — `loopback0`, `port-channel1`, `mgmt0`.
5. **`lag_name(id)` returns lowercase** — `port-channel{id}`.
6. **`ntp server use-vrf NAME ADDR` / `ip name-server use-vrf NAME ADDR`**
   — parser drains `use-vrf NAME` tokens before address.
7. **`feature` command model** — only `ssh`, `ntp`, `snmp` tracked;
   others routed to `unknown_lines[]`.

## Micro-addendum — NX-OS out-of-scope marker fix (pre-commit)

Discovered during closeout audit: two of the four spec-mandated
NX-OS out-of-scope markers were not emitted by the parser.

**Root cause:**
- `vlan configuration N` — `parse_vlan_opener("configuration 10")` returned
  `None`; fell to an else branch with no `OutOfScope` emission.
- `fabric forwarding` — `"fabric"` absent from `NXOS_OUT_OF_SCOPE_TOP_LEVEL`;
  routed to `UnsupportedKeyword` instead of `OutOfScope`.

**Fix (surgical, PARSER_VERSION stays at 1 — pre-commit refinement):**
1. `OUT_OF_SCOPE_AREAS` in `mod.rs` — added `"fabric_forwarding"` and
   `"vlan_configuration"`.
2. `NXOS_OUT_OF_SCOPE_TOP_LEVEL` in `unknown.rs` — added `"fabric"`.
3. `dispatch_top_level` vlan arm — added `vlan configuration` branch that
   pushes `"vlan_configuration"` frame and emits `OutOfScope` for opener.
4. `dispatch_top_level` other arm — added `"fabric" => "not_in_scope:fabric_forwarding"`.
5. `dispatch_in_block` — added `label == "vlan_configuration"` and
   `label.starts_with("fabric ")` to the OutOfScope child-dispatch frame.
6. 11th fixture `nxos-out-of-scope-vocabulary/` added covering all four
   markers: `vpc domain`, `interface nve1`, `vlan configuration 10`,
   `fabric forwarding anycast-gateway-mac`.
7. All 11 expected.json regenerated — all 4 markers present in every fixture.

## Gate results

All gates green at V1U close:

- `cargo check --lib` — clean
- `cargo test` — 0 failures across all test bins
  - lib unit tests
  - 29 cisco_nxos_fixtures
  - 8 cisco_nxos_fixture_corpus (11 fixtures)
  - 12 parser_version_guard (4 vendors)
  - 1 cross_vendor_consistency (4 vendors)
  - all pre-existing corpus / validator harnesses unaffected
