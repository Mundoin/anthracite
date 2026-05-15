# V1I — Canonical Network Model

**Status:** complete
**Date:** 2026-05-16
**Predecessor:** V1H — Vendor Registry Engine
**Successor (recommended):** V1J — Config Detection Engine

## Why V1I exists

V1H gave Anthracite a deterministic vocabulary of platforms. V1I gives it a
deterministic vocabulary of *what those platforms actually do*: interfaces,
addressing, VLANs, VRFs, routing, policy, services, topology hints, findings.

Every later piece — detection (V1J), parsers (V1K+), validation, topology
synthesis, change generation — speaks this model. Raw vendor config will
never leak past the parser boundary; the model is the contract.

## What changed

### Rust
- `src-tauri/src/engines/network_model.rs` (new) — full canonical model:
  - Root: `DeviceModel` with `minimal()` constructor.
  - Identity / platform / evidence: `DeviceIdentity`, `PlatformRef`,
    `EvidenceMetadata`, `EvidenceSourceKind`.
  - Interfaces / IP: `InterfaceModel`, `InterfaceKind`,
    `InterfaceAdminState`, `InterfaceOperState`, `DuplexMode`, `L2Mode`,
    `IpAddressModel`, `IpFamily`.
  - L2/L3 containers: `VlanModel`, `VlanState`, `VrfModel`,
    `StaticRouteModel`.
  - Routing: `RoutingProtocolsModel`, `OspfModel`, `OspfArea`, `IsisModel`,
    `IsisLevel`, `EigrpModel`, `BgpModel`, `BgpNeighborModel`.
  - Policy: `AclModel`, `AclRuleModel`, `AclAction`, `AclAttachment`,
    `AclDirection`, `FirewallZoneModel`, `NatRuleModel`, `NatKind`.
  - VPN/QoS/LAG/services: `TunnelModel`, `TunnelKind`, `QosPolicyModel`,
    `LagGroupModel`, `LagMode`, `ServiceModel`, `ServiceKind`.
  - Topology / findings / unknowns / confidence: `TopologyHint`,
    `TopologyHintKind`, `NeighbourModel`, `FindingModel`,
    `FindingSeverity`, `UnknownConfigLine`, `UnknownReason`,
    `ParseConfidence`, `ParserMaturityObserved`.
  - 9 unit tests: minimal construction, unknown-line round-trip,
    parse-confidence counters, dual-stack interface, BGP neighbour,
    VLAN+VRF serde round-trip, finding severity, default+populated
    DeviceModel serde round-trip.
- `src-tauri/src/engines/mod.rs` — registers `network_model` module.

### TypeScript
- `src/types/networkModel.ts` (new) — wire-shape mirror for every Rust
  type listed above. Read-only fields, explicit nullable boundaries, no
  `any`.

### Vault
- `obsidian/stages/V1I-canonical-network-model.md` (this note).
- `obsidian/ANTHRACITE_INDEX.md` — V1I row, V1J placeholder.

## Design rules encoded

1. **Unknown is first-class.** `UnknownConfigLine` carries raw text, line
   number, context path, and a typed `UnknownReason`. Future parsers fill
   these instead of dropping config they don't understand.
2. **Parse confidence is explicit.** `ParseConfidence` tracks
   `parsed_line_count`, `unknown_line_count`, `score`, observed maturity,
   and warnings. Surface consumers can filter by threshold.
3. **Vendor-neutral root.** No Cisco-shaped fields at the top level.
   Vendor-specific data lives in `notes` / `evidence` / `unknown_lines`.
4. **Stable serialisation.** `rename_all = "snake_case"` everywhere; enum
   variants likewise. Renaming a shipped field is forbidden.
5. **Pragmatic first pass.** Enough structure to support Cisco IOS / IOS XE
   L1/L2 parsing next stage, no cathedral. The model will grow with the
   parsers, not ahead of them.

Note on `Eq`: `DeviceModel`, `PlatformRef`, and `ParseConfidence` derive
`PartialEq` only (not `Eq`) because they carry `f32` confidence/score
fields. Float comparison in tests uses exact equality on round-tripped
values, which is sound because serde preserves the bit pattern via JSON
text on these specific values.

## What did NOT change

- No invoke commands — model-only stage. No new `commands/` module, no
  `lib.rs` handler wiring.
- No UI components, no CSS, no visual shell touched.
- No parser logic. No config detection. No validation engine.
- No Python sidecar — no Netmiko / Scrapli / NAPALM, no Python dependency.
- No live device access. No topology synthesis.
- No new cargo or pnpm dependencies (`serde_json` was already present).
- Docs in `docs/architecture/*` untouched.

## Validation

- `cargo check --lib` — green.
- `cargo test --lib` — 32 passed (23 prior + 9 new); 0 failed.
- `pnpm typecheck` — green.
- `pnpm build` — green, 51 modules transformed, built in 328ms.
- `tools/ops-readiness.ps1` — READY.

## Next stage

**V1J — Config Detection Engine.** Given a config blob, determine vendor +
platform + OS family + version with a confidence score and an evidence
trail. Returns a `PlatformRef` keyed against `vendor_registry`. Runs before
any parser; wrong vendor = wrong parser = wrong model.

## Cross-references

- [`../../docs/architecture/CANONICAL_NETWORK_MODEL.md`](../../docs/architecture/CANONICAL_NETWORK_MODEL.md)
- [`../../docs/architecture/VENDOR_ENGINE_PLAN.md`](../../docs/architecture/VENDOR_ENGINE_PLAN.md)
- [`../../docs/architecture/VENDOR_PLATFORM_REGISTRY.md`](../../docs/architecture/VENDOR_PLATFORM_REGISTRY.md)
- [`V1H-vendor-registry-engine.md`](./V1H-vendor-registry-engine.md)
