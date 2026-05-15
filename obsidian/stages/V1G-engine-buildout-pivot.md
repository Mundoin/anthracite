# V1G — Engine Buildout Pivot

**Status:** complete (docs-only)
**Date:** 2026-05-16
**Predecessor:** V1F — Anthracite Master shell + Environment Centre port
**Successor (recommended):** V1H — Vendor Registry Engine

## Why V1G exists

V1F landed the Direction D / Anthracite Master visual baseline. The operator
shell is now accepted as the visual source of truth. Continuing to polish UI
is no longer the highest-leverage lane.

The mainline now pivots into the motor room: vendor intelligence, canonical
network model, config detection + parsing, fixtures, validation, typed Rust
APIs. Anthracite's product value lives in deterministic understanding of
network configs across vendors, not in pixels.

V1G is a docs-only pivot. It captures the engine buildout plan, the internal
canonical network language, and the first-pass vendor / platform target list
so future stages have a clear sequence to follow.

## What changed

Documentation only. New / updated:

- `docs/architecture/VENDOR_ENGINE_PLAN.md` — engine roster, L0–L6 maturity
  levels, recommended stage sequence V1H → V1O.
- `docs/architecture/CANONICAL_NETWORK_MODEL.md` — internal vendor-neutral
  network language. First-pass area map covering identity, interfaces, IP,
  VLANs, VRFs, static routes, OSPF, IS-IS, EIGRP, BGP, ACLs, NAT, VPN, QoS,
  LAG, services (SNMP/NTP/DNS/SSH/syslog/AAA), topology hints, risks,
  unknown / unparsed lines, parse confidence. Rule: unknown is first-class
  evidence.
- `docs/architecture/VENDOR_PLATFORM_REGISTRY.md` — first vendor / platform
  list (~20 rows including Cisco family split): IOS / IOS XE, IOS XR, NX-OS,
  Junos, EOS, RouterOS, FortiOS, PAN-OS, VRP, SR OS, AOS-CX, ArubaOS, OS10,
  EXOS, VOSS, Cumulus, VyOS, EdgeOS, UniFi, Gaia. Tiers T1–T3 with initial
  parser target levels.
- `obsidian/ANTHRACITE_INDEX.md` — V1G entry + pivot note.

## What did NOT change

- No runtime code touched. No `src/`, no `src-tauri/`, no `package.json`,
  no Tauri config, no CSS, no React components, no tests.
- No additional Direction D / Anthracite Master frames ported.
- No Rust engines implemented yet — V1G defines direction, V1H starts code.
- No design handoff files modified.
- No new dependencies.

## Doctrine reaffirmed

- Modes are surfaces. Engines own logic. APIs connect them.
- Rust owns deterministic engines + state. React owns operator surface.
- No LLM in V1 engines.
- Unknown config lines are first-class evidence, never dropped.
- Parsers emit receipts. Fixtures gate behavior.

## Next stage

**V1H — Vendor Registry Engine.** Typed registry (Rust) encoding the rows from
`VENDOR_PLATFORM_REGISTRY.md`, capability flag scaffold per canonical model
area, exposed via typed Tauri invoke API. No parsing yet — registry first so
detection (V1J) and parsers (V1K+) have an authoritative platform vocabulary
to bind to.

## Cross-references

- [`../../docs/architecture/VENDOR_ENGINE_PLAN.md`](../../docs/architecture/VENDOR_ENGINE_PLAN.md)
- [`../../docs/architecture/CANONICAL_NETWORK_MODEL.md`](../../docs/architecture/CANONICAL_NETWORK_MODEL.md)
- [`../../docs/architecture/VENDOR_PLATFORM_REGISTRY.md`](../../docs/architecture/VENDOR_PLATFORM_REGISTRY.md)
- [`V1F-anthracite-master-shell-environment-port.md`](./V1F-anthracite-master-shell-environment-port.md)
