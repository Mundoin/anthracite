# Topology Node Family — contract

Eight glyph families render on the topology map. Each is the **collapsed**
form of the underlying HardwarePrimitive. See sheet **2D-01**.

## Families

| code     | name                | hardware fallback        |
|----------|---------------------|--------------------------|
| ACC-SW   | Access Switch       | 1U fixed switch          |
| DIST-SW  | Distribution Switch | 1U or 2U switch          |
| CORE-RT  | Core Router         | 4U modular chassis       |
| FW       | Firewall            | 2U appliance             |
| EDGE-RT  | Edge / WAN Router   | 2U appliance             |
| SRV · VM | Server / Virtual    | virtual primitive        |
| WAP      | Wireless AP         | compact wireless module  |
| UNK      | Unknown             | generic fallback         |

## Composition rule

```
   ┌─────────── state ring (outer; carries operational state) ─────┐
   │  ┌─────── role silhouette (the family-specific frame) ─────┐  │
   │  │   collapsed faceplate (port band + LEDs + plates)       │  │
   │  └─────────────────────────────────────────────────────────┘  │
   └───────────────────────────────────────────────────────────────┘
            └── meta strip (family code, ports, uplinks, stack)
```

- **State** lives on the outer ring only. Never tint the silhouette.
- **Role** is the silhouette shape — that's what makes the family
  recognisable at 0.20 × zoom.
- **Capability** (port count, uplinks, stack id, AS number) lives in
  the collapsed faceplate and the meta strip.

## State ring rules

| state    | stroke    | dash | extra                              |
|----------|-----------|------|------------------------------------|
| ok       | 3 px      | —    |                                    |
| warn     | 3 px      | —    |                                    |
| err      | 3 px      | —    | "blocked" semantically             |
| deferred | 3 px      | 6/4  | only dashed ring                   |
| critical | 4 px      | —    | + 6 px outer halo at 25 % opacity  |

## Selection model

- **Hover** — lift 2 px, drop-shadow 0 2 6 rgba(14,55,80,0.16).
- **Single-click** — engage cyan focus ring (1.5 px solid) **inside**
  the state ring. State ring stays. Right-docked inspector card appears.
- **Double-click** — trigger 2D → 3D inspection transition (see IXN-01,
  frame 3 → 4). 240 ms ease-in-out.

## Cyan budget on the map

Cyan **only** fires for:
- focus ring on the selected node;
- signal-flow arrows (active link, peer notch);
- AS plate text on edge router;
- live port LEDs;
- inspection plane indicator on firewall.

Cyan **does not** fire for: chrome, vendor labels, role badges,
default reference frames, sheet rules, or background grid.
