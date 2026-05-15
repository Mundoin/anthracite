# CANONICAL_NETWORK_MODEL

Anthracite's internal vendor-neutral network language. Every parser emits this
model. Every validator, surface, and renderer consumes it. Raw vendor config
never leaks past the parser boundary.

This is a first-pass area map, not a finalized schema. Field-level Rust types
land in V1I.

## Core rules

1. **Vendor-neutral.** Names match operator intuition, not a specific vendor's
   CLI. Example: `routing.bgp.neighbours[]`, not `router bgp ... neighbor ...`.
2. **Evidence-preserving.** Every parsed object carries provenance: source
   file, line range, raw text span, parser version.
3. **Unknown is first-class.** Lines the parser does not understand are
   captured as `unknown_lines[]` with location and context, never dropped.
4. **Parse confidence is explicit.** Every object and every area has a
   confidence value. Downstream consumers can filter by threshold.
5. **Deterministic.** Same input + same parser version + same registry version
   = byte-identical canonical model output.

## Model areas (first pass)

### Identity
- hostname
- chassis / model
- serial(s)
- mgmt IP(s)
- last config change marker (if visible)

### Platform
- vendor
- platform id (matches Vendor Platform Registry)
- OS family
- OS version (raw + normalized)
- detection confidence

### Interfaces
- name (vendor-native + normalized)
- type (physical, sub, loopback, vlan, lag, tunnel, mgmt)
- admin / oper state hints
- description
- mtu, speed, duplex
- L2 mode (access, trunk, routed)
- access vlan / allowed vlans
- parent / child relationships
- LAG membership

### IP addressing
- per interface: ipv4[], ipv6[], secondary[]
- mask / prefix length
- VRF binding

### VLANs
- id, name, state
- associated interfaces

### VRFs
- name, RD, RT import / export
- interface bindings
- address families enabled

### Static routes
- prefix, next-hop(s), admin distance, metric, tag, VRF, name

### OSPF
- process id / instance
- router id
- areas (id, type)
- networks / interface bindings
- authentication mode
- redistribution

### IS-IS
- instance, NET, level (L1/L2/both)
- interface bindings, metrics, authentication
- redistribution

### EIGRP
- AS, router id
- networks / interface bindings
- authentication, K-values if non-default
- redistribution

### BGP
- local AS, router id
- neighbours: peer ip, remote AS, description, password, update-source,
  ebgp-multihop, families, route-maps in/out, soft-reconfig
- address families: ipv4-unicast, ipv6-unicast, vpnv4, l2vpn-evpn, etc.
- redistribution, network statements
- peer groups / templates

### ACL / firewall rules
- name / id
- rule list with: seq, action, src, dst, protocol, ports, log, hit-count hint
- attached interfaces / direction
- rule-engine model (stateful vs stateless)

### NAT
- rule list: type (static, dynamic, pat), original, translated, conditions
- pools

### VPN / tunnels
- type (ipsec, gre, vti, l2tp, wireguard, mpls-l3vpn, mpls-l2vpn, vxlan)
- endpoints, crypto profile, ike/ipsec params
- bindings (interface, VRF, EVPN instance)

### QoS
- class maps, policy maps, service policies
- queues, shapers, policers
- interface attachments

### LAG / LACP
- bundle id, mode (active / passive / static)
- members, hashing mode
- min-links

### Services
- SNMP: communities / users, traps, locations, contact
- NTP: servers, source, authentication
- DNS: servers, domain list, source
- SSH: version, ciphers, ACL, idle timeout
- syslog: servers, severity, source, facility
- AAA: method lists, server groups (TACACS+, RADIUS), local users, privilege levels

### Topology hints
- explicit neighbour declarations (CDP/LLDP config, BGP peers, OSPF neighbours)
- implied adjacency (shared VLAN, shared subnet, LAG mates)
- not a topology graph — hints for the topology engine to consume

### Risks / findings
- parser-emitted observations: weak crypto, default credentials, missing AAA,
  ACL shadowing hints, dangling references
- not a validator output — validator engine consumes these + does its own work

### Unknown / unparsed
- `unknown_lines[]`: { source, line_start, line_end, raw, context_path, reason }
- `unsupported_blocks[]`: recognized as a config section but not yet modelled
- preserved verbatim so a future parser version can backfill

### Parse confidence
- per-object: 0.0–1.0 with rationale tag
- per-area: aggregate confidence (worst-case of contributing objects)
- per-device: aggregate + coverage ratio (areas attempted vs areas in scope)

## Receipts

Every parse produces a receipt alongside the model:
- platform detected + confidence
- areas attempted, areas successfully populated
- counts: parsed objects, skipped lines, unknown lines, unsupported blocks
- parser version, registry version, fixture corpus version
- duration

Receipts are evidence. Operators see them. Validators read them. CI gates on
fixture-diff for both model and receipt.

## Cross-references

- [`VENDOR_ENGINE_PLAN.md`](./VENDOR_ENGINE_PLAN.md)
- [`VENDOR_PLATFORM_REGISTRY.md`](./VENDOR_PLATFORM_REGISTRY.md)
