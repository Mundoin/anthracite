# VENDOR_ENGINE_PLAN

Anthracite V1G mainline pivot: from visual shell proof to deterministic vendor
intelligence. This document defines the engine buildout sequence, maturity
levels, and recommended stage cadence.

Direction D / Anthracite Master remains the visual source of truth. This plan
governs the motor room: vendor registry, canonical network model, config
detection and parsing, fixtures, validators, and typed APIs.

## Doctrine

- Modes are surfaces. Engines own logic. APIs connect them.
- Rust owns deterministic engines and state. React owns operator surface.
- No LLM in V1 engines. Parsing and validation are deterministic.
- Unknown config lines are first-class evidence, not discarded.
- Every parser produces a receipt: what it understood, what it skipped, why.

## Engine roster

### 1. Vendor Registry Engine
Authoritative list of supported vendor/platform/OS combinations. Owns:
- platform ids, vendor labels, OS family, config style
- priority tier, current parser maturity level
- capability flags (per area of canonical model)

Single source of truth for "what Anthracite claims to support and how well".

### 2. Canonical Network Model
Anthracite's internal vendor-neutral network language. See
[`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md).

Everything downstream — validation, topology, change generation — speaks this
model, not raw vendor config.

### 3. Config Detection Engine
Given a config blob (file, paste, archive), determine:
- vendor + platform + OS family + version (if visible)
- confidence score
- evidence trail (which markers triggered the match)

Detection must run before parsing. Wrong vendor = wrong parser = wrong model.

### 4. Config Parser Engine
Per-platform deterministic parser. Inputs: detected platform + raw config.
Outputs: canonical model fragment + receipt (parsed / skipped / unknown /
confidence). Each parser progresses through maturity levels independently.

### 5. Vendor Capability Matrix
Cross-cut of (platform × canonical model area × maturity level). Drives:
- "what can Anthracite tell me about this device" surface answers
- gap analysis for parser roadmap
- honesty in the UI (no false claims of coverage)

### 6. Golden fixture and evidence system
Per-platform corpus of real config samples + expected canonical model output +
expected receipts. Parsers gate on fixture diff. Fixtures are version-pinned
and immutable; new behavior = new fixture.

### 7. Validation / assessment engine
Reads canonical model. Emits findings: misconfigurations, drift, policy
violations, risks. Operates on the model, never on raw config.

### 8. Render / change-generation engine (later)
Inverse of parser: canonical model + intent diff → vendor-specific config
change. Last in the chain. Requires mature parser + validator coverage.

## Maturity levels

Each parser advances through these per canonical model area:

| Level | Name | Meaning |
|-------|------|---------|
| L0 | identify | Recognize the platform. No model extraction. |
| L1 | inventory | Device identity, interfaces, IPs, basic services. |
| L2 | topology | VLANs, VRFs, LAG, neighbour hints, static routes. |
| L3 | policy | ACLs, NAT, firewall rules, QoS, AAA. |
| L4 | intent inference | Routing protocols (OSPF/IS-IS/BGP/EIGRP), VPN, services consolidated. |
| L5 | validation | Findings, drift, risk surfaced from model. |
| L6 | render / change | Generate vendor config from canonical intent. |

A platform's headline maturity = lowest level fully green across model areas
in scope for that platform's priority tier.

## Recommended stage sequence

| Stage | Scope |
|-------|-------|
| V1H | Vendor Registry Engine — typed registry, capability flags scaffold, invoke API. |
| V1I | Canonical Network Model — Rust types + serde, model traversal API. |
| V1J | Config Detection Engine — deterministic vendor/platform/OS detection + receipt. |
| V1K | Cisco IOS / IOS XE parser at L1/L2 — inventory + topology + receipts. |
| V1L | Golden fixtures + parser receipts surface — fixture harness, receipt schema, UI evidence panel hook. |
| V1M | Junos parser at L1/L2. |
| V1N | Arista EOS parser at L1/L2. |
| V1O | Config Intake surface — operator-facing flow to ingest config, see detection + parse receipt. |

Later stages (V1P+) extend parsers to L3/L4, add validation engine, and
broaden vendor coverage per [`VENDOR_PLATFORM_REGISTRY.md`](./VENDOR_PLATFORM_REGISTRY.md).

## Non-goals for the V1G buildout window

- No render / change generation. L6 is years 2+.
- No LLM in detection or parsing. Heuristics + rules only.
- No multi-vendor topology synthesis until at least 3 parsers at L2.
- No live device polling. Config-blob in, model out. Live ingest is a later mode.

## Cross-references

- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
- [`VENDOR_PLATFORM_REGISTRY.md`](./VENDOR_PLATFORM_REGISTRY.md)
- [`ANTHRACITE_V1_SOURCE_OF_TRUTH.md`](./ANTHRACITE_V1_SOURCE_OF_TRUTH.md)
- [`MODES_AND_ENGINES_MAP.md`](./MODES_AND_ENGINES_MAP.md)
- [`ENGINE_AND_API_BOUNDARIES.md`](./ENGINE_AND_API_BOUNDARIES.md)
- [`BUILD_SEQUENCE.md`](./BUILD_SEQUENCE.md)
