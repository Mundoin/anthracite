/**
 * V1Q — per-row "Findings" cell for BatchSummaryView.
 *
 * Renders verbatim severity counts for one device's
 * ValidationReport. Counts derived once per render by
 * filtering report.findings; this is the single per-cell
 * exception to the aggregation-centralised rule because
 * the cell renders ONE device's report (not a sum across
 * devices) and the alternative is plumbing per-device
 * severity counts through the reducer.
 *
 * Render rules:
 *   - device === null OR validation_report === null AND
 *     stage_status !== "complete" → "—" muted
 *   - stage_status === "complete" with zero findings →
 *     "clean" chip
 *   - stage_status === "complete" with findings → inline
 *     monospace severity chips ("H 2 · M 1 · L 0")
 *   - stage_status === "failed" → "—" (the Stage cell
 *     carries the failure visual)
 *
 * Zero-count chips are NOT rendered for completed devices
 * with at least one finding; the "clean" chip handles the
 * all-zero case so we never produce a row with "H 0 · M 0 ·
 * L 0", which would be carnival.
 */

import type { JSX } from "react";

import type { BatchRunDevice } from "../../../types/batchRun";
import type { Severity, ValidationReport } from "../../../types/validator";

export interface BatchRunFindingsCellProps {
  readonly device: BatchRunDevice | null;
}

export function BatchRunFindingsCell(
  props: BatchRunFindingsCellProps,
): JSX.Element {
  const { device } = props;
  if (
    device === null ||
    device.stage_status === "failed" ||
    device.stage_status === "skipped"
  ) {
    return <span className="intake-muted">—</span>;
  }
  if (device.stage_status !== "complete" || device.validation_report === null) {
    return <span className="intake-muted">—</span>;
  }
  if (device.validation_report.findings.length === 0) {
    return (
      <span
        className="intake-run-findings__chip intake-run-findings__chip--clean"
        aria-label="clean"
      >
        clean
      </span>
    );
  }
  const counts = countSeverities(device.validation_report);
  return (
    <span className="intake-run-findings">
      {(
        [
          ["C", counts.critical, "fault"],
          ["H", counts.high, "fault"],
          ["M", counts.medium, "warn"],
          ["L", counts.low, "warn"],
          ["I", counts.info, "neutral"],
        ] as ReadonlyArray<readonly [string, number, "fault" | "warn" | "neutral"]>
      )
        .filter(([, n]) => n > 0)
        .map(([label, n, kind], i, arr) => (
          <span key={label}>
            <span
              className={`intake-run-findings__chip intake-run-findings__chip--${kind}`}
              aria-label={`severity ${label} count`}
            >
              {label} {n}
            </span>
            {i < arr.length - 1 && <span className="intake-muted"> · </span>}
          </span>
        ))}
    </span>
  );
}

function countSeverities(report: ValidationReport): Record<Severity, number> {
  const out: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const f of report.findings) {
    out[f.severity] += 1;
  }
  return out;
}
