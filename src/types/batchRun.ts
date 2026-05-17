/**
 * V1Q BatchRun — frontend-only batch run aggregation types.
 *
 * Composition layer over the existing five engines
 * (splitter, detection, parser, receipt, validator). No new
 * Tauri command, no wire-schema changes — these types live
 * only in the frontend reducer and never cross the IPC
 * boundary.
 *
 * Determinism (binding):
 *   - `devices` MUST be sorted by `slice_id` ascending
 *     always, regardless of completion order.
 *   - `summary` MUST be recomputed from `devices` via
 *     `deriveBatchRunSummary` on every transition.
 *   - No `run_id`, no `created_at`, no `completed_at`.
 *     Same inputs → same artifact bytes.
 *   - Aggregation is pure verbatim sum/count. No
 *     client-side severity recomputation, no
 *     interpretation, no recoloring.
 */

import type { ArchiveEntryRef } from "./archiveIntake";
import type { ConfigDetectionResult } from "./configDetection";
import type { DeviceModel, PlatformRef } from "./networkModel";
import type { ReceiptView } from "./receipt";
import type { ValidationReport } from "./validator";

/** Lifecycle of the batch run as a whole. */
export type BatchRunStatus =
  | "idle"
  | "in_progress"
  | "complete"
  | "complete_with_failures";

/** Per-device pipeline stage. */
export type DeviceStageStatus =
  | "pending"
  | "detecting"
  | "queued"
  | "parsing"
  | "validating"
  | "complete"
  | "failed"
  | "skipped";

export type DeviceStageErrorStage =
  | "detect"
  | "parse"
  | "receipt"
  | "validate";

export interface DeviceStageError {
  readonly stage: DeviceStageErrorStage;
  readonly message: string;
}

export type BatchRunSource =
  | { readonly kind: "paste" }
  | { readonly kind: "file"; readonly filename: string }
  | { readonly kind: "archive"; readonly archive_name: string };

/**
 * Per-slice device entry in the BatchRun.
 *
 * Pre-run, the device exists with stage_status "pending"
 * and only detection populated. Analyse-batch fills in
 * parse, receipt, validation, or fills in stage_error.
 *
 * Manual override is operator truth: if set, it is reused
 * on re-run instead of using detection's best_match.
 */
export interface BatchRunDevice {
  readonly slice_id: string;
  readonly hostname_hint: string | null;
  readonly source_provenance: ArchiveEntryRef | null;
  readonly stage_status: DeviceStageStatus;
  readonly detection_result: ConfigDetectionResult | null;
  readonly selected_platform: PlatformRef | null;
  readonly is_manual_override: boolean;
  readonly device_model: DeviceModel | null;
  readonly receipt: ReceiptView | null;
  readonly validation_report: ValidationReport | null;
  readonly stage_error: DeviceStageError | null;
}

export interface BatchRunSeverityCounts {
  readonly critical: number;
  readonly high: number;
  readonly medium: number;
  readonly low: number;
  readonly info: number;
}

export interface BatchRunSummary {
  readonly total_count: number;
  readonly parsed_count: number;
  readonly failed_count: number;
  readonly skipped_count: number;
  readonly pending_count: number;
  readonly with_findings_count: number;
  readonly clean_count: number;
  readonly severity_counts: BatchRunSeverityCounts;
}

/**
 * Top-level BatchRun artifact, frontend-only.
 *
 * `epoch` is a monotonically increasing counter used by
 * IntakePanel's orchestration useEffect to detect "this is
 * a new run, kick off runBatch". It is deterministic in
 * the sense that the same caller sequence produces the
 * same epoch progression; it is NOT serialised and never
 * crosses IPC. Re-mounting the panel resets to 0.
 */
export interface BatchRun {
  readonly source: BatchRunSource;
  readonly devices: ReadonlyArray<BatchRunDevice>;
  readonly summary: BatchRunSummary;
  readonly status: BatchRunStatus;
  readonly epoch: number;
}
