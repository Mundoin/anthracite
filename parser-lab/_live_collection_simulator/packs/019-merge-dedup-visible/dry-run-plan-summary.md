# 019-merge-dedup-visible dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: iosxe
- Source kind: LLDP
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/raw-output-duplicate-neighbors-015/snippets/raw-output-duplicate-neighbors-015.txt`
- Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review

The simulator should route duplicate-friendly fixture input through the merge path so dedup visibility can be tested.
