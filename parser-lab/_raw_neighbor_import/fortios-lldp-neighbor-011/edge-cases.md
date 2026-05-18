# Edge Cases

- unsupported_format is the default conservative outcome.
- insufficient_evidence must reject incomplete or ambiguous output.
- unknown_remote_node must reject generic or blank peer names.
- self_link remains a rejection reason.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
