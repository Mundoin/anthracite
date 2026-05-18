# 019-merge-dedup-visible expected simulator behaviour

- Status: merge-visible
- The request remains fixture-backed while V1AR merge semantics collapse duplicates in a deterministic way.
- Pass the raw fixture into V1AP/V1AQ, let V1AR merge, and let V1AS show the deduped projection.
- V1AS should show dedup-visible edges and keep the evidence summary honest about collapse.
