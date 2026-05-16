# V1J — Config Detection Engine

**Status:** complete
**Date:** 2026-05-16
**Predecessor:** V1I — Canonical Network Model
**Successor (recommended):** V1K — Cisco IOS / IOS XE parser at L1/L2

## Why V1J exists

V1H gave Anthracite a platform vocabulary. V1I gave it a canonical model.
V1J makes both useful: given a raw config blob, deterministically identify
which platform it belongs to so the right parser can be selected.

Detection runs **before** any parser. Wrong vendor = wrong parser = wrong
model. The detection result is keyed against the V1H registry and shaped as
a `PlatformRef` from V1I, so it can flow straight into `DeviceModel.platform`
when parsers come online.

## What changed

### Rust
- `src-tauri/src/engines/config_detection.rs` (new) — full engine:
  - Result types: `ConfigDetectionResult`, `DetectionCandidate`,
    `DetectionEvidence`, `SignatureCategory`, `DetectionWarning`.
  - Internal signature table covering all 17 V1H platforms with weighted
    `StartsWith` / `Contains` / `Equals` patterns split across four
    categories (`generic`, `distinctive`, `header`, `structural`).
  - Entry point: `detect_config_platform(config_text: &str)`.
  - Scoring: per-platform sum of matched weights, deterministic tiebreak
    on distinct signature count then platform id, normalized confidence.
  - Promotion threshold: `MIN_CONFIDENCE_FOR_MATCH = 0.45`. Below that the
    engine returns ranked candidates but no `best_match`.
  - Warnings: `EmptyInput`, `InputTruncated`, `LowConfidence`,
    `Ambiguous` (when runner-up is within 60% of top), `NoSignaturesMatched`.
  - Hard caps: `MAX_LINES_SCANNED = 20_000`, `PREVIEW_MAX_CHARS = 120`,
    evidence vector capped at 256 items to keep results bounded.
  - 17 unit tests covering empty + whitespace input, all major vendor
    samples (IOS/XE, IOS XR, NX-OS, Junos set + brace, EOS, MikroTik,
    FortiOS, Huawei VRP), ambiguous generic input, registry-id integrity,
    evidence trail shape, deterministic output across repeated calls,
    PlatformRef metadata population, and preview clipping.
- `src-tauri/src/engines/mod.rs` — registers `config_detection`.
- `src-tauri/src/commands/config_detection.rs` (new) — Tauri command
  `detect_config_platform(config_text)`.
- `src-tauri/src/commands/mod.rs` — registers module.
- `src-tauri/src/lib.rs` — wires the new command into the invoke handler.

### TypeScript
- `src/types/configDetection.ts` (new) — wire-shape mirror reusing
  `PlatformRef` from `networkModel.ts`. `DetectionWarning` is a tagged
  union matching the Rust serde `tag = "kind"` shape exactly.
- `src/api/configDetection.ts` (new) — typed `detectConfigPlatform`
  wrapper. Tauri v2 auto-converts the `configText` camelCase arg into the
  Rust `config_text` parameter.

### Vault
- `obsidian/stages/V1J-config-detection-engine.md` (this note).
- `obsidian/ANTHRACITE_INDEX.md` — V1J row, V1K placeholder.

## Design rules encoded

1. **Deterministic.** Same bytes in → byte-identical result. Candidate
   sort uses score → distinct-sig-count → platform id, never input order.
2. **Registry-backed.** Every signature's `platform_id` is asserted to
   exist in `vendor_registry::list_platforms()` by a unit test. No drift.
3. **Vendor-neutral shape.** Result reuses `PlatformRef` from V1I so it
   can attach directly to `DeviceModel.platform` later. No bespoke type.
4. **Bounded.** `MAX_LINES_SCANNED` caps cost on huge archives; evidence
   list is capped at 256 entries; preview lines are clipped to 120 chars
   so the result never carries large config slabs.
5. **First-class warnings.** Empty, truncated, ambiguous, low-confidence,
   and no-match cases all surface as typed `DetectionWarning` variants
   instead of out-of-band errors.
6. **No panic on unknown.** Empty / whitespace / unparseable input
   returns a clean low-confidence/no-match result.

## What did NOT change

- No config parsing — detection only returns a `PlatformRef`, not a
  populated `DeviceModel`.
- No UI components, no CSS, no visual shell touched.
- No Python sidecar (no Netmiko / Scrapli / NAPALM, no Python dep).
- No live SSH / SNMP / NETCONF access.
- No new cargo or pnpm dependencies.
- `vendor_registry.rs` and `network_model.rs` consumed but unmodified.
- `docs/architecture/*` untouched.

## Validation

- `cargo check --lib` — green.
- `cargo test --lib` — 49 passed (32 prior + 17 new); 0 failed.
- `pnpm typecheck` — green.
- `pnpm build` — green, 51 modules transformed, built in 333ms.
- `tools/ops-readiness.ps1` — READY.

## Next stage

**V1K — Cisco IOS / IOS XE parser at L1/L2.** Take a detected
`cisco-iosxe` config, produce a populated `DeviceModel` covering inventory
(identity, interfaces, IPs, services) plus topology (VLANs, VRFs, LAG,
static routes, neighbour hints), with `ParseConfidence` and
`UnknownConfigLine` properly populated. Gated by golden fixtures (V1L).

## Cross-references

- [`../../docs/architecture/VENDOR_ENGINE_PLAN.md`](../../docs/architecture/VENDOR_ENGINE_PLAN.md)
- [`../../docs/architecture/VENDOR_PLATFORM_REGISTRY.md`](../../docs/architecture/VENDOR_PLATFORM_REGISTRY.md)
- [`../../docs/architecture/CANONICAL_NETWORK_MODEL.md`](../../docs/architecture/CANONICAL_NETWORK_MODEL.md)
- [`V1H-vendor-registry-engine.md`](./V1H-vendor-registry-engine.md)
- [`V1I-canonical-network-model.md`](./V1I-canonical-network-model.md)
