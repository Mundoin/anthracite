# V1L — Golden fixture corpus + receipt projection

**Status:** complete
**Date:** 2026-05-16
**Predecessor:** V1K — Cisco IOS / IOS XE parser (L1 + L2)
**Successor (planned):** V1M — Juniper Junos parser L1/L2

## Why

V1K shipped the first parser and three baseline fixtures. That was
enough to prove the contract; it was not enough to make the parser
trustworthy. V1L closes three gaps:

1. **Corpus.** The committed fixture set covered ~72 lines across three
   tiny configs. Real Cisco devices were under-represented; many parse
   paths had no regression evidence at all.
2. **Discipline.** `PARSER_VERSION` was a free variable. Nothing
   stopped the parser's output from drifting silently between commits.
3. **Receipts.** UI consumption of `DeviceModel` was implicit. The
   "what landed where, what was unknown, what fired which warning"
   summary lived in consumers' heads.

V1L fixes all three within the V1K contract — no second parser, no UI
work, no model surgery beyond the one already-flagged enum variant.

## What changed

### Rust — model addendum
- `src-tauri/src/engines/network_model.rs` — added
  `UnknownReason::UnrecognizedInterfaceForm` + serde round-trip test.
- `src/types/networkModel.ts` — TS mirror.

### Rust — parser bump
- `src-tauri/src/engines/parsers/cisco_iosxe/mod.rs` —
  `PARSER_VERSION` bumped `1 → 2`. The `interface` opener now emits an
  `UnknownConfigLine` with the new reason when the form fails
  `interfaces::classify`. Block frame still pushes so child lines parse
  normally.

### Rust — receipt projection (new)
- `src-tauri/src/engines/receipt.rs` — `ReceiptView`, `ReceiptArea`,
  `ReceiptUnknown`, `ReceiptAreaStatus`, `project_receipt(&DeviceModel)`.
  Pure projection: no I/O, no parsing, no mutation. Deterministic
  ordering (`Vec` only). 256-unknown cap with truncation flag.
  Coverage ratio = parsed / (parsed + unknown), rounded 4dp.
- `src-tauri/src/commands/receipt.rs` —
  `#[tauri::command] project_device_receipt`.
- `src-tauri/src/lib.rs` — invoke handler registers the new command.
- `src-tauri/src/engines/mod.rs` + `src-tauri/src/commands/mod.rs` —
  module wiring.

### TypeScript
- `src/types/receipt.ts` — TS mirror of `ReceiptView` et al.
- `src/api/receipt.ts` — `projectDeviceReceipt` invoke wrapper.

### Fixtures (12 new + manifest)
New under `src-tauri/tests/fixtures/cisco-iosxe/`:

- `acl-and-nat-present/`
- `comments-and-banners/`
- `dual-stack-edge/`
- `duplicate-vlan-id/`
- `large-interface-count/`
- `many-access-ports-l2-only/`
- `mixed-mask-formats/`
- `out-of-order-vrf-binding/`
- `routing-protocols-present/`
- `services-snmp-ntp-ssh-syslog/`
- `unrecognised-interface-form/`
- `vrf-heavy-aggregation/`
- `wan-edge-with-subinterfaces/`

Plus `_manifest.toml` listing `parser_version = 2` and the full
alphabetical fixture set (13 V1L + 3 V1K = 16 total).

### Integration tests
- `src-tauri/tests/cisco_iosxe_fixture_corpus.rs` (new) — manifest
  reader (hand-rolled, no new dep), byte-equal walk over every
  fixture, determinism gate, serde round-trip gate, evidence
  `parser_version` consistency gate.
- `src-tauri/tests/parser_version_guard.rs` (new) — focused guard:
  manifest `parser_version` == source constant, manifest fixture set ==
  on-disk dir set, every listed fixture has `config.cfg`.
- `src-tauri/tests/cisco_iosxe_fixtures.rs` — V1K expected.json
  files re-captured to absorb the V1 → V2 evidence bump.

### Docs
- `docs/architecture/V1K_SILENT_DECISIONS_ACCEPTED.md` (new) — ratifies
  the five V1K silent decisions as the V1L-and-onward contract.
- `docs/architecture/PARSER_VERSIONING.md` — added "CI enforcement
  (V1L)" section + honest-limitation paragraph.
- `docs/architecture/PARSER_COVERAGE_AREAS.md` — added V1L fixture
  coverage matrix.

### Vault
- `obsidian/ANTHRACITE_INDEX.md` — V1L row landed; V1M row added as
  planned.
- This stage note.

## Design rules encoded

- **Receipts are a view, not parallel truth.** `project_receipt`
  reads, never writes; produces no derived facts the model doesn't
  already imply.
- **Parser version is a three-artefact agreement.** Source constant,
  manifest, on-disk corpus. Drift between any two fails CI.
- **CI's job is consistency, not judgement.** The guard cannot tell
  you whether a parser change *should* have bumped the version — only
  that the three artefacts agree. Human review is the final gate.
- **Manifest is hand-rolled, dep-free.** V1L respects the "no new
  dependencies without approval" rule; integration tests parse the
  pinned manifest shape inline.
- **Unknowns are capped, not silently dropped.** `ReceiptView` exposes
  a 256-entry cap plus `unknowns_truncated` so consumers know when
  they're seeing a slice.

## What stayed out

- No second vendor parser. V1M (Junos) waits on V1L corpus stability.
- No React UI consumption of `ReceiptView`. Backend command is wired;
  surface integration is V1O.
- No new dependencies. `Cargo.toml` and `package.json` byte-identical
  to V1K landing.
- No routing-protocol / ACL / NAT / QoS / firewall / tunnel / AAA
  parsing. These remain `unknown_lines[]` evidence per V1K.
- No edits to `vendor_registry.rs` or `config_detection.rs`.
- No Python, no Netmiko / Scrapli / NAPALM, no live device access.

## Validation

To be reported in this stage note's final pass after `cargo`, `pnpm`,
and `tools/ops-readiness.ps1` runs. See `.agents/handoff/` for the
session's final report.

## Next stage

**V1M — Juniper Junos parser L1/L2.** Reuses the V1K parser-tree
template (lexer → context → dispatch → finalize). Plugs into the same
fixture-manifest-and-guard discipline V1L established. Receipt
projection is parser-agnostic and already works against any
`DeviceModel`.

## Cross-references

- [V1K stage note](./V1K-cisco-iosxe-parser.md)
- [V1K binding spec](./V1K-cisco-iosxe-parser-PROPOSAL.md)
- [V1K_SILENT_DECISIONS_ACCEPTED.md](../../docs/architecture/V1K_SILENT_DECISIONS_ACCEPTED.md)
- [PARSER_VERSIONING.md](../../docs/architecture/PARSER_VERSIONING.md)
- [PARSER_COVERAGE_AREAS.md](../../docs/architecture/PARSER_COVERAGE_AREAS.md)
- [CANONICAL_NETWORK_MODEL.md](../../docs/architecture/CANONICAL_NETWORK_MODEL.md)
- [MOTOR_ROOM_ARCHITECTURE_RULES.md](../../docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md)
