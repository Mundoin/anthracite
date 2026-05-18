# 009-no-source-kind-selected scope guards

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
- A missing source kind is a guard failure, not a fallback to live discovery.
- No fixture may be inferred when the request omits one.
- Stop before import.
