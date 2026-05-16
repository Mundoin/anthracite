# V1K — Cisco IOS / IOS XE parser (inventory + topology)

**Status:** complete
**Date:** 2026-05-16
**Anchor at start of stage:** `41561c4 docs: add v1k parser architecture proposal`
**Predecessor:** V1J-A — Motor Room Architecture Rules
**Successor (recommended):** V1L — Golden fixture corpus expansion + receipt projection

## Why this stage exists

V1G→V1J-A built the engine spine: vendor registry, canonical model, config
detection, motor-room rules. None of them produce a single populated
`DeviceModel`. V1K wires stage 2 of the pipeline contract
([`ENGINE_PIPELINE_CONTRACT.md`](../../docs/architecture/ENGINE_PIPELINE_CONTRACT.md)
§2 normalisation) by shipping the first parser. Binding spec lives at
[`V1K-cisco-iosxe-parser-PROPOSAL.md`](./V1K-cisco-iosxe-parser-PROPOSAL.md);
this note is the changelog, not the spec.

## What changed

### Rust — parser tree
- `src-tauri/src/engines/parsers/mod.rs` — dispatch boundary, `parse_device_config`.
- `src-tauri/src/engines/parsers/context.rs` — `ParserContext` block stack + `Frame`.
- `src-tauri/src/engines/parsers/normalize.rs` — Cisco short-form normalization table.
- `src-tauri/src/engines/parsers/cisco_iosxe/mod.rs` — orchestrator, `ParserState`, three-pass walk, `finalize`, `PARSER_VERSION = 1`, in/out-of-scope area lists.
- `src-tauri/src/engines/parsers/cisco_iosxe/lexer.rs` — line-oriented tokenizer.
- `src-tauri/src/engines/parsers/cisco_iosxe/identity.rs` — hostname / version / chassis / serial / last-change marker.
- `src-tauri/src/engines/parsers/cisco_iosxe/interfaces.rs` — kind classification, parent_of, mtu / speed / duplex / switchport mode / vlan list helpers.
- `src-tauri/src/engines/parsers/cisco_iosxe/ip_addressing.rs` — IPv4 mask normalization, IPv4 / IPv6 address parsing.
- `src-tauri/src/engines/parsers/cisco_iosxe/vlans.rs` — `VlanBuilder` + parsers.
- `src-tauri/src/engines/parsers/cisco_iosxe/vrfs.rs` — `VrfBuilder` + parsers (RD, AF, RT).
- `src-tauri/src/engines/parsers/cisco_iosxe/static_routes.rs` — `ip route` / `ipv6 route` parsing with VRF / admin-distance / name / tag.
- `src-tauri/src/engines/parsers/cisco_iosxe/lag.rs` — `channel-group` parsing, canonical LAG names.
- `src-tauri/src/engines/parsers/cisco_iosxe/services.rs` — SSH / SNMP / NTP / DNS / Syslog accumulators + builders.
- `src-tauri/src/engines/parsers/cisco_iosxe/unknown.rs` — `UnknownConfigLine` emission helpers.

### Rust — command
- `src-tauri/src/commands/parser.rs` — `parse_device_config` Tauri command.
- `src-tauri/src/engines/mod.rs` — registers `parsers` module.
- `src-tauri/src/commands/mod.rs` — registers `parser` module.
- `src-tauri/src/lib.rs` — wires `parse_device_config` into the invoke handler.

### TypeScript
- `src/types/parser.ts` — re-exports `DeviceModel` for clarity.
- `src/api/parser.ts` — `parseDeviceConfig` invoke wrapper.

### Fixtures
- `src-tauri/tests/fixtures/cisco-iosxe/small/config.cfg` (~72 lines) + `expected.json`.
- `src-tauri/tests/fixtures/cisco-iosxe/near-empty/config.cfg` (2 lines) + `expected.json`.
- `src-tauri/tests/fixtures/cisco-iosxe/truncated/config.cfg` (5 lines, no `end`) + `expected.json`.
- `src-tauri/tests/cisco_iosxe_fixtures.rs` — fixture byte-equal, determinism (10× loop + serde round-trip), and negative tests.
- `.gitattributes` (new) — pins fixtures to LF so byte-equal assertions hold on Windows checkouts.

### Architecture docs
- `docs/architecture/INTERFACE_NAMING.md` — Cisco short-form table (V1K baseline).
- `docs/architecture/PARSER_VERSIONING.md` — monotonic `u32` `PARSER_VERSION` per parser + bump policy.
- `docs/architecture/PARSER_COMMAND_CONTRACT.md` — typed command shape, error behaviour, no-detection-dependency.
- `docs/architecture/PARSER_COVERAGE_AREAS.md` — enumerated 13-area in-scope list for cisco-iosxe L1/L2 + coverage ratio formula.
- `docs/architecture/CANONICAL_NETWORK_MODEL.md` — §Receipts paragraph updated to receipt-as-projection-over-DeviceModel.

### Vault
- `obsidian/stages/V1K-cisco-iosxe-parser.md` (this note).
- `obsidian/ANTHRACITE_INDEX.md` — V1K row + V1L placeholder.

## Design rules encoded

- **Composable, not chained.** Parser takes `PlatformRef` as input; does not
  call detection at runtime.
- **Unknown / missing platform id → controlled `Err`.** Never panic.
- **Empty / whitespace-only input.** `Ok(DeviceModel)` with empty body,
  `score = 0.0`, warnings = `[empty_input]`.
- **Three passes:** lex → section dispatch (with `ParserContext` block
  stack) → finalize / cross-link / sort.
