import type { JSX } from "react";

export type StatusSignal = "ok" | "warn" | "err" | "info" | "idle";

export interface StatusCell {
  readonly id: string;
  readonly label: string;
  readonly signal?: StatusSignal;
}

export interface StatusBarProps {
  readonly left?: readonly StatusCell[];
  readonly right?: readonly StatusCell[];
}

const DEFAULT_LEFT: readonly StatusCell[] = [
  { id: "engine", label: "engines online", signal: "ok" },
];

const DEFAULT_RIGHT: readonly StatusCell[] = [];

/** Persistent 24 px bottom status bar (mono, low contrast). */
export function StatusBar({
  left = DEFAULT_LEFT,
  right = DEFAULT_RIGHT,
}: StatusBarProps): JSX.Element {
  return (
    <div className="anth-statusbar" role="status" aria-live="polite">
      {renderCells(left, "left")}
      <div className="sb-right">{renderCells(right, "right")}</div>
    </div>
  );
}

function renderCells(cells: readonly StatusCell[], side: "left" | "right"): JSX.Element[] {
  const nodes: JSX.Element[] = [];
  cells.forEach((c, i) => {
    if (i > 0) nodes.push(<span key={`${side}-sep-${i}`} className="sb-sep" />);
    nodes.push(
      <span key={`${side}-${c.id}`} className="sb-cell">
        {c.signal !== undefined && <span className={`dot ${c.signal}`} />}
        <span>{c.label}</span>
      </span>,
    );
  });
  return nodes;
}
