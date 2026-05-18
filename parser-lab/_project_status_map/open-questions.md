# Open Questions

## What should V1AU be?

The next step could be a renderer consumer, a live-driver implementation, or a smaller bridge stage. The map should not force a fake choice.

- Graph renderer / canvas consumer of GraphReadyTopologyView
- Live device-contact driver that consults V1AT first
- Keep the next step out of the map until the next product decision is explicit

## Should parser-lab prep corpora appear as first-class swimlanes or only as appendix / quarry material?

The prep trees are valuable, but they are not production stages. Vale needs to know whether to render them as a separate lane or collapse them into annotations.

- Render parser-lab as a dedicated prep-quarry swimlane
- Render parser-lab as an appendix / notes panel only
- Show only the corpus that matters to the current stage and hide the rest

## Should the map emphasise V1AT as the current edge or the repo HEAD prep commit af3908c?

Product current-edge and repository HEAD are not the same thing here: V1AT is the latest landed stage, while the current commit is the Codex prep corpus preserve point.

- Highlight V1AT as current product edge and mention af3908c as prep head
- Highlight af3908c as current repository anchor and annotate V1AT as latest landed product stage
- Show both equally in the header and let the visual tell the difference

## How visible should the halted V1W proposal be?

The halted proposal teaches an important lesson, but the visual may want to show it as a red superseded marker instead of a full-size stage.

- Show V1W as a red halted marker with V1W-R as the superseding stage
- Collapse V1W into a footnote under V1W-R
- Omit V1W from the main map and mention it only in the evidence index

## Should the review surface show only aggregate rejected counters, or should future work retain per-entry rejected evidence?

V1AS currently exposes aggregate rejection counts but does not retain the rejected rows themselves. The map should indicate whether that is intentional finality or a future gap.

- Keep aggregate-only rejection visibility as the current contract
- Plan a future per-entry rejected-evidence retention stage
- Render both: current aggregate honesty now, future retention as a deferred item
