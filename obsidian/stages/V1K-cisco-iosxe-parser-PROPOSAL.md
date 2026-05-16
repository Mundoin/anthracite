# V1K — Cisco IOS / IOS XE parser: inventory + topology areas (no routing protocols)

**Status:** proposed (architecture-locked, pre-implementation)
**Date:** 2026-05-16
**Anchor at start of stage:** `dce7ebc docs: archive old anthracite architecture sources`
**Predecessor:** V1J-A — Motor Room Architecture Rules
**Successor (recommended):** V1L — Golden fixture corpus expansion + receipt projection

## 1. Why V1K exists

V1H gave Anthracite a deterministic platform vocabulary. V1I gave it a vendor-neutral model. V1J gave it deterministic platform recognition. None of them produce a single populated `DeviceModel`. Stage 2 of the canonical pipeline (`ENGINE_PIPELINE_CONTRACT.md` §2 normalisation) is wired to nothing.

V1K is the first parser. It takes a `cisco-iosxe` config blob and a `PlatformRef`, and produces a populated `DeviceModel` covering inventory (L1) and topology (L2) areas, with `ParseConfidence` and `UnknownConfigLine` honestly filled.

It is also the stage where Anthracite makes four contract decisions that bind every subsequent parser (Junos, EOS, NX-OS, …). Those decisions are §3 of this proposal.

## 2. Scope

### 2.1 In scope (V1K)

**Identity (L1)**
- hostname
- chassis / model (if visible in `version` text)
- serial(s) (if visible)
- mgmt IP(s) (interface marked as mgmt, or explicit `ip default-gateway` context — `mgmt0`, `mgmt-vrf` membership)
- last config change marker (the `! Last configuration change at …` comment)

**Platform (L1)**
- vendor, platform id, OS family, OS version raw + normalized
- detection confidence carried through from the `PlatformRef` input

**Interfaces (L1)**
- name (vendor-native)
- normalized_name (per the normalization table in §3.1)
- kind (physical, sub_interface, loopback, vlan, lag, tunnel, management, virtual)
- admin_state (up if no `shutdown`, down if `shutdown` present, unknown otherwise)
- description
- mtu, speed_mbps, duplex
- l2_mode (`access` / `trunk` / `routed`) — presence only; deep trunk allowed-VLAN range semantics deferred
- access_vlan, native_vlan (literal value, no range expansion)
- allowed_vlans (only when expressed as a simple list `switchport trunk allowed vlan 10,20,30`; range syntax `10-20` deferred)
- vrf binding (`vrf forwarding NAME` / `ip vrf forwarding NAME`)
- parent_interface (for sub-interfaces, e.g. `Gi0/0/0.10` → parent `Gi0/0/0`)
- child_interfaces (populated as inverse of parent links)
- lag_membership (`channel-group N`)
- notes (free text from parser annotations, vendor-specific quirk markers)

**IP addressing (L1)**
- ipv4_addresses[]: primary + secondary, prefix length, vrf binding
- ipv6_addresses[]: global unicast + link-local only; no IPv6 ND, no DHCPv6, no SLAAC tuning

**VLANs (L2)**
- id, name, state
- interfaces[] populated from access-port and trunk-port references (forward links only; topology engine does the inverse later)

**VRFs (L2)**
- name
- route_distinguisher (literal)
- route_targets_import[], route_targets_export[] (literal)
- interfaces[] (forward links from `ip vrf forwarding`)
- address_families[] (literal names: `ipv4-unicast`, `ipv6-unicast` only; `vpnv4` etc. deferred)

**Static routes (L2)**
- prefix (CIDR-normalized; dotted-quad mask normalized to prefix length)
- next_hops[]
- admin_distance, metric, tag, vrf, name

**LAG groups (L2, basic)**
- bundle id (from `channel-group N`)
- mode (active / passive / static — read from `channel-group N mode active|passive|on`)
- members[] (interfaces with matching `channel-group`)
- min-links and hashing mode: deferred

