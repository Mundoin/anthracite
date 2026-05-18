# PARSER_COVERAGE_AREAS

Enumerated per (parser × maturity level). Anchors
`ParseConfidence.score` so consumers of the value know exactly what the
denominator was. Bound by V1K
([`../../obsidian/stages/V1K-cisco-iosxe-parser-PROPOSAL.md`](../../obsidian/stages/V1K-cisco-iosxe-parser-PROPOSAL.md)
§3.4).

## Coverage ratio formula

For a given (parser × maturity), the in-scope area list has size `N`.
For a given parse run, count `K` = number of areas that either:

- have at least one populated entry in the produced `DeviceModel`, or
- were explicitly emitted as `absent` via a `ParseConfidence.warnings`
  marker (`absent:<area>`).

Then:

```
score = round(K / N, 4)
```

Out-of-scope areas (per the maturity level) do NOT enter the
denominator. The parser explicitly marks them via a
`ParseConfidence.warnings` marker (`not_in_scope:<area>`) so consumers
can distinguish "we did not try" from "we tried and found nothing".

## cisco-iosxe — L1 inventory + L2 topology (V1K)

In-scope areas (13):

```
identity
platform
interfaces
ip_addressing
vlans
vrfs
static_routes
lag_groups
services_ssh
services_snmp
services_ntp
services_dns
services_syslog
```

Out-of-scope at L1/L2 (marked `not_in_scope`):

```
acls
nat_rules
firewall_zones
tunnels
qos_policies
routing_protocols_ospf
routing_protocols_isis
routing_protocols_eigrp
routing_protocols_bgp
aaa_detail
route_maps
prefix_lists
community_lists
mpls
vxlan
evpn
segment_routing
```

Out-of-scope areas advance to in-scope as parsers grow up the maturity
ladder. L3 policy adds the policy block; L4 intent adds the routing
protocol block; L5 validation adds findings; L6 render flips the model
direction.

## cisco-iosxe — V1L fixture coverage matrix

V1L expanded the committed corpus from 3 to 16 fixtures. The matrix
below names the primary parser path each fixture exercises. Fixtures
may exercise more than their headline area; the listed area is the one
the fixture was added for.

| Fixture                              | Exercises                                                  |
|--------------------------------------|------------------------------------------------------------|
| `acl-and-nat-present`                | out-of-scope ACL + NAT paths → `unknown_lines[]`           |
| `comments-and-banners`               | banner/comment tolerance, chassis/serial markers           |
| `dual-stack-edge`                    | IPv4 + IPv6 addresses on the same interface                |
| `duplicate-vlan-id`                  | VlanBuilder merge under duplicate `vlan N` blocks          |
| `large-interface-count`              | BTreeMap sort + LAG aggregation across many ports          |
| `many-access-ports-l2-only`          | L2 switch posture, trunk allowed VLAN list                 |
| `mixed-mask-formats`                 | IPv4 dotted-mask + IPv6 slash-prefix + secondary           |
| `near-empty` (V1K)                   | minimal viable input, score floor                          |
| `out-of-order-vrf-binding`           | interface `vrf forwarding` before `vrf definition` block   |
| `routing-protocols-present`          | out-of-scope OSPF/BGP blocks → `unknown_lines[]`           |
| `services-snmp-ntp-ssh-syslog`       | every `services_*` coverage area in one fixture            |
| `small` (V1K)                        | baseline ~72-line config                                   |
| `truncated` (V1K)                    | input without `end` marker → `truncated_input` warning     |
| `unrecognised-interface-form`        | `UnknownReason::UnrecognizedInterfaceForm` (added V1L)     |
| `vrf-heavy-aggregation`              | multiple VRFs with RD + route-target import/export         |
| `wan-edge-with-subinterfaces`        | dot1q sub-interfaces + `parent_interface` cross-link       |

The single source of truth for the corpus list is
`src-tauri/tests/fixtures/cisco-iosxe/_manifest.toml`. The
`parser_version_guard` and `cisco_iosxe_fixture_corpus` integration
tests enforce that the manifest, the on-disk dirs, and the source
constant all agree.

## juniper-junos — L1 inventory + L2 topology (V1M)

In-scope areas mirror the cisco-iosxe set exactly so receipt projection
and cross-vendor consumers operate on one vocabulary:

```
identity
platform
interfaces
ip_addressing
vlans
vrfs
static_routes
lag_groups
services_ssh
services_snmp
services_ntp
services_dns
services_syslog
```

Out-of-scope at L1/L2 (marked `not_in_scope`) also mirror the cisco
set. Junos-style path prefixes that fall into the out-of-scope bucket
emit `unknown_lines[]` with `UnknownReason::OutOfScope`:

- `protocols …` (OSPF, BGP, IS-IS, …)
- `policy-options …`
- `firewall …`
- `security …` (SRX zones, NAT, IPS)
- `class-of-service …`
- `forwarding-options …`
- `services …` (NAT, IDS, l2circuit, etc. — distinct from `system
  services` which V1M parses)
