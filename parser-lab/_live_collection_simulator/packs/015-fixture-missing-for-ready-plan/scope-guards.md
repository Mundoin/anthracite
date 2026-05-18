# 015-fixture-missing-for-ready-plan scope guards

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
- A missing fixture must not degrade into a live or inferred source.
- No fixture may be inferred when the request omits one.
- Stop before import.
