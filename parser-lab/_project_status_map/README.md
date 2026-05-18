# Anthracite V1 Status Map Extraction

Generated: 2026-05-18 21:12:12 +02:00 local
Anchor: af3908c docs: add v1as topology edge review prep corpus

This folder is extraction-only source material for Vale. It turns the current Anthracite V1 stage map, topology boundary docs, and Codex prep corpora into a visualisation-ready JSON source plus human-readable companions.

How Vale should use it:
- Start with `anthracite-status-map-source.json`.
- Render the `arcs`, `stages`, `dependency_edges`, and `current_state` sections first.
- Treat parser-lab corpora as read-only prep material, not production stages.
- Keep the current-edge and prep / deferral split visible in the visual output.

Guardrails:
- Extraction only.
- No production code changes were made.
- No stage semantics were invented beyond the source docs and current prep corpora.
- The repo HEAD is the Codex prep preserve point; the latest landed product stage is still V1AT.

Files in this extraction:
- README.md
- anthracite-status-map-source.json
- anthracite-status-map-source.md
- evidence-index.md
- open-questions.md
- visual-recommendations.md
- handoff-for-vale.md
