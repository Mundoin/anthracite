# Edge Cases

- conflicting_remote_endpoint is the explicit rejection reason.
- self_link remains separate when the disagreement resolves back to the local node.
- unknown_remote_node remains conservative if neither peer can be resolved exactly.
- Do not merge conflicting endpoints into one edge.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
