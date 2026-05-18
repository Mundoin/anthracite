# CDP mapping syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/cdp-to-link-fact-mapping-003.cfg / cdp-map-iosxe-001`
- Observed patterns:
  - `cdp run`
  - `interface GigabitEthernet...`
  - `cdp enable`

## NX-OS

- `snippets/cdp-to-link-fact-mapping-003.cfg / cdp-map-nxos-002`
- Observed patterns:
  - `feature cdp`
  - `interface Ethernet...`
  - `cdp enable`

## Mapping note

- CDP device-id and port-id can usually map directly into a fact payload.
- Platform and capabilities should be preserved in notes, not used as the
  only proof of a link.
