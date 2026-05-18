# Interface normalization syntax notes

These notes describe the evidence shapes represented in the snippet pack.

## IOS-XE

- `snippets/interface-normalization-fact-fixtures-009.txt / norm-iosxe-001`
- Observed patterns:
  - `interface Port-channel1`
  - `show lldp neighbors detail`
  - `Local Interface`

## NX-OS

- `snippets/interface-normalization-fact-fixtures-009.txt / norm-nxos-002`
- Observed patterns:
  - `interface port-channel1`
  - `show cdp neighbors detail`
  - `Local Port`

## Junos

- `snippets/interface-normalization-fact-fixtures-009.txt / norm-junos-003`
- Observed patterns:
  - `ge-0/0/0.0`
  - `show lldp neighbors detail`
  - `Local Interface`

## EOS

- `snippets/interface-normalization-fact-fixtures-009.txt / norm-eos-004`
- Observed patterns:
  - `interface Port-Channel1`
  - `show lldp neighbors detail`
  - `Port`

## IOS-XR

- `snippets/interface-normalization-fact-fixtures-009.txt / norm-iosxr-005`
- Observed patterns:
  - `synthetic evidence payload`
  - `TenGigE0/0/0/0`
  - `GigabitEthernet0/0/0/0`

## Nokia SR OS

- `snippets/interface-normalization-fact-fixtures-009.txt / norm-sros-006`
- Observed patterns:
  - `synthetic evidence payload`
  - `configure port 1/1/1`
  - `1/1/1`

## Mapping note

- The normalized name should be stable and deterministic.
- The raw spelling should remain visible in the notes.
