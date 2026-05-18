# 020-v1as-review-after-simulated-import dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: iosxe
- Source kind: LLDP
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/import-result-summary-cases-020/snippets/import-result-summary-cases-020.txt`
- Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review

The simulator should finish with a V1AS review-ready result after the fixture-backed import path completes.
