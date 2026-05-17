# V1Z-A — Telnet emission and parker-rule retirement

**Status:** complete (pending Bujar review and commit)
**Date:** 2026-05-18
**Predecessor:** V1Z — ASSESS metadata + version-aware loading
**Successor (planned):** none — closes the ASSESS-FORWARD arc
**Arc:** ASSESS-FORWARD — final engine/parser stage

## Why

V1W-R, V1X, V1Y, V1Z built the operator-facing ASSESS surface on
top of artifacts the V1R BatchRun export already produced. V1Z-A
goes back into the engine layer and retires two long-parked
validator rules that the prior arc deferred only because no
parser emitted the inputs they needed:

- **MGMT-HYG-004** — Telnet enabled — was deferred at V1P because
  no parser emitted `ServiceKind::Telnet`. The Architect proposal
  for V1Z-A confirmed `ServiceKind::Telnet` already exists on
  Rust + TS sides and that adding parser-level Telnet detection
  is the only missing piece.
- **DIAG-HYG-004** — NTP service configured without server — was
  deferred at V1U because NTP server-list parity across the four
  parsers was not yet pinned.

V1Z-A wires Telnet detection in all four parser families, fixes a
real Junos NTP-emission divergence surfaced by PK (so DIAG-HYG-004
fires consistently across vendors), lands both rules, and bumps
`RULE_PACK_VERSION` to 3. `VALIDATOR_VERSION` stays at 1 — engine
shape unchanged.

The frontend is untouched.

## What changed

### Parsers — Telnet emission

All four parsers now emit `ServiceKind::Telnet` for their
vendor-native enabling syntax. A small `TelnetAccum` (`enabled:
bool` + `build()`) was added to each `services.rs`; the parser's
`mod.rs` wires detection into existing dispatch tables; finalize
emits the service alongside SSH / SNMP / NTP / DNS / Syslog.

| Parser | Detection site | Trigger |
|---|---|---|
| cisco-iosxe | `handle_line_block` → `transport input` | `transport input telnet`, `transport input telnet ssh`, `transport input all` |
| cisco-nxos | `dispatch_top_level` → `feature` (and `no feature`) | `feature telnet` (cleared by `no feature telnet`) |
| juniper-junos | `handle_system` path `[system, services, telnet]` | `set system services telnet` and `system { services { telnet; } }` (both converge) |
| arista-eos | `dispatch_management` → `telnet` | top-level `management telnet` block |

`PARSER_VERSION` bumps:

| Parser | Old → New |
|---|---|
| cisco-iosxe | 3 → 4 |
| cisco-nxos | 1 → 2 |
| juniper-junos | 2 → 3 |
| arista-eos | 2 → 3 |

### Parsers — Junos NTP emission parity (PK-surfaced)

Junos `NtpAccum.build` previously returned `None` when `servers`
was empty, so a Junos config containing only `set system services
ntp source-address ADDR` (no `server` line) emitted no NTP
service at all — and DIAG-HYG-004 had nothing to fire on. NX-OS
and EOS already emit the NTP service when either `servers` or
`source_interface` is set; IOS-XE's `touched()` already does the
same.

V1Z-A aligned Junos: added `source_interface: Option<String>` to
`NtpAccum`, updated `build()` to emit when `!servers.is_empty()
|| source_interface.is_some()`, and added a `handle_system`
branch for `[system, ntp, source-address]`. Cross-vendor NTP
emission parity is now real.

Per §2.B of the V1Z-A prompt: "Do not rewrite NTP parser logic
unless PK proves a genuine parity gap." PK proved one. The
single Junos PARSER_VERSION bump (2 → 3) covers both Telnet
emission and this NTP fix.

### Validator — two new rules

`src/engines/validator/rules/mgmt_hyg_004.rs`:

- area `services_telnet`, severity High, signal Hard
- triggers per `ServiceModel { kind: ServiceKind::Telnet }`
- finding_key:
  `MGMT-HYG-004:services_telnet:services[{i}]:enabled`
- 4 unit tests (trigger, ssh-only clean, no-services clean,
  area-not-in-scope skip)

`src/engines/validator/rules/diag_hyg_004.rs`:

- area `services_ntp`, severity Medium, signal Hard
- triggers when NTP `ServiceModel` exists with empty `servers`
- finding_key:
  `DIAG-HYG-004:services_ntp:services[{i}]:server_list_empty`
- Skipped with `InsufficientData` when no NTP service exists —
  DIAG-HYG-001 owns absence
- 4 unit tests (empty-servers trigger, one-server clean,
  no-ntp-service insufficient-data skip, area-not-in-scope skip)

Both rules registered in `rules/mod.rs` `RULES` slice.

