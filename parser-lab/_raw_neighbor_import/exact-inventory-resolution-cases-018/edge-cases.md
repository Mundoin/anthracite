# Edge Cases

- accepted_exact is allowed when the inventory id or hostname matches exactly.
- accepted_trimmed_exact may be allowed for whitespace or case normalisation only if OCC already supports it.
- insufficient_evidence must reject chassis-only or partial matches.
- unknown_remote_node remains conservative when no exact match exists.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
