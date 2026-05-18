# edge-review-table-to-canvas-handoff-022 intent

Purpose: describe topology edge review and graph-ready surface expectations for V1AS.
Vendor/platform: Mixed topology-edge-review

## table
- Outcome: graph_ready
- Status reason: accepted
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic table-to-canvas handoff examples..

## handoff
- Outcome: graph_ready
- Status reason: accepted
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic table-to-canvas handoff examples..

## selection
- Outcome: graph_ready
- Status reason: accepted
- Display contract: stable edge rows, inspector-friendly evidence drilldown, and graph-ready node/edge data.
- Store truth: Rust/store-owned ids, accepted/rejected/conflict state, and evidence chronology remain authoritative.
- Conservative rule: do not render a graph here; stay display-only and keep rejected/conflicting/stale evidence honest.
- Note: synthetic table-to-canvas handoff examples..

OCC guidance: the review surface may project current_edges into a graph-ready contract, but rendering and any canvas/Babylon work remain later stages.