- `applications …`

V1M fixture coverage matrix:

| Fixture                          | Exercises                                                              |
|----------------------------------|------------------------------------------------------------------------|
| `aggregate-ethernet-bundle`      | `ae0`/`ae1` bundles + `gigether-options 802.3ad` member binding        |
| `dual-stack-edge`                | inet + inet6 addresses on the same unit                                |
| `irb-and-vlan-binding`           | IRB SVI + VLAN members via `family ethernet-switching`                 |
| `many-access-ports-l2-only`      | L2 switch posture, trunk vlan member list expansion                    |
| `near-empty`                     | minimal viable input, score floor                                      |
| `protocols-and-policy-present`   | out-of-scope blocks land in `unknown_lines[]`                          |
| `small-brace-style`              | full L1/L2 surface in brace style                                      |
| `small-set-style`                | same semantics as `small-brace-style` in set style                     |
| `truncated`                      | unclosed brace block → `truncated_input` warning                       |
| `unit-zero-vs-higher`            | unit 0 + unit 10 + unit 20 on same physical, each addressed            |
| `vrf-heavy-aggregation`          | multiple `routing-instances` with `vrf-target` and per-VRF statics     |
| `wan-edge-with-units`            | one physical, multiple sub-interfaces with addresses                   |

The single source of truth for the corpus list is
`src-tauri/tests/fixtures/juniper-junos/_manifest.toml`. The
`parser_version_guard` and `juniper_junos_fixture_corpus` integration
tests enforce that the manifest, the on-disk dirs, and the source
constant all agree.

## arista-eos — L1 inventory + L2 topology (V1N)

In-scope areas mirror the cisco-iosxe and juniper-junos sets exactly
so receipt projection and cross-vendor consumers operate on one
vocabulary:

```
identity
platform
interfaces
ip_addressing
vlans
vrfs
static_routes
lag_groups
services_ssh
services_snmp
services_ntp
services_dns
services_syslog
```

Out-of-scope at L1/L2 includes the V1K/V1M set **plus EOS-specific
blocks** that emit dedicated `not_in_scope:*` markers and route
contents through `unknown_lines[]`:

- `mlag configuration` → `not_in_scope:mlag`
- `management api http-commands` → `not_in_scope:management_api`
- `event-handler …` → `not_in_scope:event_handlers`
- `daemon …` → `not_in_scope:daemons`
- `varp …` → `not_in_scope:varp`

EOS-specific note: `switchport trunk group NAME` emits the warning
`eos_trunk_group_out_of_scope` and lands the line in `unknown_lines[]`
with `OutOfScope`.

V1N fixture coverage matrix:

| Fixture                              | Exercises                                                       |
|--------------------------------------|-----------------------------------------------------------------|
| `cross-vendor-equivalent-small`      | one of three fixtures the cross-vendor invariant test compares  |
| `eos-divergence-from-iosxe`          | `vrf instance`, `management ssh`, EOS-style LACP — proves EOS ≠ IOS-XE |
| `leaf-switch`                        | top-of-rack: many access ports, trunk uplink, mgmt SVI          |
| `mlag-and-eapi-present`              | MLAG + `management api http-commands` → out-of-scope evidence   |
| `near-empty`                         | hostname only                                                   |
| `routing-protocols-present`          | `router bgp` / `router ospf` → out-of-scope evidence            |
| `small`                              | full L1/L2 surface in one config                                |
| `spine-router`                       | routed Ethernet, multiple loopbacks, no VLANs                   |
| `truncated`                          | unclosed interface block → `truncated_input` warning            |
| `vrf-segmentation`                   | multiple `vrf instance` blocks with per-VRF static routes       |

The single source of truth for the corpus list is
`src-tauri/tests/fixtures/arista-eos/_manifest.toml`. The
`parser_version_guard` and `arista_eos_fixture_corpus` integration
tests enforce that the manifest, the on-disk dirs, and the source
constant all agree.

## cisco-nxos — L1 inventory + L2 topology (V1U)

In-scope areas mirror the other three parsers exactly:

```
identity
platform
interfaces
ip_addressing
vlans
vrfs
static_routes
lag_groups
services_ssh
services_snmp
services_ntp
services_dns
services_syslog
```

NX-OS-specific note: SSH is enabled via `feature ssh` (not `ip ssh
version 2`). VRF blocks use `vrf context NAME` (not `vrf definition`
or `vrf instance`). Static routes may appear inside `vrf context` blocks
with the VRF binding implied by the enclosing block. Interface names use
lowercase (`loopback0`, `port-channel1`). Management interface is `mgmt0`.
NTP and DNS servers accept an optional `use-vrf NAME` qualifier before
the address — the parser drains the qualifier and records the address.

Out-of-scope at L1/L2 (marked `not_in_scope` or `unknown_lines[]`):

