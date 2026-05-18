# CDP facts coverage

## Current batch

- Vendor family: Cisco-only
- Prep batch: CDP facts
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/cdp-facts-002.cfg` section `cdp-iosxe-001`
- `snippets/cdp-facts-002.cfg` section `cdp-iosxe-002`
- `snippets/cdp-facts-002.cfg` section `cdp-nxos-003`

## Feature checklist

- CDP global enablement
- Interface-level CDP enablement
- Local interface descriptions that suggest peer intent
- Conservative treatment of remote-device inference

## Still missing later

- Real CDP neighbor table ingestion
- Remote device / port / capability normalization
- Duplicate edge deconfliction
- Confidence scoring against LLDP and config hints

## Readiness

- Safe for OCC review
- Not production-integrated
