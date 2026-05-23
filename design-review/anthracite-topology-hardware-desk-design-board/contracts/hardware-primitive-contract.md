# HardwarePrimitive — contract

Canonical type the topology desk emits for every device on the map and every
inspection target in the 3D viewport. Hardware is **parameter-generated**:
the same struct must produce both the 2D collapsed glyph and the 3D
axonometric primitive. Bitmaps are reference/export only — never source.

## Type

```ts
type HardwarePrimitive = {
  /** which procedural family the renderer dispatches to */
  family: '1u' | '2u' | '4u' | 'blade' | 'virtual' | 'module';

  /** rack units; null for virtual + module */
  U: number | null;

  /** outer dimensions in mm (drives axonometric projection) */
  dims: { w: number; h: number; d: number };

  /** front-face parameter program (the "part program") */
  faceplate: Faceplate;

  /** what the operator can click, by stable id (see pickable-zone-taxonomy.md) */
  zones: PickableZone[];

  /** true for VM / k8s pod / logical node — renders dashed */
  virtual: boolean;
};

type Faceplate = {
  vendor:    string;     // e.g. "ANTHRACITE"
  model:     string;     // e.g. "AXS-148-G"
  portRows:  PortRow[];  // RJ45 grids, SFP/QSFP cages
  ledBank?:  Led[];      // SYS · FAN · PSU · MGMT etc.
  bays?:     Bay[];      // module bays for chassis families
  controls?: Control[];  // console, mgmt, USB
};

type PickableZone = {
  id:    string;         // see stable-mesh-id rule
  kind:  'chassis' | 'port' | 'bay' | 'module' | 'led' | 'psu' | 'fan' | 'blade';
  rect:  [number, number, number, number]; // x,y,w,h in faceplate coords
};
```

## Invariants

1. `family` determines the renderer; the *same* HardwarePrimitive must
   render in 2D (collapsed glyph) and 3D (axonometric primitive) with no
   field rewriting.
2. `U === null` ⇔ `family ∈ { 'virtual', 'module' }`.
3. `faceplate.portRows` is the **only** source for port count + layout.
   The 2D glyph collapses it to a port band past 0.45 × zoom.
4. Every `zones[i].id` is stable across reloads, restarts, and rerenders
   (see `babylon-implementation-notes.md` for the ID rule).
5. `virtual: true` forces dashed strokes (2/1.5) on every silhouette
   edge in both 2D and 3D. No solid edges anywhere.

## Non-goals

- No textures, no PBR materials, no normal maps.
- No vendor logos as bitmaps. Vendor strip is type, not an image.
- No exact-physical accuracy. The primitive is an operator schematic,
  not a render.