**Services (L1, basic only)**
- SSH: version, idle timeout (literal `ip ssh time-out`)
- SNMP: community names (presence, not security review), location, contact, trap destinations (host only)
- NTP: server list, source interface
- DNS: server list (`ip name-server`), domain list (`ip domain-name`, `ip domain list`)
- Syslog: server list (`logging host`), severity (`logging trap`), source interface, facility

**Pipeline integration**
- Tauri command `parse_device_config(platform_ref, config_text) -> DeviceModel`
- TypeScript wrapper + types (mirrors V1H/V1I/V1J cadence)
- `EvidenceMetadata` populated: source, source_kind, byte_size, line_count, parser_version, registry_version
- `ParseConfidence` populated: parsed_line_count, unknown_line_count, score, observed maturity = L2, warnings
- `UnknownConfigLine` populated with full `context_path` for every line the parser does not understand

### 2.2 Explicitly out of scope, defer to V1L

- Fixture corpus expansion beyond the V1K minimum (3 fixtures)
- UI evidence panel hook
- Cross-fixture diff harness for CI gating across many platforms
- Receipt as a separate artifact from the model (see §3.5 — likely never)

### 2.3 Explicitly out of scope, defer to V1P+ (L3/L4)

- OSPF process structure (`OspfModel`, `OspfArea`)
- IS-IS, EIGRP
- BGP local-AS, neighbours, address-families (`BgpModel`, `BgpNeighborModel`)
- ACLs (`AclModel`)
- NAT (`NatRuleModel`)
- Firewall zones, QoS policies, IPSec/GRE/VPN tunnels
- AAA detail: method lists, server groups (TACACS+/RADIUS), local users, privilege levels
- Route-maps, prefix-lists, community-lists
- Switchport trunk range semantics (`allowed vlan add`, `allowed vlan remove`, range syntax `10-20`)
- MPLS, VXLAN, EVPN, segment-routing

### 2.4 Out of scope, defer to L6 / years-out

- Config rendering / change generation
- Live device pull (Netmiko / Scrapli / NAPALM)
- Any Python sidecar work

## 3. Binding contract decisions

These four decisions land in `docs/architecture/` as part of V1K. They bind every subsequent parser.

### 3.1 Interface name normalization

**Decision.** `InterfaceModel.name` carries vendor-native form exactly as it appeared in config. `InterfaceModel.normalized_name` carries a vendor-neutral short form drawn from a single canonical table.

**Canonical short-form table (V1K baseline, extensible per vendor):**

| Vendor-native (Cisco) | Normalized |
|---|---|
| `GigabitEthernet0/0/0` | `Gi0/0/0` |
| `TenGigabitEthernet1/0/1` | `Te1/0/1` |
| `FortyGigE1/0/1` | `Fo1/0/1` |
| `HundredGigE1/0/1` | `Hu1/0/1` |
| `FastEthernet0/1` | `Fa0/1` |
| `Ethernet0/0` | `Et0/0` |
| `Loopback0` | `Lo0` |
| `Vlan10` | `Vl10` |
| `Port-channel1` | `Po1` |
| `Tunnel0` | `Tu0` |
| `Serial0/0/0` | `Se0/0/0` |
| `Management0` | `Mgmt0` |
| `GigabitEthernet0/0/0.10` (sub) | `Gi0/0/0.10` |

Rules:
- Short form preserves slot/port path verbatim.
- Sub-interface notation `.N` preserved.
- Case: short-form is exactly as in the table (mixed-case, no lowercasing).
- Unknown long-form: store vendor-native in both `name` and `normalized_name`, set a `UnknownReason::UnrecognizedInterfaceForm`, no panic.
- Junos and Arista parsers (V1M/V1N) extend this table with their own native→normalized mappings. The short-form vocabulary is shared.

**Rationale.** Cross-vendor consumers (topology engine, validator, baseline) compare on `normalized_name`. `name` is preserved for evidence auditability and for any future render/change stage.

