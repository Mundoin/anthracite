# Interaction State Machine

The operator's descent from topology overview to a single optic. Five
states; four transitions. See sheet **IXN-01** for the visual storyboard.

## States

```
   ┌───────────┐       ┌───────────┐       ┌────────────┐
   │  MAP      │──[1]─▶│  FOCUSED  │──[2]─▶│ TRANSITION │
   │  (idle)   │       │  (node)   │       │  (2D→3D)   │
   └───────────┘       └─────┬─────┘       └─────┬──────┘
        ▲                    │                   │
        │[5]                 │[1b]               │[3]
        │                    ▼                   ▼
        │             ┌───────────┐       ┌────────────┐
        └─────────────┤  MAP      │       │  ORBIT     │
                      │  (idle)   │       │  (3D node) │
                      └───────────┘       └─────┬──────┘
                                                │[4]
                                                ▼
                                          ┌────────────┐
                                          │  DETAIL    │
                                          │  (port)    │
                                          └────────────┘
```

## Transitions

| #  | trigger                  | from → to            | timing                    |
|----|--------------------------|----------------------|---------------------------|
| 1  | single-click on glyph    | MAP → FOCUSED        | 80 ms ease-out            |
| 1b | click empty canvas       | FOCUSED → MAP        | 120 ms ease-out           |
| 2  | double-click on glyph    | FOCUSED → TRANSITION | 240 ms ease-in-out        |
| 3  | end of transition tween  | TRANSITION → ORBIT   | (sync)                    |
| 4  | click on port / module   | ORBIT → DETAIL       | 100 ms — callout flies in |
| 5  | Esc, "Back to map" btn   | ORBIT|DETAIL → MAP   | 280 ms ease-in            |

## Per-state UI surfaces

### MAP (idle)
- Topology canvas, faint ink grid.
- No inspector. No callouts. Nothing docked.

### FOCUSED (node)
- Selected node grows the cyan focus ring (1.5 px) inside its state ring.
- All other nodes desaturate by 12 % luminance.
- Right-docked **inspector card** slides in (280 px wide). Contains
  hostname, role, model, mgmt IP, uptime, alarms, "Inspect ▸" CTA.
- Connections to/from the selected node draw at 1.5 px cyan; others
  drop to 0.6 px ink-3 at 70 % opacity.

### TRANSITION (2D → 3D)
- 240 ms tween. The collapsed glyph scales up; its silhouette morphs
  into the hero axonometric primitive. The state ring stays anchored.
- Corner reticle marks (cyan, 1.4 px) appear at the four corners of the
  inspection viewport.
- Stencil text: "ENTERING HARDWARE INSPECTION · <model> · <hostname>".

### ORBIT (3D node)
- Babylon scene. Primitive rendered with the same procedural rules as
  the 2D faceplate — no PBR, no textures. Hairlines only.
- Camera orbit compass in top-right (cyan vector on ink ticks).
- All PickableZones live; hover outlines them in 1 px cyan.

### DETAIL (port / module / blade)
- Port callout floats over the 3D scene (260 px, ink frame, 3 px cyan
  top strip).
- Highlight ring at the clicked zone (1.4 px cyan, r = 14 px).
- Leader line connects the ring to the callout.
- Card carries: pid, link state, speed, neighbour, last error, "Open
  in Diagnose ▸" cyan CTA.

## Non-states

- **No modal dialogs.** Anything that would be a modal is a docked card.
- **No tooltips on hover.** Hover signals via outline only.
- **No multi-step wizards** in this surface. Diagnose lives elsewhere.
