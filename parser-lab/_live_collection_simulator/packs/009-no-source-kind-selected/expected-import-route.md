# 009-no-source-kind-selected expected import route

- Route: V1AT dry-run plan -> no fixture selected -> stop before import
- Import mode: Merge
- Fixture reference: none

The request should be rejected before V1AP/V1AQ is touched.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
