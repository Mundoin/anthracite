/**
 * V1AY Render Graph Source Badge — Data Source Label.
 *
 * Displays the data source (demo, fixture, imported, simulated, unknown)
 * with a visual hint (color + label).
 */

import type { JSX } from "react";
import type { RenderGraphDataSource } from "./renderGraph";

export interface RenderGraphSourceBadgeProps {
  readonly data_source: RenderGraphDataSource;
}

function getSourceColor(source: RenderGraphDataSource): string {
  switch (source) {
    case "demo":
      return "#666666"; // gray
    case "fixture":
      return "#0088ff"; // blue
    case "imported":
      return "#00cc00"; // green
    case "simulated":
      return "#ffaa00"; // orange
    case "unknown":
      return "#999999"; // light gray
  }
}

function getSourceLabel(source: RenderGraphDataSource): string {
  switch (source) {
    case "demo":
      return "Demo";
    case "fixture":
      return "Fixture";
    case "imported":
      return "Imported";
    case "simulated":
      return "Simulated";
    case "unknown":
      return "Unknown";
  }
}

export function RenderGraphSourceBadge({
  data_source,
}: RenderGraphSourceBadgeProps): JSX.Element {
  const color = getSourceColor(data_source);
  const label = getSourceLabel(data_source);

  return (
    <span
      className="tg-source-badge"
      data-testid="tg-source-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 8px",
        background: "rgba(0, 0, 0, 0.3)",
        border: `1px solid ${color}`,
        borderRadius: "4px",
        fontSize: "12px",
        color: color,
        fontWeight: "500",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          background: color,
          borderRadius: "50%",
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}
