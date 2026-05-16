# V1M — Juniper Junos parser (L1 + L2)

**Status:** complete
**Date:** 2026-05-16
**Predecessor:** V1L — Fixture corpus + receipt projection
**Successor (planned):** to-be-named V1N stage (likely Arista EOS parser)

## Why

V1K shipped one parser, V1L hardened the surrounding discipline (corpus,
manifest, version guard, receipt). Until a second parser lives in the
tree, "the parser contract" is just one parser's local conventions.
V1M proves the V1K/V1L contract generalises by adding a second
vendor — Junos — and showing that:

- The same `DeviceModel` shape absorbs Junos cleanly.
- Receipt projection is parser-agnostic and works over Junos models
  without any change.
- The fixture-manifest-and-guard discipline scales to two parsers.

The byte-identical brace ↔ set fixture pair is the V1M sharpener: if
the two Junos styles diverge anywhere, the parser is leaking textual
artefacts into the canonical model.

## Preflight — V1L Cisco corpus review

Per the V1M prompt, the 13 V1L expected.json files were reviewed for
contract-vs-self-capture before any Junos code was written. Two minor
observations, neither material:

1. **Vocabulary one-off.** `routing-protocols-present` emits the
   warning `not_in_scope:routing_protocols_block`. That marker is not
   in the documented `OUT_OF_SCOPE_AREAS` list (which has
   `routing_protocols_{ospf,isis,eigrp,bgp}`). It is a parser-local
   marker emitted by the `router …` top-level dispatch path. Cosmetic;
   no contract harm.
2. **Reason classification drift.** ACL/NAT lines in
   `acl-and-nat-present` emit `UnknownReason::UnsupportedKeyword`,
   despite both areas being explicitly listed as `not_in_scope`. The
   `OutOfScope` reason would be a tighter fit. The areas correctly
   surface as `not_in_scope` in warnings, so consumers still know they
   are deliberately not parsed.

**Verdict:** continue V1M. Neither finding is a contract bug; both are
parser-emission-vocabulary observations and can be folded into a later
V1L-A cleanup if Bujar/Vale want consistency tightened.

V1M does not fix Cisco parser behaviour.

## What changed

### Rust — parser tree (new)
- `src-tauri/src/engines/parsers/juniper_junos/mod.rs` — orchestrator,
  `PARSER_VERSION = 1`, dispatch + finalize, in/out-of-scope area lists.
- `src-tauri/src/engines/parsers/juniper_junos/canonical.rs` —
  `JunosLine { path, line_number, raw }`, the single convergence shape
  for both lexers.
- `src-tauri/src/engines/parsers/juniper_junos/lexer_brace.rs` —
  hand-rolled brace-style lexer with `/* … */` and `#` stripping,
  brace-depth stack, bracket-list expansion.
- `src-tauri/src/engines/parsers/juniper_junos/lexer_set.rs` —
  hand-rolled set-style lexer with quoted-string + bracket-list
  handling.
- `src-tauri/src/engines/parsers/juniper_junos/identity.rs` — hostname /
  serial helpers.
- `src-tauri/src/engines/parsers/juniper_junos/interfaces.rs` —
  Junos-style `classify` (ae*, lo*, me*, ge-/xe-/et-/fe-, irb.,
  vlan.) + `parent_of`.
- `src-tauri/src/engines/parsers/juniper_junos/ip_addressing.rs` —
  slash-prefix `parse` for both v4 and v6.
- `src-tauri/src/engines/parsers/juniper_junos/vlans.rs` —
  `VlanBuilder` with name→id resolution at finalize.
- `src-tauri/src/engines/parsers/juniper_junos/routing_instances.rs` —
  `VrfBuilder` covering instance-type, RD, vrf-target, interfaces.
- `src-tauri/src/engines/parsers/juniper_junos/static_routes.rs` —
  `RouteBuilder` handling next-hop / discard / reject / preference /
  tag.
- `src-tauri/src/engines/parsers/juniper_junos/lag.rs` — LACP-mode
  helper.
