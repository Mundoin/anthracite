# Cisco IOS Parser — Contract (V1BC initial)

## Identity

- **Platform id:** `cisco-ios`
- **Vendor:** Cisco
- **OS family:** IOS / IOS XE
- **Parser source:** `src-tauri/src/engines/parsers/cisco_ios.rs`
- **Parser version:** `PARSER_VERSION = 1`
- **Fixture corpus:** `src-tauri/tests/fixtures/cisco-ios/`
- **Fixture harness:** `src-tauri/tests/cisco_ios_fixture_corpus.rs`

## Supported config syntax / forms

The V1BC parser keeps the same canonical IOS L1/L2 surface as the
IOS-XE baseline. Implementation currently reuses the shared IOS/XE
parse core, but the family contract stays distinct and keeps its own
fixture corpus and version gate.

Recognised forms in V1:

- `hostname <name>` -> `identity.hostname`
- `version <string>` -> captured into `platform.os_version_raw` and
  `platform.os_version_normalized`
- `interface <name>` -> physical / logical interface inventory
- `interface Loopback<N>` -> loopback interface
- `interface Vlan<N>` -> VLAN interface
- `interface <name>.<unit>` -> sub-interface
- `ip address <ip> <mask>` -> IPv4 address
- `vrf definition <name>` / `ip vrf <name>` -> VRF inventory
- `vlan <id>` / `name <text>` -> VLAN model entry
- `ip route ...` -> static route
- `line vty ...` / `transport input ssh|telnet|all` -> SSH / Telnet
  service evidence
- `snmp-server ...`, `ntp server ...`, `ip name-server ...`,
  `logging host ...` -> service evidence
- comment-only and delimiter lines (`!`) are tolerated and do not
  produce model objects

The parser recognizes the same Cisco-derived topological and service
surface as `cisco-iosxe`; the difference is the family boundary and
version ledger, not the canonical model shape.

## Covered areas (in scope)

`identity`, `platform`, `interfaces`, `ip_addressing`, `vlans`,
`vrfs`, `static_routes`, `lag_groups`, `services_ssh`,
`services_snmp`, `services_ntp`, `services_dns`, `services_syslog`,
`services_telnet`.

## Out of scope (V1BC)

`acls`, `nat_rules`, `firewall_zones`, `tunnels`, `qos_policies`,
`routing_protocols_ospf`, `routing_protocols_isis`,
`routing_protocols_eigrp`, `routing_protocols_bgp`, `aaa_detail`,
`route_maps`, `prefix_lists`, `community_lists`, `mpls`, `vxlan`,
`evpn`, `segment_routing`.

Top-level vocabulary in those families is recorded as `UnknownConfigLine`
with `reason: OutOfScope`. Unsupported top-level lines outside that
vocabulary remain honest evidence with `UnsupportedKeyword` or
`ParseError`.

## Determinism expectation

- BTreeMap-only for keyed accumulators; no HashMap on output paths.
- `interfaces`, `vlans`, `vrfs`, `static_routes`, `unknown_lines`
  sorted by stable keys.
- `parse_confidence.warnings` sorted + deduped.
- `parse_confidence.score` rounded to 4 decimals.
- Never panics on malformed / truncated input.
- The corpus harness asserts repeated parses produce byte-identical JSON.

## Known limitations

- The initial corpus is intentionally small and focuses on the shared
  IOS/XE canonical bar.
- IPv6 is not modelled in the first IOS baseline slice.
- Any IOS/XE-specific syntax that is not represented in the seed corpus
  can be added later without changing the family boundary.

## Cross-links

- `src-tauri/src/engines/parsers/cisco_ios.rs`
- `src-tauri/src/engines/parsers/cisco_iosxe/mod.rs` — shared parse core.
- `src-tauri/src/engines/parsers/mod.rs` — dispatch entry.
- `src-tauri/src/engines/vendor_registry.rs` — `cisco-ios` platform.
- `src-tauri/src/engines/config_detection.rs` — `cisco-ios` signatures.
- `src-tauri/tests/fixtures/cisco-ios/` — fixture corpus.
- `src-tauri/tests/cisco_ios_fixture_corpus.rs` — corpus harness.
- `docs/architecture/PARSER_COMMAND_CONTRACT.md` — dispatch contract.
- `docs/architecture/PARSER_CONTRACT_INVARIANTS.md` — determinism rules.
- `docs/architecture/PARSER_COVERAGE_AREAS.md` — area vocabulary.
- `docs/architecture/PARSER_VERSIONING.md` — version-bump policy.
- `obsidian/stages/V1BC-cisco-ios-parser.md` — stage note.
