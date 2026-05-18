# Diagnose Seed Contract — Anthracite V1AW

## Purpose

Surface deterministic operator answers from already-available
parsed/imported data. Answers the single question:

> "What should I inspect first, and why?"

V1AW is pure-frontend rule projection — no engine, no Tauri command,
no live collection, no AI, no fuzzy matching. The same inputs always
yield the same DiagnoseModel.

## Input contracts consumed

| Input | Source | Required |
|---|---|---|
| `readonly DiscoveryDeviceRecord[]` | `discovery.view.records` (V1AF / V1AI / V1AK) | yes |
| `TopologyView | null` | `topology.view` (V1AJ / V1AS) | optional |
| `known_unsupported_platforms?: readonly string[]` | override | optional; default `["cisco-iosxr", "mikrotik-routeros"]` |

The projector reads only fields already exposed by the canonical
DeviceModel + TopologyView. No new wire types. No DeviceModel schema
expansion.

## Output contract

```
DiagnoseModel {
  answers: DiagnoseAnswer[]
  summary: DiagnoseSummary
  is_empty_input: boolean
}

DiagnoseAnswer {
  id: string                          // {category}:{rule}:{key}
  severity: "critical" | "warning" | "info"
  category: DiagnoseCategory
  title: string
  affected_devices: string[]
  why_it_matters: string
  evidence: DiagnoseEvidence[]
  suggested_inspection_target: string
  source_label: string | null         // honest provenance, never invented
}

DiagnoseEvidence { label, value, source }

DiagnoseSummary {
  total_answers
  critical_count
  warning_count
  info_count
  per_category: { category, count }[]
}
```

## Deterministic sort

`answers[]` is sorted by:

1. severity (`critical` < `warning` < `info`)
2. category (`management_access` < `identity` < `interfaces` <
   `topology_evidence` < `platform_support` < `parser_scope`)
3. title (locale compare)
4. id (locale compare)

`summary.per_category[]` is emitted in fixed category order, with
zero-count buckets omitted.

## Supported answer groups (V1AW)

| Category | Rule | Severity | Trigger |
|---|---|---|---|
| `management_access` | telnet enabled | critical | `device.services` contains `kind == "telnet"` |
| `identity` | missing hostname | warning | `device.identity.hostname` is null / trimmed empty |
| `interfaces` | unspecified admin state | info | any interface with `admin_state == "unknown"` |
| `interfaces` | description without addressing | info | any interface with non-empty description AND no `ipv4_addresses` AND no `ipv6_addresses` |
| `platform_support` | unsupported platform | warning | `platform.platform_id` ∈ `known_unsupported_platforms` |
| `parser_scope` | out-of-scope parser evidence | info | any `unknown_lines[]` entry with `reason == "out_of_scope"` |
| `topology_evidence` | rejections present | warning | `evidence_stats` or `projection_stats` carry non-zero rejection counts |
| `topology_evidence` | accepted evidence but no edges | warning | `evidence_stats.accepted > 0` AND `view.edges.length == 0` |
| `topology_evidence` | no adjacency sources connected | info | `adjacency_readiness.fact_source_state == "none_available"` AND `view.nodes.length > 0` |

Per-rule cap: each rule emits at most one answer per device (per
topology view, for topology rules) so the UI never floods. Multiple
affected items are collapsed into the `evidence` and
`affected_devices` arrays.

## Deferred answer groups (vocabulary frozen, runtime not emitting)

Listed in `DIAGNOSE_DEFERRED_GROUPS`:

- `interface_mtu_outliers`
- `vlan_consistency`
- `vrf_route_target_alignment`
- `routing_protocol_neighbor_health`
- `policy_drift`

These require model fields, validator output, or topology comparison
data not yet exposed at the contract boundary. They land as V1AW-b
when the underlying data is reachable without DeviceModel expansion
or rule-pack semantic change.

## Data honesty / source labelling

- Every answer carries `source_label` naming the producing contract
  (`"discovery_inventory"`, `"topology_view"`, etc.). Never invented.
- `affected_devices` uses `identity.hostname` when present, else
  `source_label`, else `record.id`. Never guessed.
- Truncated lists in `evidence.value` flag the omission honestly
  (`"Gi0/0, Gi0/1, … (12 total)"`).
- Empty input renders honest "Import or select a parsed run to
  generate deterministic diagnostic answers." Never fabricated
  cards.
- Clean input (devices present, all rules empty) renders honest "No
  diagnostic answers from current data." Never invented warnings to
  fill space.

## Boundaries

- No engine code. No Tauri command. No new wire types.
- No DeviceModel schema expansion.
- No validator / rule-pack changes (Diagnose Seed does not duplicate
  the validator engine; it answers a different question — "what
  should I look at first" rather than "did this rule fail").
- No live collection, no SSH, no credentials, no polling, no
  scheduler, no background task, no graph renderer.
- No fuzzy matching. No topology invention. No resolver changes.
- No mutation of inputs. The projector is pure.
- Filter / search / persistent state intentionally out of V1AW
  scope. Add them once the answer corpus shape is stable.

## Cross-links

- `src/modes/diagnose/diagnoseTypes.ts`
- `src/modes/diagnose/diagnoseProjection.ts`
- `src/modes/diagnose/DiagnoseMode.tsx`
- `src/modes/diagnose/__tests__/diagnoseProjection.test.ts`
- `src/modes/diagnose/__tests__/DiagnoseMode.test.tsx`
- `obsidian/stages/V1AW-diagnose-seed.md`
- `docs/architecture/FINDINGS_DISPLAY_CONTRACT.md` (separate concern;
  Diagnose Seed does not duplicate the FindingsDisplay surface).
- `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` (V1AS/V1AT/V1AU
  surfaces consumed read-only).
