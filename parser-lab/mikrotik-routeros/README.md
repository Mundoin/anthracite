# MikroTik RouterOS parser prep

This folder holds the first MikroTik RouterOS parser-prep baseline.

## Batch status

- Vendor: MikroTik RouterOS
- Prep areas: system identity, interface basics, VLANs and bridges,
  routed interfaces, static routes, management-plane hints, note-only
  ACL/NAT/QoS/AAA/security/routing markers
- Status: ready for OCC review, not production-integrated

## Contents

- `fixtures/` - sanitized raw RouterOS configs.
- `intent/` - human-readable extraction intent notes.
- `coverage.md` - what this baseline covers and what still needs prep.
- `syntax-notes.md` - RouterOS syntax patterns observed in the fixtures.
- `edge-cases.md` - parser risks and ambiguous forms to watch.
- `MANIFEST.yaml` - fixture index for OCC handoff.
- `HANDOFF.md` - the integration note OCC should read first.

## Why this batch exists

RouterOS is a distinct syntax family, and this pack gives OCC a clean
baseline corpus for future parser work without pulling Codex into parser
implementation.

