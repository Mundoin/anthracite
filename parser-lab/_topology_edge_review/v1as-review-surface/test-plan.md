# Test Plan

## Test categories

- Pure helper and adapter tests for review rows, evidence summaries, and display contracts.
- TypeScript contract tests for current_edges, projected_edges, selected_edge, projectionStats, evidenceStats, and graph_ready shapes.
- UI render tests for the table, inspector, drilldown, empty states, and density states.
- Filter tests for exact-match source_kind, source_label, node, interface, and rejection-state filtering.
- Selection and inspector tests for the selected edge and drilldown stability.
- Empty, all-rejected, mixed, density, and graph-ready display tests.
- Regression tests that preserve V1AO, V1AP, V1AQ, and V1AR IDs.

## Regression discipline

- Do not rename older stage IDs.
- Keep new V1AS tests additive.
- Keep display-only behaviour separate from store truth.
