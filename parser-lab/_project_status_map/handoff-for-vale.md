# Handoff for Vale

Use `anthracite-status-map-source.json` first.

Most reliable fields:
- metadata
- arcs
- stages
- current_state
- dependency_edges
- safety_boundaries

Fields that need Bujar / Vale judgement:
- next_candidates
- open_questions
- halted_or_superseded

Recommended first render:
- static PNG swimlane with the current edge highlighted
- companion HTML view with filters and dependency toggles

Caution:
- Repo HEAD is the Codex prep preserve point af3908c, but the latest landed product stage is V1AT.
- parser-lab trees are prep-only reference material.
- Do not infer production work from the prep corpora alone.
