# 010-replace-mode-warning dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: iosxe
- Source kind: LLDP
- Import mode: Replace
- Fixture reference: `parser-lab/_raw_neighbor_import/iosxe-lldp-detail-001/snippets/iosxe-lldp-detail-001.txt`
- Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR replace -> V1AS review

The simulator uses the same fixture-backed path, but the plan must loudly warn that Replace overwrites current evidence.
