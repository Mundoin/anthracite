# 018-raw-import-rejection-visible dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: iosxe
- Source kind: LLDP
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/raw-output-malformed-cases-013/snippets/raw-output-malformed-cases-013.txt`
- Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review

The simulator is allowed to pass the fixture to the raw import route, but the route is expected to reject visibly.
