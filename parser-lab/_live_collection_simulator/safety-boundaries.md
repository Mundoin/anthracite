# Safety Boundaries

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

Extra simulator guard:
- A simulator-import action may exist only if future OCC designs it explicitly; until then, the corpus is prep-only.
- No part of V1AU may bypass the V1AT planner, V1AP/V1AQ import route, V1AR store, or V1AS review.
