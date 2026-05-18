# Review Surface Contract

V1AS is a display-only operator surface for evidence-backed topology edges. The authoritative truth remains in the V1AR evidence store and the deterministic projection layer.

Safe display fields include:
- current_edges
- projected_edges
- edge_id
- local_node
- local_interface
- remote_node
- remote_interface
- source_kind
- source_label
- vendor
- platform
- projectionStats
- evidenceStats
- selected_edge
- evidence_drilldown
- filtered_view

The exact resolver stays exact:
- hostname or record_id only
- no fuzzy matching
- no substring matching
- no management IP fallback
- no chassis ID fallback
- no interface-description promotion
- no subnet or VLAN inference

The surface may show accepted, rejected, unresolved, conflicting, stale, and duplicate-collapsed evidence, but it must not invent new edges or auto-correct identity.
