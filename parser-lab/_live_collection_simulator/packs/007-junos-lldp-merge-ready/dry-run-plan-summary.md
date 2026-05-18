# 007-junos-lldp-merge-ready dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: junos
- Source kind: LLDP
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/junos-lldp-neighbors-007/snippets/junos-lldp-neighbors-007.txt`
- Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review

The simulator selects a synthetic fixture, keeps the request fixture-backed, and preserves the existing V1AT -> V1AP/V1AQ -> V1AR -> V1AS chain.
