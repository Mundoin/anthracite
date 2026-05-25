# V1BT — Fabricator Environment Quality v0

**Date:** 2026-05-25  
**Status:** Complete  
**Type:** Environment generator quality + role hint classification

## Summary

Improved the quality of generated/fabricated network scenarios by introducing scenario-aware hostnames, enriched role hints, and per-scenario site/zone metadata. This enables the Topology mode to classify devices into meaningful families (FW, CORE-RT, EDGE-RT, DIST-SW, ACC-SW, WAP, SRV) based on device role and hostname patterns rather than generic "device" labels.

**No schema migrations, no type changes.** The `LAB_GENERATOR_VERSION` remains unchanged. Existing saved environments load unchanged; only newly generated environments use the improved hostnames and role hints.

## Changes

### A. `src/engines/networkLabEngine.ts`

- **Replaced `DeviceComposition` with `DeviceSlot`:** Now includes `role_label`, optional `site_id`, optional `zone`.
- **Restructured all 5 scenario compositions** to include explicit role labels and site/zone metadata.
- **Added `buildHostname()` helper** and `SCENARIO_PREFIX_MAP` to generate scenario-aware hostnames.
- **Per-role-label counters** track hostname suffix independently, so counter resets per role within a scenario.
- **Fabric-tier tagging** for datacenter spine/leaf devices via `tags` array.

### B. `src/engines/labProjections.ts`

- **Added `deriveRoleHint()` function** that inspects hostname patterns and device class to return richer role hints:
  - `"firewall"` → devices.device_class === "firewall"
  - `"wireless ap"` → access_point
  - `"server"` / `"endpoint"` → server/endpoint/camera
  - `"core router"` / `"edge router"` → router with pattern matching
  - `"core switch"` / `"access switch"` / `"distribution switch"` → switch with pattern matching
  - `"isp edge router"` / `"edge router cpe"` → isp_edge / home_gateway
- Applied to every `FabricatedDevice` via `toFabricatorView()`.

### C. `src/types/fabricator.ts`

- **Changed `role_hint` type** from literal `"device"` to `string` to permit flexible role hints.

### D. Tests

#### `src/engines/__tests__/networkLabEngine.test.ts`
Added two new describe blocks:

1. **V1BT — scenario-aware hostnames:** Assert hostnames for all 5 scenarios
   - micro-lab: `micro-rtr-01`, `micro-rtr-02`, `micro-rtr-03`
   - branch-office: `branch-fw-01`, `branch-edge-01`, `branch-acc-01`, `branch-wap-01`, `branch-wap-02`, etc.
   - campus: `campus-core-01`, `campus-core-02`, `campus-dist-01..04`, `campus-acc-01..12`, etc.
   - datacenter-pod: `dc-spine-01..04`, `dc-leaf-01..16`, `dc-srv-01..08`, `dc-fw-01`, `dc-edge-01`
   - metro-mega-city: `metro-core-01..16`, `metro-pe-01..16`, `metro-agg-01..32`, `metro-cpe-01..16`, `metro-isp-01..08`, `metro-fw-01..08`

2. **V1BT — site/zone metadata:** Assert site_id, zone, and fabric-tier tags
   - All branch devices have `site_id: "branch-001"`
   - Campus has devices in all 5 zones: core, distribution, access, edge, wifi
   - Datacenter spine/leaf carry `"fabric-tier:spine"` / `"fabric-tier:leaf"` tags
   - Metro has devices in 6 site_ids: metro-core, metro-pe, metro-agg, metro-cpe, metro-isp, metro-edge
   - All devices have role_label in tags

#### `src/engines/__tests__/labProjections.test.ts` (new file)
Comprehensive role_hint classification tests:
- Firewall, core/edge/PE routers, spine/leaf/dist/access switches, wireless APs, servers, cameras, CPE, ISP edge
- Structure validation: device/link counts, name/vendor/platform preservation

## New Hostname Patterns

| Scenario | Role Label | Count | Example Range |
|----------|-----------|-------|---|
| micro-lab | rtr | 3 | micro-rtr-01..03 |
| branch-office | fw, edge, acc, cpe, wap, cam, srv | 8 | branch-fw-01, branch-edge-01, branch-wap-01..02, … |
| campus | core, dist, acc, fw, wap, cam | 24 | campus-core-01..02, campus-dist-01..04, campus-acc-01..12, … |
| datacenter-pod | spine, leaf, srv, fw, edge | 32 | dc-spine-01..04, dc-leaf-01..16, dc-srv-01..08, dc-fw-01..02, … |
| metro-mega-city | core, pe, agg, cpe, isp, fw | 96 | metro-core-01..16, metro-pe-01..16, metro-agg-01..32, … |

## Validation Results

```
pnpm typecheck  ✓ 0 errors
pnpm test --run ✓ 2470 tests passed (220 files, 18.90s)
pnpm build      ✓ dist/ generated (5.29s)
```

All existing tests remain green. New V1BT test blocks assert hostnames and metadata across all scenarios.

## Manual Verification

1. **Start app**, navigate to Environments → Create new environment
2. **Select Branch Office** → Create
3. **Open Topology** → Verify hostnames read `branch-fw-01`, `branch-edge-01`, `branch-acc-01`, `branch-wap-01`, `branch-wap-02`, `branch-cpe-01`, `branch-cam-01`, `branch-srv-01`
4. **Verify icon classification:**
   - FW icon on `branch-fw-01` (green)
   - Router icon on `branch-edge-01` (blue)
   - Switch icon on `branch-acc-01` (teal)
   - AP icon on `branch-wap-01` / `branch-wap-02` (teal)
5. **Repeat for Campus, Datacenter, Metro** — each should show role-specific hostnames and correct icon families
6. **Load old environment from disk** (if any saved before this stage) → confirms backward compatibility; loads via `lab_payload` unchanged

## Caveats

- **env-fab-demo remains unchanged:** Hostnames stay as `core-sw-01`, `core-sw-02`, `edge-rtr-01` per spec.
- **Role hints are heuristic:** `deriveRoleHint()` falls back to `"device"` only if all patterns fail; the actual family code is determined by `blueprintIdentity.resolveIdentity()` which has stronger keyword matching. Classification % not measured, but hostname/device_class signals are strong.
- **Fabric-tier tagging is semantic only:** Stored in `tags` array; no schema impact.

## Impact on V1BO–V1BR (topology stages)

No breaking changes. Topology stages work with the enriched role hints transparently:
- `blueprintIdentity` now has stronger signals from derived role hints
- Layout dispatchers benefit from better role classification
- No hardcoded assumptions change

---

**Next:** V1BU — Blueprint Role-Aware Layout or equivalent topology refinement.
