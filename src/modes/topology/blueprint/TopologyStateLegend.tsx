import { type JSX } from "react";
import type { GraphReadyTopologyView } from "../topologyReview";
import { computeStateCounts, formatStateLabel, STATE_ORDER } from "./topologyStateCounts";
import "./TopologyStateLegend.css";

export interface TopologyStateLegendProps {
  readonly view: GraphReadyTopologyView;
  readonly affectedOnly: boolean;
  readonly onToggleAffectedOnly: (next: boolean) => void;
}

export function TopologyStateLegend({
  view,
  affectedOnly,
  onToggleAffectedOnly,
}: TopologyStateLegendProps): JSX.Element {
  const counts = computeStateCounts(view);
  const hasAffected = counts.affected_devices > 0 || counts.affected_links > 0;

  return (
    <div className="bt-legend" data-testid="bt-legend" aria-label="State legend">
      <div className="bt-legend-section" data-testid="bt-legend-devices">
        <span className="bt-legend-section-label">Devices</span>
        {STATE_ORDER.map((state) => (
          <span
            key={state}
            className="bt-legend-pill"
            data-legend-state={state}
            data-testid={`bt-legend-device-${state}`}
          >
            <span className="bt-legend-swatch" data-state={state} aria-hidden />
            <span className="bt-legend-label">{formatStateLabel(state)}</span>
            <span className="bt-legend-count">{counts.devices[state]}</span>
          </span>
        ))}
      </div>
      <div className="bt-legend-section" data-testid="bt-legend-links">
        <span className="bt-legend-section-label">Links</span>
        {STATE_ORDER.map((state) => (
          <span
            key={state}
            className="bt-legend-pill"
            data-legend-state={state}
            data-testid={`bt-legend-link-${state}`}
          >
            <span className="bt-legend-swatch" data-state={state} aria-hidden />
            <span className="bt-legend-label">{formatStateLabel(state)}</span>
            <span className="bt-legend-count">{counts.links[state]}</span>
          </span>
        ))}
      </div>
      <label
        className="bt-legend-affected"
        data-testid="bt-legend-affected-toggle"
        title={
          hasAffected
            ? `Fade healthy: ${counts.affected_devices} affected devices · ${counts.affected_links} affected links`
            : "No affected items"
        }
      >
        <input
          type="checkbox"
          checked={affectedOnly}
          onChange={(e) => onToggleAffectedOnly(e.currentTarget.checked)}
          data-testid="bt-legend-affected-input"
        />
        <span>Affected only</span>
      </label>
    </div>
  );
}
