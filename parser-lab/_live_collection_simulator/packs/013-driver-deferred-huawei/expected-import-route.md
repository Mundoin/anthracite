# 013-driver-deferred-huawei expected import route

- Route: V1AT dry-run plan -> validate deferred platform -> stop before import
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/huawei-vrp-lldp-neighbor-009/snippets/huawei-vrp-lldp-neighbor-009.txt`

Keep the fixture in the prep pack only; do not route it into V1AP/V1AQ from the simulator.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
