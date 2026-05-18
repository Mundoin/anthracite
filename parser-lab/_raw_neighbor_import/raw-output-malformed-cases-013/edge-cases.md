# Edge Cases

- malformed_output is the explicit rejection reason for truncated or garbled text.
- insufficient_evidence applies when the output is too partial to resolve a node exactly.
- unsupported_format can apply when the prompt or output shape is mixed in with the evidence.
- unknown_remote_node must not be guessed.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
