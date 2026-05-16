# INTERFACE_NAMING

Anthracite's vendor-neutral short form for interface names. Bound by V1K
([`../../obsidian/stages/V1K-cisco-iosxe-parser-PROPOSAL.md`](../../obsidian/stages/V1K-cisco-iosxe-parser-PROPOSAL.md)
§3.1). Every parser, validator, topology engine, and surface comparison
operates on `InterfaceModel.normalized_name`; `InterfaceModel.name` is
preserved verbatim for evidence auditability.

## Rule

- `InterfaceModel.name` carries the vendor-native form exactly as it
  appeared in config. No case change. No collapse. No trim past
  surrounding whitespace.
- `InterfaceModel.normalized_name` carries the vendor-neutral short form
  from the canonical table below. Vendors extend the table with their own
  native → normalized mappings; they do not invent new short-form
  vocabulary.
- Slot / port path is preserved verbatim in the short form
  (`Gi0/0/0`, not `Gi-0-0-0`).
- Sub-interface notation `.N` is preserved as-is (`Gi0/0/0.10`).
- Case in the short form is exactly as in the table (mixed-case, no
  lowercasing).
- Unknown long-form: store the vendor-native string in both `name` and
  `normalized_name`, emit an `UnknownConfigLine` capturing the
  interface declaration, no panic.

## Canonical short-form table

### Cisco (V1K baseline)

| Vendor-native | Normalized |
|---|---|
| `GigabitEthernet0/0/0` | `Gi0/0/0` |
| `TenGigabitEthernet1/0/1` | `Te1/0/1` |
| `FortyGigE1/0/1` | `Fo1/0/1` |
| `HundredGigE1/0/1` | `Hu1/0/1` |
| `FastEthernet0/1` | `Fa0/1` |
| `Ethernet0/0` | `Et0/0` |
| `Loopback0` | `Lo0` |
| `Vlan10` | `Vl10` |
| `Port-channel1` | `Po1` |
| `Tunnel0` | `Tu0` |
| `Serial0/0/0` | `Se0/0/0` |
| `Management0` | `Mgmt0` |
| `GigabitEthernet0/0/0.10` (sub-interface) | `Gi0/0/0.10` |

### Juniper Junos (V1M baseline)

Junos native short names are already canonical. V1M's rule is
**verbatim preservation**: `name` and `normalized_name` are identical.
No vocabulary translation is applied because Junos's native form
already lives in the short-form space.

| Vendor-native | Normalized |
|---|---|
| `ge-0/0/0` | `ge-0/0/0` |
| `ge-0/0/0.0` (unit 0) | `ge-0/0/0.0` |
| `ge-0/0/0.10` (unit 10 / sub-interface) | `ge-0/0/0.10` |
| `xe-1/0/2` | `xe-1/0/2` |
| `et-0/0/0` | `et-0/0/0` |
| `fe-0/0/0` | `fe-0/0/0` |
| `lo0` | `lo0` |
| `ae0` (aggregated Ethernet bundle) | `ae0` |
| `me0` (management) | `me0` |
| `fxp0` (management) | `fxp0` |
| `irb.100` (IRB SVI) | `irb.100` |
| `vlan.100` (VLAN SVI, legacy) | `vlan.100` |

Cross-vendor comparison still works because consumers operate on the
shared short-form vocabulary; Junos contributes its own short forms
without colliding with Cisco's.

### Arista EOS (V1N baseline)

EOS interface naming overlaps significantly with Cisco IOS/XE — the
short forms are shared canonical vocabulary, not Cisco-private.
Aristas land in the same `Et`/`Lo`/`Po`/`Vl`/`Ma` short-form space
the Cisco table established.

| Vendor-native | Normalized |
|---|---|
| `Ethernet1` | `Et1` |
| `Ethernet1/1` | `Et1/1` |
| `Ethernet48` | `Et48` |
| `Management1` | `Ma1` |
| `Loopback0` | `Lo0` |
| `Vlan100` | `Vl100` |
| `Port-Channel10` | `Po10` |
| `Vxlan1` | `Vxlan1` |

EOS-specific notes:
- `Port-Channel` (capital-P, hyphenated) is the EOS form; the
  normalised short form is the same `Po<N>` as Cisco.
- Sub-interface notation `.N` exists in EOS but is uncommon at L1/L2.

### Other vendors

NX-OS, SR Linux, and the rest extend this table with their own
vendor-native → normalized mappings. The short-form vocabulary is
shared across vendors so cross-vendor consumers compare on a single
string space.

## Rationale

Cross-vendor consumers (topology engine, baseline, validator) need a
single comparable identifier. Raw vendor-native names diverge by
vendor and by config style; comparing them directly would push
normalization down into every consumer and lose evidence fidelity.
Holding both `name` (verbatim) and `normalized_name` (canonical short
form) keeps evidence auditability AND cross-vendor comparability.

## Cross-references

- [`PARSER_VERSIONING.md`](./PARSER_VERSIONING.md)
- [`PARSER_COMMAND_CONTRACT.md`](./PARSER_COMMAND_CONTRACT.md)
- [`PARSER_COVERAGE_AREAS.md`](./PARSER_COVERAGE_AREAS.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