Lands in: `docs/architecture/INTERFACE_NAMING.md` (new).

### 3.2 Parser version convention

**Decision.** Each parser module carries a monotonic integer version in source: `pub const PARSER_VERSION: u32 = 1;`. The version is written into `EvidenceMetadata.parser_version` (stringified) and into `ParseConfidence` warnings on mismatch scenarios.

Bump policy:
- **Patch-equivalent (no bump):** internal refactor, comment changes, test-only changes, performance changes that preserve output bytes.
- **Bump required:** any change that could produce different `DeviceModel` JSON for any existing fixture. Includes new field population, new unknown_line capture, normalization table extension, signature change.

Bump is enforced by CI: if `cargo test --lib` shows fixture diff and `PARSER_VERSION` was not incremented in the same commit, the build fails.

**Rationale.** Monotonic int is the simplest scheme that supports the "byte-identical output for same input + same parser version + same registry version" rule from `CANONICAL_NETWORK_MODEL.md` §5. Semver is over-engineering at this stage. Per-vendor (not global) because parsers evolve independently per the maturity ladder.

Lands in: `docs/architecture/PARSER_VERSIONING.md` (new).

### 3.3 Parser command shape

**Decision.** Tauri command signature:

```rust
#[tauri::command]
pub fn parse_device_config(
    platform_ref: PlatformRef,
    config_text: String,
) -> Result<DeviceModel, String>
```

TypeScript wrapper:

```typescript
export async function parseDeviceConfig(
  platformRef: PlatformRef,
  configText: string,
): Promise<DeviceModel>
```

Behaviour:
- Caller is responsible for obtaining `PlatformRef`. Typical chain is V1J detection → V1K parse, but the parser does not depend on V1J at runtime.
- If `platform_ref.platform_id` does not match a registered parser, returns `Err("unsupported platform: <id>")`. No panic.
- If `platform_ref.platform_id` is `None` or empty, returns `Err("missing platform id")`.
- If `config_text` is empty or whitespace-only, returns `Ok(DeviceModel)` with empty body, parse_confidence.score = 0.0, warnings = [`empty_input`].
- The parser never reads files, never touches the network. Bytes in, model out.

**Rationale.** Engines composable, not chained. A test harness or fixture runner can construct a `PlatformRef` directly without routing through detection. Matches the V1J pattern of typed input/output, no hidden state.

Lands in: `docs/architecture/PARSER_COMMAND_CONTRACT.md` (new).

### 3.4 Coverage ratio definition

**Decision.** `ParseConfidence` reports coverage against an explicitly enumerated list of in-scope areas per (parser × maturity level).

For V1K (cisco-iosxe at L1/L2), in-scope areas:

```
identity
platform
interfaces
ip_addressing
vlans
vrfs
static_routes
lag_groups
services_ssh
services_snmp
services_ntp
services_dns
services_syslog
```

13 areas. Coverage ratio = (areas with at least one populated entry OR explicitly emitted as `absent` via warning) / 13.

Out-of-scope areas (`acls`, `nat_rules`, `firewall_zones`, `tunnels`, `qos_policies`, `routing_protocols.*`) do not enter the denominator. The parser explicitly marks them as `not_in_scope` via a `ParseConfidence` warning so consumers can distinguish "we didn't try" from "we tried and found nothing."

**Rationale.** Without this, every consumer of `ParseConfidence.score` has to guess what the denominator was, and "coverage" silently changes meaning each time a parser expands. The enumerated list also serves as a contract for V1M/V1N: same L2 maturity = same in-scope areas = comparable scores across vendors.

Lands in: `docs/architecture/PARSER_COVERAGE_AREAS.md` (new), with one section per vendor parser, extended per stage.

### 3.5 Receipt as projection, not parallel artifact

**Decision.** No separate `Receipt` type. `DeviceModel` already carries everything a receipt needs: `EvidenceMetadata` (source, parser_version, registry_version, byte_size, line_count), `ParseConfidence` (counts, score, observed maturity, warnings), `unknown_lines[]` (with full context_path). V1L will build a receipt *projection* — a flat view over `DeviceModel` shaped for UI display — but the truth lives in the model.

