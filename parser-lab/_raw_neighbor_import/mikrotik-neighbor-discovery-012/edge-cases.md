# Edge Cases

- duplicate_collapsed can apply when the same neighbour-discovery record appears more than once.
- conflicting_remote_endpoint must reject if the peer identity changes across observations.
- unknown_remote_node must reject generic or blank identities.
- self_link remains a rejection reason.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
