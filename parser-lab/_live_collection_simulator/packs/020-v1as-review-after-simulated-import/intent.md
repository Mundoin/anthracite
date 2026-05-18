# 020-v1as-review-after-simulated-import intent

Purpose: describe the fixture-backed simulator expectation for v1as review after simulated import.
Platform: Mixed
Source kind: LLDP
Truth note: synthetic and sanitised.

## Expected behaviour
- The simulator should finish with a V1AS review-ready result after the fixture-backed import path completes.
- The dry-run plan, fixture selection, raw import, store mode, and review surface all stay in the same explicit chain.
- V1AS should show the projected edges, stats, and inspection surface that an operator can review after the simulated import.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- Review-ready still does not mean live; it means fixture-backed and explicit.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
