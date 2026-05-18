# Test Plan

Suggested test categories:
- Rust planner compatibility tests
- TS fixture routing helper tests
- UI simulator panel tests
- import route tests with mocked API
- no credential / host / IP regression tests
- existing V1AT panel still works
- existing V1AS review still works

Scenario coverage:
- Supported merge and append scenarios across IOS-XE, NX-OS, EOS, Junos, and IOS-XR.
- Replace warning path.
- No source kind selected path.
- Unsupported FortiOS and MikroTik paths.
- Deferred Huawei and Nokia paths.
- Missing fixture path.
- Platform mismatch path.
- Source kind mismatch path.
- Raw import rejection visible path.
- Merge dedup visible path.
- V1AS review after simulated import path.

Regression protection:
- V1AT panel still works.
- V1AS review still works.
- No credential / host / IP fields appear anywhere in the simulator flow.
