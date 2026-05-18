# Edge Cases

- duplicate_collapsed is expected for reverse-direction evidence.
- unknown_local_node remains a rejection reason if the local node cannot be matched exactly.
- self_link must reject when the resolved remote node is the same as the local node.
- contains-based device-name matching remains out-of-scope.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
