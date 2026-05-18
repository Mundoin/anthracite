# Edge Cases

- partial_fields must remain conservative when remote port or system name is missing.
- self_link must reject if the resolved remote node is the local node.
- unsupported_format remains possible for command-shape uncertainty.
- unknown_remote_node must reject blank or generic names.

Rejection reasons used here: unknown_local_node, unknown_remote_node, self_link, malformed_output, insufficient_evidence, stale_evidence, conflicting_remote_endpoint, unsupported_format, duplicate_collapsed.
