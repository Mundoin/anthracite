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
import { HardwareInspectReceiver } from "./inspect/HardwareInspectReceiver";
import type { DiagnoseHandoffPayload } from "./diagnoseHandoff";
import "./TopologyGraphPanel.css";

export interface TopologyGraphPanelProps {
  readonly view: GraphReadyTopologyView;
  readonly data_source: RenderGraphDataSource;
  /** V1BZ — Diagnose handoff seam forwarded into the Blueprint canvas. */
  readonly onOpenDiagnose?: (payload: DiagnoseHandoffPayload) => void;
}

export function TopologyGraphPanel({
  view,
  data_source,
  onOpenDiagnose,
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

  // V1BF — the active Lab Environment renders as a blueprint canvas
  // when no imported evidence is overriding it. Imported / unknown /
  // demo data sources keep the existing V1AY surface intact.
  // V1BH — the Blueprint canvas is wrapped in HardwareInspectReceiver
  // which lazy-loads the Babylon hardware scene on inspect intent.
  // V1CB — imported evidence views are now also routed through the
  // Blueprint canvas. The V1BY source contract carries Source = Imported
  // into the header, V1BX affected focus still works, and V1BZ Diagnose
  // CTA surfaces the handoff. Existing V1AY surface stays available
  // for `demo` / `unknown` sources during transition.
  if (data_source === "simulated" || data_source === "imported") {
    // V1BL-C — Blueprint canvas owns its own header strip (env / scenario
    // / counts / density / provenance). No outer "Topology · Map" title
    // or duplicate source badge here.
    return (
      <div
        className="tg-panel tg-panel--blueprint"
        data-testid="tg-panel"
        data-surface="blueprint"
      >
        <div className="tg-content tg-content--blueprint">
          <HardwareInspectReceiver
            canvasProps={{ view, dataSource: data_source, onOpenDiagnose }}
          />
        </div>
      </div>
    );
  }

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
