# 016-fixture-platform-mismatch expected import route

- Route: V1AT dry-run plan -> validate platform mismatch -> stop before import
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/iosxe-lldp-detail-001/snippets/iosxe-lldp-detail-001.txt`

Do not hand mismatched raw text into V1AP/V1AQ.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
