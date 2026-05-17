/**
 * V1Q — pure aggregation helpers for BatchRun.
 *
 * `deriveBatchRunSummary` is the SINGLE source of truth for
 * batch-run counts. React components render verbatim from
 * `batchRun.summary.{field}`; they never recount.
 *
 * Discipline (binding):
 *   - No `Date.now()`, no `Math.random`, no IO, no logging.
 *   - Severity counts are sum-by-`finding.severity`. No
 *     re-classification, no recoloring, no escalation.
 *   - Each finding contributes to exactly one severity bucket.
 *   - Two single-pass loops (one for summary, one for status).
 */

import type {
  BatchRunDevice,
  BatchRunSeverityCounts,
  BatchRunStatus,
  BatchRunSummary,
} from "../../../types/batchRun";

const PENDING_STAGES = new Set<string>([
  "pending",
  "detecting",
  "queued",
  "parsing",
  "validating",
]);

export function deriveBatchRunSummary(
  devices: ReadonlyArray<BatchRunDevice>,
): BatchRunSummary {
  let parsed = 0;
  let failed = 0;
  let skipped = 0;
  let pending = 0;
  let withFindings = 0;
  let clean = 0;
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let info = 0;

  for (const d of devices) {
    if (d.stage_status === "complete") {
      parsed += 1;
      if (d.validation_report && d.validation_report.findings.length > 0) {
        withFindings += 1;
      } else if (d.validation_report) {
        clean += 1;
      }
    } else if (d.stage_status === "failed") {
      failed += 1;
    } else if (d.stage_status === "skipped") {
      skipped += 1;
    } else if (PENDING_STAGES.has(d.stage_status)) {
      pending += 1;
    }

    if (d.validation_report) {
      for (const f of d.validation_report.findings) {
        switch (f.severity) {
          case "critical":
            critical += 1;
            break;
          case "high":
            high += 1;
            break;
          case "medium":
            medium += 1;
            break;
          case "low":
            low += 1;
            break;
          case "info":
            info += 1;
            break;
        }
      }
    }
  }

  const severity_counts: BatchRunSeverityCounts = {
    critical,
    high,
    medium,
    low,
    info,
  };

  return {
    total_count: devices.length,
    parsed_count: parsed,
    failed_count: failed,
    skipped_count: skipped,
    pending_count: pending,
    with_findings_count: withFindings,
    clean_count: clean,
    severity_counts,
  };
}

/**
 * Pure derivation of the run-level status from per-device
 * states.
 *
 * - "idle"              : initial pre-Analyse state. Caller
 *                         passes `hasBeenAnalysed = false`
 *                         until the first BatchRunRequested.
 * - "in_progress"       : any device in a non-terminal
 *                         non-pending state (queued, parsing,
 *                         validating, detecting).
 * - "complete"          : every device terminal (complete or
 *                         skipped), zero failed.
 * - "complete_with_failures":
 *                         every device terminal, at least
 *                         one failed.
 */
export function deriveBatchRunStatus(
  devices: ReadonlyArray<BatchRunDevice>,
  hasBeenAnalysed: boolean,
): BatchRunStatus {
  if (!hasBeenAnalysed) return "idle";

  let anyInFlight = false;
  let anyFailed = false;
  for (const d of devices) {
    if (
      d.stage_status === "queued" ||
      d.stage_status === "parsing" ||
      d.stage_status === "validating" ||
      d.stage_status === "detecting" ||
      d.stage_status === "pending"
    ) {
      anyInFlight = true;
    } else if (d.stage_status === "failed") {
      anyFailed = true;
    }
  }
  if (anyInFlight) return "in_progress";
  return anyFailed ? "complete_with_failures" : "complete";
}
