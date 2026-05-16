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

### Other vendors

Junos (V1M+), Arista EOS (V1N+), NX-OS, and the rest extend this table
with their own vendor-native → normalized mappings. The short-form
vocabulary (`Gi`, `Te`, `Lo`, `Po`, `Vl`, …) is shared across vendors so
cross-vendor consumers compare on a single string space.

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
