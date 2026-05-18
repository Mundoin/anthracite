# Interface peer hints coverage

## Current batch

- Vendor family: mixed Cisco / Arista / Nokia
- Prep batch: interface peer hints
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/interface-peer-hints-003.cfg` section `peerhint-iosxr-001`
- `snippets/interface-peer-hints-003.cfg` section `peerhint-eos-002`
- `snippets/interface-peer-hints-003.cfg` section `peerhint-sros-003`

## Feature checklist

- Interface descriptions with peer-like language
- Routed interface context on uplinks
- L2 port mode hints
- Conservative treatment of role labels in names

## Still missing later

- Discovery-table confirmation
- Remote system-name merge
- Confidence rules for stale descriptions
- Conflict handling between config hints and live neighbor evidence

## Readiness

- Safe for OCC review
- Not production-integrated
