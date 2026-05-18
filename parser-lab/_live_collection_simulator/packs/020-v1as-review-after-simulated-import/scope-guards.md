# 020-v1as-review-after-simulated-import scope guards

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
- Review-ready still does not mean live; it means fixture-backed and explicit.
- Fixture path stays local and synthetic: `parser-lab/_raw_neighbor_import/import-result-summary-cases-020/snippets/import-result-summary-cases-020.txt`
- Import is explicit and fixture-backed only.
