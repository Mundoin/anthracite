# Risks and Scope Guards

- The most likely failure mode is accidental drift from fixture-backed simulation into something that looks like live collection.
- The simulator must not grow host/IP, credential, or socket fields even if that seems convenient.
- The simulator must not become a hidden second evidence-store path.
- The simulator must not replace V1AR or V1AS with its own truth source.
- Unsupported and deferred vendor families must stay honest instead of becoming silent fallbacks.
- Missing fixtures and mismatches must fail before import, not after a partial store write.

Scope guard reminders:
- V1AT planner output in, fixture text in, existing import route out.
- V1AR store mode decides the write behaviour.
- V1AS review decides what the operator sees.