- **Determinism guarantees.** No `HashMap` in output-producing paths
  (`BTreeMap` everywhere). All `Vec<T>` outputs sorted by documented keys.
  No floating-point arithmetic except the single `ParseConfidence.score`,
  rounded to 4 decimals. No timestamps.
- **Sort keys** (per proposal §4.2): interfaces by `normalized_name`,
  vlans by `id`, vrfs by `name`, static_routes by `(prefix, vrf,
  next_hop_first)`, lag_groups by bundle id, services by `(kind,
  identifier)`, unknown_lines by `line_number`.
- **Unknown is first-class.** Every line the parser does not understand
  yields an `UnknownConfigLine` with full `context_path`. Not dropped.
- **`PARSER_VERSION = 1`.** Stamped into `EvidenceMetadata.parser_version`.
- **Coverage discipline.** 13 in-scope areas; out-of-scope areas marked
  via `not_in_scope:<area>` warnings; absent in-scope areas marked via
  `absent:<area>` warnings.
- **Truncated input detected.** Parsed lines without an `end` marker
  flips `truncated_input` warning.

## What did NOT change

- `src-tauri/src/engines/network_model.rs` — untouched.
- `src-tauri/src/engines/vendor_registry.rs` — untouched.
- `src-tauri/src/engines/config_detection.rs` — untouched.
- `obsidian/stages/V1K-cisco-iosxe-parser-PROPOSAL.md` — frozen at `41561c4`.
- No new cargo or pnpm dependencies. `Cargo.toml` and `package.json`
  byte-identical to start.
- No UI / CSS / React component / `src/modes/` touch.
- No Python sidecar. No Netmiko / Scrapli / NAPALM. No live device access.
- No routing-protocol parsing (OSPF, BGP, EIGRP, IS-IS). No ACL, NAT, QoS,
  firewall zone, tunnel, AAA-detail, route-map, MPLS, VXLAN parsing.
- No switchport trunk range expansion (`allowed vlan 10-20` /
  `add` / `remove`) — surfaced as `trunk_allowed_range_or_modifier_out_of_scope`
  warning + `UnknownConfigLine`.
- No separate `Receipt` type — receipt is a projection over `DeviceModel`
  (see updated §Receipts in `CANONICAL_NETWORK_MODEL.md`).

## Validation

- `cargo check --lib` — green.
- `cargo test --lib` — 152 passed; 0 failed (122 prior + 30 new lib-level
  tests across parsers / context / normalize / cisco_iosxe submodules).
- `cargo test --test cisco_iosxe_fixtures` — 11 passed (3 fixture byte-equal,
  2 determinism, 5 negative, 1 registry-integrity).
- `pnpm typecheck` — green.
- `pnpm build` — green, 51 modules, ~352ms.
- `tools/ops-readiness.ps1` — READY.

## Silent decisions (flagged for Bujar / Vale review before V1L)

1. **`UnknownReason::UnrecognizedInterfaceForm` (proposal §3.1) does not
   exist on the V1I `UnknownReason` enum.** V1K uses
   `UnknownReason::UnsupportedKeyword` for unrecognized interface forms
   (with descriptive `context_path`). Adding the variant would require
   editing `network_model.rs`, which is forbidden in V1K scope. V1L can
   add the variant if needed.
2. **Service sub-attributes packed into `notes`.** V1I `ServiceModel`
   carries only `kind / servers / source_interface / vrf /
   authentication_mode / notes`. Multi-attribute services (SSH version +
   timeout, SNMP location + contact + communities + trap hosts, DNS
   domain list, syslog severity + facility) pack scalars into `notes` as
   deterministic `key=value;…` strings. SNMP communities and trap hosts
   are emitted as **two distinct `ServiceModel { kind: Snmp }` records**
   differentiated by `notes`. Encoded keys are stable.
3. **`ip default-gateway` recorded as parsed acknowledgement only.**
   Mgmt IPs come from `Management*` interface IPv4 addresses on the
   `InterfaceKind::Management` branch.
4. **`exec-timeout MIN SEC` under `line vty` populates SSH idle-timeout
   only if `ip ssh time-out` did not already set it.** Last-write-wins
   would be non-deterministic across config orderings.
5. **`service timestamps …` lines are emitted as `UnknownConfigLine`.**
   Not in V1K scope. Captured for evidence.

## Next stage

**V1L — Golden fixture corpus expansion + receipt projection.** Expand the
cisco-iosxe fixture corpus to ~15 fixtures; build the fixture-diff CI
harness; build the receipt projection (`project_receipt(&DeviceModel) ->
ReceiptView`) as a flat view shape for UI consumption. Second parser
(V1M Junos) waits until V1L shakes out the L1/L2 contract.

## Cross-references

- [`V1K-cisco-iosxe-parser-PROPOSAL.md`](./V1K-cisco-iosxe-parser-PROPOSAL.md)
- [`../../docs/architecture/INTERFACE_NAMING.md`](../../docs/architecture/INTERFACE_NAMING.md)
- [`../../docs/architecture/PARSER_VERSIONING.md`](../../docs/architecture/PARSER_VERSIONING.md)
- [`../../docs/architecture/PARSER_COMMAND_CONTRACT.md`](../../docs/architecture/PARSER_COMMAND_CONTRACT.md)
- [`../../docs/architecture/PARSER_COVERAGE_AREAS.md`](../../docs/architecture/PARSER_COVERAGE_AREAS.md)
- [`../../docs/architecture/CANONICAL_NETWORK_MODEL.md`](../../docs/architecture/CANONICAL_NETWORK_MODEL.md)
- [`../../docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md`](../../docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md)
- [`V1J-config-detection-engine.md`](./V1J-config-detection-engine.md)
- [`V1J-A-motor-room-architecture-rules.md`](./V1J-A-motor-room-architecture-rules.md)
