# Fortinet FortiOS parser prep

This folder holds the first FortiOS parser-prep baseline.

## Batch status

- Vendor: Fortinet FortiOS
- Prep areas: system/global, interfaces, VLANs, zones, static routes,
  firewall objects/policies, NAT markers, note-only VPN/SD-WAN hints
- Status: ready for OCC review, not production-integrated

## Contents

- `fixtures/` - sanitized raw FortiOS configs.
- `intent/` - human-readable extraction intent notes.
- `coverage.md` - what this baseline covers and what still needs prep.
- `syntax-notes.md` - FortiOS syntax patterns observed in the fixtures.
- `edge-cases.md` - parser risks and ambiguous forms to watch.
- `MANIFEST.yaml` - fixture index for OCC handoff.
- `HANDOFF.md` - the integration note OCC should read first.

## Why this batch exists

FortiOS is not production-integrated in this lane yet, so this pack
gives OCC a clean baseline corpus for a future parser stage without
pulling Codex into parser implementation work.

