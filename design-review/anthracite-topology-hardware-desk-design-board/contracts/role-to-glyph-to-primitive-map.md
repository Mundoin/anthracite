# Role → Glyph → Primitive map

The discovery pipeline emits a **role**. The map renderer picks a **glyph**.
The inspection viewport renders a **HardwarePrimitive**. This file is the
canonical mapping between the three layers.

## Mapping

| discovered role        | 2D glyph (NodeGlyphs key) | 3D primitive family |
|------------------------|---------------------------|---------------------|
| access switch          | access                    | 1U fixed switch     |
| distribution switch    | distribution              | 1U / 2U switch      |
| core router            | core                      | 4U modular chassis  |
| firewall               | firewall                  | 2U appliance        |
| edge / WAN router      | edge                      | 2U appliance        |
| server / VM            | server                    | virtual primitive   |
| wireless AP            | wap                       | compact wireless    |
| unknown                | unknown                   | generic fallback    |

## Rules

1. **Every role MUST resolve.** Unknown roles fall through to `unknown` →
   generic fallback primitive. No null glyphs, no blank tiles on the map.
2. **Resolution is deterministic.** Same role + same HardwarePrimitive →
   same glyph + same primitive, forever.
3. **The mapping is one-way.** Glyphs do not infer roles. If the
   discovery layer is wrong, fix discovery — do not patch in the renderer.
4. **Virtual flag is orthogonal.** `virtual: true` modifies the *render*
   (dashed strokes) but not the family selection. A virtualised firewall
   is still glyph: firewall, family: 2U appliance, virtual: true.
5. **Hardware fallback is advisory.** The map shows the glyph; the
   inspection view shows the primitive. If hardware data is missing,
   the inspection view renders the fallback family with empty bays /
   greyed faceplate, not a dialog.

## Provenance tagging

Every emitted HardwarePrimitive carries a provenance stamp:

```ts
provenance: 'snmp' | 'lldp' | 'cdp' | 'netflow' | 'manual' | 'inferred'
```

The `unknown` glyph displays the provenance in its meta strip
("DISCOVERED · UNCLASSIFIED · scan/arp"). Inferred roles MUST be flagged
visually — dashed border on the glyph, "INFERRED" stencil on the
3D primitive's vendor strip.
