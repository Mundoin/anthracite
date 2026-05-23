# Topology Selection → Model map

When the operator double-clicks a glyph on the 2D topology map, the
Topology Hardware Desk needs to know which 3D model to spin up in the
inspection viewport. This file is the canonical mapping.

## Mapping

| topology glyph (from design board) | role           | model kit `profileId`   |
|------------------------------------|----------------|---------------------------|
| ACC-SW                             | access switch  | access24 · access48        |
| DIST-SW                            | distribution   | dist2u                     |
| CORE-RT (4U modular)               | core router    | core4u_rt                  |
| CORE-RT (4U modular)               | core switch    | core4u_sw                  |
| FW                                 | firewall (1U)  | fw1u                       |
| FW                                 | firewall (2U)  | fw2u_ha · fw_dc            |
| FW                                 | firewall (branch)| fw_branch                |
| FW                                 | firewall (vm)  | vfirewall                  |
| EDGE-RT                            | edge router    | edge1u                     |
| EDGE-RT                            | branch router  | branch2u                   |
| EDGE-RT                            | wan / core     | wancore2u                  |
| EDGE-RT (virtual)                  | virtual router | vrouter                    |
| SRV · VM                           | compute        | server1u                   |
| SRV · VM (blade)                   | blade chassis  | blade10u                   |
| WAP                                | wireless ap    | wap                        |
| (port detail)                      | optic module   | sfp_module                 |
| (passive)                          | patch panel    | patch1u                    |
| UNK                                | unknown        | (fallback) access24        |

## Resolution rules

1. **Glyph → role** is the design board's mapping (see the design board
   package, `role-to-glyph-to-primitive-map.md`).
2. **Role → profile** is decided at discovery time using `form_factor`
   from SNMP / LLDP / CDP and `port_count` from the same source. The
   resolver picks the smallest profile that fits the device's port
   manifest. The resolver implementation is OCC's; this file specifies
   only the allowed mapping target.
3. **Unknown devices** fall back to `access24` so the operator gets
   *something* to inspect even when classification fails. The `unknown`
   glyph still marks the node on the map; the 3D viewport's model is
   the fallback.
4. **Virtual devices** (`HardwarePrimitive.virtual === true`) MUST
   resolve to the `vrouter` / `vfirewall` glass-finish profiles —
   never to a metal chassis, even if the discovered ports match.

## When this map needs to change

- A new device family is introduced in discovery.
- A new profile is added to `hardwareProfiles.ts`.
- The form-factor → port-count → profile resolver in OCC adds a new
  branch.

Any other change is a bug fix, not a map revision.
