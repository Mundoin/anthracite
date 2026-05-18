# Fixture Routing Contract

The simulator routes by exact fixture metadata, not by device contact.

Rules:
- Use the V1AT planner output as the dry-run input.
- Select the fixture by platform hint and source kind.
- If the fixture is missing or mismatched, stop before import.
- If the platform is unsupported or deferred, stop before import.
- Never derive a fixture from a host, IP, credential, or shell command.

| Pack | Platform hint | Source kind | Fixture ref | Route |
| --- | --- | --- | --- | --- |
| 001-iosxe-lldp-merge-ready | iosxe | LLDP | `parser-lab/_raw_neighbor_import/iosxe-lldp-detail-001/snippets/iosxe-lldp-detail-001.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 002-iosxe-cdp-append-ready | iosxe | CDP | `parser-lab/_raw_neighbor_import/iosxe-cdp-detail-002/snippets/iosxe-cdp-detail-002.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR append -> V1AS review |
| 003-nxos-lldp-merge-ready | nxos | LLDP | `parser-lab/_raw_neighbor_import/nxos-lldp-detail-003/snippets/nxos-lldp-detail-003.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 004-nxos-cdp-append-ready | nxos | CDP | `parser-lab/_raw_neighbor_import/nxos-cdp-detail-004/snippets/nxos-cdp-detail-004.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR append -> V1AS review |
| 005-eos-lldp-merge-ready | eos | LLDP | `parser-lab/_raw_neighbor_import/eos-lldp-detail-005/snippets/eos-lldp-detail-005.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 006-eos-cdp-append-ready | eos | CDP | `parser-lab/_raw_neighbor_import/eos-cdp-detail-006/snippets/eos-cdp-detail-006.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR append -> V1AS review |
| 007-junos-lldp-merge-ready | junos | LLDP | `parser-lab/_raw_neighbor_import/junos-lldp-neighbors-007/snippets/junos-lldp-neighbors-007.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 008-iosxr-lldp-merge-ready | iosxr | LLDP | `parser-lab/_raw_neighbor_import/iosxr-lldp-neighbors-008/snippets/iosxr-lldp-neighbors-008.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 009-no-source-kind-selected | (none) | none | none | V1AT dry-run plan -> no fixture selected -> stop before import |
| 010-replace-mode-warning | iosxe | LLDP | `parser-lab/_raw_neighbor_import/iosxe-lldp-detail-001/snippets/iosxe-lldp-detail-001.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR replace -> V1AS review |
| 011-unsupported-fortios | fortios | LLDP | `parser-lab/_raw_neighbor_import/fortios-lldp-neighbor-011/snippets/fortios-lldp-neighbor-011.txt` | V1AT dry-run plan -> validate unsupported platform -> stop before import |
| 012-unsupported-mikrotik | mikrotik | neighbor-discovery | `parser-lab/_raw_neighbor_import/mikrotik-neighbor-discovery-012/snippets/mikrotik-neighbor-discovery-012.txt` | V1AT dry-run plan -> validate unsupported platform -> stop before import |
| 013-driver-deferred-huawei | huawei_vrp | LLDP | `parser-lab/_raw_neighbor_import/huawei-vrp-lldp-neighbor-009/snippets/huawei-vrp-lldp-neighbor-009.txt` | V1AT dry-run plan -> validate deferred platform -> stop before import |
| 014-driver-deferred-nokia | nokia_sros | LLDP | `parser-lab/_raw_neighbor_import/nokia-sros-lldp-neighbor-010/snippets/nokia-sros-lldp-neighbor-010.txt` | V1AT dry-run plan -> validate deferred platform -> stop before import |
| 015-fixture-missing-for-ready-plan | iosxe | LLDP | none | V1AT dry-run plan -> no fixture selected -> stop before import |
| 016-fixture-platform-mismatch | nxos | LLDP | `parser-lab/_raw_neighbor_import/iosxe-lldp-detail-001/snippets/iosxe-lldp-detail-001.txt` | V1AT dry-run plan -> validate platform mismatch -> stop before import |
| 017-fixture-source-kind-mismatch | iosxe | CDP | `parser-lab/_raw_neighbor_import/iosxe-lldp-detail-001/snippets/iosxe-lldp-detail-001.txt` | V1AT dry-run plan -> validate source kind mismatch -> stop before import |
| 018-raw-import-rejection-visible | iosxe | LLDP | `parser-lab/_raw_neighbor_import/raw-output-malformed-cases-013/snippets/raw-output-malformed-cases-013.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 019-merge-dedup-visible | iosxe | LLDP | `parser-lab/_raw_neighbor_import/raw-output-duplicate-neighbors-015/snippets/raw-output-duplicate-neighbors-015.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 020-v1as-review-after-simulated-import | iosxe | LLDP | `parser-lab/_raw_neighbor_import/import-result-summary-cases-020/snippets/import-result-summary-cases-020.txt` | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |

The route ends in V1AP/V1AQ only when the simulator is explicitly fixture-backed and the checks pass. V1AR and V1AS remain the authoritative downstream stages.
