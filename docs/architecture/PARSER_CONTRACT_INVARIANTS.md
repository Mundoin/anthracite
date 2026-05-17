# PARSER_CONTRACT_INVARIANTS

What every Anthracite parser must do, what every cross-vendor
consumer may assume, and the few invariants the project locks in
writing so they cannot drift unnoticed. Anchored by V1N-A after the
V1M / V1N cross-vendor work.

## Four-parser state (as of V1Z-A)

Anthracite ships four L1/L2 parsers:

- `cisco-iosxe` (V1K + V1L + V1N-A + V1Z-A; current `PARSER_VERSION = 4`)
- `juniper-junos` (V1M + V1N-A + V1Z-A; current `PARSER_VERSION = 3`)
- `arista-eos` (V1N + V1N-A + V1Z-A; current `PARSER_VERSION = 3`)
- `cisco-nxos` (V1U + V1Z-A; current `PARSER_VERSION = 2`)

V1Z-A bumped every parser by one minor: all four families now emit
`ServiceKind::Telnet` for their vendor-native enabling syntax
(`transport input telnet|all` on IOS-XE, `feature telnet` on NX-OS,
`set system services telnet` on Junos, top-level `management telnet`
on EOS). The Junos `NtpAccum` also aligned with NX-OS / EOS so an
NTP `source-address` alone now produces an NTP `ServiceModel` —
parity required by DIAG-HYG-004.

All four populate the same `DeviceModel` shape and emit the same
14-area coverage vocabulary (`services_telnet` added at V1Z-A) so
receipt projection and cross-vendor consumers operate on one
canonical space.

## Truth object

`DeviceModel` (`src-tauri/src/engines/network_model.rs`) is the only
truth object the parser layer produces. Anything else is a view:

- **Receipt** (`ReceiptView`) is a projection over `DeviceModel`,
  computed by `engines::receipt::project_receipt`. It is pure, has no
  parallel state, and any change to it must not require a `DeviceModel`
  change.
- **Cross-vendor canonical view** (used in
  `tests/cross_vendor_consistency.rs`) is a test-only projection
  documenting which fields are vendor-invariant and which are not.
  It is NOT part of the public command surface; it lives only inside
  the integration test.

Future surfaces (Config Intake, topology engine, baseline) consume
`DeviceModel`. They do not consume parser-internal state.

## Vendor parser modules stay separate

`cisco_iosxe`, `juniper_junos`, and `arista_eos` are independent
modules. Sharing infrastructure between them (`parsers::context`,
`parsers::normalize`) is fine; sharing per-vendor dispatch logic is
not. The EOS-vs-IOSXE divergences documented in
[`EOS_VS_IOSXE_DIVERGENCES.md`](./EOS_VS_IOSXE_DIVERGENCES.md) are the
canonical list of reasons; a future Cisco-like vendor (NX-OS) must
ship its own module too.

The lexer architecture being similar across Cisco-derived vendors
is family inheritance, not justification for consolidation. The
dispatch tables, vocabulary, and top-level keyword sets diverge
meaningfully; consolidation silently mis-models the minority vendor.

## Cross-vendor canonical consistency

V1N proved (and V1N-A keeps proving) that three vendor parsers
populate the same canonical L1/L2 facts for the same logical device.
The invariant is enforced by
`tests/cross_vendor_consistency::cross_vendor_equivalent_models_match`.

### What is cross-vendor invariant

The following facts must agree across parsers for the same logical
device:

- `identity.hostname` (when identical)
- VRF set with route-distinguishers
- VLAN set with names
- Set of IP addresses present (address, prefix_length, family, vrf)
- Static-route set (prefix, sorted next_hops, vrf)
- Set of populated service kinds
- Per-service-kind server lists (sorted)
- DNS domains
- `ssh_enabled` boolean

### What is NOT cross-vendor invariant

The following intrinsically vary by vendor and must be normalised
out of any cross-vendor comparison:

- `evidence` block (byte_size, line_count, parser_version — each
  parser's own version, each fixture's own bytes)
- `platform` block (platform_id, vendor, os_family)
- `parse_confidence.warnings` (each parser has its own
  `not_in_scope:*` vocabulary, e.g. EOS adds `not_in_scope:mlag` and
  `not_in_scope:varp` that Cisco and Junos do not)
