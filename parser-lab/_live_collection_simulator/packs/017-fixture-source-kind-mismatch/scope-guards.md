# 017-fixture-source-kind-mismatch scope guards

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
- Source-kind mismatch is a hard block, not a parser fallback.
- Fixture path stays local and synthetic: `parser-lab/_raw_neighbor_import/iosxe-lldp-detail-001/snippets/iosxe-lldp-detail-001.txt`
- Stop before import.
