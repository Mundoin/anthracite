# 009-no-source-kind-selected intent

Purpose: describe the fixture-backed simulator expectation for no source kind selected.
Platform: Mixed
Source kind: none
Truth note: synthetic and sanitised.

## Expected behaviour
- The simulator must stop before fixture selection when no source kind is chosen.
- No source kind means no route into the raw import path and no evidence mutation.
- V1AS should not receive a simulated import; the UI should stay on the blocked state.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- A missing source kind is a guard failure, not a fallback to live discovery.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
