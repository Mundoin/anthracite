# Edge Cases

- unsupported_format may apply where the exact command shape is not confirmed.
- malformed_output must reject truncated or mangled lines.
- unknown_remote_node and self_link remain conservative rejection reasons.
- management address alone must not invent a node.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
