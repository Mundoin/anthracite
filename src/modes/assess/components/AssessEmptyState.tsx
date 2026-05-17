/**
 * V1W-R — ASSESS empty-state view.
 *
 * Single primary action + one helper line. No statistics, no
 * history, no engine status. Matches A1–A4 of
 * ASSESS_SURFACE_CONTRACT.md.
 */

import type { JSX } from "react";

export interface AssessEmptyStateProps {
  readonly onOpen: () => void;
  readonly disabled?: boolean;
}

export function AssessEmptyState({
  onOpen,
  disabled = false,
}: AssessEmptyStateProps): JSX.Element {
  return (
    <section className="assess-empty" aria-label="No assessment loaded">
      <button
        type="button"
        className="intake-btn intake-btn--primary"
        onClick={onOpen}
        disabled={disabled}
        aria-label="Open assessment file"
      >
        Open assessment file…
      </button>
      <p className="assess-empty__hint intake-muted">
        Open a saved Batch Run export (.json) to view its findings.
      </p>
    </section>
  );
}
