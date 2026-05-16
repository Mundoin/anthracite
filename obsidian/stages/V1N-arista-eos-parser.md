# V1N — Arista EOS parser (L1 + L2) + cross-vendor consistency

**Status:** complete
**Date:** 2026-05-16
**Predecessor:** V1M — Juniper Junos parser (L1 + L2)
**Successor (planned):** to-be-named V1O stage (likely receipt UI consumption, or V1L-A cosmetic cleanup)

## Why

V1K shipped one parser, V1L hardened the surrounding discipline, V1M
proved the contract generalised across Cisco-vs-Junos with brace/set
convergence. V1N is the third confirmation: prove that a third vendor
that is **Cisco-CLI-derived but not Cisco IOS/XE** stays distinct,
does not collapse into copy-paste IOS/XE logic, and joins the same
canonical model.

The new central acceptance test
(`cross_vendor_consistency::cross_vendor_equivalent_models_match`) is
V1N's load-bearing claim: one logical device described in three
vendor syntaxes produces three `DeviceModel`s that agree on every
canonical invariant.

## What changed

### Rust — parser tree (new)
- `src-tauri/src/engines/parsers/arista_eos/mod.rs` — orchestrator,
  `PARSER_VERSION = 1`, EOS-specific dispatch + finalize, in/out-of-scope
  area lists including EOS-only `mlag`, `management_api`,
  `event_handlers`, `daemons`, `varp`.
- `src-tauri/src/engines/parsers/arista_eos/lexer.rs` — distinct
  line+indent lexer module.
- `src-tauri/src/engines/parsers/arista_eos/identity.rs` — hostname +
  EOS `! device:` + `! boot system flash:/EOS-X.X.X.swi` parsers.
- `src-tauri/src/engines/parsers/arista_eos/interfaces.rs` — EOS
  classifier (`Ethernet`, `Port-Channel`, `Management`, `Vlan`, `Loopback`,
  `Vxlan`, …) + helpers. Uses shared `normalize::normalize_cisco` for
  short forms since vocabulary is shared.
- `src-tauri/src/engines/parsers/arista_eos/ip_addressing.rs` — both
  slash and dotted-mask IPv4 forms; slash-only IPv6; mask-to-prefix
  helper.
- `src-tauri/src/engines/parsers/arista_eos/vlans.rs` — `VlanBuilder`
  + parsers.
- `src-tauri/src/engines/parsers/arista_eos/vrfs.rs` — `VrfBuilder` +
  `vrf instance NAME` opener.
- `src-tauri/src/engines/parsers/arista_eos/static_routes.rs` — both
  `ip route PREFIX/LEN NEXTHOP` and `ip route NET MASK NEXTHOP` shapes,
  `ip route vrf NAME …`, `ipv6 route …`.
- `src-tauri/src/engines/parsers/arista_eos/lag.rs` — EOS
  `channel-group N mode active|passive|on` parser.
- `src-tauri/src/engines/parsers/arista_eos/services.rs` — SSH
  (`management ssh` block), SNMP, NTP, DNS, syslog accumulators with
  V1K-compatible `notes` encoding.
- `src-tauri/src/engines/parsers/arista_eos/unknown.rs` — out-of-scope
  emission helpers + the EOS-specific top-level keyword vocabulary
  (`mlag`, `daemon`, `event-handler`, `router`, …).

### Rust — dispatch wiring
- `src-tauri/src/engines/parsers/mod.rs` — registers `arista_eos` and
  routes `platform_id == "arista-eos"` to it. Renamed the previous
  unsupported-platform sentinel from `arista-eos` to
  `unknown-vendor-xyz` and added `arista_eos_platform_id_dispatches_ok`
  alongside the Junos test.

### Fixtures (new)
Under `src-tauri/tests/fixtures/arista-eos/` (10):
- `cross-vendor-equivalent-small/`
- `eos-divergence-from-iosxe/`
- `leaf-switch/`
- `mlag-and-eapi-present/`
- `near-empty/`
- `routing-protocols-present/`
- `small/`
- `spine-router/`
- `truncated/`
- `vrf-segmentation/`

Plus `_manifest.toml` (`parser_version = 1`).

