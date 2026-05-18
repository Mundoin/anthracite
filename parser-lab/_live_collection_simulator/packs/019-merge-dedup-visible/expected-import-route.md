# 019-merge-dedup-visible expected import route

- Route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review
- Import mode: Merge
- Fixture reference: `parser-lab/_raw_neighbor_import/raw-output-duplicate-neighbors-015/snippets/raw-output-duplicate-neighbors-015.txt`

Pass the raw fixture into V1AP/V1AQ, let V1AR merge, and let V1AS show the deduped projection.

The route must stay inside the existing V1AP/V1AQ raw import path and hand the result to V1AR, then V1AS.
