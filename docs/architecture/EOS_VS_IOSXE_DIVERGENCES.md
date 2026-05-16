# EOS_VS_IOSXE_DIVERGENCES

Why Anthracite ships **two separate parser modules** for Cisco IOS/XE
and Arista EOS, and the specific syntactic and semantic divergences
that justify that separation.

## Headline rule

**Do not consolidate `cisco_iosxe` and `arista_eos` into a shared
parser.** EOS is Cisco-CLI-derived; it is not Cisco IOS/XE. The most
expensive parser bugs in any vendor-engine product come from assuming
"close enough" and silently mis-modelling minority-syntax devices.

The line-oriented + indent-block lexer architecture is deliberately
similar (both EOS and IOS/XE use the same family of conventions). The
**dispatch tables, vocabulary, and top-level keyword sets** differ, and
those are where the divergences live.

## Concrete divergences

### 1. VRF declarations

| Concept       | IOS/XE                          | EOS                          |
|---------------|---------------------------------|------------------------------|
| Open block    | `vrf definition NAME`           | `vrf instance NAME`          |
| RD            | `rd ASN:N` under address-family | `rd ASN:N` top-level inside  |
| Route-target  | `route-target import/export …` under `address-family ipv4` | `route-target import/export …` top-level inside |
| Per-iface bind| `vrf forwarding NAME`           | `vrf NAME` (or legacy `vrf forwarding NAME`) |

A parser that sees `vrf instance MGMT` as `vrf <unknown-keyword>`
silently loses VRF inventory.

### 2. SSH service

| Concept       | IOS/XE                          | EOS                          |
|---------------|---------------------------------|------------------------------|
| Enable        | `ip ssh version 2` (top-level)  | `management ssh` (block)     |
| Timeout       | `ip ssh time-out N`             | `idle-timeout N` (inside `management ssh`) |
| Source-iface  | `ip ssh source-interface IFACE` | `ip access-group …` (V1N OoS) |
| Bind to VRF   | n/a                              | `vrf NAME` (inside `management ssh`) |

EOS's SSH posture is *block-scoped*; an IOS/XE parser treats
`management ssh` as an unknown top-level keyword and silently loses
the entire SSH area.

### 3. Management API / eAPI

EOS has `management api http-commands` as a first-class block.
**V1N classifies this as out-of-scope** (`not_in_scope:management_api`)
and records contents in `unknown_lines[]`. IOS/XE has no analogue;
attempting to share parser logic would either drop EOS eAPI silently
or invent a non-existent IOS/XE feature.

### 4. MLAG

EOS's `mlag configuration` block is fundamental to EOS topology
(it's how leaf pairs synchronise). **V1N marks it
`not_in_scope:mlag`** at L1/L2 maturity and captures contents as
`unknown_lines[]`. A later L3+ stage may promote MLAG to a typed
shape; for V1N, the rule is "do not silently lose it, but do not
model it either".

### 5. Trunk groups

EOS's `switchport trunk group NAME` is a distinct concept from
IOS/XE's `switchport trunk allowed vlan` list. V1N emits the warning
`eos_trunk_group_out_of_scope` and records the line so the operator
can see it.

### 6. Event handlers + daemons

EOS exposes:
- `event-handler NAME { trigger … action … }`
- `daemon NAME { exec /path … }`

Both are EOS-only. **V1N marks them out-of-scope**:
`not_in_scope:event_handlers`, `not_in_scope:daemons`.

### 7. Interface naming

Both use `Et`/`Po`/`Lo`/`Vl`/`Ma` short forms — vocabulary is shared.
But EOS's vendor-native form lacks Cisco's `GigabitEthernet` prefix:

| IOS/XE native              | EOS native     | Shared normalised |
|----------------------------|----------------|-------------------|
| `GigabitEthernet0/0/0`     | `Ethernet1`    | `Gi0/0/0` / `Et1` |
| `TenGigabitEthernet1/0/1`  | `Ethernet1/1`  | `Te1/0/1` / `Et1/1` |
| `Port-channel1`            | `Port-Channel10` | `Po1` / `Po10`  |
| `Management0`              | `Management1`  | `Mgmt0` / `Ma1`   |

A shared parser would either require per-vendor classification logic
inside the same module (defeating the separation) or silently
mis-classify (`Ethernet1` becoming `Unknown` under IOS/XE classifier).

### 8. Static-route syntax

EOS accepts both forms; IOS/XE primarily uses the legacy dotted-mask
form. V1N parses both for EOS:

```
ip route 10.0.0.0/24 10.0.0.1            (EOS slash form)
ip route 10.0.0.0 255.255.255.0 10.0.0.1 (legacy dotted-mask form)
```

Cisco's V1K parser only supports the dotted-mask form. Sharing this
code would force the choice between regressing Cisco or
under-supporting EOS.

### 9. Out-of-scope blocks differ in `not_in_scope` vocabulary

EOS adds five `not_in_scope:*` markers Cisco does not emit:
`mlag`, `management_api`, `event_handlers`, `daemons`, `varp`. Cross-
vendor consumers must accept that the warning vocabulary is the union
of all in-scope parsers, not a single global set. The
cross-vendor invariant test normalises this away.

### 10. Header conventions

EOS configs commonly begin with:
- `! device: NAME`
- `! boot system flash:/EOS-4.X.X.swi`

V1N parses both as `chassis` and `os_version_raw` evidence
respectively. IOS/XE has its own `! Chassis type:` and version
conventions. The marker grammars differ enough that consolidating
them would require either dual-parsing every header or losing
fidelity for one side.

## Warning against future consolidation

If a future stage proposes "let's unify `cisco_iosxe` and
`arista_eos`", the proposer must demonstrate:

1. Every divergence above remains correctly handled.
2. Every fixture in **both** corpora still produces byte-identical
   `expected.json`.
3. The cross-vendor invariant test still passes.
4. The shared module is not larger than the sum of the two
   per-vendor modules. (If it is, the abstraction is wrong.)

In the absence of (1)–(4), keep them separate.

## Cross-references

- [V1N stage note](../../obsidian/stages/V1N-arista-eos-parser.md)
- [PARSER_VERSIONING.md](./PARSER_VERSIONING.md)
- [PARSER_COVERAGE_AREAS.md](./PARSER_COVERAGE_AREAS.md)
- [INTERFACE_NAMING.md](./INTERFACE_NAMING.md)
- [CANONICAL_NETWORK_MODEL.md](./CANONICAL_NETWORK_MODEL.md)
