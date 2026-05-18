# Visual Recommendations

## Static PNG timeline / swimlane

- Use one swimlane per arc.
- Color stages by status: done, current, prep, planned, deferred, halted.
- Highlight V1AT as the current product edge.
- Show V1AS as the graph-ready seam and the prep quarry as a separate lane.

## Interactive HTML

- JSON-driven only; no hand-maintained HTML.
- Filters: status, arc, dependency, prep / deferred / halted visibility.
- Click a stage to expand summary, source refs, dependencies, scope-out, and confidence.
- Toggle dependency edges on and off.
- Include a left-undone board and an open-questions rail.

## Possible future internal page

- Suggested target: `docs/project-map.html` or a `tools/status-map` generator.
- Keep the page generated from JSON so it can be rebuilt deterministically.

## Layout hints

- Top row: legend and current state.
- Middle: timeline / swimlanes.
- Right rail: dependency edges, open questions, and left-undone items.
- Footer: evidence index and source anchors.
