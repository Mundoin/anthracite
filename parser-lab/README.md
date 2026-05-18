# parser-lab

`parser-lab` is Codex's parser-prep workspace for raw corpus material,
intent notes, syntax maps, edge-case catalogs, and coverage tracking.

## Purpose

- Prepare vendor-specific source material for future parser stages.
- Keep prep work separated from production parser code and from golden
  integration artifacts.
- Give OCC a clean handoff package so it can wire the material into Rust
  parser code later without hunting for source configs.

## Roles

- Codex = corpus / prep factory only.
- OCC = integration owner.

## Hard boundary

- No Rust parser edits.
- No parser version bumps.
- No `expected.json` integration.
- No frontend edits.
- No production architecture doc edits.

If a prep task needs any of those, it belongs to OCC, not Codex.

## Working rhythm

File-by-file, vendor-by-vendor:

1. Add or update sanitized raw fixtures.
2. Write intent notes in plain language.
3. Capture syntax patterns and edge cases.
4. Update coverage and manifest metadata.
5. Leave integration to OCC.

## Current focus

- First vendor: `cisco-iosxe`
- First feature area: `interface-depth`

