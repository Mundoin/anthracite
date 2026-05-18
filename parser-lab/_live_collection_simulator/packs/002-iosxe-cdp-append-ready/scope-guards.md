# 002-iosxe-cdp-append-ready scope guards

- fixture-backed only
- no device contact
- no sockets
- no credentials
- no host/IP plumbing
- no shell command execution
- no external process
- no polling
- no scheduler
- no background task
- no hidden mutation
- V1AR remains authoritative
- V1AS review remains mandatory
- never bypass V1AR or V1AS
- Append remains an explicit store mode; the simulator must not smuggle in hidden mutation.
- Fixture path stays local and synthetic: `parser-lab/_raw_neighbor_import/iosxe-cdp-detail-002/snippets/iosxe-cdp-detail-002.txt`
- Import is explicit and fixture-backed only.
