# Huawei VRP Parser — Contract (V1AV initial)

## Identity

- **Platform id:** `huawei-vrp`
- **Vendor:** Huawei
- **OS family:** VRP
- **Parser source:** `src-tauri/src/engines/parsers/huawei_vrp.rs`
- **Parser version:** `PARSER_VERSION = 1`
- **Fixture corpus:** `src-tauri/tests/fixtures/huawei-vrp/`
- **Fixture harness:** `src-tauri/tests/huawei_vrp_fixture_corpus.rs`

## Supported config syntax / forms

The V1 parser walks the running-config line-by-line with a two-level
indent context (top-level vs interface/vty block bodies). Recognised
forms in V1:

- `version <string>` → captured into `platform.os_version_raw` and
  `platform.os_version_normalized`.
- `sysname <name>` → captured into `identity.hostname`.
- `interface <Name>` → opens an interface block; block closes on
  next top-level command.
  - `description <text>` → `interface.description`.
  - `shutdown` → `interface.admin_state = down`.
  - `undo shutdown` → `interface.admin_state = up`.
  - `ip address <addr> <mask|prefix>` → ipv4 address with prefix
    length derived from dotted-decimal mask or numeric prefix.
  - `ip binding vpn-instance <vrf>` → `interface.vrf`.
- `ip route-static <dest> <mask|prefix> <next-hop>` → static route
  with prefix-form destination.
- `user-interface vty <range>` → opens a vty block.
  - `protocol inbound telnet` or `protocol inbound all` → emits a
    `ServiceModel { kind: Telnet }` (telnet hygiene signal).
- `return` / `quit` / blank / `#` lines → counted as parsed lines,
  no model contribution.

## Covered areas (in scope)

`identity`, `platform`, `interfaces`, `ip_addressing`,
`static_routes`, `services_telnet`.

Interface kinds classified: Physical (GigabitEthernet*, Ethernet*,
*GE), Loopback (LoopBack*), Vlan (Vlanif*), Lag (Eth-Trunk*),
Tunnel (Tunnel*), Management (MEth* / Management*), Virtual (Null*),
SubInterface (name contains `.`).

## Out of scope (V1AV)

Emitted as `not_in_scope:` warnings in `parse_confidence.warnings`
so consumers can compare absent vs. not-in-scope deterministically:

`aaa_detail`, `acls`, `firewall_policies`, `lag_groups`, `nat_rules`,
`qos_policies`, `routing_protocols_bgp`, `routing_protocols_isis`,
`routing_protocols_ospf`, `services_dns`, `services_ntp`,
`services_snmp`, `services_ssh`, `services_syslog`, `tunnels`,
`vlans`, `vrfs`.

Top-level vocabulary in any of those families is recorded as an
`UnknownConfigLine` with `reason: OutOfScope`. Future stages bump
`PARSER_VERSION` and expand `IN_SCOPE_AREAS` accordingly.

## Determinism expectation

- BTreeMap-only for any keyed accumulator; no HashMap on output paths.
- `interfaces`, `static_routes`, `unknown_lines` sorted by stable keys.
- `parse_confidence.warnings` sorted + deduped.
- `parse_confidence.score` rounded to 4 decimals.
- Never panics on malformed / truncated input.
- The corpus harness asserts ten back-to-back parses produce
  byte-identical JSON.

## Known limitations

- VLAN / VLAN-batch / port trunk vocabulary recorded as
  `not_in_scope:vlans` only; no canonical VLAN model emitted.
- VRF instance bodies (`ip vpn-instance <name>` block) not
  consumed; per-interface `ip binding vpn-instance` is captured.
- Eth-Trunk / LAG bodies recorded as out-of-scope.
- Routing protocol bodies (`ospf`, `bgp`, `isis`) recorded as
  out-of-scope.
- Service vocabulary beyond telnet (SSH, SNMP, NTP, syslog, DNS)
  not modelled in V1.
- IPv6 not modelled in V1.

## Future expansion points

Per the area list above, each removal from `OUT_OF_SCOPE_AREAS` lands
as a `PARSER_VERSION` bump and a fresh `expected.json` regeneration
under `ANTHRACITE_UPDATE_FIXTURES=1`. Suggested next deltas:

1. VLAN / Vlanif modelling (extend `vlans` and `interfaces.vlan`
   linkage).
2. VRF instance modelling (extend `vrfs`).
3. SSH / SNMP / NTP / syslog services.
4. OSPF / BGP / ISIS routing protocols.
5. ACL / traffic-policy / QoS canonicalisation.

## Cross-links

- `src-tauri/src/engines/parsers/huawei_vrp.rs`
- `src-tauri/src/engines/parsers/mod.rs` — dispatch entry.
- `src-tauri/src/engines/vendor_registry.rs` — `huawei-vrp` platform.
- `src-tauri/src/engines/config_detection.rs` — `huawei-vrp` signatures.
- `src-tauri/tests/fixtures/huawei-vrp/` — fixture corpus.
- `src-tauri/tests/huawei_vrp_fixture_corpus.rs` — corpus harness.
- `docs/architecture/PARSER_COMMAND_CONTRACT.md` — dispatch contract.
- `docs/architecture/PARSER_CONTRACT_INVARIANTS.md` — determinism rules.
- `docs/architecture/PARSER_COVERAGE_AREAS.md` — area vocabulary.
- `docs/architecture/PARSER_VERSIONING.md` — version-bump policy.
- `obsidian/stages/V1AV-missing-parser-coverage.md` — stage note.