```
router bgp / ospf / isis / eigrp
policy-map / class-map / route-map
vpc configuration
evpn / vxlan / segment-routing
mpls
copp / errdisable / spanning-tree
event-manager / monitor / flow
hardware / boot
feature vpc / lacp / lldp (untracked features)
```

V1U fixture coverage matrix:

| Fixture                              | Exercises                                                           |
|--------------------------------------|---------------------------------------------------------------------|
| `cross-vendor-equivalent-small`      | one of four fixtures the cross-vendor invariant test compares       |
| `feature-commands`                   | multiple `feature` lines — only ssh/ntp/snmp tracked               |
| `large-interface-count`              | 13 interfaces, port-channel10 LAG with 2 members                   |
| `near-empty`                         | hostname only, no `end` in fixture                                  |
| `nxos-divergence-from-iosxe`         | vrf context, loopback0, port-channel1, use-vrf NTP/DNS syntax      |
| `services-ssh-ntp-syslog`            | multiple NTP/syslog/DNS servers, SNMP contacts                      |
| `small`                              | full L1/L2 surface — baseline fixture used by receipt round-trip test |
| `truncated`                          | no `end` line → `truncated_input` warning                           |
| `vlan-database`                      | 4 VLANs with names, Vlan SVI, access/trunk Ethernet ports           |
| `vrf-segmentation`                   | 3 VRF contexts with RDs, route-targets, ip routes inside contexts   |

The single source of truth for the corpus list is
`src-tauri/tests/fixtures/cisco-nxos/_manifest.toml`. The
`parser_version_guard` and `cisco_nxos_fixture_corpus` integration
tests enforce that the manifest, the on-disk dirs, and the source
constant all agree.

See [`NXOS_VS_IOSXE_DIVERGENCES.md`](./NXOS_VS_IOSXE_DIVERGENCES.md)
for the full divergence catalogue.

## huawei-vrp — bounded VRP parser (V1AV)

In-scope areas:

```
identity
platform
interfaces
ip_addressing
static_routes
services_telnet
```

Out-of-scope at V1AV (marked `not_in_scope`):

```
aaa_detail
firewall_address_objects
firewall_policy
firewall_service_objects
nat_rules
qos_policies
routing_protocols_bgp
routing_protocols_eigrp
routing_protocols_isis
routing_protocols_ospf
sdwan
services_dns
services_ntp
services_snmp
services_ssh
services_syslog
tunnels
vpn_tunnels
```

Per-interface VRF binding is attached to `interfaces` in the canonical
model; there is no standalone `vrfs` area in this bounded slice.

The single source of truth for the corpus list is
`src-tauri/tests/fixtures/huawei-vrp/_manifest.toml`. The
`parser_version_guard` and `huawei_vrp_fixture_corpus` integration
tests enforce that the manifest, the on-disk dirs, and the source
constant all agree.

## fortinet-fortios — bounded FortiOS parser (V1AV)

In-scope areas:

```
identity
platform
interfaces
ip_addressing
vlans
firewall_zones
static_routes
```

Out-of-scope at V1AV (marked `not_in_scope`):

```
aaa_detail
firewall_address_objects
firewall_policy
firewall_service_objects
nat_rules
qos_policies
routing_protocols_bgp
routing_protocols_eigrp
routing_protocols_isis
routing_protocols_ospf
sdwan
services_dns
services_ntp
services_snmp
services_ssh
services_syslog
tunnels
vpn_tunnels
```

The single source of truth for the corpus list is
`src-tauri/tests/fixtures/fortinet-fortios/_manifest.toml`. The
`parser_version_guard` and `fortinet_fortios_fixture_corpus`
integration tests enforce that the manifest, the on-disk dirs, and the
source constant all agree.

## Cross-vendor consistency invariant (V1N / V1U)

`tests/cross_vendor_consistency.rs` parses one logically-equivalent
fixture for each of the four parsers and asserts a canonical
projection over them is byte-identical. The projection deliberately
strips vendor-specific surface (evidence, platform, warnings,
unknowns, interface kind shape, interface names) and keeps the
device-shape invariants: hostname, VRF set with RDs, VLAN set with
names, set of IP addresses present, static-route set, set of
populated service kinds, sorted service-server lists. See V1N stage
note for the rationale; V1U extended the test to include cisco-nxos.

## Other parsers

Extended per-vendor as each parser ships. Same area names are reused
across vendors so cross-vendor consumers compare scores on a single
vocabulary.

## Rationale

Without an enumerated denominator, every consumer of `score` has to
guess what it means, and "coverage" silently changes every time the
parser expands. Locking the list per (parser × maturity) keeps the
score a comparable number across vendors and across parser versions.

## Cross-references

- [`INTERFACE_NAMING.md`](./INTERFACE_NAMING.md)
- [`PARSER_VERSIONING.md`](./PARSER_VERSIONING.md)
- [`PARSER_COMMAND_CONTRACT.md`](./PARSER_COMMAND_CONTRACT.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
- [`VENDOR_ENGINE_PLAN.md`](./VENDOR_ENGINE_PLAN.md)
