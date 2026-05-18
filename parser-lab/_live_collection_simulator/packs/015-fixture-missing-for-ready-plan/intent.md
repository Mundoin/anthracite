# 015-fixture-missing-for-ready-plan intent

Purpose: describe the fixture-backed simulator expectation for fixture missing for ready plan.
Platform: Cisco IOS-XE
Source kind: LLDP
Truth note: synthetic and sanitised.

## Expected behaviour
- The dry-run plan exists, but the fixture lookup fails before any import can occur.
- Missing fixtures are a hard block: no raw text, no import, no review handoff.
- No projected edges should appear because the simulator could not select a fixture.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- A missing fixture must not degrade into a live or inferred source.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
