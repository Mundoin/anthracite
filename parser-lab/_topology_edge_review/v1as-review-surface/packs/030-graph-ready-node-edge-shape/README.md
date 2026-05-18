# 030-graph-ready-node-edge-shape

Purpose: prep-only corpus for V1AS topology edge review and graph-ready surface behaviour.

Scenario: Graph-ready node and edge data are visible without a renderer.

Status: synthetic, sanitised, prep-only, not integrated.

Vendor/platform: Mixed topology-edge-review

What this pack proves:
- Graph-ready data is present, but there is no graph renderer.
- evidence-backed current_edges and projected_edges remain visible
- selected_edge drilldown stays display-only
- no graph renderer is introduced

What OCC may later integrate:
- filterable review table
- selected-edge inspector
- evidence drilldown
- projectionStats and evidenceStats strip
- graph-ready node and edge data, without coordinates or layout

What must remain conservative:
- exact resolver only
- no fuzzy or substring matching
- no interface-description promotion
- no management IP or chassis fallback
- no hidden store mutation
- no live SSH, SNMP, polling, or renderer
