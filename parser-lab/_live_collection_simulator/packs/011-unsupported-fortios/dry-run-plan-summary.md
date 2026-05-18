# 011-unsupported-fortios dry-run plan summary

- Planner source: V1AT dry-run plan
- Platform hint: fortios
- Source kind: LLDP
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/fortios-lldp-neighbor-011/snippets/fortios-lldp-neighbor-011.txt`
- Expected route: V1AT dry-run plan -> validate unsupported platform -> stop before import

The simulator should surface the unsupported-platform guard before any import is attempted.
