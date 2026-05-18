# Edge Cases

- duplicate_collapsed is expected when the same CDP fact is seen more than once.
- unknown_remote_node must reject when Device ID cannot resolve exactly.
- self_link must reject when Device ID resolves to the local node.
- conflicting_remote_endpoint must reject on disagreement with another exact source.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
