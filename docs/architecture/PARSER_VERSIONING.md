# PARSER_VERSIONING

Per-parser monotonic version convention. Bound by V1K
([`../../obsidian/stages/V1K-cisco-iosxe-parser-PROPOSAL.md`](../../obsidian/stages/V1K-cisco-iosxe-parser-PROPOSAL.md)
§3.2).

## Rule

Each parser module declares:

```rust
pub const PARSER_VERSION: u32 = N;
```

`N` starts at `1` for a parser's first shipped version and is monotonic
across the parser's lifetime. The version is written into:

- `EvidenceMetadata.parser_version` (stringified, e.g. `"1"`).
- `ParseConfidence.warnings` on mismatch / fallback scenarios.

Versions are **per-vendor parser**, not global. The cisco-iosxe parser
and the (future) juniper-junos parser have independent version
counters; they evolve on independent maturity ladders.

## Bump policy

**Patch-equivalent — no bump required:**

- Internal refactor that preserves output bytes.
- Comment changes.
- Test-only changes.
- Performance changes that preserve output bytes.

**Bump required:**

- Any change that could produce different `DeviceModel` JSON for any
  existing fixture.
- New field population (previously absent in output, now present).
- New `unknown_lines[]` capture (previously dropped, now captured).
- Normalization table extension that touches any existing fixture.
- Signature change (rare; would be a major bump in spirit).

## CI enforcement

If `cargo test --lib` shows a fixture diff and the relevant
`PARSER_VERSION` was not incremented in the same commit, the build
fails. The fixture is the contract; the version is the receipt.

(V1L wires the CI check explicitly. V1K relies on developer discipline
and the fixture byte-equal tests as a stand-in.)

## Rationale

Monotonic `u32` is the smallest scheme that supports the
"byte-identical output for same input + same parser version + same
registry version" guarantee from
[`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md). Semver is
over-specification at this stage — the canonical model is the
contract, not the parser interface.

Per-vendor counters keep each parser's evolution legible. A bump on
`cisco-iosxe` does not imply anything about `juniper-junos`.

## Cross-references

- [`INTERFACE_NAMING.md`](./INTERFACE_NAMING.md)
- [`PARSER_COMMAND_CONTRACT.md`](./PARSER_COMMAND_CONTRACT.md)
- [`PARSER_COVERAGE_AREAS.md`](./PARSER_COVERAGE_AREAS.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
