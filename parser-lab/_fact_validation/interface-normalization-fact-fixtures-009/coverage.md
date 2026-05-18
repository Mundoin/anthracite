# Interface normalization coverage

## Current batch

- Vendor family: mixed Cisco / Juniper / Arista / Nokia
- Prep batch: interface name normalization
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/interface-normalization-fact-fixtures-009.txt` section `norm-iosxe-001`
- `snippets/interface-normalization-fact-fixtures-009.txt` section `norm-nxos-002`
- `snippets/interface-normalization-fact-fixtures-009.txt` section `norm-junos-003`
- `snippets/interface-normalization-fact-fixtures-009.txt` section `norm-eos-004`
- `snippets/interface-normalization-fact-fixtures-009.txt` section `norm-iosxr-005`
- `snippets/interface-normalization-fact-fixtures-009.txt` section `norm-sros-006`

## Feature checklist

- Port-channel casing variants
- Junos unit normalization
- EOS interface casing
- IOS-XR interface depth
- Nokia SR OS port naming
- Original spelling retention

## Still missing later

- Final canonical interface key implementation
- Reviewer override policy
- Conflict handling when normalization changes the chosen peer

## Readiness

- Safe for OCC review
- Not production-integrated
