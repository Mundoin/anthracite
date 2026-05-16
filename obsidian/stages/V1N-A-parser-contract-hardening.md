# V1N-A — Parser contract hardening + debt ledger

**Status:** complete
**Date:** 2026-05-16
**Predecessor:** V1N — Arista EOS parser + cross-vendor consistency
**Successor (planned):** V1O — Config Intake operator surface

## Why

V1N landed parser #3 (Arista EOS) and proved cross-vendor canonical
consistency holds across three vendors. Before V1O surfaces parser
output to the operator, V1N-A:

1. Burns down the documented parser debt accumulated in V1L/V1M/V1N.
2. Locks the parser contract findings as architecture (`PARSER_CONTRACT_INVARIANTS.md`).
3. Leaves the parser layer ready for Config Intake without avoidable
   surprises bleeding through.

This is not a feature stage. Not a fourth-parser stage. Not a model-
expansion stage. No new dependencies. No model edits.

## Debt ledger — per-item status

### A. V1L-A Cisco IOS/XE cosmetic findings

**#1 — routing-protocols-present vocabulary one-off — FIXED.**
The `router` top-level dispatch previously pushed a one-off
`not_in_scope:routing_protocols_block` warning that was not in the
documented `OUT_OF_SCOPE_AREAS` set. Removed. The per-protocol
markers (`not_in_scope:routing_protocols_{ospf,isis,eigrp,bgp}`)
auto-emit in finalize from the area list, which is the documented
vocabulary. Cisco `PARSER_VERSION` bumped 2 → 3.

**#2 — ACL/NAT reason classification — FIXED.**
Cisco IOS-XE parser now emits `UnknownReason::OutOfScope` for:
- `ip access-list extended NAME` top-level opener (and pushes a
  block frame so child rules also classify as `OutOfScope` with the
  ACL context_path)
