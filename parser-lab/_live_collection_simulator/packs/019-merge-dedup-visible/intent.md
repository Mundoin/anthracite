# 019-merge-dedup-visible intent

Purpose: describe the fixture-backed simulator expectation for merge dedup visible.
Platform: Mixed
Source kind: LLDP
Truth note: synthetic and sanitised.

## Expected behaviour
- The simulator should route duplicate-friendly fixture input through the merge path so dedup visibility can be tested.
- The request remains fixture-backed while V1AR merge semantics collapse duplicates in a deterministic way.
- V1AS should show dedup-visible edges and keep the evidence summary honest about collapse.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- Dedup visibility is a store-mode behavior, not a simulator guess.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
