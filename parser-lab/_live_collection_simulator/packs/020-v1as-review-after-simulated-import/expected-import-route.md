# 020-v1as-review-after-simulated-import expected import route

- Route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/import-result-summary-cases-020/snippets/import-result-summary-cases-020.txt`

The fixture should reach V1AP/V1AQ, then V1AR, then V1AS with the summary strip visible.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
