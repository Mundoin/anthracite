/**
 * V1AY Topology Graph Panel — Composed Renderer.
 *
 * Orchestrates Surface + Inspector + SourceBadge for use from TopologyMode.
 * Owns selection state. Resets selection when model changes.
 * Computes RenderGraphModel from GraphReadyTopologyView via buildRenderGraph.
 */

import type { JSX } from "react";
import { useMemo, useState, useEffect } from "react";
import { buildRenderGraph } from "./renderGraph";
import type {
  RenderGraphDataSource,
  RenderGraphSelection,
} from "./renderGraph";
import type { GraphReadyTopologyView } from "./topologyReview";
import { TopologyGraphSurface } from "./TopologyGraphSurface";
import { TopologyGraphInspector } from "./TopologyGraphInspector";
import { RenderGraphSourceBadge } from "./RenderGraphSourceBadge";
import "./TopologyGraphPanel.css";

export interface TopologyGraphPanelProps {
  readonly view: GraphReadyTopologyView;
  readonly data_source: RenderGraphDataSource;
}

export function TopologyGraphPanel({
  view,
  data_source,
}: TopologyGraphPanelProps): JSX.Element {
  const [selection, setSelection] = useState<RenderGraphSelection | null>(null);

  // Compute render model
  const model = useMemo(
    () => buildRenderGraph({ view, data_source }),
    [view, data_source],
  );

  // Reset selection when model changes
  useEffect(() => {
    setSelection(null);
  }, [model]);

  return (
    <div className="tg-panel" data-testid="tg-panel">
      <div className="tg-header">
        <h3 className="tg-title">Graph (V1AY)</h3>
        <RenderGraphSourceBadge data_source={data_source} />
      </div>

      <div className="tg-content">
        <div className="tg-surface-container">
          <TopologyGraphSurface
            model={model}
            selection={selection}
            onSelect={setSelection}
          />
        </div>

        <div className="tg-inspector-container">
          <TopologyGraphInspector model={model} selection={selection} />
        </div>
      </div>
    </div>
  );
}
