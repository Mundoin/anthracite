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
