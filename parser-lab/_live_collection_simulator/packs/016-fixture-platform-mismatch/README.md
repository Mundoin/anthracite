# 016-fixture-platform-mismatch

Purpose: prep-only corpus for V1AU fixture-backed simulator.
Platform: Cisco NX-OS
Source kind: LLDP
Import mode: Merge
Truth note: synthetic and sanitised.
Integration status: prep_ready / not_integrated.

Fixture reference: `parser-lab/_raw_neighbor_import/iosxe-lldp-detail-001/snippets/iosxe-lldp-detail-001.txt`
Expected route: V1AT dry-run plan -> validate platform mismatch -> stop before import

What this proves:
- V1AT dry-run planning can be consumed without device contact.
- Fixture-backed raw text can still flow through the existing V1AP/V1AQ import route.
- V1AR remains the only store authority.
- V1AS remains the review surface, not a renderer or a live driver.

Honesty note:
- A mismatch is a validation failure and must stop before import.
- A platform mismatch is a guardrail, not a prompt to guess.
