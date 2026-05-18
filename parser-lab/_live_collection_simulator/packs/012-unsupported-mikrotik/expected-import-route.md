# 012-unsupported-mikrotik expected import route

- Route: V1AT dry-run plan -> validate unsupported platform -> stop before import
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/mikrotik-neighbor-discovery-012/snippets/mikrotik-neighbor-discovery-012.txt`

Do not route to V1AP/V1AQ for FortiOS or MikroTik in this corpus.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
