# 016-fixture-platform-mismatch intent

Purpose: describe the fixture-backed simulator expectation for fixture platform mismatch.
Platform: Cisco NX-OS
Source kind: LLDP
Truth note: synthetic and sanitised.

## Expected behaviour
- The simulator finds a fixture, but the requested platform hint does not match the fixture family.
- A mismatch is a validation failure and must stop before import.
- The review surface remains empty because the import never happened.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- A platform mismatch is a guardrail, not a prompt to guess.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
