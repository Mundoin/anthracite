/**
 * V1BV — OperatorActivityLedger comprehensive cases.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_OPERATOR_ACTIVITY_LEDGER,
  appendOperatorActivityEvent,
  buildOperatorActivitySummaryLabel,
  makeOperatorActivityEventId,
  type OperatorActivityEvent,
  type OperatorActivityEventKind,
  type OperatorActivityStatus,
  type OperatorActivityWorkbench,
  type OperatorActivityCounts,
} from "../operatorActivityLedger";

interface MakeEventInput {
  workbench: OperatorActivityWorkbench;
  kind: OperatorActivityEventKind;
  status: OperatorActivityStatus;
  counts?: OperatorActivityCounts;
  source_label?: string | null;
  reason_code?: string | null;
}

function makeEvent(seq: number, input: MakeEventInput): OperatorActivityEvent {
  const counts = input.counts ?? {};
  return {
    id: makeOperatorActivityEventId(input.kind, seq),
    timestamp: `2026-05-21T00:00:${seq.toString().padStart(2, "0")}Z`,
    workbench: input.workbench,
    kind: input.kind,
    status: input.status,
    source_label: input.source_label ?? null,
    summary_label: buildOperatorActivitySummaryLabel(input.kind, input.status, counts),
    counts,
    reason_code: input.reason_code ?? null,
  };
}

describe("OperatorActivityLedger — events", () => {
  it("seed_plan_generated records safe counts only", () => {
    const ev = makeEvent(1, {
      workbench: "discovery",
      kind: "seed_plan_generated",
      status: "info",
      counts: { seed_count: 7 },
    });
    const after = appendOperatorActivityEvent(EMPTY_OPERATOR_ACTIVITY_LEDGER, ev);
    expect(after.events[0].counts).toEqual({ seed_count: 7 });
    expect(after.events[0].summary_label).toContain("7 seeds");
    expect(Object.keys(after.events[0].counts)).toEqual(["seed_count"]);
  });

  it("crawl_preview_generated records frontier_count only", () => {
    const ev = makeEvent(2, {
      workbench: "discovery",
      kind: "crawl_preview_generated",
      status: "info",
      counts: { frontier_count: 12 },
    });
    const after = appendOperatorActivityEvent(EMPTY_OPERATOR_ACTIVITY_LEDGER, ev);
    expect(after.events[0].counts).toEqual({ frontier_count: 12 });
    expect(after.events[0].summary_label).toContain("12 frontier");
  });

  it("evidence_import_accepted / no_mutation / rejected map cleanly", () => {
    const accepted = makeEvent(1, {
      workbench: "topology",
      kind: "evidence_import_accepted",
      status: "accepted",
      counts: { accepted_evidence_count: 4, rejected_evidence_count: 0 },
    });
    const noMut = makeEvent(2, {
      workbench: "topology",
      kind: "evidence_import_no_mutation",
      status: "no_mutation",
      counts: { accepted_evidence_count: 0, rejected_evidence_count: 0 },
      reason_code: "no_mutation",
    });
    const rejected = makeEvent(3, {
      workbench: "topology",
      kind: "evidence_import_rejected",
      status: "rejected",
      counts: { accepted_evidence_count: 0, rejected_evidence_count: 3 },
      reason_code: "parse_error",
    });
    let l = EMPTY_OPERATOR_ACTIVITY_LEDGER;
    l = appendOperatorActivityEvent(l, accepted);
    l = appendOperatorActivityEvent(l, noMut);
    l = appendOperatorActivityEvent(l, rejected);
    expect(l.accepted_count).toBe(1);
    expect(l.rejected_count).toBe(1);
    expect(l.blocked_count).toBe(0);
    expect(l.per_workbench_counts.topology).toBe(3);
    expect(l.events[1].reason_code).toBe("no_mutation");
    expect(l.events[2].reason_code).toBe("parse_error");
  });

  it("evidence_cleared records as info status (not import)", () => {
    const cleared = makeEvent(1, {
      workbench: "topology",
      kind: "evidence_cleared",
      status: "info",
    });
    const after = appendOperatorActivityEvent(EMPTY_OPERATOR_ACTIVITY_LEDGER, cleared);
    expect(after.events[0].kind).toBe("evidence_cleared");
    expect(after.events[0].summary_label).toBe("evidence cleared");
    expect(after.accepted_count).toBe(0);
    expect(after.rejected_count).toBe(0);
  });

  it("intake_parse_completed records device/finding counts only", () => {
    const ev = makeEvent(1, {
      workbench: "intake",
      kind: "intake_parse_completed",
      status: "accepted",
      counts: { parsed_device_count: 14, finding_count: 3 },
      source_label: "cisco-ios",
    });
    const after = appendOperatorActivityEvent(EMPTY_OPERATOR_ACTIVITY_LEDGER, ev);
    expect(after.events[0].counts).toEqual({
      parsed_device_count: 14,
      finding_count: 3,
    });
    expect(after.events[0].source_label).toBe("cisco-ios");
  });

  it("assess_readiness_generated records state + reason codes only", () => {
    const blocked = makeEvent(1, {
      workbench: "assess",
      kind: "assess_readiness_generated",
      status: "blocked",
      reason_code: "no_signals",
    });
    const ready = makeEvent(2, {
      workbench: "assess",
      kind: "assess_readiness_generated",
      status: "accepted",
    });
    let l = EMPTY_OPERATOR_ACTIVITY_LEDGER;
    l = appendOperatorActivityEvent(l, blocked);
    l = appendOperatorActivityEvent(l, ready);
    expect(l.blocked_count).toBe(1);
    expect(l.accepted_count).toBe(1);
    expect(l.events[0].reason_code).toBe("no_signals");
    expect(l.events[1].reason_code).toBeNull();
  });

  it("preserves event order across many appends", () => {
    let l = EMPTY_OPERATOR_ACTIVITY_LEDGER;
    const kinds: OperatorActivityEventKind[] = [
      "seed_plan_generated",
      "crawl_preview_generated",
      "evidence_import_accepted",
      "evidence_cleared",
      "intake_parse_completed",
      "assess_readiness_generated",
    ];
    kinds.forEach((kind, i) => {
      l = appendOperatorActivityEvent(
        l,
        makeEvent(i + 1, {
          workbench: "discovery",
          kind,
          status: "info",
        }),
      );
    });
    expect(l.events.map((e) => e.kind)).toEqual(kinds);
    expect(l.total_count).toBe(6);
    expect(l.last_event_kind).toBe("assess_readiness_generated");
  });

  it("per_workbench_counts increments correct bucket", () => {
    let l = EMPTY_OPERATOR_ACTIVITY_LEDGER;
    l = appendOperatorActivityEvent(
      l,
      makeEvent(1, { workbench: "intake", kind: "intake_parse_completed", status: "accepted" }),
    );
    l = appendOperatorActivityEvent(
      l,
      makeEvent(2, { workbench: "intake", kind: "intake_parse_completed", status: "accepted" }),
    );
    l = appendOperatorActivityEvent(
      l,
      makeEvent(3, { workbench: "assess", kind: "assess_readiness_generated", status: "info" }),
    );
    expect(l.per_workbench_counts.intake).toBe(2);
    expect(l.per_workbench_counts.assess).toBe(1);
    expect(l.per_workbench_counts.topology).toBe(0);
  });

  it("makeOperatorActivityEventId yields deterministic ids", () => {
    expect(makeOperatorActivityEventId("seed_plan_generated", 5)).toBe(
      "oa-5-seed_plan_generated",
    );
    expect(makeOperatorActivityEventId("evidence_cleared", 1)).toBe(
      "oa-1-evidence_cleared",
    );
  });
});
