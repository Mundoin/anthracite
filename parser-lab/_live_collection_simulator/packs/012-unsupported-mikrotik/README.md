# 012-unsupported-mikrotik

Purpose: prep-only corpus for V1AU fixture-backed simulator.
Platform: MikroTik RouterOS
Source kind: neighbor-discovery
Import mode: Merge
Truth note: synthetic and sanitised.
Integration status: prep_ready / not_integrated.

Fixture reference: `parser-lab/_raw_neighbor_import/mikrotik-neighbor-discovery-012/snippets/mikrotik-neighbor-discovery-012.txt`
Expected route: V1AT dry-run plan -> validate unsupported platform -> stop before import

What this proves:
- V1AT dry-run planning can be consumed without device contact.
- Fixture-backed raw text can still flow through the existing V1AP/V1AQ import route.
- V1AR remains the only store authority.
- V1AS remains the review surface, not a renderer or a live driver.

Honesty note:
- Unsupported or lower-confidence platform families stay blocked and honest.
- Unsupported does not mean guessed; it means blocked.
