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
