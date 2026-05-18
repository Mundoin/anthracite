# Edge rejection and dedup syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/edge-rejection-dedup-policy-005.cfg / dedup-iosxe-001`
- Observed patterns:
  - `lldp run`
  - `cdp run`
  - `interface GigabitEthernet...`
  - `description ...`

## Junos

- `snippets/edge-rejection-dedup-policy-005.cfg / dedup-junos-002`
- Observed patterns:
  - `protocols lldp`
  - `protocols bgp`
  - `neighbor ...`

## EOS

- `snippets/edge-rejection-dedup-policy-005.cfg / dedup-eos-003`
- Observed patterns:
  - `mlag configuration`
  - `peer-link ...`
  - `peer-address ...`

## Policy note

- Dedup should merge source bundles for the same pair.
- Rejection should be explicit, not silent.
- Self-links should be rejected unless the note says the example is synthetic
  or a lab loopback.