Cross-vendor companions added to existing corpora (parser-version
constants unchanged because corpus expansion is not parser-output
change):
- `src-tauri/tests/fixtures/cisco-iosxe/cross-vendor-equivalent-small/`
- `src-tauri/tests/fixtures/juniper-junos/cross-vendor-equivalent-small/`
- Existing cisco + junos `_manifest.toml` updated to list them.

### Integration tests
- `src-tauri/tests/arista_eos_fixture_corpus.rs` (new) — full corpus
  harness mirroring cisco / junos. Adds
  `receipt_projection_round_trips_over_eos_model`.
- `src-tauri/tests/cross_vendor_consistency.rs` (new) — central
  V1N acceptance test. Parses all three companion fixtures, projects
  to a canonical view (hostname, vrfs+RDs, vlans+names, ip address
  set, static-route set, service-kind set, sorted service servers,
  ssh enabled flag), asserts byte-identical JSON across three vendors.
- `src-tauri/tests/parser_version_guard.rs` (extended) — three
  per-parser guards now (cisco / junos / eos).
- `src-tauri/tests/cisco_iosxe_fixtures.rs` — `wrong_platform_ref_returns_err`
  sentinel updated to `unknown-vendor-xyz`.

### Docs
- `docs/architecture/EOS_VS_IOSXE_DIVERGENCES.md` (new) — ten
  documented divergences and a warning against future parser
  consolidation.
- `docs/architecture/INTERFACE_NAMING.md` — EOS table added. EOS
  shares the `Et`/`Po`/`Lo`/`Vl`/`Ma` short-form vocabulary with Cisco
  (a deliberately shared canonical space, not Cisco-private).
- `docs/architecture/PARSER_COVERAGE_AREAS.md` — EOS coverage section
  + V1N fixture matrix + a new "Cross-vendor consistency invariant"
  paragraph documenting the V1N central test.

### Vault
- `obsidian/ANTHRACITE_INDEX.md` — V1N row landed.
- This stage note.

## Parser architecture

The EOS parser uses the same line-oriented + indent-block shape as
Cisco IOS/XE because EOS is Cisco-CLI-derived. But the dispatch
tables, vocabulary, and top-level keyword sets are EOS-specific. See
`EOS_VS_IOSXE_DIVERGENCES.md` for the ten documented divergences. The
lexer module is duplicated (not shared) per V1N's explicit "do not
collapse EOS into IOS/XE" rule.

Top-level dispatch handles EOS-specific keywords directly:
- `vrf` opens a `vrf instance NAME` block via `vrfs::parse_vrf_instance_opener`
- `management` routes to `dispatch_management` (ssh → in-scope,
  api → out-of-scope sentinel frame, others → unknown)
- `mlag` / `daemon` / `event-handler` / `router` push sentinel frames
  so child lines emit `OutOfScope` with the right `context_path`

Finalize is structurally identical to V1K/V1M (sort, cross-link,
synthesise LAG groups from membership, compute score, dedupe
warnings). The score denominator is the same 13-area set so cross-
vendor consumers compare on one vocabulary.

## Fixture list

10 EOS fixtures + 1 each added to the cisco and junos corpora for
the cross-vendor companion. The EOS list is enumerated in the "What
changed → Fixtures" section above; the matrix is in
`PARSER_COVERAGE_AREAS.md`.

## Cross-vendor invariant result

