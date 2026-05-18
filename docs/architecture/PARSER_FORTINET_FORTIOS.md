# FortiOS Parser — Contract (V1AV initial)

## Identity

- **Platform id:** `fortinet-fortios`
- **Vendor:** Fortinet
- **OS family:** FortiOS
- **Parser source:** `src-tauri/src/engines/parsers/fortinet_fortios.rs`
- **Parser version:** `PARSER_VERSION = 1`
- **Fixture corpus:** `src-tauri/tests/fixtures/fortinet-fortios/`
- **Fixture harness:** `src-tauri/tests/fortinet_fortios_fixture_corpus.rs`

## Supported config syntax / forms

The V1 parser walks FortiOS configuration text line-by-line using a
simple section stack. Recognised forms in V1:

- `config system global`
  - `set hostname <name>` → captured into `identity.hostname`.
  - `set version <string>` → captured into
    `platform.os_version_raw` / `platform.os_version_normalized`.
- `config system interface`
  - `edit "<name>"` → opens an interface block; block closes on `next`
    or `end`.
  - `set alias <text>` → interface description.
  - `set status up|down|enable|disable` → admin state.
  - `set ip <addr> <mask>` or `set ip <addr>/<prefix>` → IPv4
    address entry with prefix-length normalisation.
  - `set interface "<parent>"` → parent interface binding.
  - `set vlanid <id>` → VLAN model entry and interface-to-VLAN
    attachment.
  - `set mtu <n>` → interface MTU.
  - `set allowaccess ...`, `set role ...`, `set vdom ...`,
    `set mtu-override ...` → preserved as interface notes.
- `config system zone`
  - `edit "<zone>"` / `set interface ...` → firewall zone membership.
- `config router static`
  - `edit <id>` → opens a static route block.
  - `set dst <prefix>` → static route prefix.
  - `set gateway <next-hop>` → next hop.
  - `set distance <n>` / `set metric <n>` → route attributes.
  - `set name <text>` / `set comment <text>` → route note/name.
  - `set device <iface>` → recorded as out-of-scope evidence, not as a
    model field.
- `return` / `quit` / blank / `#` / `!` lines → tolerated and never
  panic.

## Covered areas (in scope)

`identity`, `platform`, `interfaces`, `ip_addressing`, `vlans`,
`firewall_zones`, `static_routes`.

Interface kinds classified in V1: Physical (`port*`), Vlan (`VLAN*`),
Loopback (`loopback*`), Lag (`aggregate*` / `agg*`), Management
(`mgmt*` / `management*`), SubInterface (`name contains "."`),
Unknown otherwise.

## Out of scope (V1AV)

Emitted as `not_in_scope:` warnings in `parse_confidence.warnings` so
consumers can distinguish "did not try" from "not modelled yet":

`aaa_detail`, `firewall_address_objects`, `firewall_policy`,
`firewall_service_objects`, `nat_rules`, `qos_policies`,
`routing_protocols_bgp`, `routing_protocols_eigrp`,
`routing_protocols_isis`, `routing_protocols_ospf`, `sdwan`,
`services_dns`, `services_ntp`, `services_snmp`, `services_ssh`,
`services_syslog`, `tunnels`, `vpn_tunnels`.

Top-level vocabulary in any of those families is recorded as an
`UnknownConfigLine` with `reason: OutOfScope`; other unsupported top-
level lines remain honest `UnknownConfigLine` evidence too.

## Determinism expectation

- BTreeMap-only for keyed accumulators; no HashMap on output paths.
- `interfaces`, `vlans`, `firewall_zones`, `static_routes`,
  `unknown_lines` sorted by stable keys.
- `parse_confidence.warnings` sorted + deduped.
- `parse_confidence.score` rounded to 4 decimals.
- Never panics on malformed / truncated input.
- The corpus harness asserts ten back-to-back parses produce
  byte-identical JSON.

## Known limitations

- Firewall address / service / policy / ippool semantics are not
  modelled in V1.
- VPN / SD-WAN / AAA / QoS / routing-protocol deep parsing is not
  modelled in V1.
- IPv6 is not modelled in V1.
- `set device` on static routes is preserved only as evidence, not as a
  typed route field.

## Future expansion points

Per the area list above, each removal from `OUT_OF_SCOPE_AREAS` lands
as a `PARSER_VERSION` bump and a fresh `expected.json` regeneration
under `ANTHRACITE_UPDATE_FIXTURES=1`. Suggested next deltas:

1. Firewall address / service / policy modelling.
2. NAT / ippool / VIP modelling.
3. SD-WAN and VPN tunnelling.
4. AAA and QoS policy modelling.
5. Routing-protocol blocks if FortiOS coverage ever grows past the
   current bounded slice.

## Cross-links

- `src-tauri/src/engines/parsers/fortinet_fortios.rs`
- `src-tauri/src/engines/parsers/mod.rs` — dispatch entry.
- `src-tauri/src/engines/vendor_registry.rs` — `fortinet-fortios`
  platform.
- `src-tauri/src/engines/config_detection.rs` — `fortinet-fortios`
  signatures.
- `src-tauri/tests/fixtures/fortinet-fortios/` — fixture corpus.
- `src-tauri/tests/fortinet_fortios_fixture_corpus.rs` — corpus
  harness.
- `docs/architecture/PARSER_COMMAND_CONTRACT.md` — dispatch contract.
- `docs/architecture/PARSER_CONTRACT_INVARIANTS.md` — determinism
  rules.
- `docs/architecture/PARSER_COVERAGE_AREAS.md` — area vocabulary.
- `docs/architecture/PARSER_VERSIONING.md` — version-bump policy.
- `obsidian/stages/V1AV-missing-parser-coverage.md` — stage note.
