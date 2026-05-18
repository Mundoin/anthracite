# Cisco IOS-XE parser prep

This folder holds the IOS-XE parser-depth prep batches.

## Batch status

- Vendor: Cisco IOS-XE
- Prep areas: interface-depth, VLAN/L2 switching deeper
- Status: ready for OCC review, not production-integrated

## Contents

- `fixtures/` - sanitized raw IOS-XE configs.
- `intent/` - human-readable extraction intent notes.
- `coverage.md` - what this batch covers and what still needs prep.
- `syntax-notes.md` - IOS-XE syntax patterns observed in the fixtures.
- `edge-cases.md` - parser risks and ambiguous forms to watch.
- `MANIFEST.yaml` - fixture index for OCC handoff.
- `HANDOFF.md` - the integration note OCC should read first.

## Why this batch exists

Interface depth is the highest parser-depth priority for IOS-XE, and the
parser already exists. This pack gives OCC bounded source material for a
future stage without forcing Codex into parser implementation work.
