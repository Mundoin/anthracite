# V1AS Review Surface Prep Corpus

This subtree is prep-only and synthetic. It extends the existing topology review corpus without touching the older dge-review-* packs in the parent folder.

Goal: prepare the operator review surface for V1AS so projected edges are evidence-backed, filterable, inspectable, and graph-ready without adding a renderer yet.

Scope reminders:
- evidence-backed review of current_edges and projected_edges
- accepted, rejected, unresolved, conflicting, stale, and duplicate-collapsed evidence stay visible
- exact resolver only: hostname or record_id, no fuzzy matching
- display-only graph-ready contract, no canvas or graph library
- no live SSH, no polling, no hidden store mutation

Top-level docs explain the review-surface contract, graph-ready display shape, workflows, states, filters, drilldown, density, risks, and test plan. The pack folders under packs/ provide synthetic input shapes and expected review behaviour for the 32 scenarios listed in the manifest.
