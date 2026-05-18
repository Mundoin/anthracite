# Huawei VRP parser prep

This folder holds the first Huawei VRP parser-prep baseline.

## Batch status

- Vendor: Huawei VRP
- Prep areas: system/interface basics, VLANs, SVIs, trunk/access L2,
  static routes, note-only ACL/NAT/QoS/AAA markers, VRP syntax edge cases
- Status: ready for OCC review, not production-integrated

## Contents

- `fixtures/` - sanitized raw VRP configs.
- `intent/` - human-readable extraction intent notes.
- `coverage.md` - what this baseline covers and what still needs prep.
- `syntax-notes.md` - VRP syntax patterns observed in the fixtures.
- `edge-cases.md` - parser risks and ambiguous forms to watch.
- `MANIFEST.yaml` - fixture index for OCC handoff.
- `HANDOFF.md` - the integration note OCC should read first.

## Why this batch exists

Huawei VRP is not production-integrated in this lane yet, so this pack
gives OCC a clean baseline corpus for a future parser stage without
pulling Codex into parser implementation work.