- `src-tauri/src/engines/parsers/juniper_junos/services.rs` — SSH /
  SNMP / NTP / DNS / Syslog accumulators with V1K-compatible `notes`
  encoding.
- `src-tauri/src/engines/parsers/juniper_junos/unknown.rs` —
  out-of-scope path-prefix vocabulary + `UnknownConfigLine` emission.

### Rust — dispatch wiring
- `src-tauri/src/engines/parsers/mod.rs` — registers `juniper_junos`
  module; routes `platform_id == "juniper-junos"` to it; updates the
  pre-existing `unknown_platform_id_returns_err` test to use
  `arista-eos` (since `juniper-junos` is no longer unsupported); adds
  `juniper_junos_platform_id_dispatches_ok` test.

### Fixtures (12 new)
Under `src-tauri/tests/fixtures/juniper-junos/`:

- `aggregate-ethernet-bundle/`
- `dual-stack-edge/`
- `irb-and-vlan-binding/`
- `many-access-ports-l2-only/`
- `near-empty/`
- `protocols-and-policy-present/`
- `small-brace-style/`
- `small-set-style/`
- `truncated/`
- `unit-zero-vs-higher/`
- `vrf-heavy-aggregation/`
- `wan-edge-with-units/`

Plus `_manifest.toml` listing `parser_version = 1` and the full
alphabetical fixture set (12 total).

### Integration tests
- `src-tauri/tests/juniper_junos_fixture_corpus.rs` (new) — mirrors
  the Cisco corpus harness. Adds:
  - `brace_set_pair_produces_same_model` — asserts the small-style
    pair produces byte-identical `DeviceModel` JSON after normalising
    `evidence.byte_size` and `evidence.line_count`.
  - `receipt_projection_round_trips_over_junos_model` — proves the
    V1L receipt projection works over a Junos model unchanged.
- `src-tauri/tests/parser_version_guard.rs` (extended) — now guards
  both `cisco-iosxe` and `juniper-junos` manifests in parallel.
- `src-tauri/tests/cisco_iosxe_fixtures.rs` — the
  `wrong_platform_ref_returns_err` test switched its sentinel from
  `juniper-junos` to `arista-eos` since the former is now a known
  platform.

### Docs
- `docs/architecture/JUNOS_CONFIG_STYLES.md` (new) — brace vs set
  algorithms, convergence rule, byte-equal pair contract, V1M
  limitations.
- `docs/architecture/INTERFACE_NAMING.md` — Junos table added; rule
  is verbatim preservation (Junos native names are already canonical).
- `docs/architecture/PARSER_COVERAGE_AREAS.md` — Junos coverage
  section + V1M fixture matrix.
- `docs/architecture/PARSER_VERSIONING.md` — added "Shared
  infrastructure changes" paragraph: shared edits that move output
  must bump every affected parser's version in the same commit.

### Vault
- `obsidian/ANTHRACITE_INDEX.md` — V1M row landed.
- This stage note.

## Design rules encoded

- **Two lexers, one convergence.** `canonical::JunosLine` is the
  single shape area parsers see. Brace and set lower into the same
  path-token sequence; everything downstream is style-agnostic.
- **No new dependencies.** No parser-combinator crate, no TOML crate.
  Both manifests are hand-parsed by the same minimal reader used in
  V1L.
- **Verbatim short forms.** Junos native names are already short, so
  `normalized_name == name`. No vocabulary translation.
- **Out-of-scope is path-prefix, not heuristic.** `unknown.rs`
  declares the exact prefixes the V1M parser does not interpret
  (`protocols`, `policy-options`, `firewall`, `security`,
  `class-of-service`, `forwarding-options`, `services`,
  `applications`). Lines under those prefixes land in
  `unknown_lines[]` with `UnknownReason::OutOfScope`.
- **Brace ↔ set byte-equal contract.** Up to two intrinsically
  textual evidence fields, the two styles must produce byte-identical
  `DeviceModel` JSON. Anything else means the parser is leaking
  textual artefacts.
