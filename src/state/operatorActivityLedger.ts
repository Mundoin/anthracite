/**
 * V1BV — Operator Activity Ledger.
 *
 * Append-only in-memory ledger of safe, sanitized operator activity events
 * across workbenches. Pure projection: a deterministic summary is derived
 * from the event list.
 *
 * Hard discipline:
 *   - Counts, short labels, short reason codes ONLY.
 *   - No raw configs, no raw evidence payloads, no command output, no
 *     markdown bodies, no credentials, no secrets, no evidence_set_id,
 *     no raw error messages, no device credentials.
 *   - Deterministic: same prior + event → same ledger.
 *   - No I/O, no fetch, no mutation of inputs.
 *   - source_label is a small token (typically environment_id or platform
 *     id) — never a host string, payload, or secret.
 *   - summary_label is a short fixed-form caption derived from kind/status
 *     + counts; never raw operator content.
 *   - Events are append-only. Order is preserved.
 */

export type OperatorActivityWorkbench =
  | "discovery"
  | "topology"
  | "intake"
  | "operate"
  | "assess"
  | "diagnose"
  | "build"
  | "hierarchy";

export type OperatorActivityEventKind =
  | "seed_plan_generated"
  | "crawl_preview_generated"
  | "evidence_import_accepted"
  | "evidence_import_no_mutation"
  | "evidence_import_rejected"
  | "evidence_cleared"
  | "intake_parse_completed"
  | "assess_readiness_generated";

export type OperatorActivityStatus =
  | "info"
  | "accepted"
  | "rejected"
  | "no_mutation"
  | "blocked";

export interface OperatorActivityCounts {
  readonly seed_count?: number;
  readonly frontier_count?: number;
  readonly accepted_evidence_count?: number;
  readonly rejected_evidence_count?: number;
  readonly parsed_device_count?: number;
  readonly finding_count?: number;
}

export interface OperatorActivityEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly workbench: OperatorActivityWorkbench;
  readonly kind: OperatorActivityEventKind;
  readonly status: OperatorActivityStatus;
  readonly source_label: string | null;
  readonly summary_label: string;
  readonly counts: OperatorActivityCounts;
  readonly reason_code: string | null;
}

export interface OperatorActivityPerWorkbenchCounts {
  readonly discovery: number;
  readonly topology: number;
  readonly intake: number;
  readonly operate: number;
  readonly assess: number;
  readonly diagnose: number;
  readonly build: number;
  readonly hierarchy: number;
}

export interface OperatorActivityLedger {
  readonly events: readonly OperatorActivityEvent[];
  readonly total_count: number;
  readonly last_event_at: string | null;
  readonly last_event_kind: OperatorActivityEventKind | null;
  readonly per_workbench_counts: OperatorActivityPerWorkbenchCounts;
  readonly accepted_count: number;
  readonly rejected_count: number;
  readonly blocked_count: number;
}

const EMPTY_PER_WORKBENCH_COUNTS: OperatorActivityPerWorkbenchCounts = {
  discovery: 0,
  topology: 0,
  intake: 0,
  operate: 0,
  assess: 0,
  diagnose: 0,
  build: 0,
  hierarchy: 0,
};

export const EMPTY_OPERATOR_ACTIVITY_LEDGER: OperatorActivityLedger = {
  events: [],
  total_count: 0,
  last_event_at: null,
  last_event_kind: null,
  per_workbench_counts: EMPTY_PER_WORKBENCH_COUNTS,
  accepted_count: 0,
  rejected_count: 0,
  blocked_count: 0,
};

/**
 * Pure append. Returns a new ledger with the event appended and
 * derived counts re-projected. Does not mutate prior.
 */
export function appendOperatorActivityEvent(
  prior: OperatorActivityLedger,
  event: OperatorActivityEvent,
): OperatorActivityLedger {
  const events = [...prior.events, event];
  const per: OperatorActivityPerWorkbenchCounts = {
    ...prior.per_workbench_counts,
    [event.workbench]: prior.per_workbench_counts[event.workbench] + 1,
  };
  const acceptedDelta = event.status === "accepted" ? 1 : 0;
  const rejectedDelta = event.status === "rejected" ? 1 : 0;
  const blockedDelta = event.status === "blocked" ? 1 : 0;
  return {
    events,
    total_count: prior.total_count + 1,
    last_event_at: event.timestamp,
    last_event_kind: event.kind,
    per_workbench_counts: per,
    accepted_count: prior.accepted_count + acceptedDelta,
    rejected_count: prior.rejected_count + rejectedDelta,
    blocked_count: prior.blocked_count + blockedDelta,
  };
}

/**
 * Deterministic id factory. Uses monotonic sequence + short kind token so
 * tests can assert ordering without a clock. Callers can override with a
 * UUID or random id in product code if desired.
 */
export function makeOperatorActivityEventId(
  kind: OperatorActivityEventKind,
  sequence: number,
): string {
  return `oa-${sequence}-${kind}`;
}

/**
 * Short, fixed-form caption builder. Never echoes raw user content; only
 * mixes kind/status/counts into a stable string. Caller may pass a
 * pre-sanitized small label suffix (e.g. environment_id).
 */
export function buildOperatorActivitySummaryLabel(
  kind: OperatorActivityEventKind,
  status: OperatorActivityStatus,
  counts: OperatorActivityCounts,
): string {
  switch (kind) {
    case "seed_plan_generated":
      return `seed plan generated (${counts.seed_count ?? 0} seeds)`;
    case "crawl_preview_generated":
      return `crawl preview generated (${counts.frontier_count ?? 0} frontier)`;
    case "evidence_import_accepted":
      return `evidence import accepted (+${counts.accepted_evidence_count ?? 0})`;
    case "evidence_import_no_mutation":
      return `evidence import no mutation`;
    case "evidence_import_rejected":
      return `evidence import rejected (${counts.rejected_evidence_count ?? 0} rejected)`;
    case "evidence_cleared":
      return `evidence cleared`;
    case "intake_parse_completed":
      return `intake parse completed (${counts.parsed_device_count ?? 0} devices, ${counts.finding_count ?? 0} findings)`;
    case "assess_readiness_generated":
      return `assess readiness ${status}`;
  }
}
