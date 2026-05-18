# Edge Cases

- partial_fields are acceptable only when exact inventory resolution still succeeds.
- insufficient_evidence must reject when the node cannot be resolved exactly.
- unknown_local_node remains a rejection reason when the local endpoint is not known.
- unknown_remote_node remains a rejection reason when the peer cannot be resolved.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