**Rationale.** Two artifacts mean two places to drift. The motor-room rules require evidence to live with the model it explains. A projection is a view; a parallel type is duplication.

Lands as a note in: `docs/architecture/CANONICAL_NETWORK_MODEL.md` (updated §Receipts).

## 4. Implementation shape

### 4.1 Module layout

```
src-tauri/src/engines/parsers/
  mod.rs                      ← registers cisco_iosxe, exposes dispatch by platform_id
  context.rs                  ← ParserContext stack (shared across all parsers)
  normalize.rs                ← interface name normalization (shared)
  cisco_iosxe/
    mod.rs                    ← top-level parse entry, PARSER_VERSION constant
    lexer.rs                  ← line-oriented tokenizer + indent/block tracking
    identity.rs               ← hostname, version, chassis, serials
    interfaces.rs             ← interface block parser
    ip_addressing.rs          ← ipv4/ipv6 within interface context
    vlans.rs                  ← vlan database + interface bindings
    vrfs.rs                   ← vrf definition + interface bindings
    static_routes.rs          ← ip route, ipv6 route
    lag.rs                    ← channel-group resolution
    services.rs               ← ssh, snmp, ntp, dns, syslog
    unknown.rs                ← unknown-line emission helpers

src-tauri/src/commands/
  parser.rs                   ← parse_device_config command

src-tauri/tests/fixtures/cisco-iosxe/
  small/
    config.cfg
    expected.json
  near-empty/
    config.cfg
    expected.json
  truncated/
    config.cfg
    expected.json

src/types/parser.ts
src/api/parser.ts
```

### 4.2 Parser internals

**No third-party parser crate.** No `nom`, no `pest`, no regex soup. Boring deterministic line walker with explicit context stack. The detection engine got that right; the parser matches the style.

**ParserContext stack.** Tracks the active config block. Pushed on `interface …`, `router …`, `line …`, `vrf definition …`, `vlan …`, etc. Popped on `!`, on de-indent (IOS uses 1-space indent inside blocks), or on encountering a new top-level command. `UnknownConfigLine.context_path` is the stack joined by `" > "`.

**Three passes:**
1. **Lex pass.** Strip comments after parser-relevant data extraction. Identify block boundaries. Emit a stream of `(line_no, indent, command, args, raw)`.
2. **Section dispatch.** For each block, dispatch to the responsible submodule. Each submodule populates its `DeviceModel` slice. Unknown lines fall through to `unknown_lines[]` with current context_path.
3. **Cross-link pass.** Resolve forward references: interfaces ↔ VLANs, interfaces ↔ VRFs, interfaces ↔ LAG, sub-interface ↔ parent. No new facts; only links between facts already collected.

**Determinism guarantees:**
- No `HashMap` in any output-producing path. `BTreeMap` or `Vec` with explicit sort.
- All `Vec<T>` outputs sorted by a documented key (interfaces by `normalized_name`, vlans by `id`, vrfs by `name`, static_routes by `(prefix, vrf, next_hop)`).
- No timestamps in output.
- No floating-point arithmetic in output beyond `ParseConfidence.score`, which is computed from integer counts and rounded to 4 decimal places.

**Error policy:**
- The parser never panics on malformed input.
- Unrecognised lines → `unknown_lines[]`.
- Structurally broken blocks (e.g. interface block with no name) → emit a `ParseConfidence` warning, drop the block, continue.
- Platform mismatch (e.g. Junos config text passed with `cisco-iosxe` `PlatformRef`) → parser produces a near-empty `DeviceModel` with `unknown_lines[]` densely populated and `ParseConfidence.score` near 0.0. Detection of this scenario is the *caller's* responsibility (V1J), not V1K's.

### 4.3 What V1K does NOT touch

