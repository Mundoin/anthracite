# models/

This kit ships **no .glb files** by design.

Every model in the kit is **parameter-generated** at runtime by
`src/buildHardwareModel.ts` from the data in `src/hardwareProfiles.ts`.
The same factory call produces a chassis, faceplate, ports, LEDs,
screens, bays, blades, PSUs, and fans — at exact rack-mountable
dimensions in millimetres — with stable mesh IDs.

## Why no static models?

1. **Hardware varies continuously** — port counts, bay populations,
   SFP cage layouts. Hand-modelling each variant in Blender would
   produce dozens of stale .glb files within a year.
2. **Pickable zones must be stable.** A re-export of a Blender model
   can re-name meshes silently; the parameter pipeline guarantees IDs
   forever.
3. **The aesthetic is drafting-deliberate.** A photo-real .glb pushes
   the operator toward "looking at the hardware" instead of "operating
   the topology." Procedural primitives keep the language consistent
   across 2D and 3D.

## When .glb makes sense

Single one-off devices that don't fit the procedural taxonomy —
specialty optical equipment, custom power infrastructure, vendor demo
units. Drop them in `optional-glb/` and import via Babylon's
`SceneLoader.ImportMesh`.

The kit's runtime never requires a .glb. OCC may add a fallback path
that *prefers* a .glb when one is present for a given profile id,
but the procedural model MUST remain the source of truth for layout
and pickable zones.
