# 019-merge-dedup-visible scope guards

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
- Dedup visibility is a store-mode behavior, not a simulator guess.
- Fixture path stays local and synthetic: `parser-lab/_raw_neighbor_import/raw-output-duplicate-neighbors-015/snippets/raw-output-duplicate-neighbors-015.txt`
- Import is explicit and fixture-backed only.
