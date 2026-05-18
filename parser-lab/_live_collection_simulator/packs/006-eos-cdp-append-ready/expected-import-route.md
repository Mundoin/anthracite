# 006-eos-cdp-append-ready expected import route

- Route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR append -> V1AS review
- Import mode: Append
- Fixture reference: `parser-lab/_raw_neighbor_import/eos-cdp-detail-006/snippets/eos-cdp-detail-006.txt`

The raw fixture should feed the existing V1AP/V1AQ import route, then V1AR appends the evidence and V1AS shows the resulting projected edges.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
