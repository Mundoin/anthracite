# Simulator Contract

V1AU is a fixture-backed simulator, not live collection.

Contract:
- Accept V1AT dry-run planner output as the starting point.
- Select a local synthetic fixture from the parser-lab prep corpus.
- Pass that raw text through the existing V1AP/V1AQ import route.
- Let V1AR apply the chosen evidence store mode.
- Let V1AS render the projected edges and evidence-backed review surface.

Absolute limits:
- no SSH
- no credentials
- no host/IP transport
- no sockets
- no polling
- no scheduler
- no background tasks
- no device sweep
- no fuzzy matching
- no bypass of V1AR or V1AS

The simulator is allowed to be explicit about unsupported or deferred platforms, missing fixtures, and mismatch failures. It is not allowed to fake a live connection.
