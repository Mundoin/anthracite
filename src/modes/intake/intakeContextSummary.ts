/**
 * V1BO — Sanitized intake summary projection.
 *
 * Derives WorkbenchIntakeSummary from IntakeState.
 * Counts + small labels only. No raw configs, no command output, no credentials.
 * If a field is unknown, use the EMPTY default — never invent.
 */

import type { IntakeState } from "./intakeTypes";
import type { WorkbenchIntakeSummary, IntakeParseStatus } from "../../state/workbenchContextSummary";

/**
 * Map IntakeState.status to IntakeParseStatus.
 * Only safe transitions are included; unknown states return "idle".
 */
function mapIntakeStatus(status: string): IntakeParseStatus {
  switch (status) {
    case "detected":
      return "detected";
    case "parsing":
      return "parsing";
    case "parsed":
      return "parsed";
    case "error":
      return "failed";
    default:
      return "idle";
  }
}

/**
 * Count parsed devices from batch or single-config flow.
 * - Single config: 1 if device is populated and status is "parsed"
 * - Batch: count of devices with terminal stage_status (not pending, detecting, queued, parsing, validating)
 */
function countParsedDevices(state: IntakeState): number {
  // Single-config flow: if parsed and device exists
  if (state.status === "parsed" && state.device) {
    return 1;
  }

  // Batch flow: count devices with terminal status from batchRun
  if (state.batch?.batchRun) {
    const { devices } = state.batch.batchRun;
    if (devices && devices.length > 0) {
      return devices.filter(
        (d) => d.stage_status === "complete" || d.stage_status === "failed" || d.stage_status === "skipped"
      ).length;
    }
  }

  return 0;
}

/**
 * Count findings from validation report.
 */
function countFindings(state: IntakeState): number {
  if (!state.validationReport?.findings) {
    return 0;
  }
  return state.validationReport.findings.length;
}

/**
 * Build sanitized intake summary from IntakeState.
 * Guarantees:
 * - current_platform_id is the selected platform id or null
 * - parse_status is one of the safe enum values (never raw error strings)
 * - parsed_device_count is a cardinal count (single or batch, never negative)
 * - finding_count is a cardinal count (never negative)
 * - No raw configs, no command output, no credentials leak
 */
export function buildIntakeContextSummary(state: IntakeState): WorkbenchIntakeSummary {
  return {
    current_platform_id: state.selectedPlatform?.platform_id ?? null,
    parse_status: mapIntakeStatus(state.status),
    parsed_device_count: countParsedDevices(state),
    finding_count: countFindings(state),
  };
}
