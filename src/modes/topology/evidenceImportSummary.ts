/**
 * V1BR — Evidence Import Summary (sanitized).
 *
 * Tracks counts + small labels for operator evidence-import activity in the
 * Topology workbench. Safe to hoist into App-level WorkbenchContextSummary
 * and consume from other workbenches (Operate).
 *
 * Hard discipline:
 *   - Counts + small labels only.
 *   - No raw evidence payloads, no raw command output, no markdown bodies,
 *     no credentials, no secrets.
 *   - Reason codes are short tokens, not raw stderr.
 *   - Deterministic: same prior + event → same summary.
 *   - No I/O, no mutation of the input prior.
 */
import type {
  RawNeighborEvidenceImportResult,
  TopologyEvidenceMutationResult,
} from "../../types/topology";

export type EvidenceImportEventKind =
  | "json_replace"
  | "json_append"
  | "json_merge"
  | "raw_lldp"
  | "raw_cdp"
  | "clear";

export type EvidenceImportEventStatus =
  | "accepted"
  | "no_mutation"
  | "rejected";

export interface EvidenceImportEvent {
  readonly kind: EvidenceImportEventKind;
  readonly status: EvidenceImportEventStatus;
  /** Net evidence accepted in this event (raw: accepted_evidence_count; json: added_count). */
  readonly accepted_count: number;
  /** Rejected entries (raw imports). 0 for json/clear. */
  readonly rejected_count: number;
  /** Short token: "no_mutation" | "parse_error" | "import_failed" | ""; never raw stderr. */
  readonly reason_code: string | null;
  /** ISO 8601. */
  readonly timestamp: string;
  /** Small label (typically environment_id). Never credentials or raw payloads. */
  readonly source_label: string | null;
}

export interface EvidenceImportSummary {
  readonly attempted_import_count: number;
  readonly accepted_import_count: number;
  readonly rejected_import_count: number;
  readonly accepted_evidence_total: number;
  readonly rejected_evidence_total: number;
  readonly last_event_at: string | null;
  readonly last_source_label: string | null;
  readonly last_reason_code: string | null;
}

export const EMPTY_EVIDENCE_IMPORT_SUMMARY: EvidenceImportSummary = {
  attempted_import_count: 0,
  accepted_import_count: 0,
  rejected_import_count: 0,
  accepted_evidence_total: 0,
  rejected_evidence_total: 0,
  last_event_at: null,
  last_source_label: null,
  last_reason_code: null,
};

export function applyEvidenceImportEvent(
  prior: EvidenceImportSummary,
  event: EvidenceImportEvent,
): EvidenceImportSummary {
  const isClear = event.kind === "clear";
  const attemptDelta = isClear ? 0 : 1;
  const acceptedDelta = event.status === "accepted" && !isClear ? 1 : 0;
  const rejectedDelta = event.status === "rejected" && !isClear ? 1 : 0;

  return {
    attempted_import_count: prior.attempted_import_count + attemptDelta,
    accepted_import_count: prior.accepted_import_count + acceptedDelta,
    rejected_import_count: prior.rejected_import_count + rejectedDelta,
    accepted_evidence_total: prior.accepted_evidence_total + event.accepted_count,
    rejected_evidence_total: prior.rejected_evidence_total + event.rejected_count,
    last_event_at: event.timestamp,
    last_source_label: event.source_label,
    last_reason_code: event.reason_code,
  };
}

/**
 * Adapter from a raw-neighbor import result to an EvidenceImportEvent.
 * Sanitises by dropping the result's `accepted_evidence` / `rejected_entries`
 * arrays entirely; only counts cross the boundary.
 */
export function eventFromRawNeighborResult(
  kind: "raw_lldp" | "raw_cdp",
  result: RawNeighborEvidenceImportResult,
  source_label: string | null,
  timestamp: string,
): EvidenceImportEvent {
  const accepted = result.accepted_evidence_count;
  const rejected = result.rejected_count;
  const status: EvidenceImportEventStatus =
    accepted === 0 && rejected === 0
      ? "no_mutation"
      : accepted > 0
        ? "accepted"
        : "rejected";

  return {
    kind,
    status,
    accepted_count: accepted,
    rejected_count: rejected,
    reason_code: status === "no_mutation" ? "no_mutation" : null,
    timestamp,
    source_label,
  };
}

/**
 * Adapter from a JSON-evidence mutation result to an EvidenceImportEvent.
 */
export function eventFromMutationResult(
  kind: "json_replace" | "json_append" | "json_merge",
  result: TopologyEvidenceMutationResult,
  source_label: string | null,
  timestamp: string,
): EvidenceImportEvent {
  const status: EvidenceImportEventStatus = result.added_count > 0
    ? "accepted"
    : "no_mutation";

  return {
    kind,
    status,
    accepted_count: result.added_count,
    rejected_count: 0,
    reason_code: status === "no_mutation" ? "no_mutation" : null,
    timestamp,
    source_label,
  };
}

/**
 * Build a rejected-event for failures (parse error, callback throw).
 * The detail message is dropped — only a short reason_code crosses the boundary.
 */
export function eventFromFailure(
  kind: EvidenceImportEventKind,
  reason_code: string,
  source_label: string | null,
  timestamp: string,
): EvidenceImportEvent {
  return {
    kind,
    status: "rejected",
    accepted_count: 0,
    rejected_count: 0,
    reason_code,
    timestamp,
    source_label,
  };
}
