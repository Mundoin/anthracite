# optional-glb/

Drop optional `.glb` exports here, named by profile id:

```
access48.glb
core4u_rt.glb
blade10u.glb
```

OCC's loader MAY prefer a matching .glb when present, but the
procedural model in `src/buildHardwareModel.ts` remains the source of
truth for layout, dimensions, and pickable zone IDs. See
`../README.md` for the rationale.

This folder is intentionally empty in v0.
