# 017-fixture-source-kind-mismatch intent

Purpose: describe the fixture-backed simulator expectation for fixture source kind mismatch.
Platform: Cisco IOS-XE
Source kind: CDP
Truth note: synthetic and sanitised.

## Expected behaviour
- The simulator finds a fixture, but the source kind does not match the fixture content.
- The mismatch must be caught before import and before review.
- No projected edges should appear because the simulator did not import.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- Source-kind mismatch is a hard block, not a parser fallback.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
