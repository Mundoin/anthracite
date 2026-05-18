# edge-review-duplicate-collapse-display-010 intent

Purpose: describe topology edge review and graph-ready surface expectations for V1AS.
Vendor/platform: Mixed topology-edge-review

## dup-a
- Outcome: duplicate_collapsed
- Status reason: duplicate_collapsed
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic duplicate-collapse examples..

## dup-b
- Outcome: ignored_duplicate
- Status reason: ignored_duplicate
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic duplicate-collapse examples..

## dup-c
- Outcome: accepted
- Status reason: accepted
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic duplicate-collapse examples..

OCC guidance: the review surface may project current_edges into a graph-ready contract, but rendering and any canvas/Babylon work remain later stages.
