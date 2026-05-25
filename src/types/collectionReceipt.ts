/**
 * V1CD — Collection Receipt Model.
 *
 * Typed proof of one import or (future) live collection run. Records
 * what was attempted, what method was used, what evidence was
 * accepted/rejected/failed, when it happened, and how confident /
 * fresh the result is.
 *
 * Doctrine:
 *   - Source kinds align with the V1BY TopologySourceInfo contract so
 *     a receipt can plug straight into the topology source pipeline.
 *   - Receipts are pure data. They never execute collection.
 *   - V1CD validator rejects impossible / inconsistent receipts so the
 *     trust layer cannot be bypassed by malformed input.
 *
 * Out of scope at V1CD:
 *   - Live runner (V1CE/V1CF).
 *   - Evidence drilldown UI (V1CI).
 *   - Diagnose explanation engine.
 *   - Receipt persistence beyond the v0 in-memory catalogue.
 */

import type {
  CollectionScopeFact,
  CollectionTargetAccessMethod,
} from "./collectionTarget";

/** Aligned with V1BY TopologySourceKind, plus "manual" for ad-hoc entry. */
export type CollectionReceiptSourceKind =
  | "fabricated"
  | "demo"
  | "imported"
  | "live"
  | "manual"
  | "unknown";

export type CollectionReceiptFreshness = "static" | "fresh" | "stale" | "unknown";

export type CollectionEvidenceStatus = "accepted" | "rejected" | "failed";

export interface CollectionEvidenceEntry {
  readonly id: string;
  readonly fact: CollectionScopeFact;
  readonly status: CollectionEvidenceStatus;
  /** Source label or reference id (e.g. "lldp-paste-1", "snmp-walk@edge-01"). */
  readonly source: string | null;
  /** [0, 1] confidence band. `null` when the receipt cannot assert one. */
  readonly confidence: number | null;
  /** ISO timestamp when the entry was observed; falls back to receipt-level value. */
  readonly observed_at: string | null;
  /** Short reason/message. Required for non-accepted statuses. */
  readonly message: string | null;
}

export interface CollectionReceiptCounts {
  readonly attempted: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly failed: number;
}

export interface CollectionReceipt {
  readonly id: string;
  /** Optional link back to V1CC CollectionTarget.id. */
  readonly target_id: string | null;
  /** Optional grouping id when multiple receipts come from one run. */
  readonly run_id: string | null;
  readonly source_kind: CollectionReceiptSourceKind;
  readonly method: CollectionTargetAccessMethod;
  readonly scope_attempted: readonly CollectionScopeFact[];
  readonly started_at: string;
  readonly finished_at: string;
  /** When the underlying evidence was observed. Optional for imported/manual. */
  readonly observed_at: string | null;
  /** When the receipt was imported into Anthracite. */
  readonly imported_at: string | null;
  readonly freshness: CollectionReceiptFreshness;
  readonly counts: CollectionReceiptCounts;
  readonly evidence: readonly CollectionEvidenceEntry[];
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  /** Free-form note for the operator. */
  readonly note: string | null;
}

export interface CollectionReceiptValidationIssue {
  readonly field: string;
  readonly code:
    | "empty"
    | "negative_count"
    | "count_mismatch"
    | "missing_message"
    | "invalid_confidence"
    | "invalid_time_window"
    | "live_without_target"
    | "live_without_observed_at"
    | "unknown_method"
    | "unknown_scope_fact"
    | "duplicate_evidence_id";
  readonly message: string;
}

export interface CollectionReceiptValidationResult {
  readonly ok: boolean;
  readonly issues: readonly CollectionReceiptValidationIssue[];
}

const VALID_METHODS = new Set<CollectionTargetAccessMethod>([
  "ssh",
  "snmp",
  "api",
  "import",
  "manual",
]);
const VALID_SCOPE = new Set<CollectionScopeFact>([
  "inventory",
  "topology_neighbors",
  "interface_summary",
  "version_facts",
  "config_read",
]);

export interface BuildCollectionReceiptInput {
  readonly id: string;
  readonly target_id?: string | null;
  readonly run_id?: string | null;
  readonly source_kind: CollectionReceiptSourceKind;
  readonly method: CollectionTargetAccessMethod;
  readonly scope_attempted?: readonly CollectionScopeFact[];
  readonly started_at: string;
  readonly finished_at?: string;
  readonly observed_at?: string | null;
  readonly imported_at?: string | null;
  readonly freshness?: CollectionReceiptFreshness;
  readonly evidence?: readonly CollectionEvidenceEntry[];
  readonly warnings?: readonly string[];
  readonly errors?: readonly string[];
  readonly note?: string | null;
}

