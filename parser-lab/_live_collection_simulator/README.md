# V1AU Fixture-Backed Live Collection Simulator Prep Corpus

This subtree is synthetic, sanitised, prep-only, and not integrated.
It prepares a future fixture-backed simulator that proves the V1AT dry-run plan path without any device contact.

What it should do:
- consume V1AT dry-run plan output
- select a local synthetic fixture
- send the raw text through the existing V1AP/V1AQ raw import route
- let V1AR apply the selected store mode
- show projected edges in the V1AS review surface

What it must never do:
- open SSH or any other live transport
- use credentials, host/IP plumbing, sockets, polling, or background tasks
- bypass V1AR or V1AS
- invent topology or resolve anything fuzzily

Pack overview:

| Pack | Platform | Source kind | Expected route |
| --- | --- | --- | --- |
| 001-iosxe-lldp-merge-ready | Cisco IOS-XE | LLDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 002-iosxe-cdp-append-ready | Cisco IOS-XE | CDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR append -> V1AS review |
| 003-nxos-lldp-merge-ready | Cisco NX-OS | LLDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 004-nxos-cdp-append-ready | Cisco NX-OS | CDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR append -> V1AS review |
| 005-eos-lldp-merge-ready | Arista EOS | LLDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 006-eos-cdp-append-ready | Arista EOS | CDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR append -> V1AS review |
| 007-junos-lldp-merge-ready | Juniper Junos | LLDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 008-iosxr-lldp-merge-ready | Cisco IOS-XR | LLDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 009-no-source-kind-selected | Mixed | none | V1AT dry-run plan -> no fixture selected -> stop before import |
| 010-replace-mode-warning | Cisco IOS-XE | LLDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR replace -> V1AS review |
| 011-unsupported-fortios | FortiOS | LLDP | V1AT dry-run plan -> validate unsupported platform -> stop before import |
| 012-unsupported-mikrotik | MikroTik RouterOS | neighbor-discovery | V1AT dry-run plan -> validate unsupported platform -> stop before import |
| 013-driver-deferred-huawei | Huawei VRP | LLDP | V1AT dry-run plan -> validate deferred platform -> stop before import |
| 014-driver-deferred-nokia | Nokia SR OS | LLDP | V1AT dry-run plan -> validate deferred platform -> stop before import |
| 015-fixture-missing-for-ready-plan | Cisco IOS-XE | LLDP | V1AT dry-run plan -> no fixture selected -> stop before import |
| 016-fixture-platform-mismatch | Cisco NX-OS | LLDP | V1AT dry-run plan -> validate platform mismatch -> stop before import |
| 017-fixture-source-kind-mismatch | Cisco IOS-XE | CDP | V1AT dry-run plan -> validate source kind mismatch -> stop before import |
| 018-raw-import-rejection-visible | Mixed | LLDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 019-merge-dedup-visible | Mixed | LLDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |
| 020-v1as-review-after-simulated-import | Mixed | LLDP | V1AT dry-run plan -> fixture select -> V1AP/V1AQ raw import -> V1AR merge -> V1AS review |

The top-level docs explain the simulator contract, fixture-routing rules, operator workflows, state machine, import modes, safety boundaries, test plan, risks, and the project-map update note.
