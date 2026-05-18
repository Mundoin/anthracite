# 010-replace-mode-warning intent

Purpose: describe the fixture-backed simulator expectation for replace mode warning.
Platform: Cisco IOS-XE
Source kind: LLDP
Truth note: synthetic and sanitised.

## Expected behaviour
- The simulator uses the same fixture-backed path, but the plan must loudly warn that Replace overwrites current evidence.
- Read-only planning still applies; only the operator-chosen replace mode changes the store semantics later.
- V1AS should show the same projected-edge surface, but the simulator summary must keep the replace warning visible.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- Replace is deliberate, never hidden, and never automatic.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
