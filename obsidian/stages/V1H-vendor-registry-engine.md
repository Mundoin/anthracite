# V1H — Vendor Registry Engine

**Status:** complete
**Date:** 2026-05-16
**Predecessor:** V1G — Engine buildout pivot (docs-only)
**Successor (recommended):** V1I — Canonical Network Model

## Why V1H exists

V1G pivoted the mainline into the motor room. V1H is the first real code slice
of that buildout: a deterministic Rust registry of the vendor / platform / OS
targets Anthracite claims to support, exposed through the same engine → typed
command → TS wrapper pattern V1C established.

The registry is the vocabulary every later engine binds to. Detection (V1J)
returns a platform id from this registry. Parsers (V1K+) are keyed by these
ids. Capability matrices are projected from the families declared here.

## What changed

### Rust
- `src-tauri/src/engines/vendor_registry.rs` — new engine. Static, stateless,
  deterministic. Types: `VendorPlatform`, `PriorityTier`, `ParserMaturity`
  (L0–L6), `CapabilityFamily`, `VendorRegistryError`. Free functions:
  `list_platforms()`, `get_platform(id)`. Unit tests cover non-empty,
  uniqueness, required V1G ids, lookup success, controlled error on unknown
  id, capability families for flagship platforms, no empty required fields,
  maturity floor.
- `src-tauri/src/engines/mod.rs` — registers the module.
- `src-tauri/src/commands/vendor_registry.rs` — Tauri commands
  `list_vendor_platforms` and `get_vendor_platform(id)`. Unknown id returns
  `Result::Err(String)`, never panic.
- `src-tauri/src/commands/mod.rs` — registers the module.
- `src-tauri/src/lib.rs` — wires the two commands into the invoke handler.

### TypeScript
- `src/types/vendor.ts` — mirror types for the command boundary.
- `src/api/vendor.ts` — typed `invoke` wrappers `listVendorPlatforms` and
  `getVendorPlatform`.

### Vault
- `obsidian/stages/V1H-vendor-registry-engine.md` (this note).
- `obsidian/ANTHRACITE_INDEX.md` — V1H row.

## Platforms encoded (17)

`cisco-iosxe`, `cisco-iosxr`, `cisco-nxos`, `juniper-junos`, `arista-eos`,
`mikrotik-routeros`, `fortinet-fortios`, `paloalto-panos`, `huawei-vrp`,
`nokia-sros`, `aruba-aoscx`, `dell-os10`, `extreme-exos-voss`,
`nvidia-cumulus`, `vyos`, `ubiquiti-edgeos-unifi`, `checkpoint-gaia`.

Cisco IOS/IOS XE, IOS XR, and NX-OS are split because they are distinct
config realities. Extreme EXOS/VOSS and Ubiquiti EdgeOS/UniFi are bundled
under single ids for V1 scope — narrower coverage, single parser binding
point. Doc registry kept as the operator-facing list; this engine is the
machine-facing one.

## What did NOT change

- No UI components, no CSS, no visual shell.
- No config detection or parsing.
- No Python sidecar — no Netmiko / Scrapli / NAPALM, no Python dependency.
- No live device access, no topology code.
- No new cargo or pnpm dependencies.
- `docs/architecture/VENDOR_PLATFORM_REGISTRY.md` untouched.

## Validation

- `cargo check` — green.
- `cargo test --lib` — green (7 new tests in `engines::vendor_registry::tests`).
- `pnpm typecheck` — green.
- `pnpm build` — green.
- `tools/ops-readiness.ps1` — READY.

## Doctrine reaffirmed

- Modes are surfaces. Engines own logic. APIs connect them.
- Rust owns deterministic engines + state.
- React is only the operator surface.
- No LLM in V1 engines.
- Platform ids are stable. Renaming a shipped id is forbidden.

## Next stage

**V1I — Canonical Network Model.** Rust types + serde for the model areas
defined in `CANONICAL_NETWORK_MODEL.md`. Detection (V1J) and the first
parser (V1K Cisco IOS / IOS XE at L1/L2) follow.

## Cross-references

- [`../../docs/architecture/VENDOR_ENGINE_PLAN.md`](../../docs/architecture/VENDOR_ENGINE_PLAN.md)
- [`../../docs/architecture/VENDOR_PLATFORM_REGISTRY.md`](../../docs/architecture/VENDOR_PLATFORM_REGISTRY.md)
- [`../../docs/architecture/CANONICAL_NETWORK_MODEL.md`](../../docs/architecture/CANONICAL_NETWORK_MODEL.md)
- [`V1G-engine-buildout-pivot.md`](./V1G-engine-buildout-pivot.md)