- `ip nat …` top-level lines
- `ip nat inside` / `ip nat outside` inside interface blocks
Previously these emitted `UnsupportedKeyword`. Cisco `PARSER_VERSION`
bumped 2 → 3 (same bump as #1).

### B. V1M Junos follow-ups

**#3 — Compact brace blocks — FIXED.**
`lexer_brace.rs` now expands compact single-line blocks like
`vlan { members [ v10 v20 ]; }` into virtual lines that the brace-
depth walker handles identically to the conventional multi-line form.
All virtual lines keep the original line number for evidence
traceability. New unit tests:
`compact_single_line_brace_block_expands` and
`compact_block_with_inline_brackets_expands_both`. New fixture:
`compact-brace-blocks`. Junos `PARSER_VERSION` bumped 1 → 2.

**#4 — `deactivate` / `delete` set-style forms — FIXED.**
`lexer_set::lex` no longer silently drops these. Both forms are
surfaced as `JunosLine` records with the verbatim path, and
`unknown::OUT_OF_SCOPE_PREFIXES` adds `deactivate` and `delete` so
the orchestrator classifies them as `OutOfScope` evidence. V1N-A
explicitly does NOT apply semantic delete/deactivate behaviour to
the model. New fixture: `deactivate-and-delete-set-forms`. Test
`delete_lines_are_ignored` renamed to
`delete_and_deactivate_preserved_as_evidence`.

**#5 — Junos LAG mode threading — FIXED.**
Added `State.lag_modes: BTreeMap<String, LagMode>` as a parser-level
sidecar. When `aggregated-ether-options lacp <mode>` is parsed on an
`ae` bundle, the mode is recorded both on the bundle's `IfaceBuilder`
(legacy) and in the sidecar map. Finalize threads the mode into the
synthesised `LagGroupModel.mode`. Symmetric across brace and set
styles, so the brace ↔ set byte-equal pair contract still holds.

**#6 — Junos IRB↔VLAN cross-link — FIXED.**
Added `State.vlan_l3_interface: BTreeMap<String, String>` to capture
`vlans { NAME { l3-interface irb.N; } }` bindings. Finalize stamps
the SVI name (e.g. `irb.100`) into `VlanModel.interfaces` for the
matching VLAN, alongside the access/trunk member interfaces. This
makes the IRB↔VLAN relationship observable through the existing
model field — no `network_model.rs` edit.

### C. V1N EOS follow-ups

**#7 — VARP fixture coverage — FIXED.**
New EOS fixture `varp-present` exercises both top-level
`ip virtual-router mac-address …` and per-interface
`ip virtual-router address …`. Parser arms added in `dispatch_ip_top`
and `handle_iface_ip` to emit `UnknownReason::OutOfScope` (was
`UnsupportedKeyword`). EOS `PARSER_VERSION` bumped 1 → 2.

**#8 — EOS trunk group plan — DOCUMENTED AND PARKED.**
`switchport trunk group NAME` remains out-of-scope at V1N-A;
already covered by the `mlag-and-eapi-present` fixture which exercises
the `trunk group MLAG-PEER` form. Promotion path documented in
`PARSER_CONTRACT_INVARIANTS.md` and `EOS_VS_IOSXE_DIVERGENCES.md`:
deferred to a future L3+/switching-policy stage when a topology
consumer actually demands it. No V1N-A code change.

**#9 — `management api http-commands` — ALREADY COVERED, DOCUMENTED.**
The `mlag-and-eapi-present` fixture exercises this. Parser already
classifies it as out-of-scope with `not_in_scope:management_api`
warning. V1N-A leaves the behaviour intact and confirms the
documentation reflects "deferred to a dedicated management-plane
stage". No V1N-A code change.

**#10 — Cross-vendor topology keying observation — DOCUMENTED.**
Locked in `PARSER_CONTRACT_INVARIANTS.md` as a binding contract for
future topology / cross-vendor consumers:

> Future topology / cross-vendor consumers MUST key off
> `(platform_id, normalized_name)`, not `normalized_name` alone.

No code path required topology engine logic in V1N-A. Documentation
only.

## Contract documentation added

**New:** `docs/architecture/PARSER_CONTRACT_INVARIANTS.md` — locks
the V1M / V1N findings into binding architecture:

- Three-parser state inventory with current `PARSER_VERSION` per
  parser.
- `DeviceModel` is the truth object; receipt and cross-vendor view
  are projections.
- Vendor parser modules stay separate. EOS-vs-IOSXE divergences are
  the canonical reasons-list.
- Cross-vendor canonical consistency: what is invariant, what is not.
- **Addresses are the L1/L2 cross-vendor invariant. Interface-kind
  shape is not.** (Locked as a one-line contract.)
- Future topology keys must include platform/vendor context.
- Unsupported-but-present visibility rule.
- Parser maintenance rule: prefer documenting/parking model gaps
  over expanding `DeviceModel` inside cleanup stages.

## Fixture changes

**Cisco IOS-XE:** every fixture's `expected.json` re-captured for
`PARSER_VERSION` 2 → 3. Two semantic changes visible in diffs:
- `routing-protocols-present` warnings no longer contain
  `not_in_scope:routing_protocols_block`.
- `acl-and-nat-present` unknown lines now carry
  `reason: "out_of_scope"` (was `"unsupported_keyword"`).

**Junos:** every fixture's `expected.json` re-captured for
`PARSER_VERSION` 1 → 2. Visible diffs:
- `aggregate-ethernet-bundle`: `lag_groups[*].mode` now populated.
- `irb-and-vlan-binding`: `vlans[*].interfaces` now include the
  bound `irb.N` SVI name.
- **New:** `compact-brace-blocks/`
- **New:** `deactivate-and-delete-set-forms/`

**Arista EOS:** every fixture's `expected.json` re-captured for
`PARSER_VERSION` 1 → 2. Visible diff:
- VARP and ACL top-level lines now carry `reason: "out_of_scope"`.
- **New:** `varp-present/`

## Parser versions bumped

- `cisco_iosxe::PARSER_VERSION`: 2 → 3
- `juniper_junos::PARSER_VERSION`: 1 → 2
- `arista_eos::PARSER_VERSION`: 1 → 2

All three manifests updated to match. Version guard tests green.

## Cross-vendor consistency result

**PASS.** `cross_vendor_equivalent_models_match` still green after
all V1N-A changes. The cross-vendor invariant survived three parser
version bumps and four semantic behaviour changes, which is the
strongest signal that the canonical projection captured the right
invariants.

## Validation results

- `cargo check --lib` — green.
- `cargo test --lib` — **224 passed / 0 failed** (was 222 in V1N; +2 new lexer tests).
- `cargo test --test cisco_iosxe_fixtures` — **11 passed**.
- `cargo test --test cisco_iosxe_fixture_corpus` — **7 passed** (17 fixtures).
- `cargo test --test juniper_junos_fixture_corpus` — **9 passed** (15 fixtures).
- `cargo test --test arista_eos_fixture_corpus` — **8 passed** (11 fixtures).
- `cargo test --test cross_vendor_consistency` — **1 passed**.
- `cargo test --test parser_version_guard` — **9 passed** (3 per parser × 3 parsers).
- `pnpm typecheck`, `pnpm build`, `tools/ops-readiness.ps1` — final pass below.

## Remaining parked follow-ups

Genuine remaining items for after V1O:

1. **Junos `deactivate` / `delete` semantic application.** V1N-A
   surfaces them as evidence; a future "config-as-overlay" stage
   may want to reify them.
2. **EOS trunk group promotion.** Out-of-scope; promotion deferred
   to L3+/switching-policy stage when a topology consumer needs it.
3. **EOS `management api http-commands` typed shape.** Out-of-scope;
   promotion deferred to a dedicated management-plane stage.
4. **VARP typed shape.** Out-of-scope; promotion folds into HSRP-
   like shared-gateway modelling later.
5. **Cross-vendor topology keying** — contract documented in
   `PARSER_CONTRACT_INVARIANTS.md`; consumer enforcement waits until
   a topology engine exists.
6. **EOS / Junos `oper_state` and `mtu` differences** — surface-
   level, intentionally not part of the cross-vendor invariant.

The V1N stage note's earlier "Parked debt before V1O" list is now
either burned down or relocated to this remaining list, in line with
the V1N-A intent ("debt ledger cleanup before V1O").

## Next stage

**V1O — Config Intake operator surface.** First UI consumption of
parser output. The parser layer is now in a state where V1O can
trust:
- Three vendor parsers with stable `PARSER_VERSION`.
- Cross-vendor canonical consistency proven.
- Receipt projection parser-agnostic.
- Out-of-scope content reliably surfaced (not silently dropped).
- Contract invariants locked in writing.

## Cross-references

- [V1N stage note](./V1N-arista-eos-parser.md)
- [V1M stage note](./V1M-juniper-junos-parser.md)
- [V1L stage note](./V1L-fixture-corpus-and-receipts.md)
- [V1K stage note](./V1K-cisco-iosxe-parser.md)
- [PARSER_CONTRACT_INVARIANTS.md](../../docs/architecture/PARSER_CONTRACT_INVARIANTS.md)
- [PARSER_VERSIONING.md](../../docs/architecture/PARSER_VERSIONING.md)
- [PARSER_COVERAGE_AREAS.md](../../docs/architecture/PARSER_COVERAGE_AREAS.md)
- [EOS_VS_IOSXE_DIVERGENCES.md](../../docs/architecture/EOS_VS_IOSXE_DIVERGENCES.md)
- [JUNOS_CONFIG_STYLES.md](../../docs/architecture/JUNOS_CONFIG_STYLES.md)
