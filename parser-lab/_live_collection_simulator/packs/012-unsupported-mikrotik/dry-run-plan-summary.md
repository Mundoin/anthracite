# 012-unsupported-mikrotik dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: mikrotik
- Source kind: neighbor-discovery
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/mikrotik-neighbor-discovery-012/snippets/mikrotik-neighbor-discovery-012.txt`
- Expected route: V1AT dry-run plan -> validate unsupported platform -> stop before import

The simulator should surface the unsupported-platform guard before any import is attempted.
