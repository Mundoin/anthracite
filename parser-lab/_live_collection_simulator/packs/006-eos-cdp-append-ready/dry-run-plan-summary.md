# 006-eos-cdp-append-ready dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: eos
- Source kind: CDP
- Import mode: Append
- Fixture reference: `parser-lab/_raw_neighbor_import/eos-cdp-detail-006/snippets/eos-cdp-detail-006.txt`
- Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR append -> V1AS review

The simulator selects a fixture and keeps append semantics visible before any import happens.
