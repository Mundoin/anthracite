import type { JSX } from "react";
import { IcoTerminal } from "./icons";

export interface OpsStripProps {
  readonly expanded?: boolean;
}

/**
 * D3T-P1 — Honest bottom ops strip.
 *
 * Slice 1 originally rendered a duplicate "Ops Console" label, a dead
 * "Ctrl+`" terminal-toggle hint, and a non-functional toggle button.
 * The Ops Console identity already lives on the ModeRail foot row, so
 * this strip now shows a single connection-status row and nothing else.
 * No fake telemetry, no dead toggle, no watermark.
 */
export function OpsStrip({ expanded = false }: OpsStripProps): JSX.Element {
  return (
    <div
      className="anth-opsdock"
      role="region"
      aria-label="Operator console status"
      data-expanded={expanded}
    >
      <span className="ops-cell ops-cell--icon">
        <IcoTerminal size={13} />
      </span>
      <span className="ops-cell mono ops-cell--state">
        ops session · not connected
      </span>
      <span className="ops-spacer" />
      <span className="ops-cell ops-cell--meta mono">demo session · synthetic</span>
    </div>
  );
}
