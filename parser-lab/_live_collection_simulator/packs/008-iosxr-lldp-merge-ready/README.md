# 008-iosxr-lldp-merge-ready

Purpose: prep-only corpus for V1AU fixture-backed simulator.
Platform: Cisco IOS-XR
Source kind: LLDP
Import mode: Merge
Truth note: synthetic and sanitised.
Integration status: prep_ready / not_integrated.

Fixture reference: `parser-lab/_raw_neighbor_import/iosxr-lldp-neighbors-008/snippets/iosxr-lldp-neighbors-008.txt`
Expected route: V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review

What this proves:
- V1AT dry-run planning can be consumed without device contact.
- Fixture-backed raw text can still flow through the existing V1AP/V1AQ import route.
- V1AR remains the only store authority.
- V1AS remains the review surface, not a renderer or a live driver.

Honesty note:
- Read-only plan input becomes a fixture-backed raw-output path with no device contact, no sockets, and no credentials.
- The simulator stays fixture-only and never opens live transport.
