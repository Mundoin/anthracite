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

Versions are **per-vendor parser**, not global. Each parser family has
an independent version counter; they evolve on independent maturity
ladders.

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

## CI enforcement (V1L)

Three artefacts must agree on the parser's version at all times:

1. The Rust source constant `cisco_iosxe::PARSER_VERSION` (and the
   per-parser equivalent for future parsers).
2. The fixture manifest at
   `src-tauri/tests/fixtures/cisco-iosxe/_manifest.toml`, field
   `parser_version`.
3. The on-disk fixture corpus (every directory listed in the manifest
   must exist; every directory on disk must appear in the manifest).

The integration test `tests/parser_version_guard.rs` enforces (1)↔(2)
and (2)↔(3). The corpus harness `tests/cisco_iosxe_fixture_corpus.rs`
additionally enforces that every fixture's committed `expected.json`
matches what the current parser produces; any diff fails CI.

### Honest limitation

CI enforces consistency among the three artefacts. It **cannot** tell
you whether a parser change *should* have required a bump in the first
place. The workflow is therefore:

- Make the parser change.
- Run `ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test cisco_iosxe_fixture_corpus`.
- Look at the diff in every regenerated `expected.json`.
- If any byte changed for any fixture that was already shipped, you
  MUST bump `PARSER_VERSION` and the manifest `parser_version` in the
  same commit. CI fails if you regenerate without bumping.
- If no bytes changed, the bump was unnecessary; revert it.

Human review at PR time is the final gate on bump correctness. CI is
the gate that you didn't *forget* to bump.

(V1K relied on developer discipline. V1L wires the explicit guards.)

## Rationale

Monotonic `u32` is the smallest scheme that supports the
"byte-identical output for same input + same parser version + same
registry version" guarantee from
[`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md). Semver is
over-specification at this stage — the canonical model is the
contract, not the parser interface.

Per-vendor counters keep each parser's evolution legible. A bump on
`cisco-ios` does not imply anything about `cisco-iosxe` or
`juniper-junos`.

As of V1BC the shipped parser families are:

- `cisco-ios`
- `cisco-iosxe`
- `juniper-junos`
- `arista-eos`
- `cisco-nxos`
- `huawei-vrp`
- `fortinet-fortios`
- `mikrotik-routeros`

## Shared infrastructure changes (V1M clarification)

When a change lives in **shared** parser infrastructure
(`parsers/normalize.rs`, `parsers/context.rs`, the canonical model in
`network_model.rs`, the receipt projection in `engines/receipt.rs`) and
that change alters any per-vendor parser's output for any fixture, then
**every affected parser's `PARSER_VERSION` must bump in the same
commit**. The per-vendor counters are independent, but they must all
move when a shared edit reaches them.

The corpus harnesses make this enforceable: a shared change that
shifts cisco fixture output and junos fixture output forces two
expected.json regenerations, and the guard rejects the commit unless
both `PARSER_VERSION` constants and both manifest values move
together.

## Cross-references

- [`INTERFACE_NAMING.md`](./INTERFACE_NAMING.md)
- [`PARSER_COMMAND_CONTRACT.md`](./PARSER_COMMAND_CONTRACT.md)
- [`PARSER_COVERAGE_AREAS.md`](./PARSER_COVERAGE_AREAS.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
- [`PARSER_CISCO_IOS.md`](./PARSER_CISCO_IOS.md)
- [`PARSER_HUAWEI_VRP.md`](./PARSER_HUAWEI_VRP.md)
- [`PARSER_FORTINET_FORTIOS.md`](./PARSER_FORTINET_FORTIOS.md)
- [`PARSER_MIKROTIK_ROUTEROS.md`](./PARSER_MIKROTIK_ROUTEROS.md)
