/**
 * V1BQ — Crawl Preview Context Summary (sanitized).
 *
 * Pure derivation from the rich CrawlPreviewSummary into a counts-only +
 * minimal-label shape safe to hoist into App-level WorkbenchContextSummary
 * and consumed by other workbenches (Operate).
 *
 * Hard discipline:
 *   - Counts + small id/timestamp labels only.
 *   - No host strings, no CIDR strings, no per-seed plans, no command labels,
 *     no warning bodies, no markdown.
 *   - Deterministic: same input → same output.
 *   - No I/O, no fetch, no mutation.
 */

import type { CrawlPreviewSummary } from "./crawlPreview";

export interface CrawlPreviewContextSummary {
  readonly frontier_count: number;
  readonly active_seed_count: number;
  readonly blocked_seed_count: number;
  readonly warning_count: number;
  /** Stable id of the most recently built preview; null when no preview built. */
  readonly last_preview_id: string | null;
  /** ISO 8601 timestamp of the most recently built preview; null when no preview built. */
  readonly last_preview_generated_at: string | null;
}

export const EMPTY_CRAWL_PREVIEW_CONTEXT_SUMMARY: CrawlPreviewContextSummary = {
  frontier_count: 0,
  active_seed_count: 0,
  blocked_seed_count: 0,
  warning_count: 0,
  last_preview_id: null,
  last_preview_generated_at: null,
};

export function buildCrawlPreviewContextSummary(
  preview: CrawlPreviewSummary,
): CrawlPreviewContextSummary {
  return {
    frontier_count: preview.frontier.length,
    active_seed_count: preview.active_seed_count,
    blocked_seed_count: preview.blocked_seeds.length,
    warning_count: preview.warnings.length,
    last_preview_id: preview.crawl_preview_id,
    last_preview_generated_at: preview.generated_at,
  };
}
