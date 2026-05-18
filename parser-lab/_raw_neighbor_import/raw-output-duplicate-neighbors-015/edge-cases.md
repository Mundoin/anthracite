# Edge Cases

- duplicate_collapsed is the expected handling for repeated raw neighbour evidence.
- self_link remains a separate rejection reason if a duplicate resolves back to the local node.
- unknown_remote_node and insufficient_evidence remain conservative fallbacks.
- Do not double-count the same edge.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
