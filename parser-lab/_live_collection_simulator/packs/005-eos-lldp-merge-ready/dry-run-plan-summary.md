# 005-eos-lldp-merge-ready dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: eos
- Source kind: LLDP
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/eos-lldp-detail-005/snippets/eos-lldp-detail-005.txt`
- Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review

The simulator selects a synthetic fixture, keeps the request fixture-backed, and preserves the existing V1AT -> V1AP/V1AQ -> V1AR -> V1AS chain.
