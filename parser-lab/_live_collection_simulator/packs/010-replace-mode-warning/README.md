# 010-replace-mode-warning

Purpose: prep-only corpus for V1AU fixture-backed simulator.
Platform: Cisco IOS-XE
Source kind: LLDP
Import mode: Replace
Truth note: synthetic and sanitised.
Integration status: prep_ready / not_integrated.

Fixture reference: `parser-lab/_raw_neighbor_import/iosxe-lldp-detail-001/snippets/iosxe-lldp-detail-001.txt`
Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR replace -> V1AS review

What this proves:
- V1AT dry-run planning can be consumed without device contact.
- Fixture-backed raw text can still flow through the existing V1AP/V1AQ import route.
- V1AR remains the only store authority.
- V1AS remains the review surface, not a renderer or a live driver.

Honesty note:
- Read-only planning still applies; only the operator-chosen replace mode changes the store semantics later.
- Replace is deliberate, never hidden, and never automatic.
