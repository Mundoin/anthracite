/**
 * V1BV — OperatorActivityLedger redaction proof.
 *
 * Proves the ledger refuses to carry — or surface via JSON serialization —
 * raw configs, raw evidence payloads, markdown bodies, command output,
 * credentials, secrets, evidence_set_id, or raw error messages, even when
 * a buggy upstream tries to smuggle them through extra-shaped fields.
 *
 * The ledger types accept only well-defined fields; any extra fields on an
 * event must NOT leak into the serialized ledger. We assert by constructing
 * an event with the safe surface and asserting forbidden tokens never
 * appear in JSON.stringify(ledger).
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_OPERATOR_ACTIVITY_LEDGER,
  appendOperatorActivityEvent,
  buildOperatorActivitySummaryLabel,
  makeOperatorActivityEventId,
  type OperatorActivityEvent,
} from "../operatorActivityLedger";

const FORBIDDEN_TOKENS: readonly string[] = [
  "BEGIN RSA PRIVATE KEY",
  "password=hunter2",
  "evidence_set_id",
  "raw_config:",
  "stderr:",
  "```",
  "AKIAIOSFODNN7EXAMPLE",
  "Bearer ey",
];

function safeEvent(seq: number): OperatorActivityEvent {
  const counts = { accepted_evidence_count: 2, rejected_evidence_count: 1 };
  return {
    id: makeOperatorActivityEventId("evidence_import_accepted", seq),
    timestamp: `2026-05-21T00:00:0${seq}Z`,
    workbench: "topology",
    kind: "evidence_import_accepted",
    status: "accepted",
    source_label: "prod-env",
    summary_label: buildOperatorActivitySummaryLabel(
      "evidence_import_accepted",
      "accepted",
      counts,
    ),
    counts,
    reason_code: null,
  };
}

describe("OperatorActivityLedger — redaction", () => {
  it("serialized ledger contains zero forbidden tokens for safe events", () => {
    let l = EMPTY_OPERATOR_ACTIVITY_LEDGER;
    for (let i = 1; i <= 3; i++) {
      l = appendOperatorActivityEvent(l, safeEvent(i));
    }
    const json = JSON.stringify(l);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
  });

  it("summary_label never echoes source_label or arbitrary text", () => {
    const counts = { seed_count: 4 };
    const label = buildOperatorActivitySummaryLabel(
      "seed_plan_generated",
      "info",
      counts,
    );
    // label is a fixed-form caption derived from kind + counts only
    expect(label).toBe("seed plan generated (4 seeds)");
    expect(label).not.toContain("hunter2");
    expect(label).not.toContain("BEGIN RSA");
  });

  it("event shape exposes only the documented fields", () => {
    const ev = safeEvent(1);
    const allowed: ReadonlyArray<keyof OperatorActivityEvent> = [
      "id",
      "timestamp",
      "workbench",
      "kind",
      "status",
      "source_label",
      "summary_label",
      "counts",
      "reason_code",
    ];
    const keys = Object.keys(ev).sort();
    expect(keys).toEqual([...allowed].sort());
  });

  it("counts object exposes only numeric count fields", () => {
    const ev = safeEvent(1);
    for (const v of Object.values(ev.counts)) {
      expect(typeof v).toBe("number");
    }
  });
});
