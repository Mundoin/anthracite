/**
 * V1Q — per-row "Stage" cell for BatchSummaryView.
 *
 * Renders the device's stage_status verbatim with a small
 * semantic chip. No counting, no interpretation.
 *
 * device === null → "—" muted (batch not yet analysed).
 */

import type { JSX } from "react";

import type { BatchRunDevice } from "../../../types/batchRun";

export interface BatchRunStageCellProps {
  readonly device: BatchRunDevice | null;
}

export function BatchRunStageCell(props: BatchRunStageCellProps): JSX.Element {
  const { device } = props;
  if (device === null) {
    return <span className="intake-muted">—</span>;
  }
  switch (device.stage_status) {
    case "pending":
    case "detecting":
    case "queued":
      return <span className="intake-muted">pending</span>;
    case "parsing":
      return (
        <span
          className="intake-run-stage intake-run-stage--running"
          aria-label="parsing"
        >
          parsing…
        </span>
      );
    case "validating":
      return (
        <span
          className="intake-run-stage intake-run-stage--running"
          aria-label="validating"
        >
          validating…
        </span>
      );
    case "complete":
      return (
        <span
          className="intake-run-stage intake-run-stage--complete"
          aria-label="complete"
        >
          ok
        </span>
      );
    case "failed":
      return (
        <span
          className="intake-run-stage intake-run-stage--failed"
          title={device.stage_error?.message ?? undefined}
          aria-label={`failed: ${device.stage_error?.stage ?? "unknown"}`}
        >
          failed: {device.stage_error?.stage ?? "unknown"}
        </span>
      );
    case "skipped":
      return (
        <span
          className="intake-run-stage intake-run-stage--skipped"
          title={device.stage_error?.message ?? undefined}
          aria-label="skipped"
        >
          skipped
        </span>
      );
  }
}
