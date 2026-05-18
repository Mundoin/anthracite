# Cisco IOS-XR parser prep

This folder holds the first Cisco IOS-XR parser-prep baseline.

## Batch status

- Vendor: Cisco IOS-XR
- Prep areas: system identity, interface basics, routed interfaces,
  L2 subinterfaces, native VLAN where present, static routes,
  management-plane hints, note-only ACL/NAT/QoS/AAA/security/routing
  markers
- Status: ready for OCC review, not production-integrated

## Contents

- `fixtures/` - sanitized raw IOS-XR configs.
- `intent/` - human-readable extraction intent notes.
- `coverage.md` - what this baseline covers and what still needs prep.
- `syntax-notes.md` - IOS-XR syntax patterns observed in the fixtures.
- `edge-cases.md` - parser risks and ambiguous forms to watch.
- `MANIFEST.yaml` - fixture index for OCC handoff.
- `HANDOFF.md` - the integration note OCC should read first.

## Why this batch exists

IOS-XR is a common routed-edge platform, and this pack gives OCC a clean
baseline corpus for future parser work without pulling Codex into parser
implementation.

