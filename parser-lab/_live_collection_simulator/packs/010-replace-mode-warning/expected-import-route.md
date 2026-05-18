# 010-replace-mode-warning expected import route

- Route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR replace -> V1AS review
- Import mode: Replace
- Fixture reference: `parser-lab/_raw_neighbor_import/iosxe-lldp-detail-001/snippets/iosxe-lldp-detail-001.txt`

The raw fixture should still route through V1AP/V1AQ, then V1AR performs replace and V1AS updates the review surface.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
