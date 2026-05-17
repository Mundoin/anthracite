# NXOS_VS_IOSXE_DIVERGENCES

Why Anthracite ships **two separate parser modules** for Cisco IOS/XE
and Cisco NX-OS, and the specific syntactic and semantic divergences
that justify that separation.

## Headline rule

**Do not consolidate `cisco_iosxe` and `cisco_nxos` into a shared
parser.** NX-OS is Cisco-derived; it is not IOS/XE. The most expensive
parser bugs in any vendor-engine product come from assuming "close
enough" and silently mis-modelling minority-syntax devices.

Both parsers share a line-oriented + indent-block lexer architecture.
The **dispatch tables, feature vocabulary, VRF block semantics, interface
naming, and service-enable model** differ, and those are where the
divergences live.

## Concrete divergences

### 1. Service enablement — SSH

| Concept       | IOS/XE                          | NX-OS                    |
|---------------|---------------------------------|--------------------------|
| Enable SSH    | `ip ssh version 2` (global)     | `feature ssh` (global)   |
| Disable SSH   | `no ip ssh` or absence          | `no feature ssh`         |

NX-OS uses a **feature gate** model. SSH does not exist unless
`feature ssh` is present. A parser that looks for `ip ssh version 2`
will silently report no SSH on every NX-OS device.

### 2. VRF declarations

| Concept       | IOS/XE                          | NX-OS                         |
|---------------|---------------------------------|-------------------------------|
| Open block    | `vrf definition NAME`           | `vrf context NAME`            |
| RD            | `rd ASN:N` under `address-family ipv4` | `rd ASN:N` directly inside the context block |
| Route-target  | `route-target …` under `address-family ipv4` | `route-target …` directly inside the context block |
| Per-iface bind| `vrf forwarding NAME`           | `vrf member NAME`             |

A parser that matches `vrf definition` will never open a VRF block for
`vrf context MGMT`, leaving all NX-OS VRFs invisible.

### 3. Static routes inside VRF context blocks

| Concept         | IOS/XE                                      | NX-OS                                                   |
|-----------------|---------------------------------------------|---------------------------------------------------------|
| VRF static route| `ip route vrf NAME PREFIX NEXTHOP` (global) | `ip route PREFIX NEXTHOP` **inside** `vrf context NAME` |

NX-OS allows — and commonly uses — `ip route` lines within the `vrf
context` block. The VRF binding comes from the enclosing block, not from
the line itself. A parser that only handles the global-scope
`ip route vrf NAME` form will lose all NX-OS per-VRF routes.

### 4. Interface naming — lowercase vs titlecase

| Kind           | IOS/XE form         | NX-OS form          |
|----------------|---------------------|---------------------|
| Loopback       | `Loopback0`         | `loopback0`         |
| Port-channel   | `Port-channel1`     | `port-channel1`     |
| Management     | `Management0`       | `mgmt0`             |
| Ethernet       | `GigabitEthernet1`  | `Ethernet1/1`       |
| Vlan SVI       | `Vlan100`           | `Vlan100` (same)    |

NX-OS uses **lowercase** for loopback and port-channel. A parser that
matches `Loopback` (titlecase) via `starts_with` will miss all NX-OS
loopback interfaces. The management interface name (`mgmt0`) has no
IOS/XE equivalent — it is not `Management0` or `GigabitEthernet0/0`.

### 5. LAG naming

| Concept         | IOS/XE         | NX-OS           |
|-----------------|----------------|-----------------|
| Aggregate name  | `Port-channel1`| `port-channel1` |
| Member join     | `channel-group 1 mode active` | same |

`lag_name(id)` in the NX-OS parser returns `format!("port-channel{id}")` 
(lowercase). The IOS/XE parser returns `format!("Port-channel{id}")`
(titlecase). Both parsers sort lag_groups by the numeric suffix, so
determinism is unaffected by the name case.

### 6. NTP server syntax

| Concept          | IOS/XE                        | NX-OS                                       |
|------------------|-------------------------------|---------------------------------------------|
| NTP server       | `ntp server ADDR`             | `ntp server ADDR` or `ntp server use-vrf NAME ADDR` |

NX-OS supports a `use-vrf` qualifier that specifies which VRF to use for
the NTP reachability path. The parser drains the `use-vrf NAME` tokens
before extracting the server address.

### 7. DNS server syntax

| Concept          | IOS/XE                        | NX-OS                                              |
|------------------|-------------------------------|----------------------------------------------------|
| DNS nameserver   | `ip name-server ADDR [ADDR…]` | `ip name-server ADDR` or `ip name-server use-vrf NAME ADDR` |

Same `use-vrf` pattern as NTP. IOS/XE accepts multiple addresses on one
line; NX-OS commonly uses one address per line (with optional `use-vrf`).

### 8. Version command

| Concept          | IOS/XE             | NX-OS           |
|------------------|--------------------|-----------------|
| OS version line  | `version 15.x(y)z` | `version 9.3(8)`|

Both appear at the top of `show running-config`. The NX-OS parser
records the version string in `evidence.command_marker`. The lexer
treats `version` as a top-level command (not a comment), unlike the
`!Command:` prefix which is also present in NX-OS show output.

### 9. Feature-gated services

NX-OS uses an explicit `feature` command to enable protocol stacks:

```
feature ssh
feature ntp
feature snmp
feature vpc
feature lacp
feature lldp
```

Only `ssh`, `ntp`, and `snmp` are tracked (in `TRACKED_FEATURES`).
Untracked features (`vpc`, `lacp`, `lldp`, etc.) are routed to
`unknown_lines` via the out-of-scope keyword list. This is intentional:
tracking every NX-OS feature would require a separate parser area for
each, which is out of scope at V1U.

## Parser module layout

```
src/engines/parsers/cisco_nxos/
  mod.rs          — PARSER_VERSION, State, finalize(), 14 unit tests
  lexer.rs        — LexedLine, lex(), split_command()
  identity.rs     — parse_hostname(), parse_nxos_version(), parse_nxos_command_marker()
  interfaces.rs   — classify(), parent_of(), parse_* helpers
  ip_addressing.rs— parse_ipv4_address_line(), parse_ipv6_address_line()
  vlans.rs        — VlanBuilder
  vrfs.rs         — VrfBuilder (uses "context" keyword, not "definition")
  static_routes.rs— parse_ip_route(args, vrf_override)
  lag.rs          — parse_channel_group(), lag_name() → lowercase
  services.rs     — SshAccum, SnmpAccum, NtpAccum, DnsAccum, SyslogAccum
  features.rs     — TRACKED_FEATURES, is_tracked()
  unknown.rs      — emit(), NXOS_OUT_OF_SCOPE_TOP_LEVEL
```

## Cross-vendor consistency guarantee

`tests/fixtures/cisco-nxos/cross-vendor-equivalent-small/config.cfg`
expresses the same logical device as the equivalent fixtures for
`cisco-iosxe`, `juniper-junos`, and `arista-eos`. The
`cross_vendor_equivalent_models_match` integration test asserts that the
canonical projection (hostname, VRFs, VLANs, IPs, routes, services) is
byte-identical across all four vendors.
