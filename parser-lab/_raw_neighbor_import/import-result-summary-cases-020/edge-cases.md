# Edge Cases

- none_available means no safe neighbour evidence could be imported.
- partial means some evidence imported but unresolved or rejected items remain.
- ready means the batch has accepted items and no unresolved blockers remain.
- duplicate_collapsed should be counted separately from accepted items where helpful.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
