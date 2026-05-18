# 018-raw-import-rejection-visible expected import route

- Route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/raw-output-malformed-cases-013/snippets/raw-output-malformed-cases-013.txt`

Let V1AP/V1AQ return the rejection, then keep V1AR unchanged unless a future explicit action says otherwise.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