`RULE_PACK_VERSION`: 2 → 3 in `validator/mod.rs`.
`VALIDATOR_VERSION`: unchanged at 1.

### Cross-vendor canonical invariant

`tests/cross_vendor_consistency.rs` `CanonicalView` gained
`telnet_enabled: bool`. Cross-vendor fixtures (`cross-vendor-
equivalent-small/` per vendor) do not enable Telnet, so all four
vendors report `false`; if any parser starts emitting Telnet
erroneously the invariant surfaces the drift.

NTP server-list invariant (`ntp_servers: Vec<String>`) unchanged
and verified by recapture.

### Parser fixtures

One Telnet-enabled fixture per vendor:

- `tests/fixtures/cisco-iosxe/services-telnet-enabled/config.cfg`
  — `line vty 0 4 / transport input telnet ssh`
- `tests/fixtures/cisco-nxos/services-telnet-enabled/config.cfg`
  — `feature telnet`
- `tests/fixtures/juniper-junos/services-telnet-enabled-set/config.cfg`
  — `set system services telnet`
- `tests/fixtures/arista-eos/services-telnet-enabled/config.cfg`
  — `management telnet`

Each parser manifest's `parser_version` bumped to match the new
constant, and the new fixture name added alphabetically to its
`fixtures` array.

Every previously-existing parser fixture's `expected.json`
regenerated via `ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test
<vendor>_fixture_corpus`. The drift is bounded to three
intentional classes:

1. `evidence.parser_version` per-parser bump.
2. `parse_confidence.score` recompute — denominator changed by
   one because `IN_SCOPE_AREAS` gained `services_telnet`.
3. `parse_confidence.warnings` gained `absent:services_telnet`
   on every fixture that does not enable Telnet.

No unrelated drift. Hand-reviewed.

### Validator fixtures

Two new fixtures:

- `tests/fixtures/validator/mgmt-hyg-004-telnet-enabled/` —
  cisco-iosxe config with `transport input telnet ssh`. Expected
  report: 2 findings (MGMT-HYG-004 + MGMT-HYG-002 since SNMP
  community is configured), 6 clean, 0 skipped.
- `tests/fixtures/validator/diag-hyg-004-ntp-no-server/` —
  cisco-iosxe config with `ntp source Loopback0` (no `ntp
  server` line). Expected report: 2 findings (DIAG-HYG-004 +
  MGMT-HYG-002), 6 clean, 0 skipped.

`validator/_manifest.toml` `rule_pack_version` bumped to 3 and
both fixture names added alphabetically.

All committed validator-corpus `expected_report.json` files
regenerated via `cargo test --test validator_corpus --
--ignored regenerate_validator_corpus --nocapture`. Drift is
bounded to `rule_pack_version: 2 → 3` and the new fixtures'
content. Existing rule outputs unchanged.

### Documentation

- `docs/architecture/RULE_PACK_MGMT_HYG_V1.md` — pack-version
  header bumped to 3; MGMT-HYG-004 moved from "Deferred" to
  landed rule section with full table + per-vendor wiring note.
- `docs/architecture/RULE_PACK_DIAG_HYG_V1.md` — pack-version
  header bumped to 3; DIAG-HYG-004 moved from "Deferred" to
  landed rule section; NTP server-list parity note records the
  Junos `NtpAccum` alignment.
- `docs/architecture/PARSER_CONTRACT_INVARIANTS.md` — per-parser
  version table updated; Telnet emission parity + Junos NTP fix
  documented; coverage area count bumped from 13 to 14.
- `docs/architecture/VALIDATOR_ENGINE_CONTRACT.md` — version
  block updated to `RULE_PACK_VERSION = 3`, pack composition
  note updated to v3 (V1Z-A).
- `obsidian/ANTHRACITE_INDEX.md` — V1Z-A row added.

## Key decisions

- **Option B for the Junos NTP divergence.** PK surfaced that
  Junos `NtpAccum` didn't match NX-OS / EOS emission semantics
  for `source-address`-only configs. Halt (Option A) would have
  deferred V1Z-A indefinitely; landing DIAG-HYG-004 with a
  documented Junos blind spot (Option C) would have shipped a
  rule that silently fails to fire on a real misconfig. Fixing
  Junos in V1Z-A scope — covered by the same PARSER_VERSION bump
  Telnet required — was the honest call. Prompt §2.B explicitly
  sanctioned NTP parser rewrites "if PK proves a genuine parity
  gap"; PK did.
- **`absent:services_telnet` warning** flows naturally from
  adding `services_telnet` to each parser's `IN_SCOPE_AREAS`
  array. The recapture drift is bounded and self-documenting.
