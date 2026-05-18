# 018-raw-import-rejection-visible intent

Purpose: describe the fixture-backed simulator expectation for raw import rejection visible.
Platform: Mixed
Source kind: LLDP
Truth note: synthetic and sanitised.

## Expected behaviour
- The simulator is allowed to pass the fixture to the raw import route, but the route is expected to reject visibly.
- The raw-import route should report the rejection and keep the evidence store unchanged.
- V1AS should show no new projected edges and the simulator should surface the rejection reason honestly.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- Rejection visibility is required; hidden success is not allowed.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
