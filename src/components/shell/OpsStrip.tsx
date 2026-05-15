import type { JSX } from "react";
import { IcoTerminal } from "./icons";

export interface OpsStripProps {
  readonly expanded?: boolean;
  readonly onToggle?: () => void;
}

/**
 * Persistent ops dock strip — 28 px collapsed band above the status bar.
 * Slice 1 ships the collapsed strip only. Expanded terminal lands in a
 * later slice with the xterm.js + pty wiring.
 */
export function OpsStrip({ expanded = false, onToggle }: OpsStripProps): JSX.Element {
  return (
    <div
      className="anth-opsdock"
      role="region"
      aria-label="Operator console strip"
      data-expanded={expanded}
    >
      <span className="ops-cell">
        <IcoTerminal size={13} />
        <span>Ops Console</span>
      </span>
      <span className="ops-sep" />
      <span className="ops-cell mono">idle</span>
      <span className="ops-sep" />
      <span className="ops-cell">no active session</span>

      <span className="ops-spacer" />

      <span className="ops-hint">
        toggle <span className="kbd">Ctrl</span> <span className="kbd">`</span>
      </span>
      <span
        className="anth-tb-icon"
        role="button"
        tabIndex={0}
        aria-label="Toggle ops console"
        onClick={onToggle}
        style={{ width: 22, height: 22 }}
      >
        <IcoTerminal size={13} />
      </span>
    </div>
  );
}