- `unknown_lines[]` (the "what we didn't parse" set differs by
  vendor — different config grammars yield different unknowns)
- **Interface-kind shape**: Junos models L3 addresses on
  `unit` sub-interfaces (e.g. `ge-0/0/0.0`); Cisco and EOS attach
  addresses directly to physical interfaces. The L1/L2 invariant is
  *what addresses landed on what VRFs*, not *which kind of
  interface entry holds them*. This was the key V1N finding.
- Per-interface `name` (vendor-native: `GigabitEthernet0/0/0` vs
  `ge-0/0/0` vs `Ethernet1`)
- Per-interface `normalized_name` (still vendor-shaped: `Gi0/0/0`
  vs `ge-0/0/0` vs `Et1`)

## Addresses are the L1/L2 cross-vendor invariant

The single sharpest statement of the V1N finding:

> Addresses are the L1/L2 cross-vendor invariant. Interface-kind
> shape is not.

A topology engine that wants to compare interfaces across vendors
should not compare by `kind`. It should compare by *what L3 facts are
attached*: which IP addresses, on which VRF, on which sub-interface
of which parent. The interface entry shape is parser-bookkeeping; the
L3 facts are reality.

## Topology key guidance

`InterfaceModel.normalized_name` is shared canonical short-form
vocabulary across vendors. `Et1` exists on both Arista and a
hypothetical IOS device; `Po10` exists on both Cisco and Arista; `Lo0`
exists on Cisco, EOS, and (as `lo0`) Junos. These are not collisions
inside a single device; they are collisions in the cross-vendor
identifier space.

**Future topology / cross-vendor consumers MUST key off `(platform_id,
normalized_name)`, not `normalized_name` alone.** The V1N stage note
flagged this; V1N-A locks it as a binding contract for any future
topology engine.

## Unsupported-but-present visibility rule

Every parser must surface configuration content it does not interpret
as evidence, not silently drop it. Two routes:

- `DeviceModel.unknown_lines[]` — first-class typed evidence with
  `line_number`, `raw`, `context_path`, `reason`. This is the
  default route.
- Existing field-level "notes" (`InterfaceModel.notes`,
  `ServiceModel.notes`) — for content that has a natural attachment
  point but no typed shape at this maturity.

V1N-A tightened this rule in three places:
- Cisco ACL/NAT lines: previously `UnsupportedKeyword`, now
  `OutOfScope` (more accurate; consumer can distinguish "parser
  doesn't know" from "parser knows this is L3+/policy and the
  current maturity doesn't model it").
- Junos `deactivate` / `delete` set-style: previously silently
  dropped, now surfaced as `OutOfScope` evidence.
- EOS `ip virtual-router …` (VARP): previously
  `UnsupportedKeyword`, now `OutOfScope`.

## Parser maintenance rule

In a maintenance stage (V1L-A, V1N-A, future "letter" stages):

- **Prefer documenting/parking a model gap over expanding
  `DeviceModel`.** Cleanup stages are scoped to parser-side improvements;
  model surgery happens in a dedicated, planned stage.
- **Bump per-parser `PARSER_VERSION` if output changes for any
  fixture.** Shared-infra changes that alter output bump every
  affected parser's version. See [`PARSER_VERSIONING.md`](./PARSER_VERSIONING.md).
- **Keep vendor modules separate.** No "while we're here, let's
  unify…" — that's a different stage with a different blast radius.

## Cross-references

- [PARSER_VERSIONING.md](./PARSER_VERSIONING.md)
- [PARSER_COVERAGE_AREAS.md](./PARSER_COVERAGE_AREAS.md)
- [PARSER_COMMAND_CONTRACT.md](./PARSER_COMMAND_CONTRACT.md)
- [CANONICAL_NETWORK_MODEL.md](./CANONICAL_NETWORK_MODEL.md)
- [JUNOS_CONFIG_STYLES.md](./JUNOS_CONFIG_STYLES.md)
- [EOS_VS_IOSXE_DIVERGENCES.md](./EOS_VS_IOSXE_DIVERGENCES.md)
- [INTERFACE_NAMING.md](./INTERFACE_NAMING.md)
- V1N-A stage note: [`../../obsidian/stages/V1N-A-parser-contract-hardening.md`](../../obsidian/stages/V1N-A-parser-contract-hardening.md)
