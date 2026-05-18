# 017-fixture-source-kind-mismatch expected import route

- Route: V1AT dry-run plan -> validate source kind mismatch -> stop before import
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/iosxe-lldp-detail-001/snippets/iosxe-lldp-detail-001.txt`

Do not send a CDP request into an LLDP fixture or vice versa.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
