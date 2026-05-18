# 014-driver-deferred-nokia intent

Purpose: describe the fixture-backed simulator expectation for driver deferred nokia.
Platform: Nokia SR OS
Source kind: LLDP
Truth note: synthetic and sanitised.

## Expected behaviour
- Huawei VRP and Nokia SR OS remain deferred driver cases in this corpus.
- The simulator may name the fixture, but it must still stop before import because the platform is deferred.
- The review surface remains unchanged because the simulator is intentionally not allowed to import.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- Deferred is a future driver decision, not a silent fallback.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
