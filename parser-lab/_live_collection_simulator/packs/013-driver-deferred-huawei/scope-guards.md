# 013-driver-deferred-huawei scope guards

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
- Deferred is a future driver decision, not a silent fallback.
- Fixture path stays local and synthetic: `parser-lab/_raw_neighbor_import/huawei-vrp-lldp-neighbor-009/snippets/huawei-vrp-lldp-neighbor-009.txt`
- Stop before import.
