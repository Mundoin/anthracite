# Edge Cases

- stale_evidence is the explicit rejection reason for aged observations.
- unknown_remote_node and self_link remain conservative if the peer cannot be resolved exactly.
- Do not turn a stale record into a live edge.
- Do not infer from descriptions or addresses.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
