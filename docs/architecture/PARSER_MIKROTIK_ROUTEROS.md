# MikroTik RouterOS Parser — Contract (V1BA initial)

## Identity

- **Platform id:** `mikrotik-routeros`
- **Vendor:** MikroTik
- **OS family:** RouterOS
- **Parser source:** `src-tauri/src/engines/parsers/mikrotik_routeros.rs`
- **Parser version:** `PARSER_VERSION = 1`
- **Fixture corpus:** `src-tauri/tests/fixtures/mikrotik-routeros/`
- **Fixture harness:** `src-tauri/tests/mikrotik_routeros_fixture_corpus.rs`

## Supported config syntax / forms

The V1BA parser walks RouterOS export text line-by-line. Recognised
forms in V1:

- `/system identity set name=<name>` -> `identity.hostname`
- `/interface bridge add name=<bridge> ...` -> bridge interface,
  with `vlan-filtering` and `comment` preserved as notes
- `/interface ethernet set [ find default-name=etherN ] name=<new>` ->
  physical interface inventory / rename
- `/interface vlan add name=<vlan-if> interface=<parent> vlan-id=<id>` ->
  VLAN interface attached to a parent interface
- `/interface bridge port add bridge=<bridge> interface=<member> ...` ->
  bridge membership, access/trunk hints, `pvid`, and bridge notes
- `/interface bridge vlan add bridge=<bridge> tagged=... untagged=... vlan-ids=...` ->
  VLAN membership / allowed-vlan modelling
- `/ip address add address=<ip/prefix> interface=<iface>` -> IPv4 address
- `/ip route add dst-address=<prefix> gateway=<next-hop> distance=<n>` ->
  static route
- `/ip service set ssh disabled=no port=<n>` -> `ServiceKind::Ssh`
- `/ip service set telnet disabled=no|yes ...` -> `ServiceKind::Telnet`
  when present
- `/ip service set api disabled=yes` -> honest unsupported keyword
  evidence, not a first-class service
- `/snmp set enabled=yes` -> `ServiceKind::Snmp`
- `/system ntp client set enabled=yes primary-ntp=... secondary-ntp=...` ->
  `ServiceKind::Ntp`
- comment-only note markers are tolerated and do not create structured
  model objects

## Covered areas (in scope)

`identity`, `platform`, `interfaces`, `ip_addressing`, `vlans`,
`static_routes`, `services_ssh`, `services_snmp`, `services_ntp`.

The current corpus does not contain a telnet service line. The parser
code accepts it, but the initial coverage denominator still tracks the
SSH / SNMP / NTP trio above.

## Out of scope (V1BA)

Emitted as `not_in_scope:` warnings in `parse_confidence.warnings` so
consumers can distinguish "did not try" from "not modelled yet":

`aaa_detail`, `firewall_address_objects`, `firewall_policy`,
`firewall_service_objects`, `nat_rules`, `qos_policies`,
`routing_protocols_bgp`, `routing_protocols_eigrp`,
`routing_protocols_isis`, `routing_protocols_ospf`, `sdwan`,
`services_dns`, `services_syslog`, `tunnels`, `vpn_tunnels`,
`wireless`.

Top-level vocabulary in any of those families is recorded as an
`UnknownConfigLine` with `reason: OutOfScope`; unsupported lines that
do not match the top-level out-of-scope vocabulary remain honest
evidence with `UnsupportedKeyword` or `ParseError`.

## Determinism expectation

- BTreeMap-only for keyed accumulators; no HashMap on output paths.
- `interfaces`, `vlans`, `static_routes`, `unknown_lines` sorted by
  stable keys.
- `parse_confidence.warnings` sorted + deduped.
- `parse_confidence.score` rounded to 4 decimals.
- Never panics on malformed / truncated input.
- The corpus harness asserts ten back-to-back parses produce
  byte-identical JSON.

## Known limitations

- `api` service lines remain honest unsupported evidence.
- Telnet is recognized by the parser code, but the first shipped corpus
  does not yet exercise it.
- Bridge / VLAN semantics are shaped by the current prep corpus. More
  complex RouterOS exports can extend the slice later.
- IPv6 is not modelled in V1BA.

## Future expansion points

Per the area list above, each removal from `OUT_OF_SCOPE_AREAS` lands
as a `PARSER_VERSION` bump and a fresh `expected.json` regeneration
under `ANTHRACITE_UPDATE_FIXTURES=1`. Suggested next deltas:

1. Telnet denominator coverage if the corpus starts using it.
2. Firewall / NAT / QoS canonicalisation.
3. AAA / policy / security surface.
4. Routing-protocol blocks.
5. VPN / tunnel modelling.

## Cross-links

- `src-tauri/src/engines/parsers/mikrotik_routeros.rs`
- `src-tauri/src/engines/parsers/mod.rs` — dispatch entry.
- `src-tauri/src/engines/vendor_registry.rs` — `mikrotik-routeros` platform.
- `src-tauri/src/engines/config_detection.rs` — `mikrotik-routeros` signatures.
- `src-tauri/tests/fixtures/mikrotik-routeros/` — fixture corpus.
- `src-tauri/tests/mikrotik_routeros_fixture_corpus.rs` — corpus harness.
- `docs/architecture/PARSER_COMMAND_CONTRACT.md` — dispatch contract.
- `docs/architecture/PARSER_CONTRACT_INVARIANTS.md` — determinism rules.
- `docs/architecture/PARSER_COVERAGE_AREAS.md` — area vocabulary.
- `docs/architecture/PARSER_VERSIONING.md` — version-bump policy.
- `obsidian/stages/V1BA-mikrotik-routeros-parser.md` — stage note.
