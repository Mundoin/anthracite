/**
 * V1Y shared display contract.
 *
 * Binding cross-mode shape for RunSummaryStrip and FindingsPanel
 * consumers. See docs/architecture/FINDINGS_DISPLAY_CONTRACT.md for
 * the full contract.
 */

import type {
  BatchRunStatus,
  BatchRunSummary,
} from "./batchRun";

export const FINDINGS_DISPLAY_CONTRACT_VERSION = 1;

export type FindingsDisplayMode = "author" | "viewer";

export interface FindingsDisplaySummary {
  readonly status: BatchRunStatus;
  readonly summary: BatchRunSummary;
}
