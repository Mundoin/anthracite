/**
 * V1BV — Opus sanity check for OperatorActivityLedger contract.
 * Comprehensive cases live in operatorActivityLedger.test.ts (Lane C).
 * Redaction proof lives in operatorActivityLedger.redaction.test.ts (Lane C).
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_OPERATOR_ACTIVITY_LEDGER,
  appendOperatorActivityEvent,
  buildOperatorActivitySummaryLabel,
  makeOperatorActivityEventId,
  type OperatorActivityEvent,
} from "../operatorActivityLedger";

function event(
  partial: Partial<OperatorActivityEvent> & Pick<OperatorActivityEvent, "kind" | "workbench" | "status">,
  sequence: number,
): OperatorActivityEvent {
  return {
    id: partial.id ?? makeOperatorActivityEventId(partial.kind, sequence),
    timestamp: partial.timestamp ?? `2026-05-21T00:00:0${sequence}Z`,
    source_label: partial.source_label ?? null,
    summary_label:
      partial.summary_label ??
      buildOperatorActivitySummaryLabel(partial.kind, partial.status, partial.counts ?? {}),
    counts: partial.counts ?? {},
    reason_code: partial.reason_code ?? null,
    workbench: partial.workbench,
    kind: partial.kind,
    status: partial.status,
  };
}

describe("OperatorActivityLedger — sanity", () => {
  it("EMPTY ledger has zero counts and null last_*", () => {
    const l = EMPTY_OPERATOR_ACTIVITY_LEDGER;
    expect(l.events).toEqual([]);
    expect(l.total_count).toBe(0);
    expect(l.last_event_at).toBeNull();
    expect(l.last_event_kind).toBeNull();
    expect(l.accepted_count).toBe(0);
    expect(l.rejected_count).toBe(0);
    expect(l.blocked_count).toBe(0);
    expect(l.per_workbench_counts.discovery).toBe(0);
    expect(l.per_workbench_counts.topology).toBe(0);
  });

  it("append preserves order and updates derived counts", () => {
    const e1 = event(
      { workbench: "discovery", kind: "seed_plan_generated", status: "info", counts: { seed_count: 3 } },
      1,
    );
    const e2 = event(
      {
        workbench: "topology",
        kind: "evidence_import_accepted",
        status: "accepted",
        counts: { accepted_evidence_count: 5 },
      },
      2,
    );
    const after1 = appendOperatorActivityEvent(EMPTY_OPERATOR_ACTIVITY_LEDGER, e1);
    const after2 = appendOperatorActivityEvent(after1, e2);

    expect(after2.events).toEqual([e1, e2]);
    expect(after2.total_count).toBe(2);
    expect(after2.last_event_at).toBe(e2.timestamp);
    expect(after2.last_event_kind).toBe("evidence_import_accepted");
    expect(after2.accepted_count).toBe(1);
    expect(after2.per_workbench_counts.discovery).toBe(1);
    expect(after2.per_workbench_counts.topology).toBe(1);
  });

  it("does not mutate prior ledger", () => {
    const e = event(
      { workbench: "assess", kind: "assess_readiness_generated", status: "blocked" },
      1,
    );
    const after = appendOperatorActivityEvent(EMPTY_OPERATOR_ACTIVITY_LEDGER, e);
    expect(EMPTY_OPERATOR_ACTIVITY_LEDGER.events.length).toBe(0);
    expect(EMPTY_OPERATOR_ACTIVITY_LEDGER.total_count).toBe(0);
    expect(after.blocked_count).toBe(1);
  });
});
