/**
 * V1BR — EvidenceImportSummary unit tests.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_EVIDENCE_IMPORT_SUMMARY,
  applyEvidenceImportEvent,
  eventFromFailure,
  eventFromMutationResult,
  eventFromRawNeighborResult,
  type EvidenceImportEvent,
} from "../evidenceImportSummary";
import type {
  RawNeighborEvidenceImportResult,
  TopologyEvidenceMutationResult,
} from "../../../types/topology";

const T = "2026-05-20T10:00:00Z";

function accepted(overrides: Partial<EvidenceImportEvent> = {}): EvidenceImportEvent {
  return {
    kind: "json_append",
    status: "accepted",
    accepted_count: 3,
    rejected_count: 0,
    reason_code: null,
    timestamp: T,
    source_label: "env-1",
    ...overrides,
  };
}

describe("EvidenceImportSummary defaults", () => {
  it("EMPTY summary is fully zeroed with null labels", () => {
    expect(EMPTY_EVIDENCE_IMPORT_SUMMARY.attempted_import_count).toBe(0);
    expect(EMPTY_EVIDENCE_IMPORT_SUMMARY.accepted_import_count).toBe(0);
    expect(EMPTY_EVIDENCE_IMPORT_SUMMARY.rejected_import_count).toBe(0);
    expect(EMPTY_EVIDENCE_IMPORT_SUMMARY.accepted_evidence_total).toBe(0);
    expect(EMPTY_EVIDENCE_IMPORT_SUMMARY.rejected_evidence_total).toBe(0);
    expect(EMPTY_EVIDENCE_IMPORT_SUMMARY.last_event_at).toBeNull();
    expect(EMPTY_EVIDENCE_IMPORT_SUMMARY.last_source_label).toBeNull();
    expect(EMPTY_EVIDENCE_IMPORT_SUMMARY.last_reason_code).toBeNull();
  });
});

describe("applyEvidenceImportEvent", () => {
  it("accepted event increments attempted + accepted + evidence total", () => {
    const next = applyEvidenceImportEvent(EMPTY_EVIDENCE_IMPORT_SUMMARY, accepted());
    expect(next.attempted_import_count).toBe(1);
    expect(next.accepted_import_count).toBe(1);
    expect(next.rejected_import_count).toBe(0);
    expect(next.accepted_evidence_total).toBe(3);
  });

  it("rejected event increments attempted + rejected, not accepted", () => {
    const ev = eventFromFailure("json_append", "parse_error", "env-1", T);
    const next = applyEvidenceImportEvent(EMPTY_EVIDENCE_IMPORT_SUMMARY, ev);
    expect(next.attempted_import_count).toBe(1);
    expect(next.rejected_import_count).toBe(1);
    expect(next.accepted_import_count).toBe(0);
    expect(next.last_reason_code).toBe("parse_error");
  });

  it("no_mutation event increments attempted only", () => {
    const ev: EvidenceImportEvent = {
      kind: "json_append",
      status: "no_mutation",
      accepted_count: 0,
      rejected_count: 0,
      reason_code: "no_mutation",
      timestamp: T,
      source_label: "env-1",
    };
    const next = applyEvidenceImportEvent(EMPTY_EVIDENCE_IMPORT_SUMMARY, ev);
    expect(next.attempted_import_count).toBe(1);
    expect(next.accepted_import_count).toBe(0);
    expect(next.rejected_import_count).toBe(0);
  });

  it("clear event does NOT increment attempts but updates timestamp/label", () => {
    const ev: EvidenceImportEvent = {
      kind: "clear",
      status: "accepted",
      accepted_count: 0,
      rejected_count: 0,
      reason_code: null,
      timestamp: T,
      source_label: "env-1",
    };
    const next = applyEvidenceImportEvent(EMPTY_EVIDENCE_IMPORT_SUMMARY, ev);
    expect(next.attempted_import_count).toBe(0);
    expect(next.accepted_import_count).toBe(0);
    expect(next.last_event_at).toBe(T);
    expect(next.last_source_label).toBe("env-1");
  });

  it("multiple events accumulate correctly", () => {
    let s = EMPTY_EVIDENCE_IMPORT_SUMMARY;
    s = applyEvidenceImportEvent(s, accepted({ accepted_count: 3 }));
    s = applyEvidenceImportEvent(s, accepted({ accepted_count: 5 }));
    s = applyEvidenceImportEvent(s, eventFromFailure("raw_lldp", "import_failed", "env-1", T));

    expect(s.attempted_import_count).toBe(3);
    expect(s.accepted_import_count).toBe(2);
    expect(s.rejected_import_count).toBe(1);
    expect(s.accepted_evidence_total).toBe(8);
  });

  it("is pure: does not mutate prior", () => {
    const prior = EMPTY_EVIDENCE_IMPORT_SUMMARY;
    applyEvidenceImportEvent(prior, accepted());
    expect(prior).toBe(EMPTY_EVIDENCE_IMPORT_SUMMARY);
    expect(prior.attempted_import_count).toBe(0);
  });
});

describe("eventFromRawNeighborResult", () => {
  it("maps accepted_evidence_count + rejected_count, drops payload arrays", () => {
    const result: RawNeighborEvidenceImportResult = {
      parsed_entries_total: 5,
      accepted_evidence_count: 4,
      rejected_count: 1,
      unresolved_count: 0,
      stored_evidence_count: 4,
      evidence_set_id: "set-secret-1",
      accepted_evidence: [{ raw_payload: "should not leak" }] as never,
      rejected_entries: [
        {
          reason: "unknown_local_node",
          detail: "raw stderr with password=hunter2",
          raw_block: "show lldp neighbors output...",
        } as never,
      ],
    };
    const event = eventFromRawNeighborResult("raw_lldp", result, "env-1", T);

    expect(event.kind).toBe("raw_lldp");
    expect(event.status).toBe("accepted");
    expect(event.accepted_count).toBe(4);
    expect(event.rejected_count).toBe(1);

    // Redaction guarantee: serialised event must not carry raw payload bytes
    const serialised = JSON.stringify(event);
    expect(serialised).not.toContain("hunter2");
    expect(serialised).not.toContain("show lldp neighbors");
    expect(serialised).not.toContain("should not leak");
    expect(serialised).not.toContain("set-secret-1");
  });

  it("zero accepted + zero rejected → no_mutation", () => {
    const result: RawNeighborEvidenceImportResult = {
      parsed_entries_total: 0,
      accepted_evidence_count: 0,
      rejected_count: 0,
      unresolved_count: 0,
      stored_evidence_count: 0,
      evidence_set_id: null,
      accepted_evidence: [],
      rejected_entries: [],
    };
    const event = eventFromRawNeighborResult("raw_cdp", result, "env-1", T);
    expect(event.status).toBe("no_mutation");
  });

  it("zero accepted + positive rejected → rejected", () => {
    const result: RawNeighborEvidenceImportResult = {
      parsed_entries_total: 2,
      accepted_evidence_count: 0,
      rejected_count: 2,
      unresolved_count: 0,
      stored_evidence_count: 0,
      evidence_set_id: null,
      accepted_evidence: [],
      rejected_entries: [],
    };
    const event = eventFromRawNeighborResult("raw_lldp", result, "env-1", T);
    expect(event.status).toBe("rejected");
  });
});

describe("eventFromMutationResult", () => {
  it("added_count > 0 → accepted", () => {
    const result: TopologyEvidenceMutationResult = {
      mode: "append",
      previous_count: 2,
      incoming_count: 3,
      added_count: 3,
      replaced_count: 0,
      ignored_duplicate_count: 0,
      final_count: 5,
      evidence_set_id: "set-1",
      source_labels: [],
      store_mutated: true,
    };
    const event = eventFromMutationResult("json_append", result, "env-1", T);
    expect(event.status).toBe("accepted");
    expect(event.accepted_count).toBe(3);

    // Redaction: evidence_set_id must not leak through the event
    expect(JSON.stringify(event)).not.toContain("set-1");
  });

  it("added_count === 0 → no_mutation", () => {
    const result: TopologyEvidenceMutationResult = {
      mode: "merge",
      previous_count: 2,
      incoming_count: 2,
      added_count: 0,
      replaced_count: 0,
      ignored_duplicate_count: 2,
      final_count: 2,
      evidence_set_id: null,
      source_labels: [],
      store_mutated: false,
    };
    const event = eventFromMutationResult("json_merge", result, "env-1", T);
    expect(event.status).toBe("no_mutation");
  });
});
