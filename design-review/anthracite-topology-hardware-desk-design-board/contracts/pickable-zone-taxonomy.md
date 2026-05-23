# Pickable Zone Taxonomy

Every click target in the 3D inspection view is a **PickableZone** with a
`kind` tag. The operator's pointer can only resolve to these — there are
no anonymous mesh hits.

## Zone kinds

| kind     | what it is                          | typical action            |
|----------|-------------------------------------|---------------------------|
| chassis  | the body of the device              | select device · open card |
| port     | a single RJ45 / SFP / QSFP slot     | open port detail callout  |
| bay      | a module bay (populated or empty)   | insert / inspect module   |
| module   | a populated module inside a bay     | open module detail        |
| led      | a single status LED                 | tooltip · history         |
| psu      | a power supply unit                 | open PSU panel            |
| fan      | a fan tray or single fan            | open fan panel            |
| blade    | a single blade in a blade chassis   | open blade detail         |

## Rules

1. **No anonymous geometry is pickable.** If the operator can click it,
   it has a zone.
2. **Decoration is never pickable.** Vendor strip text, dimensional
   ticks, construction lines — all `isPickable = false`.
3. **Zone rectangles do not overlap** within a single primitive. A
   pointer event resolves to exactly one zone.
4. **`kind` is closed.** No new zone kinds without a contract revision.
5. **Hover state** must be consistent across kinds: 1 px cyan outline on
   the zone, no fill change, no lift. The card on the right is the
   payload, not the hover effect.

## Mapping to HardwarePrimitive.zones

Every `HardwarePrimitive.faceplate` field that produces visible geometry
must declare one or more PickableZones. For example:

```ts
faceplate.portRows[0].ports[17]  →  zones += { id: '1u.port.17', kind: 'port',  rect: [...] }
faceplate.ledBank[3]             →  zones += { id: '1u.led.3',  kind: 'led',   rect: [...] }
faceplate.bays[2]                →  zones += { id: '4u.bay.2',  kind: 'bay',   rect: [...] }
```

If a faceplate field has no zone, it is decoration — and must not be
clickable in Babylon.
