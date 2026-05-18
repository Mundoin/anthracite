# 013-driver-deferred-huawei

Purpose: prep-only corpus for V1AU fixture-backed simulator.
Platform: Huawei VRP
Source kind: LLDP
Import mode: Merge
Truth note: synthetic and sanitised.
Integration status: prep_ready / not_integrated.

Fixture reference: `parser-lab/_raw_neighbor_import/huawei-vrp-lldp-neighbor-009/snippets/huawei-vrp-lldp-neighbor-009.txt`
Expected route: V1AT dry-run plan -> validate deferred platform -> stop before import

What this proves:
- V1AT dry-run planning can be consumed without device contact.
- Fixture-backed raw text can still flow through the existing V1AP/V1AQ import route.
- V1AR remains the only store authority.
- V1AS remains the review surface, not a renderer or a live driver.

Honesty note:
- The simulator may name the fixture, but it must still stop before import because the platform is deferred.
- Deferred is a future driver decision, not a silent fallback.