- `vendor_registry.rs` — consumed, not modified.
- `network_model.rs` — consumed, not modified. If a model field is missing, V1K halts and we discuss an addendum stage, not edit the model mid-parser.
- `config_detection.rs` — consumed at the boundary only; parser does not call detection.
- UI components, CSS, visual shell.
- No new cargo or pnpm dependencies.
- No Python sidecar. No live device access.

## 5. Test strategy

### 5.1 Unit tests

Per submodule, small inline `&str` fixtures. Fast.

Required minimums:
- `identity.rs`: hostname present, hostname absent, version present, version absent
- `interfaces.rs`: physical interface, loopback, sub-interface with parent link, VLAN interface, port-channel, interface with description containing special chars, shutdown vs no-shutdown
- `ip_addressing.rs`: primary IPv4, secondary IPv4, IPv4 in VRF, IPv6 global, IPv6 link-local
- `vlans.rs`: vlan with name, vlan without name, vlan in trunk allowed list
- `vrfs.rs`: vrf with RD + RT, vrf with no RT, vrf bound to interface
- `static_routes.rs`: route with dotted-quad mask, route with prefix mask, route with next-hop + admin distance, route in VRF
- `lag.rs`: channel-group active, channel-group passive, channel-group on, port-channel with no members
- `services.rs`: each of SSH/SNMP/NTP/DNS/syslog with at least minimal config

### 5.2 Fixture tests (CI gate)

Three fixtures committed in V1K. Each fixture is `config.cfg` + `expected.json`. Test:
1. Parses the .cfg.
2. Serialises the resulting `DeviceModel` to JSON.
3. Asserts byte-equal to `expected.json` (after both go through `serde_json` round-trip to normalize whitespace).

**Fixture 1: `small/`** — a realistic but compact IOS-XE config (~80 lines): hostname, 4 interfaces (one routed, one access, one trunk, one loopback), 2 VLANs, 1 VRF, 2 static routes, SSH + SNMP + NTP services. Exercises the happy path across all 13 in-scope areas.

**Fixture 2: `near-empty/`** — a config with only `hostname foo` and `end`. Exercises the empty-areas path. Expected: hostname set, all other vectors empty, `ParseConfidence.score` low, observed maturity = L2, warnings include `low_coverage` and `not_in_scope` markers for L3/L4 areas.

**Fixture 3: `truncated/`** — a config that breaks mid-interface block (no `!` terminator, no `end`). Exercises the graceful-degradation path. Expected: partial interface captured, `ParseConfidence.warnings` includes `truncated_input` or equivalent, `unknown_lines[]` contains the trailing partial.

### 5.3 Determinism test

Pick `small/`. Run the parser 10× in a loop. Assert all 10 serialised outputs are byte-identical. Then: serialise → deserialise → reserialise → assert byte-equal to original. This catches `HashMap` iteration order regressions and round-trip drift.

### 5.4 Negative tests

- Empty input → returns `DeviceModel::default()` shell with `empty_input` warning.
- Whitespace-only input → same as empty.
- `platform_ref.platform_id = "juniper-junos"` with IOS config text → returns `Err("unsupported platform: juniper-junos")`. Parser refuses to run on a platform it does not own.
- `platform_ref.platform_id = "cisco-iosxe"` with Junos config text → parser runs but produces near-empty model with dense `unknown_lines[]` and very low score.
- Single garbage line → all in `unknown_lines[]`, no panic.

### 5.5 Coverage discipline

Every `Option<T>` field that V1K claims to populate has at least one fixture exercising the populated path and at least one exercising the absent path. Tracked manually for V1K; codified as a coverage table in V1L.

### 5.6 What V1K does NOT test

- Real-world Cisco config corpus (V1L).
- Fuzzing (post-V1O).
- Property-based tests (post-V1O).
- Cross-vendor consistency (post-V1N when ≥3 parsers exist).
- Performance benchmarks (not in V1 scope).

## 6. Acceptance criteria

V1K is complete when:

