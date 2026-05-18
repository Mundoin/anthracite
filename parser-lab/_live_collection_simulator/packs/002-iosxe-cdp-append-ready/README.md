# 002-iosxe-cdp-append-ready

Purpose: prep-only corpus for V1AU fixture-backed simulator.
Platform: Cisco IOS-XE
Source kind: CDP
Import mode: Append
Truth note: synthetic and sanitised.
Integration status: prep_ready / not_integrated.

Fixture reference: `parser-lab/_raw_neighbor_import/iosxe-cdp-detail-002/snippets/iosxe-cdp-detail-002.txt`
Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR append -> V1AS review

What this proves:
- V1AT dry-run planning can be consumed without device contact.
- Fixture-backed raw text can still flow through the existing V1AP/V1AQ import route.
- V1AR remains the only store authority.
- V1AS remains the review surface, not a renderer or a live driver.

Honesty note:
- Read-only plan input becomes a fixture-backed append path with no device contact, no sockets, and no credentials.
- Append remains an explicit store mode; the simulator must not smuggle in hidden mutation.
