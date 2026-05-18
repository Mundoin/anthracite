# 014-driver-deferred-nokia expected import route

- Route: V1AT dry-run plan -> validate deferred platform -> stop before import
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/nokia-sros-lldp-neighbor-010/snippets/nokia-sros-lldp-neighbor-010.txt`

Keep the fixture in the prep pack only; do not route it into V1AP/V1AQ from the simulator.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
