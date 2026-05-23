# Role → Glyph → Primitive map

The discovery pipeline emits a **role**. The map renderer picks a **glyph**.
The inspection viewport renders a **HardwarePrimitive**. This file is the
canonical mapping between the three layers.

## Mapping

Canonical role → glyph → kit `profileId`. This table is the single
source of truth — the kit's `topology-selection-to-model-map.md`
mirrors it. Changes here propagate to the kit.

| discovered role            | family code | 2D glyph (NodeGlyphs key) | kit `profileId` (default)  | alternates (by form factor)    |
|----------------------------|-------------|---------------------------|----------------------------|---------------------------------|
| access switch              | ACC-SW      | access                    | `access24`                 | `access48`, `leaf32q`           |
| distribution switch        | DIST-SW     | distribution              | `dist2u`                   | —                               |
| core router                | CORE-RT     | core                      | `core4u_rt`                | `core4u_sw` (core switch)       |
| firewall                   | FW          | firewall                  | `fw1u`                     | `fw2u_ha`, `fw_dc`, `fw_branch`, `vfirewall` |
| edge / WAN router          | EDGE-RT     | edge                      | `edge1u`                   | `branch2u`, `wancore2u`, `vrouter` |
| server / VM                | SRV · VM    | server                    | `server1u`                 | `blade10u` (blade chassis)      |
| wireless AP                | WAP         | wap                       | `wap`                      | —                               |
| unknown                    | UNK         | unknown                   | `unk1u`                    | — (no silent fallback)          |

Two kit families have no glyph because they only appear inside another
device's inspection view, never on the map:

| kit `profileId` | role             | where it surfaces                          |
|-----------------|------------------|--------------------------------------------|
| `sfp_module`    | optic module     | DETAIL callout on a port zone              |
| `patch1u`       | passive panel    | rack view (out of v1 scope) — not on map   |

## Rules

1. **Every role MUST resolve.** Unknown roles fall through to the `UNK`
   family → `unknown` glyph → `unk1u` profile. No null glyphs, no blank
   tiles, no silent substitution into another family's profile.
2. **Resolution is deterministic.** Same role + same form factor → same
   glyph + same `profileId`, forever.
3. **The mapping is one-way.** Glyphs do not infer roles. If the
   discovery layer is wrong, fix discovery — do not patch in the renderer.
4. **Virtual flag picks the glass variant.** A virtualised router
   resolves to `vrouter`; a virtualised firewall to `vfirewall`. The
   glyph stays the same (edge / firewall); only the kit profile changes.
5. **No silent fallback to a real device.** If classification fails,
   the resolver returns `unk1u`. Substituting `access24` (or any other
   real profile) for an unknown device is a contract violation — the
   operator must see "UNKNOWN" in the inspection viewport, not a
   plausible-looking access switch.

## Provenance tagging

Every emitted HardwarePrimitive carries a provenance stamp:

```ts
provenance: 'snmp' | 'lldp' | 'cdp' | 'netflow' | 'manual' | 'inferred'
```

The `unknown` glyph displays the provenance in its meta strip
("DISCOVERED · UNCLASSIFIED · scan/arp"). Inferred roles MUST be flagged
visually — dashed border on the glyph, "INFERRED" stencil on the
3D primitive's vendor strip.
