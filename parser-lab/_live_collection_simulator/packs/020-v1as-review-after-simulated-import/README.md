# 020-v1as-review-after-simulated-import

Purpose: prep-only corpus for V1AU fixture-backed simulator.
Platform: Mixed
Source kind: LLDP
Import mode: Merge
Truth note: synthetic and sanitised.
Integration status: prep_ready / not_integrated.

Fixture reference: `parser-lab/_raw_neighbor_import/import-result-summary-cases-020/snippets/import-result-summary-cases-020.txt`
Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review

What this proves:
- V1AT dry-run planning can be consumed without device contact.
- Fixture-backed raw text can still flow through the existing V1AP/V1AQ import route.
- V1AR remains the only store authority.
- V1AS remains the review surface, not a renderer or a live driver.

Honesty note:
- The dry-run plan, fixture selection, raw import, store mode, and review surface all stay in the same explicit chain.
- Review-ready still does not mean live; it means fixture-backed and explicit.
