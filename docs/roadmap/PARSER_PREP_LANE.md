# Parser Prep Lane — Codex × OCC Contract

> Parallel lane: Codex prepares parser corpus and intent material while OCC
> continues integration work elsewhere. Companion to
> [`ANTHRACITE_V1_PRODUCT_ROADMAP.md`](./ANTHRACITE_V1_PRODUCT_ROADMAP.md).

---

## Roles

- **Codex.** Corpus / prep factory only. Builds the raw material that future
  parser stages will consume.
- **OCC (Anthracite's main coding agent — Claude under hybrid orchestration).**
  Integration owner. Reads Codex's prep material when a parser stage opens
  and turns it into Rust parser code, fixtures wired into the test harness,
  and engine-boundary changes.

Hard boundary: **Codex never edits Rust parser logic.** OCC never asks
Codex to commit Rust parser code.

---

## Allowed Codex outputs

- Raw vendor configurations (sanitized, no real customer data).
- Coverage maps — what feature areas are represented across the corpus,
  with gaps marked.
- Syntax notes — how vendor X expresses concept Y, with line citations from
  the raw configs.
- Edge-case catalogues — known oddities, deprecated forms, version skew
  notes, vendor "fun".
- Expected-intent notes — natural-language description of what each raw
  config snippet *should* produce in DeviceModel terms. Never machine-
  readable golden JSON unless OCC has opened a stage that needs it.
- Fixture manifests — index of fixtures + metadata (vendor, version,
  feature coverage tags, source provenance, sanitization notes).

---

## Disallowed Codex outputs

- Rust parser engine edits (anywhere under `src-tauri/src/engines/parsers/`
  or related modules).
- Parser version bumps. Cross-vendor invariants. Schema-version constants.
- Golden `expected.json` files wired into the parser test harness.
- DeviceModel schema changes.
- Validator rule pack changes.
- Production docs / index edits unless OCC explicitly requests one.
- Edits to `AGENTS.md`, `CLAUDE.md`, `GOALS.md`, `PRODUCT.md`,
  `docs/architecture/*`, or any roadmap doc without OCC sign-off.
- Edits to `src/` (frontend) entirely — that's OCC's lane.

If a Codex task requires any of the above, Codex halts and asks OCC.

---

## Proposed folder layout

```
parser-lab/
  README.md                 # lane purpose + status board
  cisco-iosxe/
    fixtures/
      <hostname>.cfg        # raw, sanitized
    coverage.md             # what's covered, what's missing
    syntax-notes.md         # vendor quirks
    edge-cases.md           # weird forms, version skew
    intent/
      <hostname>.intent.md  # natural-language "what this should mean"
    MANIFEST.yaml           # fixture index
  cisco-nxos/
  juniper-junos/
  arista-eos/
  fortinet-fortios/
  huawei-vrp/
  mikrotik-routeros/
```

`parser-lab/` is a Codex working surface. OCC reads it; OCC does not commit
parser code that lives there. Production parser code stays under
`src-tauri/src/engines/parsers/`.

---

## File-by-file working rhythm

Per vendor, Codex iterates roughly:

1. **Drop a raw config** under `<vendor>/fixtures/<hostname>.cfg`.
2. **Sanitize.** Remove real IPs, hostnames, secrets, customer-identifying
   strings. Document sanitization in the file header.
3. **Tag coverage.** Update `<vendor>/coverage.md` with the feature areas
   the new fixture exercises.
4. **Note quirks.** Anything weird → `<vendor>/syntax-notes.md` or
   `<vendor>/edge-cases.md`.
5. **Sketch intent.** Write a short `<vendor>/intent/<hostname>.intent.md`
   describing in plain words what the parser *should* extract.
6. **Update manifest.** Append the fixture to `<vendor>/MANIFEST.yaml`.

No code execution required during prep — purely material assembly.

---

## Handoff shape from Codex to OCC

When OCC opens a parser stage that consumes Codex prep:

- Codex provides a short **handoff note** under the relevant vendor folder
  listing:
  - which fixtures + intent files are ready
  - which feature areas the stage should cover
  - which gaps are explicitly out of scope for the stage
  - known edge cases relevant to the stage
- OCC reads the handoff note, picks the in-scope fixtures, writes Rust
  parser code, wires golden `expected.json` into the existing parser test
  harness, and bumps the parser version under its own engine-boundary
  discipline.
- After the stage lands, Codex updates the vendor's `coverage.md` and
  `MANIFEST.yaml` to reflect what is now production-tested.

---

## Stop rule

This lane runs only when Bujar greenlights it. The roadmap freeze
(V1AI-A) defines the lane shape but does not auto-start it.