/**
 * Deterministic builder. Counts are derived from `evidence[]` so the
 * receipt cannot ship inconsistent totals. Freshness defaults to
 * "fresh" when observed_at is provided, otherwise "unknown" (matches
 * V1BY TopologySourceInfo defaults).
 */
export function buildCollectionReceipt(
  input: BuildCollectionReceiptInput,
): CollectionReceipt {
  const evidence = input.evidence ?? [];
  const counts: CollectionReceiptCounts = {
    attempted: evidence.length,
    accepted: evidence.filter((e) => e.status === "accepted").length,
    rejected: evidence.filter((e) => e.status === "rejected").length,
    failed: evidence.filter((e) => e.status === "failed").length,
  };
  return {
    id: input.id,
    target_id: input.target_id ?? null,
    run_id: input.run_id ?? null,
    source_kind: input.source_kind,
    method: input.method,
    scope_attempted: input.scope_attempted ?? [],
    started_at: input.started_at,
    finished_at: input.finished_at ?? input.started_at,
    observed_at: input.observed_at ?? null,
    imported_at: input.imported_at ?? null,
    freshness:
      input.freshness ?? (input.observed_at ? "fresh" : "unknown"),
    counts,
    evidence,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
    note: input.note ?? null,
  };
}

/**
 * Pure validator. Returns `{ ok, issues[] }`. Caller decides surface.
 * Catches: empty id, negative counts, count mismatch with evidence[],
 * missing message on rejected/failed entries, invalid confidence,
 * inverted time window, unknown method/scope, live receipt without
 * target_id or observed_at, duplicate evidence ids.
 */
export function validateCollectionReceipt(
  r: CollectionReceipt,
): CollectionReceiptValidationResult {
  const issues: CollectionReceiptValidationIssue[] = [];

  if (!r.id.trim()) issues.push({ field: "id", code: "empty", message: "Receipt id is empty." });

  if (!VALID_METHODS.has(r.method)) {
    issues.push({ field: "method", code: "unknown_method", message: `Unknown method: ${r.method}` });
  }
  for (const s of r.scope_attempted) {
    if (!VALID_SCOPE.has(s)) {
      issues.push({ field: "scope_attempted", code: "unknown_scope_fact", message: `Unknown scope fact: ${s}` });
    }
  }

  const c = r.counts;
  for (const [k, v] of [
    ["attempted", c.attempted],
    ["accepted", c.accepted],
    ["rejected", c.rejected],
    ["failed", c.failed],
  ] as const) {
    if (!Number.isInteger(v) || v < 0) {
      issues.push({
        field: `counts.${k}`,
        code: "negative_count",
        message: `counts.${k} must be a non-negative integer.`,
      });
    }
  }
  const sumStatus = c.accepted + c.rejected + c.failed;
  if (sumStatus > c.attempted) {
    issues.push({
      field: "counts",
      code: "count_mismatch",
      message: "accepted + rejected + failed must not exceed attempted.",
    });
  }
  if (c.attempted !== r.evidence.length) {
    issues.push({
      field: "counts.attempted",
      code: "count_mismatch",
      message: "counts.attempted must equal evidence[].length.",
    });
  }

  // per-entry checks
  const seenIds = new Set<string>();
  for (const e of r.evidence) {
    if (seenIds.has(e.id)) {
      issues.push({
        field: `evidence[${e.id}]`,
        code: "duplicate_evidence_id",
        message: `Duplicate evidence id: ${e.id}`,
      });
    } else {
      seenIds.add(e.id);
    }
    if ((e.status === "rejected" || e.status === "failed") && !e.message?.trim()) {
      issues.push({
        field: `evidence[${e.id}].message`,
        code: "missing_message",
        message: "Rejected/failed evidence entries must carry a message.",
      });
    }
    if (e.confidence !== null) {
      if (!Number.isFinite(e.confidence) || e.confidence < 0 || e.confidence > 1) {
        issues.push({
          field: `evidence[${e.id}].confidence`,
          code: "invalid_confidence",
          message: "confidence must be a finite number in [0, 1] or null.",
        });
      }
    }
  }

  // time window
  if (r.finished_at < r.started_at) {
    issues.push({
      field: "finished_at",
      code: "invalid_time_window",
      message: "finished_at must be >= started_at.",
    });
  }

  // live-specific constraints
  if (r.source_kind === "live") {
    if (!r.target_id) {
      issues.push({
        field: "target_id",
        code: "live_without_target",
        message: "Live receipts must reference a target_id.",
      });
    }
    if (!r.observed_at) {
      issues.push({
        field: "observed_at",
        code: "live_without_observed_at",
        message: "Live receipts must carry observed_at.",
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

export function isSafeReceipt(r: CollectionReceipt): boolean {
  return validateCollectionReceipt(r).ok;
}
