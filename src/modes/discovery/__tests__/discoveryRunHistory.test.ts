/**
 * V1BL — Discovery Run History tests.
 */

import { describe, it, expect } from "vitest";
import {
  emptyHistory,
  addHistoryEntry,
  listHistory,
  clearHistory,
  filterHistoryByKind,
  latestByKind,
  toHistoryMarkdown,
  type HistoryEntry,
  type DiscoveryRunHistory,
} from "../discoveryRunHistory";

function makeEntry(overrides?: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: "entry_1",
    kind: "seed_plan",
    created_at: "2026-05-20T10:00:00Z",
    label: "Seed Plan 1",
    summary: "3 active seeds",
    markdown: "# Seed Plan\n\n- 3 active seeds",
    source_tool: "seed_planner",
    redaction_status: "safe",
    ...overrides,
  };
}

describe("emptyHistory", () => {
  it("returns a history with no entries", () => {
    const h = emptyHistory();
    expect(h.entries).toHaveLength(0);
  });
});

describe("addHistoryEntry", () => {
  it("appends entry and returns new history", () => {
    const h1 = emptyHistory();
    const entry = makeEntry({ id: "e1" });
    const h2 = addHistoryEntry(h1, entry);

    expect(h1.entries).toHaveLength(0);
    expect(h2.entries).toHaveLength(1);
    expect(h2.entries[0].id).toBe("e1");
  });

  it("maintains immutability — original history unchanged", () => {
    const h1 = emptyHistory();
    const entry1 = makeEntry({ id: "e1" });
    const h2 = addHistoryEntry(h1, entry1);

    const entry2 = makeEntry({ id: "e2" });
    const h3 = addHistoryEntry(h2, entry2);

    expect(h1.entries).toHaveLength(0);
    expect(h2.entries).toHaveLength(1);
    expect(h3.entries).toHaveLength(2);
  });

  it("preserves insertion order", () => {
    let h = emptyHistory();
    const e1 = makeEntry({ id: "e1", created_at: "2026-05-20T10:00:00Z" });
    const e2 = makeEntry({ id: "e2", created_at: "2026-05-20T10:01:00Z" });
    const e3 = makeEntry({ id: "e3", created_at: "2026-05-20T10:02:00Z" });

    h = addHistoryEntry(h, e1);
    h = addHistoryEntry(h, e2);
    h = addHistoryEntry(h, e3);

    expect(h.entries.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });
});

describe("listHistory", () => {
  it("returns entries in order", () => {
    let h = emptyHistory();
    h = addHistoryEntry(h, makeEntry({ id: "e1" }));
    h = addHistoryEntry(h, makeEntry({ id: "e2" }));

    const entries = listHistory(h);

    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe("e1");
    expect(entries[1].id).toBe("e2");
  });
});

describe("clearHistory", () => {
  it("returns empty history", () => {
    let h = emptyHistory();
    h = addHistoryEntry(h, makeEntry());
    h = addHistoryEntry(h, makeEntry());

    const cleared = clearHistory(h);

    expect(cleared.entries).toHaveLength(0);
  });
});

describe("filterHistoryByKind", () => {
  it("narrows to entries of a specific kind", () => {
    let h = emptyHistory();
    h = addHistoryEntry(h, makeEntry({ id: "e1", kind: "seed_plan" }));
    h = addHistoryEntry(h, makeEntry({ id: "e2", kind: "crawl_preview" }));
    h = addHistoryEntry(h, makeEntry({ id: "e3", kind: "seed_plan" }));

    const seedPlans = filterHistoryByKind(h, "seed_plan");

    expect(seedPlans).toHaveLength(2);
    expect(seedPlans.map((e) => e.id)).toEqual(["e1", "e3"]);
  });

  it("returns empty when no entries match", () => {
    let h = emptyHistory();
    h = addHistoryEntry(h, makeEntry({ id: "e1", kind: "seed_plan" }));

    const receipts = filterHistoryByKind(h, "field_receipt");

    expect(receipts).toHaveLength(0);
  });
});

describe("latestByKind", () => {
  it("returns the last entry of that kind", () => {
    let h = emptyHistory();
    h = addHistoryEntry(h, makeEntry({ id: "e1", kind: "seed_plan" }));
    h = addHistoryEntry(h, makeEntry({ id: "e2", kind: "crawl_preview" }));
    h = addHistoryEntry(h, makeEntry({ id: "e3", kind: "seed_plan" }));

    const latest = latestByKind(h, "seed_plan");

    expect(latest?.id).toBe("e3");
  });

  it("returns undefined when no entries of that kind exist", () => {
    const h = emptyHistory();

    const latest = latestByKind(h, "field_receipt");

    expect(latest).toBeUndefined();
  });
});

describe("toHistoryMarkdown", () => {
  it("returns empty state message when no entries", () => {
    const h = emptyHistory();
    const md = toHistoryMarkdown(h);

    expect(md).toContain("# Discovery Session History");
    expect(md).toContain("_No entries yet._");
  });

  it("includes all entry details", () => {
    let h = emptyHistory();
    h = addHistoryEntry(
      h,
      makeEntry({
        id: "e1",
        kind: "seed_plan",
        label: "Initial Seed Plan",
        summary: "5 seeds staged",
        created_at: "2026-05-20T10:00:00Z",
        source_tool: "seed_planner",
        counts: { seeds: 5, warnings: 1 },
      }),
    );

    const md = toHistoryMarkdown(h);

    expect(md).toContain("Initial Seed Plan");
    expect(md).toContain("seed_plan");
    expect(md).toContain("5 seeds staged");
    expect(md).toContain("seed_planner");
    expect(md).toContain("**Seeds:**");
    expect(md).toContain("5");
    expect(md).toContain("**Warnings:**");
    expect(md).toContain("1");
  });

  it("redacts secret material in markdown", () => {
    let h = emptyHistory();
    h = addHistoryEntry(
      h,
      makeEntry({
        id: "e1",
        summary: "Do not use password 'secret123'",
      }),
    );

    const md = toHistoryMarkdown(h);

    expect(md).toContain("[redacted]");
    expect(md).not.toContain("password");
  });

  it("handles optional counts gracefully", () => {
    let h = emptyHistory();
    h = addHistoryEntry(
      h,
      makeEntry({
        id: "e1",
        counts: { seeds: 3 }, // only seeds, no other counts
      }),
    );

    const md = toHistoryMarkdown(h);

    expect(md).toContain("**Seeds:**");
    expect(md).toContain("3");
    expect(md).not.toContain("**Warnings:**");
  });

  it("produces deterministic markdown for same input", () => {
    let h = emptyHistory();
    h = addHistoryEntry(h, makeEntry({ id: "e1", created_at: "2026-05-20T10:00:00Z" }));

    const md1 = toHistoryMarkdown(h);
    const md2 = toHistoryMarkdown(h);

    expect(md1).toBe(md2);
  });
});
