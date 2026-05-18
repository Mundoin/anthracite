# 009-no-source-kind-selected

Purpose: prep-only corpus for V1AU fixture-backed simulator.
Platform: Mixed
Source kind: none
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
- No source kind means no route into the raw import path and no evidence mutation.
- A missing source kind is a guard failure, not a fallback to live discovery.
