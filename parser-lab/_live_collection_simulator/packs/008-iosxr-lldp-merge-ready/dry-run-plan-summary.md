# 008-iosxr-lldp-merge-ready dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: iosxr
- Source kind: LLDP
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/iosxr-lldp-neighbors-008/snippets/iosxr-lldp-neighbors-008.txt`
- Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review

The simulator selects a synthetic fixture, keeps the request fixture-backed, and preserves the existing V1AT -> V1AP/V1AQ -> V1AR -> V1AS chain.
