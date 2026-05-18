# edge-review-current-edge-list-001 intent

Purpose: describe topology edge review and graph-ready surface expectations for V1AS.
Vendor/platform: Mixed topology-edge-review

## current
- Outcome: accepted
- Status reason: accepted
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic edge list examples..

## rejected
- Outcome: rejected_evidence
- Status reason: rejected
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic edge list examples..

## stale
- Outcome: stale_evidence
- Status reason: stale_evidence
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic edge list examples..

OCC guidance: the review surface may project current_edges into a graph-ready contract, but rendering and any canvas/Babylon work remain later stages.
