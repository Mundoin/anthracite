# Edge Cases

- unknown_remote_node remains a rejection reason when the remote system name cannot be resolved exactly.
- self_link remains a rejection reason when the remote endpoint resolves back to the local node.
- stale_evidence must not be promoted into a live edge.
- management address alone must not invent a node.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
