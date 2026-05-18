# live-collection-iosxr-lldp-014 edge cases

- live output must stay read-only
- dry_run must not mutate the store
- current evidence must survive auth_failed, connection_failed, timeout, and command_unsupported
- empty_output must not wipe current evidence
- malformed_output must be reported, not guessed
- unsupported_platform and deferred_platform stay conservative
- raw output is the source of truth; the preview is not
- review_required remains a hard gate before store mutation

## Pack-specific risks
- Brief forms can omit context, so the parser must stay conservative.

## Conservative outcome expectations
- no_store_mutation on failure
- preserve_current_evidence on failure
- reject or defer unsupported platforms
