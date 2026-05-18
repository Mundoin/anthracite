# 018-raw-import-rejection-visible

Purpose: prep-only corpus for V1AU fixture-backed simulator.
Platform: Mixed
Source kind: LLDP
Import mode: Merge
Truth note: synthetic and sanitised.
Integration status: prep_ready / not_integrated.

Fixture reference: `parser-lab/_raw_neighbor_import/raw-output-malformed-cases-013/snippets/raw-output-malformed-cases-013.txt`
Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review

What this proves:
- V1AT dry-run planning can be consumed without device contact.
- Fixture-backed raw text can still flow through the existing V1AP/V1AQ import route.
- V1AR remains the only store authority.
- V1AS remains the review surface, not a renderer or a live driver.

Honesty note:
- The raw-import route should report the rejection and keep the evidence store unchanged.
- Rejection visibility is required; hidden success is not allowed.
