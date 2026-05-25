/**
 * V1CD — Collection Receipt model tests.
 */

import { describe, it, expect } from "vitest";
import {
  buildCollectionReceipt,
  validateCollectionReceipt,
  isSafeReceipt,
  type CollectionEvidenceEntry,
  type CollectionReceipt,
} from "../collectionReceipt";

function ev(
  id: string,
  status: "accepted" | "rejected" | "failed",
  message: string | null = null,
): CollectionEvidenceEntry {
  return {
    id,
    fact: "topology_neighbors",
    status,
    source: "test",
    confidence: 0.5,
    observed_at: "2026-05-25T10:00:00Z",
    message,
  };
}

function base(overrides: Partial<CollectionReceipt> = {}): CollectionReceipt {
  return {
    ...buildCollectionReceipt({
      id: "rcpt-1",
      source_kind: "imported",
      method: "import",
      scope_attempted: ["topology_neighbors"],
      started_at: "2026-05-25T10:00:00Z",
      observed_at: "2026-05-25T10:00:00Z",
      evidence: [ev("a", "accepted")],
    }),
    ...overrides,
  };
}

describe("buildCollectionReceipt defaults", () => {
  it("derives counts from evidence[] (cannot ship inconsistent totals)", () => {
    const r = buildCollectionReceipt({
      id: "r",
      source_kind: "imported",
      method: "import",
      started_at: "2026-05-25T10:00:00Z",
      evidence: [ev("a", "accepted"), ev("b", "rejected", "bad"), ev("c", "failed", "down")],
    });
    expect(r.counts).toEqual({ attempted: 3, accepted: 1, rejected: 1, failed: 1 });
  });

  it("defaults finished_at = started_at when not provided", () => {
    const r = buildCollectionReceipt({
      id: "r",
      source_kind: "imported",
      method: "import",
      started_at: "2026-05-25T10:00:00Z",
    });
    expect(r.finished_at).toBe("2026-05-25T10:00:00Z");
  });

  it("defaults freshness: 'fresh' when observed_at present, 'unknown' otherwise", () => {
    expect(
      buildCollectionReceipt({
        id: "r", source_kind: "imported", method: "import",
        started_at: "t", observed_at: "t",
      }).freshness,
    ).toBe("fresh");
    expect(
      buildCollectionReceipt({
        id: "r", source_kind: "imported", method: "import", started_at: "t",
      }).freshness,
    ).toBe("unknown");
  });
});

describe("validateCollectionReceipt — happy path", () => {
  it("accepts a minimal imported receipt", () => {
    expect(validateCollectionReceipt(base()).ok).toBe(true);
  });

  it("accepts a live receipt with target_id + observed_at", () => {
    const r = base({
      source_kind: "live",
      method: "ssh",
      target_id: "tgt-1",
      observed_at: "2026-05-25T10:00:00Z",
    });
    expect(validateCollectionReceipt(r).ok).toBe(true);
  });
});

describe("validateCollectionReceipt — guardrails", () => {
  it("rejects empty id", () => {
    const r = base({ id: "" });
    expect(validateCollectionReceipt(r).issues.some((i) => i.field === "id")).toBe(true);
  });

  it("rejects unknown method", () => {
    const r = base({ method: "telnet" as never });
    expect(validateCollectionReceipt(r).issues.some((i) => i.code === "unknown_method")).toBe(true);
  });

  it("rejects unknown scope fact", () => {
    const r = base({ scope_attempted: ["secrets" as never] });
    expect(validateCollectionReceipt(r).issues.some((i) => i.code === "unknown_scope_fact")).toBe(true);
  });

  it("rejects negative counts", () => {
    const r = base({
      counts: { attempted: -1, accepted: 0, rejected: 0, failed: 0 },
    });
    expect(validateCollectionReceipt(r).issues.some((i) => i.code === "negative_count")).toBe(true);
  });

  it("rejects accepted+rejected+failed exceeding attempted", () => {
    const r = base({
      counts: { attempted: 1, accepted: 1, rejected: 1, failed: 0 },
    });
    expect(validateCollectionReceipt(r).issues.some((i) => i.code === "count_mismatch")).toBe(true);
  });

  it("rejects counts.attempted not equal to evidence.length", () => {
    const r = base({
      evidence: [ev("a", "accepted")],
      counts: { attempted: 2, accepted: 1, rejected: 0, failed: 0 },
    });
    expect(validateCollectionReceipt(r).issues.some((i) => i.code === "count_mismatch")).toBe(true);
  });

  it("requires message on rejected/failed evidence", () => {
    const r = base({
      evidence: [ev("a", "rejected", null)],
      counts: { attempted: 1, accepted: 0, rejected: 1, failed: 0 },
    });
    expect(validateCollectionReceipt(r).issues.some((i) => i.code === "missing_message")).toBe(true);
  });

  it("rejects confidence outside [0, 1]", () => {
    const r = base({
      evidence: [{ ...ev("a", "accepted"), confidence: 1.5 }],
      counts: { attempted: 1, accepted: 1, rejected: 0, failed: 0 },
    });
    expect(validateCollectionReceipt(r).issues.some((i) => i.code === "invalid_confidence")).toBe(true);
  });

  it("rejects inverted time window", () => {
    const r = base({
      started_at: "2026-05-25T10:00:05Z",
      finished_at: "2026-05-25T10:00:00Z",
    });
    expect(validateCollectionReceipt(r).issues.some((i) => i.code === "invalid_time_window")).toBe(true);
  });

  it("rejects duplicate evidence ids", () => {
    const r = base({
      evidence: [ev("a", "accepted"), ev("a", "accepted")],
      counts: { attempted: 2, accepted: 2, rejected: 0, failed: 0 },
    });
    expect(
      validateCollectionReceipt(r).issues.some((i) => i.code === "duplicate_evidence_id"),
    ).toBe(true);
  });

  it("rejects live receipt missing target_id", () => {
    const r = base({
      source_kind: "live",
      method: "ssh",
      target_id: null,
      observed_at: "2026-05-25T10:00:00Z",
    });
    expect(
      validateCollectionReceipt(r).issues.some((i) => i.code === "live_without_target"),
    ).toBe(true);
  });

  it("rejects live receipt missing observed_at", () => {
    const r = base({
      source_kind: "live",
      method: "ssh",
      target_id: "tgt-1",
      observed_at: null,
    });
    expect(
      validateCollectionReceipt(r).issues.some((i) => i.code === "live_without_observed_at"),
    ).toBe(true);
  });
});

describe("isSafeReceipt", () => {
  it("returns true for clean receipt, false for any failure", () => {
    expect(isSafeReceipt(base())).toBe(true);
    expect(isSafeReceipt(base({ id: "" }))).toBe(false);
  });
});
