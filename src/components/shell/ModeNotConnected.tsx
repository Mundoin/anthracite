import type { JSX } from "react";
import type { ModeId } from "./ModeRail";
import { DataSourceTag } from "./DataSourceTag";
import "./ModeNotConnected.css";

export interface ModeNotConnectedProps {
  readonly modeId: ModeId;
  readonly modeLabel: string;
  readonly engineName: string;
  readonly plannedStage?: string;
}

export function ModeNotConnected({
  modeLabel,
  engineName,
  plannedStage,
}: ModeNotConnectedProps): JSX.Element {
  return (
    <div className="mode-not-connected">
      <h2 className="mnc-title">{modeLabel.toUpperCase()}</h2>
      <div className="mnc-engine">
        <span className="mnc-name">{engineName}</span>
        {" — "}
        <span className="mnc-status">not connected</span>
        <DataSourceTag state="not_connected" />
      </div>
      {plannedStage != null && (
        <div className="mnc-planned">Planned: {plannedStage}</div>
      )}
    </div>
  );
}
