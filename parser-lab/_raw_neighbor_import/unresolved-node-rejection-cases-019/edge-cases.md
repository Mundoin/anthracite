# Edge Cases

- unknown_local_node must reject when the local endpoint cannot be resolved exactly.
- unknown_remote_node must reject when the peer cannot be resolved exactly.
- insufficient_evidence remains the fallback when the record is too weak to trust.
- self_link remains a rejection reason if the peer resolves back to the local node.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
