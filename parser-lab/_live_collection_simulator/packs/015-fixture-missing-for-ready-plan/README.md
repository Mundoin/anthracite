# 015-fixture-missing-for-ready-plan

Purpose: prep-only corpus for V1AU fixture-backed simulator.
Platform: Cisco IOS-XE
Source kind: LLDP
Import mode: Merge
Truth note: synthetic and sanitised.
Integration status: prep_ready / not_integrated.

Fixture reference: none - blocked before fixture selection
Expected route: V1AT dry-run plan -> no fixture selected -> stop before import

What this proves:
- V1AT dry-run planning can be consumed without device contact.
- Fixture-backed raw text can still flow through the existing V1AP/V1AQ import route.
- V1AR remains the only store authority.
- V1AS remains the review surface, not a renderer or a live driver.

Honesty note:
- Missing fixtures are a hard block: no raw text, no import, no review handoff.
- A missing fixture must not degrade into a live or inferred source.
