# 002-iosxe-cdp-append-ready dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: iosxe
- Source kind: CDP
- Import mode: Append
- Fixture reference: `parser-lab/_raw_neighbor_import/iosxe-cdp-detail-002/snippets/iosxe-cdp-detail-002.txt`
- Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR append -> V1AS review

The simulator selects a fixture and keeps append semantics visible before any import happens.
