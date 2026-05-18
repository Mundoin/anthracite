# 005-eos-lldp-merge-ready expected import route

- Route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/eos-lldp-detail-005/snippets/eos-lldp-detail-005.txt`

The raw fixture should feed the existing V1AP/V1AQ import route, then V1AR applies the chosen mode and V1AS renders the projected edges.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
