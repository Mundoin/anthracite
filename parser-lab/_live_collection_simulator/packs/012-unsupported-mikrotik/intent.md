# 012-unsupported-mikrotik intent

Purpose: describe the fixture-backed simulator expectation for unsupported mikrotik.
Platform: MikroTik RouterOS
Source kind: neighbor-discovery
Truth note: synthetic and sanitised.

## Expected behaviour
- The simulator should surface the unsupported-platform guard before any import is attempted.
- Unsupported or lower-confidence platform families stay blocked and honest.
- V1AS should show no simulated projection and keep the rejection visible only in the simulator panel.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- Unsupported does not mean guessed; it means blocked.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
