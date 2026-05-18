# 004-nxos-cdp-append-ready intent

Purpose: describe the fixture-backed simulator expectation for nxos cdp append ready.
Platform: Cisco NX-OS
Source kind: CDP
Truth note: synthetic and sanitised.

## Expected behaviour
- The simulator selects a fixture and keeps append semantics visible before any import happens.
- Read-only plan input becomes a fixture-backed append path with no device contact, no sockets, and no credentials.
- V1AS should show accepted projected edges while evidence summaries preserve the appended source rows and labels.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- Append remains an explicit store mode; the simulator must not smuggle in hidden mutation.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
