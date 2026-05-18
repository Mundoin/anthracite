# CDP facts syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/cdp-facts-002.cfg / cdp-iosxe-001`
- `snippets/cdp-facts-002.cfg / cdp-iosxe-002`
- Observed patterns:
  - `cdp run`
  - `cdp enable`

## NX-OS

- `snippets/cdp-facts-002.cfg / cdp-nxos-003`
- Observed patterns:
  - `feature cdp`
  - `cdp enable`

## Interface context

- `snippets/cdp-facts-002.cfg / cdp-iosxe-001`
- `snippets/cdp-facts-002.cfg / cdp-iosxe-002`
- `snippets/cdp-facts-002.cfg / cdp-nxos-003`

Observed patterns:

- `description ...`
- `no shutdown`
- routed or switchport interface presence

## Conservative note

- CDP enablement is not a neighbor edge.
- Future adjacency edges must come from discovery evidence, not from the
  presence of `cdp run` / `feature cdp` alone.
