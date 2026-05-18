# 001-iosxe-lldp-merge-ready intent

Purpose: describe the fixture-backed simulator expectation for iosxe lldp merge ready.
Platform: Cisco IOS-XE
Source kind: LLDP
Truth note: synthetic and sanitised.

## Expected behaviour
- The simulator selects a synthetic fixture, keeps the request fixture-backed, and preserves the existing V1AT -> V1AP/V1AQ -> V1AR -> V1AS chain.
- Read-only plan input becomes a fixture-backed raw-output path with no device contact, no sockets, and no credentials.
- V1AS should show accepted projected edges, evidence drilldown, and the normal review surface with no invented edges.

## Conservative rules
- Exact inventory matching stays exact; this corpus does not add fuzzy resolution.
- The simulator must not invent raw output or live device contact.
- The simulator must not bypass V1AR store modes or V1AS review.
- The simulator stays fixture-only and never opens live transport.

## OCC guidance
- Consume V1AT planner output only as a dry-run input.
- Select a local fixture and pass the fixture text through the existing V1AP/V1AQ raw import path.
- Let V1AR apply the chosen store mode and let V1AS show the projected edges or the honest block reason.
