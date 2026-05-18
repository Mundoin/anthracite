# EOS LLDP/CDP syntax notes

These notes describe the syntax represented in the snippet pack.

## EOS LLDP

- `snippets/eos-lldp-cdp-neighbor-evidence-004.txt / eos-lldp-001`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Port`
  - `Chassis ID`
  - `Port ID`
  - `System Name`
  - `Management Address`

## EOS CDP note-only

- `snippets/eos-lldp-cdp-neighbor-evidence-004.txt / eos-cdp-note-002`
- Observed patterns:
  - `show cdp neighbors detail`
  - `Device ID`
  - `Interface`
  - `Port ID`
  - `IP address`

## Mapping note

- LLDP is the stronger and safer source for EOS neighbor evidence.
- CDP, if used, should be retained conservatively as note-only unless OCC has
  stronger evidence for remote-node resolution.