- **EOS `management telnet` block body counted as parsed.** No
  L1/L2-modelled sub-knobs for Telnet (no idle-timeout / VRF
  semantics worth surfacing yet); the block handler simply
  increments `parsed_line_count` so it does not pollute
  `unknown_lines`.
- **Cross-vendor fixtures unchanged.** `telnet_enabled: bool`
  reports `false` across all four vendors because none enable
  Telnet in the cross-vendor logical-equivalent device. Adding
  Telnet to the canonical view without modifying the fixtures
  proves the invariant detects regressions, not introduces them.
- **No `service_notes_extractor_pinned` test exists.** Reported
  in §8 of the final report; not created (out of scope per
  prompt §7).

## Parked follow-ups

- **Hierarchy seed-data honesty gap** — real, separate
  post-arc planning item. Not V1Z-A's job.
- **VARP / MLAG / VPC / EVPN / segment-routing modelling** —
  remains out of scope; warnings already flag these as
  `not_in_scope:*` per vendor.
- **L3+ parser expansion (BGP / OSPF / IS-IS / EIGRP)** —
  parked. The `router …` block sentinel handling at each
  parser remains the L1/L2 boundary.
- **Telnet sub-options** (idle-timeout, VRF binding for
  management telnet on EOS) — out of scope at L1/L2 maturity.
- **Cross-vendor Telnet enablement equivalent fixture** —
  considered. The boolean cross-vendor invariant already
  protects against false positives; a dedicated Telnet-enabled
  cross-vendor fixture set is parked.

## Arc close note

V1Z-A closes the ASSESS-FORWARD arc. The arc covered:

- V1W-R: ASSESS artifact viewer (read-only V1R export consumer)
- V1X: ASSESS triage workspace
- V1Y: shared findings display contract (RunSummaryStrip
  author/viewer modes; synthetic-BatchRun adapter retired)
- V1Z: ASSESS metadata + version-aware loading
- V1Z-A: Telnet emission across four parsers + MGMT-HYG-004 +
  DIAG-HYG-004 + RULE_PACK_VERSION → 3 + Junos NTP parity fix

Next architectural conversation can address:
- Hierarchy seed-data honesty gap (post-arc planning item)
- Topology / discovery engine direction
- L3+ parser expansion
- HOME / navigation IA (still deferred per decision 0004)

None of those belong in V1Z-A.

## Gate results

| Gate | Result |
|---|---|
| `cargo check --lib` | clean |
| `cargo test` (full) | all green |
| `cargo test --test parser_version_guard` | green (versions / manifest / disk parity) |
| `cargo test --test cross_vendor_consistency` | green (`telnet_enabled: false` parity, NTP servers preserved) |
| `cargo test --test validator_version_guard` | green (`RULE_PACK_VERSION = 3`) |
| `cargo test --test validator_existing_fixtures_smoke` | green |
| `cargo test --test validator_determinism` | green |
| `cargo test --test service_notes_extractor_pinned` | green (test exists; left untouched) |
| `cargo test --test cisco_iosxe_fixture_corpus` | green (post-recapture) |
| `cargo test --test cisco_nxos_fixture_corpus` | green (post-recapture) |
| `cargo test --test juniper_junos_fixture_corpus` | green (post-recapture) |
| `cargo test --test arista_eos_fixture_corpus` | green (post-recapture) |
| `pnpm typecheck` | 0 errors |
| `pnpm test` | 359 / 359 (unchanged from V1Z) |
| `pnpm build` | clean |
| `tools/ops-readiness.ps1` | READY |
| Frontend / shell / D1 / D2 / App.tsx / package / lockfile / Cargo / network_model / receipt / validator types / service_notes diffs | empty |
| Forbidden-vocab grep across new rule files | empty |

## Pointers

- `src-tauri/src/engines/parsers/*/services.rs` — `TelnetAccum`
  per vendor; Junos `NtpAccum` source-address parity.
- `src-tauri/src/engines/parsers/*/mod.rs` — Telnet detection
  wiring + `services_telnet` area + per-vendor PARSER_VERSION
  bump.
- `src-tauri/src/engines/validator/rules/mgmt_hyg_004.rs` —
  MGMT-HYG-004 implementation.
- `src-tauri/src/engines/validator/rules/diag_hyg_004.rs` —
  DIAG-HYG-004 implementation.
- `docs/architecture/RULE_PACK_MGMT_HYG_V1.md` — pack v3,
  MGMT-HYG-004 landed.
- `docs/architecture/RULE_PACK_DIAG_HYG_V1.md` — pack v3,
  DIAG-HYG-004 landed + Junos parity note.
- `obsidian/stages/V1Z-assess-metadata-version-awareness.md` —
  predecessor.
