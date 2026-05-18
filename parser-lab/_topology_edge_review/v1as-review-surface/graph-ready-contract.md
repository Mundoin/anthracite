# Graph-Ready Contract

Graph-ready means display-ready data only. It does not mean graph-rendered.

Required shape:
- node_id
- label
- vendor
- platform
- platform_family

Edges use:
- edge_id
- source_node_id
- target_node_id
- local_interface
- remote_interface
- source_kind
- source_label
- status
- vendor
- platform
- platform_family

Forbidden here:
- coordinates
- layout engines
- physics
- animation
- renderer state
- hidden graph mutation
- Babylon, D3, Cytoscape, or any other graph library

Example display-only payload:
`json
{
  "nodes": [
    { "node_id": "node-leaf-a1", "label": "leaf-a1", "vendor": "Mixed", "platform": "topology-edge-review", "platform_family": "topology-edge-review" },
    { "node_id": "node-spine-b1", "label": "spine-b1", "vendor": "Mixed", "platform": "topology-edge-review", "platform_family": "topology-edge-review" }
  ],
  "edges": [
    {
      "edge_id": "graph-edge-030",
      "source_node_id": "node-leaf-a1",
      "target_node_id": "node-spine-b1",
      "local_interface": "Ethernet1/1",
      "remote_interface": "Ethernet1/49",
      "source_kind": "LLDP",
      "source_label": "graph-ready",
      "status": "accepted",
      "vendor": "Mixed",
      "platform": "topology-edge-review",
      "platform_family": "topology-edge-review"
    }
  ]
}
`
"@
W (Join-Path D:\Repos\anthracite\parser-lab\_topology_edge_review\v1as-review-surface 'operator-workflows.md') @"
# Operator Workflows

1. Load the current evidence-backed edge list.
2. Filter by source_kind, source_label, node, interface, or rejection state.
3. Select an edge.
4. Inspect the evidence drilldown.
5. Review projectionStats and evidenceStats.
6. Decide the next action, without mutating store truth here.

The workflow must remain honest about rejected, unresolved, conflicting, stale, and duplicate-collapsed evidence.
