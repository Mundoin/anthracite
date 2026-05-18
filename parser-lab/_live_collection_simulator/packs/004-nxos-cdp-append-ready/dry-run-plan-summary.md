# 004-nxos-cdp-append-ready dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: nxos
- Source kind: CDP
- Import mode: Append
- Fixture reference: `parser-lab/_raw_neighbor_import/nxos-cdp-detail-004/snippets/nxos-cdp-detail-004.txt`
- Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR append -> V1AS review

The simulator selects a fixture and keeps append semantics visible before any import happens.
