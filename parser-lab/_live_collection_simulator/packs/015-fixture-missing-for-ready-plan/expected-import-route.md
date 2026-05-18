# 015-fixture-missing-for-ready-plan expected import route

- Route: V1AT dry-run plan -> no fixture selected -> stop before import
- Import mode: Merge
- Fixture reference: none

The simulator must refuse before it reaches V1AP/V1AQ.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
