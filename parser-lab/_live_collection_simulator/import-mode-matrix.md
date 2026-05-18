# Import Mode Matrix

| Mode | Simulator meaning | V1AR behaviour | V1AS consequence |
| --- | --- | --- | --- |
| Merge | Deduplicate fixture-backed evidence deterministically. | Merge by store semantics. | Show dedup-visible edges and stable evidence drilldown. |
| Append | Add fixture-backed evidence without collapsing evidence rows. | Append in order. | Show appended evidence and keep labels / counts honest. |
| Replace | Explicit overwrite mode with a loud warning. | Replace current evidence. | Show the same review surface, but with overwrite warning visible before import. |

The simulator must never silently choose a mode. V1AR remains the authority for how evidence is written.
