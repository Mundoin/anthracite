# Intent

This pack exists to exercise Source labels can be used as exact filters. with synthetic, sanitised input.

The review surface should keep the edge review honest:
- show current_edges and projected_edges only when the evidence is accepted
- keep rejected, conflicting, stale, and unresolved evidence visible in drilldown or summary form
- allow exact filters by source_kind, source_label, node, interface, and rejection state
- stay display-only and graph-ready, not graph-rendered

Do not invent extra edges, hidden mutations, or topology inference beyond the exact resolver.
