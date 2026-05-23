# Density and Zoom Rules

The topology map must remain legible from a wall-display overview
(0.20 × scale, 200+ nodes visible) down to a single-rack zoom (1.2 ×).
This file defines what collapses, when.

## Zoom thresholds

| zoom band     | what renders                                            |
|---------------|---------------------------------------------------------|
| ≥ 1.00 ×      | full anatomy: ports, LEDs, plates, labels, dim ticks    |
| 0.45 – 1.00 × | faceplate ports merge to a single port band             |
| 0.20 – 0.45 × | silhouette + state ring + family code only              |
| < 0.20 ×      | render as a dot at the state-ring colour                |

Transitions are stepwise (no fade animation). The thresholds are
measured against the *node's* scale, not the viewport.

## Density rules

1. **State ring is never collapsed.** Even at <0.20 × it remains the
   ring's hue — that's the only signal a wall display needs.
2. **Family silhouette is never collapsed above 0.20 ×.** It carries
   role; replacing it with an icon would betray the family.
3. **Labels disappear before geometry.** Internal labels (port numbers,
   stack IDs, AS numbers) drop at 0.45 ×; geometry stays.
4. **LEDs flatten to one halo on the state ring at 0.45 ×.** Per-LED
   detail is inspection-only.

## Density-of-information cap

Per glyph, at 1.0 × scale, the operator can resolve at most:
- one role silhouette;
- one state ring;
- one collapsed faceplate band;
- one meta strip (≤ 4 kvp);
- ≤ 4 callout extension lines (drafting board only — not the live map).

If a glyph wants to communicate more, it belongs in the inspector
card or the 3D inspection view. The map is a map, not a dashboard.

## Cyan accent budget per viewport

Cyan must remain rare to remain meaningful. Per viewport, the renderer
should ensure cyan ink does not exceed ~3 % of total non-paper pixels.
If the map naturally pushes past that (e.g. many selected ports during
a multi-select), the renderer SHOULD desaturate older selections — keep
the most recent select at full cyan, older selects at cyan-deep at 60 %.
