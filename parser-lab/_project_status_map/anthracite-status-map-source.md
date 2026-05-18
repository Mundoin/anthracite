# Anthracite V1 Status Map Source

This is the human-readable twin of `anthracite-status-map-source.json`.

## Current state

- Current product edge: V1AT
- Latest landed product commit: d9d6181
- Current repository anchor: af3908c (docs: add v1as topology edge review prep corpus)
- Repo state: dirty
- Summary: Production edge is V1AT; HEAD is the Codex V1AS prep corpus commit af3908c; worktree is dirty because the status-map extraction outputs now exist.

## Arc overview

| Arc | Range | Status | Summary |
| --- | --- | --- | --- |
| foundation_visual_shell | V1A-V1G | done | Repo scaffold, environment centre, and visual shell baseline. |
| motor_room_registry_model_parsers_intake | V1H-V1U | done | Vendor registry, canonical model, parsers, intake, validator, batch run, and export surfaces. |
| assess_findings | V1W-V1Z-A | done | ASSESS viewer, triage, shared display contract, and version-aware loading. |
| honest_hierarchy_discovery | V1AA-V1AI-A | done | Hierarchy honesty contract, typed boundary, and discovery persistence. |
| topology_pipeline | V1AJ-V1AR | done | Topology read model, adjacency readiness, link facts, evidence store, raw import, vendor expansion, and merge semantics. |
| topology_review | V1AS | done | Evidence-backed review surface with graph-ready display contract and no renderer yet. |
| topology_live_safety | V1AT | current | Read-only dry-run plan and safety gate before any device contact. |
| prep_quarry | parser-lab | prep | Synthetic, sanitised, not-integrated corpora for parser, evidence, review, and live-readiness work. |
| future_deferred | future | deferred | No graph renderer, no live SSH, no polling daemon, no fuzzy topology inference, no hidden store mutation. |

## Top deferred items

| ID | Title | Reason |
| --- | --- | --- |
| actual_ssh_driver | Actual SSH / device contact driver | V1AT is dry-run only; future drivers must consult the planner first |
| polling_daemon | Polling daemon / scheduler | No background collection or scheduler is allowed in the current contract |
| graph_renderer | Graph renderer / canvas / Babylon / D3 / Cytoscape | V1AS exports display contract only; no renderer is attached yet |
| fuzzy_topology_inference | Fuzzy topology inference | Exact resolver remains hostname or record_id only; no substring, management-IP, chassis-ID, or interface-description promotion |
| device_model_drift | DeviceModel mutation for topology truth | Topology pipeline stages do not mutate DeviceModel beyond explicit stage scopes |
| validator_rule_pack_drift | Validator / rule-pack changes for topology truth | No validator or rule-pack changes are part of the current topology stages |
| history_audit_layer | Evidence history / audit / rollback layer | V1AR intentionally stops at deterministic merge semantics; history DB and timestamps are out of scope |
| per_entry_rejected_retention | Per-entry rejected evidence retention in review surface | V1AS only exposes aggregate rejection counters; rejected rows are not retained in that view yet |
| parser_version_bumps | Parser version bumps / expected.json integration | The prep corpora remain parser-lab only and must not be folded into parser version changes from this extraction |
| unsupported_vendor_live_support | Full live-output support for deferred / unsupported vendors | Huawei VRP / Nokia SR OS remain deferred; FortiOS / MikroTik remain unsupported in the live-readiness contract |

## Safety boundaries

| ID | Rule |
| --- | --- |
| no_live_contact_before_gate | Any future live driver must consult V1AT first and refuse when readiness is not ready. |
| exact_resolver_only | Hostname or record_id only. No fuzzy matching, substring matching, management-IP fallback, chassis-ID fallback, interface-description promotion, or subnet/VLAN inference. |
| display_only_graph_ready_contract | GraphReadyTopologyView is a contract, not a renderer. No coordinates, layout, physics, or animation belong in V1AS. |
| no_hidden_store_mutation | Evidence mutation must be explicit and deterministic. Empty incoming must not wipe evidence; store changes only happen through explicit import / clear paths. |
| no_parser_changes_from_prep | parser-lab corpora are read-only reference material for OCC unless an explicit integration stage is defined. |
| no_device_model_or_validator_drift | Topology review / live-safety work does not add DeviceModel or validator changes beyond explicit stage scope. |
| no_polling_daemon | No background tasks, scheduler, polling daemon, or live discovery loop is allowed until a future stage explicitly opens that lane. |

## Open questions

### What should V1AU be?

The next step could be a renderer consumer, a live-driver implementation, or a smaller bridge stage. The map should not force a fake choice.

- Graph renderer / canvas consumer of GraphReadyTopologyView
- Live device-contact driver that consults V1AT first
- Keep the next step out of the map until the next product decision is explicit

### Should parser-lab prep corpora appear as first-class swimlanes or only as appendix / quarry material?

The prep trees are valuable, but they are not production stages. Vale needs to know whether to render them as a separate lane or collapse them into annotations.

- Render parser-lab as a dedicated prep-quarry swimlane
- Render parser-lab as an appendix / notes panel only
- Show only the corpus that matters to the current stage and hide the rest

### Should the map emphasise V1AT as the current edge or the repo HEAD prep commit af3908c?

Product current-edge and repository HEAD are not the same thing here: V1AT is the latest landed stage, while the current commit is the Codex prep corpus preserve point.

- Highlight V1AT as current product edge and mention af3908c as prep head
- Highlight af3908c as current repository anchor and annotate V1AT as latest landed product stage
- Show both equally in the header and let the visual tell the difference

### How visible should the halted V1W proposal be?

The halted proposal teaches an important lesson, but the visual may want to show it as a red superseded marker instead of a full-size stage.

- Show V1W as a red halted marker with V1W-R as the superseding stage
- Collapse V1W into a footnote under V1W-R
- Omit V1W from the main map and mention it only in the evidence index

### Should the review surface show only aggregate rejected counters, or should future work retain per-entry rejected evidence?

V1AS currently exposes aggregate rejection counts but does not retain the rejected rows themselves. The map should indicate whether that is intentional finality or a future gap.

- Keep aggregate-only rejection visibility as the current contract
- Plan a future per-entry rejected-evidence retention stage
- Render both: current aggregate honesty now, future retention as a deferred item

## Rendering hints

- Preferred view: swimlane_timeline_plus_dependency_edges
- Grouping: arc, status, dependency
- Important labels: done, current, prep, planned, deferred, halted, prep quarry, needs Bujar decision
- Must highlight: V1AT, V1AS, V1AR, V1AP, V1AQ, V1W, parser-lab prep corpora
