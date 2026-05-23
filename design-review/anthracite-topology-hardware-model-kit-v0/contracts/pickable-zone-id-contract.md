# Pickable Zone — ID contract

Every clickable mesh in the kit carries an ID following this rule:

```
<model>.<zone>.<n>
```

## Components

| segment | meaning                                                  |
|---------|----------------------------------------------------------|
| model   | profile id from `hardwareProfiles.ts` (`access48`, …)  |
| zone    | a kind from the closed taxonomy below                     |
| n       | zero-based index within that (model, zone) pair          |

## Closed zone taxonomy

```
chassis   port   bay   module   led   psu   fan   blade   screen   label
```

Taxonomy parity with the design board:
`anthracite-topology-hardware-desk-design-board/contracts/pickable-zone-taxonomy.md`.
Both packages share the same 10 kinds; ratified 2026-05-23.

**`screen` zones** carry the live text payload from
`faceplate[*].text`. LCD/OLED appliance screens, supervisor readouts,
fabric panels — all pickable, all surface a DETAIL callout that shows
the static lines plus any live replacement from the topology adapter.

**`label` zones** are reserved for hostname plates and asset
placards — i.e. `faceplate.label` items whose text encodes the
device's identity (`hostname-01`, `asset-12345`, vendor + model). v0
emits these as pickable; click opens an asset card. Decorative vendor
strips, regulatory text, dimensional ticks, and `vendorPlate: true`
items remain `isPickable = false` and have no zone.

## Examples

```
access48.port.17
access48.led.3
firewall2u.fan.0          // (= fw2u_ha.fan.0 in this kit)
core4u_rt.bay.5
core4u_rt.psu.1
vrouter.chassis.0
blade10u.blade.2
sfp_module.port.2000      // SFP port indices start at 1000
sfp_module.port.2000      // QSFP port indices start at 2000
```

## Port-index convention

To keep RJ45, SFP, and QSFP zones distinguishable within one model,
their indices live in separate ranges:

- **RJ45 (portGrid):** 0 … N − 1
- **SFP (sfpRow):**     1000 … 1000 + N − 1
- **QSFP (qsfpRow):**   2000 … 2000 + N − 1

This stays inside the `<model>.port.<n>` rule (one zone kind for all
port types) while remaining unambiguous when OCC parses the index.

## API

`src/pickableZones.ts` exposes three functions on
`window.AnthraciteZones`:

```ts
meshId(modelId, kind, n)        // build an ID
tagZone(mesh, modelId, kind, n) // stamp a mesh as pickable + tagged
readZone(mesh)                  // read back the ZoneTag from metadata
parseMeshId(id)                 // parse an ID string back to a ZoneTag
```

## Stability guarantees

1. **IDs are stable** across reloads, hot reloads, and Tauri window
   recreations. OCC may persist them as event keys, undo-stack keys,
   selection-restore keys, etc.
2. **Indices are dense.** Within a (model, zone) pair, indices run
   contiguously from the lowest value upward — no holes.
3. **Renaming is a breaking change.** The model id, the zone kind, and
   the index ordering MUST NOT change between releases without a
   contract revision.
