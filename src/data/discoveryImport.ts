import type { BatchRun, BatchRunDevice } from "../types/batchRun";
import type { DiscoveryImportCandidate } from "../types/discovery";

export interface BuildImportCandidatesResult {
  readonly candidates: readonly DiscoveryImportCandidate[];
  readonly skippedCount: number;
  readonly totalDevices: number;
}

/**
 * Build Discovery import candidates from a live BatchRun.
 *
 * Pure function. Output order matches `batchRun.devices` order.
 *
 * Rules:
 *   - Only includes devices with `stage_status === "complete"` AND
 *     `device_model !== null`.
 *   - Skips: failed, pending, queued, parsing, validating, detecting,
 *     skipped, or any device with `device_model === null`.
 *   - Returns empty candidates when `environmentId` is null.
 *   - `candidate_id` = `device.slice_id`.
 *   - `source_kind` = `"intake_import"`.
 *   - `environment_id` = the provided `environmentId`.
 *   - `device_model` = `device.device_model` (the non-null model).
 *   - `confidence` = `device.detection_result?.confidence ?? null`.
 *   - `source_label` = derived from BatchRun source + provenance:
 *       - if `device.source_provenance != null`: use the provenance path
 *         leaf segment (after the last `/`).
 *       - else if `batchRun.source.kind === "file"`: use `source.filename`.
 *       - else if `batchRun.source.kind === "archive"`: use `source.archive_name`.
 *       - else (paste): null.
 *   - `slice_id` = `device.slice_id`.
 *   - `skippedCount` = devices excluded from candidates.
 *   - `totalDevices` = `batchRun.devices.length`.
 */
export function buildDiscoveryImportCandidates(
  batchRun: BatchRun,
  environmentId: string | null,
): BuildImportCandidatesResult {
  // When environmentId is null, return empty candidates without skipping.
  if (environmentId === null) {
    return {
      candidates: [],
      skippedCount: 0,
      totalDevices: batchRun.devices.length,
    };
  }

  const candidates: DiscoveryImportCandidate[] = [];
  let skippedCount = 0;

  for (const device of batchRun.devices) {
    // Only include devices with stage_status === "complete" AND device_model !== null.
    if (device.stage_status !== "complete" || device.device_model === null) {
      skippedCount++;
      continue;
    }

    // Derive source_label from provenance or batch source.
    let sourceLabel: string | null = null;

    if (device.source_provenance !== null) {
      // Use the leaf segment of entry_path after the last "/".
      const path = device.source_provenance.entry_path;
      const lastSlash = path.lastIndexOf("/");
      sourceLabel = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
    } else if (batchRun.source.kind === "file") {
      sourceLabel = batchRun.source.filename;
    } else if (batchRun.source.kind === "archive") {
      sourceLabel = batchRun.source.archive_name;
    }
    // else: paste source with no provenance → null.

    const candidate: DiscoveryImportCandidate = {
      candidate_id: device.slice_id,
      environment_id: environmentId,
      source_kind: "intake_import",
      device_model: device.device_model,
      confidence: device.detection_result?.confidence ?? null,
      source_label: sourceLabel,
      slice_id: device.slice_id,
    };

    candidates.push(candidate);
  }

  return {
    candidates,
    skippedCount,
    totalDevices: batchRun.devices.length,
  };
}