**PASS.** `cross_vendor_equivalent_models_match` is green. The
canonical projection across cisco-iosxe, juniper-junos, and arista-eos
produces byte-identical JSON for the same logical device. The
projection deliberately strips intrinsically vendor-specific surface
(evidence, platform, warnings, unknown_lines, interface kind shape —
since Junos models addresses on `unit` sub-interfaces and Cisco/EOS
don't — and interface name fields), and keeps the L1/L2 invariants
that *should* be cross-vendor.

One observation from the development cycle: an early version of the
canonical view included `interface_kind_counts`. That failed because
Junos's `unit 0` shape creates `sub_interface` entries where
Cisco/EOS do not. The L1/L2 invariant that matters is "what addresses
landed on what VRFs", not "how many interface-kind entries the parser
chose to create". The view was tightened accordingly. This is
captured in the test's doc comment.

## Receipt projection result

**PASS.** `receipt_projection_round_trips_over_eos_model` is green.
The V1L receipt projection works unmodified over an EOS `DeviceModel`:
deterministic across re-projections, serde round-trips, and correctly
reports `platform_id == "arista-eos"`. No receipt code change
required. The receipt projection is now confirmed parser-agnostic
across three vendors.

## Validation results

| Target | Result |
|---|---|
| `cargo check --lib` | green |
| `cargo test --lib` | **222 passed / 0 failed** (was 197 in V1M; +25 EOS lib tests) |
| `cargo test --test cisco_iosxe_fixtures` | **11 passed** |
| `cargo test --test cisco_iosxe_fixture_corpus` | **7 passed** (now 17 fixtures incl. cross-vendor companion) |
| `cargo test --test juniper_junos_fixture_corpus` | **9 passed** (now 13 fixtures incl. cross-vendor companion) |
| `cargo test --test arista_eos_fixture_corpus` | **8 passed** (10 fixtures, incl. receipt round-trip) |
| `cargo test --test cross_vendor_consistency` | **1 passed** ← V1N's central test |
| `cargo test --test parser_version_guard` | **9 passed** (3 per parser) |
| `pnpm typecheck` / `pnpm build` / `tools/ops-readiness.ps1` | to be confirmed in final pass |

## Model-gap findings

None requiring `network_model.rs` edits. The existing model absorbed
all EOS L1/L2 concepts without addendum. Specifically:
- VRFs accept EOS's flat RD/route-target shape (no need for
  EOS-specific instance-type discrimination at this maturity).
- `management ssh` populates `ServiceModel { kind: Ssh }` cleanly via
  the existing `notes` encoding.
- MLAG / eAPI / event-handlers / daemons land in `unknown_lines[]`
  with `OutOfScope`; no model surface required at L1/L2.
- VARP not encountered in V1N fixtures; `not_in_scope:varp` marker
  emitted prospectively.

## Known follow-ups

1. **VARP modelling** — `varp` warning is emitted prospectively but no
   fixture exercises a varp block. A future stage that needs HSRP-like
   shared gateway state will need to fold VARP into a typed shape.
2. **EOS `switchport trunk group NAME`** — captured as `unknown_lines[]`
   with `eos_trunk_group_out_of_scope` warning. A later L3+ stage can
   promote trunk groups when topology consumers actually want them.
3. **`management api http-commands`** — out-of-scope at V1N. eAPI
   configuration is meaningful but better folded into a dedicated
   management-plane stage rather than L1/L2.
4. **Compound interface name overlap with Cisco** — both vendors use
   `Et`/`Po`/`Lo`/`Mgmt`/`Vl` short forms. Cross-vendor consumers
   that key off `normalized_name` will see collisions
   (e.g. `Et1` exists on both Arista and a hypothetical IOS device).
   Today they're disambiguated by `platform_id`; a future
   topology engine may want a `(platform_id, normalized_name)` tuple
   as the cross-vendor identifier.
5. **Carry-over from V1L/V1M** — Cisco cosmetic findings (V1L-A) and
   Junos follow-ups (compact brace, deactivate/delete, LAG mode
   threading, IRB/VLAN cross-link) remain parked.

## Next stage

To-be-named V1O. Candidates:
- **V1L-A** — Cisco cosmetic cleanup (vocabulary marker tightening +
  ACL reason classification).
- **V1O** — first mode surface consuming `project_device_receipt`.
- **NX-OS parser** — fourth vendor; would re-stress the contract a
  fourth time but adds no new architectural insight at this point.

## Cross-references

- [V1M stage note](./V1M-juniper-junos-parser.md)
- [V1L stage note](./V1L-fixture-corpus-and-receipts.md)
- [V1K stage note](./V1K-cisco-iosxe-parser.md)
- [EOS_VS_IOSXE_DIVERGENCES.md](../../docs/architecture/EOS_VS_IOSXE_DIVERGENCES.md)
- [PARSER_VERSIONING.md](../../docs/architecture/PARSER_VERSIONING.md)
- [PARSER_COVERAGE_AREAS.md](../../docs/architecture/PARSER_COVERAGE_AREAS.md)
- [INTERFACE_NAMING.md](../../docs/architecture/INTERFACE_NAMING.md)
- [CANONICAL_NETWORK_MODEL.md](../../docs/architecture/CANONICAL_NETWORK_MODEL.md)