1. `cargo check --lib` green.
2. `cargo test --lib` green, with the unit-test minimums in §5.1 and the three fixture tests in §5.2 all passing.
3. `pnpm typecheck` green.
4. `pnpm build` green.
5. `tools/ops-readiness.ps1` reports READY.
6. The four contract decisions in §3 are landed as new docs in `docs/architecture/`.
7. `obsidian/stages/V1K-cisco-iosxe-parser.md` written following the V1H/V1I/V1J template (why, what changed, design rules encoded, what did NOT change, validation, next stage).
8. `obsidian/ANTHRACITE_INDEX.md` updated with V1K row and V1L placeholder.
9. No regression in V1H/V1I/V1J test counts.
10. Parser produces byte-identical output across 10 consecutive runs of the same fixture.

## 7. Risks accepted and mitigations

| Risk | Mitigation |
|---|---|
| Real-world IOS configs will break the parser in ways the 3 fixtures do not catch | V1L corpus expansion is the next stage. V1K's job is correct on the documented scope, honest about unknowns. The `unknown_lines[]` mechanism is the safety net. |
| Interface normalization table will need extension for NX-OS/Arista variants | Table is explicitly extensible per vendor parser. V1M/V1N extend, not rewrite. |
| Parser version bump policy will be argued case-by-case | CI enforcement (fixture diff → bump required) removes the discretion. |
| Coverage area list per parser will grow as maturity advances | Each maturity level (L1, L2, L3, L4) gets its own enumerated area list. Documented in `PARSER_COVERAGE_AREAS.md`. |
| Three fixtures is light | Acknowledged. V1L expansion is the explicit next stage. Three is the minimum to validate the harness, not the corpus. |

## 8. What V1K explicitly does NOT do

For Bujar and Vale to confirm:

- No edits to `network_model.rs`. If a field is missing, V1K halts.
- No edits to `vendor_registry.rs`.
- No edits to `config_detection.rs`.
- No new top-level invoke commands beyond `parse_device_config`.
- No UI work. No CSS. No surface touched.
- No fixture corpus expansion beyond the V1K minimum (3).
- No receipt type. No receipt UI hook.
- No routing protocol parsing (OSPF, BGP, EIGRP, IS-IS).
- No ACL, NAT, QoS, firewall, tunnel, AAA detail parsing.
- No Python. No third-party parser crate. No regex framework.
- No cross-vendor synthesis or normalization beyond the interface name table.
- No performance optimization beyond not-being-pathological.

## 9. Next stage (after V1K)

**V1L — Golden fixture corpus expansion + receipt projection.**

- Expand the cisco-iosxe fixture corpus to ~15 fixtures covering common deployment patterns and edge cases (Catalyst access switch, ISR branch router, ASR-1k aggregation, partial configs, multi-VRF MPLS-CE templates without the MPLS parsing).
- Build a fixture-diff CI harness that runs every fixture and asserts model + serialised-JSON stability.
- Build the receipt projection: a Rust function `project_receipt(&DeviceModel) -> ReceiptView` returning a flat shape for UI consumption. No parallel truth, view only.
- Optional: scaffold UI evidence panel hook (typed invoke API exposed; React consumption can come later in V1O).

V1L is *not* the place to start the second parser. The second parser (V1M Junos) waits until the V1K fixture corpus has shaken out the L1/L2 contract.

## 10. Cross-references

- `../../docs/architecture/VENDOR_ENGINE_PLAN.md`
- `../../docs/architecture/CANONICAL_NETWORK_MODEL.md`
- `../../docs/architecture/VENDOR_PLATFORM_REGISTRY.md`
- `../../docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md`
- `../../docs/architecture/ENGINE_PIPELINE_CONTRACT.md`
- `../../docs/architecture/OLD_ANTHRACITE_ADAPTATION_MAP.md`
- `V1H-vendor-registry-engine.md`
- `V1I-canonical-network-model.md`
- `V1J-config-detection-engine.md`
- `V1J-A-motor-room-architecture-rules.md`
