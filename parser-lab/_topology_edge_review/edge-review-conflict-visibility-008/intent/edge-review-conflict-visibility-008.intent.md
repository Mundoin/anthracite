# edge-review-conflict-visibility-008 intent

Purpose: describe topology edge review and graph-ready surface expectations for V1AS.
Vendor/platform: Mixed topology-edge-review

## conflict
- Outcome: conflicting_evidence
- Status reason: conflicting_remote_endpoint
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic conflict visibility examples..

## duplicate
- Outcome: duplicate_collapsed
- Status reason: duplicate_collapsed
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic conflict visibility examples..

## accepted
- Outcome: accepted_evidence
- Status reason: accepted
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic conflict visibility examples..

OCC guidance: the review surface may project current_edges into a graph-ready contract, but rendering and any canvas/Babylon work remain later stages.
