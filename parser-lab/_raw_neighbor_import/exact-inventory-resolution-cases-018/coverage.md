# Coverage

- exact inventory resolution
- exact hostname match
- exact device-id match
- exact inventory-id match when present
- case-insensitive trim may be documented but not fuzzy contains matching
- insufficient_evidence rejection when exact match fails
- no description promotion

Current focus: exact inventory resolution and conservative neighbour import behaviour.
OCC can later integrate only when exact matching succeeds.