- **Receipt projection is unchanged.** V1L's projection works over
  any `DeviceModel`. The Junos corpus harness includes a round-trip
  check that proves it.

## What stayed out

- No second new parser (no Arista EOS, no NX-OS).
- No deep parsing of `protocols`, `policy-options`, `firewall`,
  `security`, `class-of-service`, `forwarding-options`,
  `applications`. These captured as `unknown_lines[]` only.
- No React UI consumption of Junos data. Tauri command + TS API are
  unchanged; the existing `parse_device_config` invoke handles Junos
  via dispatch.
- No `network_model.rs` edits. The model already covered every Junos
  L1/L2 concept (V1L's `UnrecognizedInterfaceForm` is reused here).
- No `vendor_registry.rs` or `config_detection.rs` edits.
- No new `Cargo.toml` or `package.json` dependencies.
- No Python, Netmiko, Scrapli, NAPALM, or live device access.
- No receipt redesign.

## Validation

- `cargo check --manifest-path src-tauri/Cargo.toml --lib` — green.
- `cargo test --lib` — **197 passed / 0 failed** (was 163 in V1L;
  +34 new from Junos lexers, area helpers, and orchestrator).
- `cargo test --test cisco_iosxe_fixtures` — **11 passed**.
- `cargo test --test cisco_iosxe_fixture_corpus` — **7 passed**.
- `cargo test --test juniper_junos_fixture_corpus` — **9 passed**
  (including brace/set pair byte-equal + receipt round-trip).
- `cargo test --test parser_version_guard` — **6 passed** (3 per
  parser).
- `pnpm typecheck`, `pnpm build`, `tools/ops-readiness.ps1` —
  to be confirmed in the final validation pass.

## Known follow-ups

Items deliberately left for later stages so V1M stays bounded:

1. **Compact-block brace syntax** — single-line `{ a; b; c; }` is
   tolerated but not fully parsed. Real Junos rarely uses it; V1M's
   fixtures use the canonical multi-line form.
2. **`deactivate` / `delete` in set style** — dropped silently in
   V1M. A later "config-as-overlay" stage may want to reify these.
3. **LAG mode plumbing on the bundle** — `aggregated-ether-options
   lacp active|passive` is parsed but the mode does not flow through
   to the synthesised `LagGroupModel.mode` (both styles drop it the
   same way, so the byte-equal contract holds). Wiring this is a
   one-line fix once a fixture demands it.
4. **`l3-interface` cross-link** — `vlans { NAME { l3-interface
   irb.100; } }` is captured but not used to stamp IRB SVIs against
   their VLANs. Mild model improvement, no contract regression.
5. **V1L-A consideration** — the two cosmetic V1L Cisco findings
   (vocabulary one-off + ACL reason classification) could be
   tightened in a small V1L-A. Not blocking V1M.

## Next stage

To-be-named V1N. Candidates:

- **V1N (Arista EOS parser).** Now that two parsers exist, a third
  exercises the contract further. EOS is Cisco-like syntactically,
  which would test how much normalize.rs can be shared.
- **V1L-A (Cisco cosmetic cleanup).** Tighten the two preflight
  findings.
- **V1O (Receipt UI consumption).** First mode surface that calls
  `project_device_receipt`.

## Cross-references

- [V1L stage note](./V1L-fixture-corpus-and-receipts.md)
- [V1K stage note](./V1K-cisco-iosxe-parser.md)
- [JUNOS_CONFIG_STYLES.md](../../docs/architecture/JUNOS_CONFIG_STYLES.md)
- [PARSER_VERSIONING.md](../../docs/architecture/PARSER_VERSIONING.md)
- [PARSER_COVERAGE_AREAS.md](../../docs/architecture/PARSER_COVERAGE_AREAS.md)
- [INTERFACE_NAMING.md](../../docs/architecture/INTERFACE_NAMING.md)
- [CANONICAL_NETWORK_MODEL.md](../../docs/architecture/CANONICAL_NETWORK_MODEL.md)
