import { describe, it, expect } from "vitest";
import {
  buildDiscoveryPlanningSummary,
  EMPTY_DISCOVERY_PLANNING_SUMMARY,
  type DiscoveryPlanningSummary,
} from "../discoveryPlanningSummary";
import type { SeedEntry } from "../seedPlanner";
import type { DiscoveryRunHistory, HistoryEntry } from "../discoveryRunHistory";
import { emptyHistory, addHistoryEntry } from "../discoveryRunHistory";

describe("discoveryPlanningSummary", () => {
  const makeSeed = (id: string, enabled = true): SeedEntry => ({
    id,
    host_or_cidr: "10.0.0.1",
    label: `Seed ${id}`,
    platform_hint: "unknown",
    transport_intent: "ssh",
    port: 22,
    credential_profile_label: "default",
    source_kind: "manual",
    notes: "",
    enabled,
  });

  const makeHistoryEntry = (id: string): HistoryEntry => ({
    id,
    kind: "seed_plan",
    created_at: "2026-05-20T00:00:00Z",
    label: `Plan ${id}`,
    summary: "Test plan",
    markdown: "# Plan",
    source_tool: "SeedPlannerPanel",
    redaction_status: "safe",
  });

  it("returns all zeros for empty seeds and empty history", () => {
    const summary = buildDiscoveryPlanningSummary([], emptyHistory());
    expect(summary.staged_seed_count).toBe(0);
    expect(summary.total_seed_count).toBe(0);
    expect(summary.history_entry_count).toBe(0);
  });

  it("counts all enabled seeds as staged and total", () => {
    const seeds: ReadonlyArray<SeedEntry> = [
      makeSeed("a", true),
      makeSeed("b", true),
      makeSeed("c", true),
    ];
    const summary = buildDiscoveryPlanningSummary(seeds, emptyHistory());
    expect(summary.total_seed_count).toBe(3);
    expect(summary.staged_seed_count).toBe(3);
  });

  it("excludes disabled seeds from staged count but includes in total count", () => {
    const seeds: ReadonlyArray<SeedEntry> = [
      makeSeed("a", true),
      makeSeed("b", false),
      makeSeed("c", true),
    ];
    const summary = buildDiscoveryPlanningSummary(seeds, emptyHistory());
    expect(summary.total_seed_count).toBe(3);
    expect(summary.staged_seed_count).toBe(2);
  });

  it("counts history entries correctly", () => {
    const seeds: ReadonlyArray<SeedEntry> = [makeSeed("a")];
    let history = emptyHistory();
    history = addHistoryEntry(history, makeHistoryEntry("entry1"));
    history = addHistoryEntry(history, makeHistoryEntry("entry2"));
    history = addHistoryEntry(history, makeHistoryEntry("entry3"));
    const summary = buildDiscoveryPlanningSummary(seeds, history);
    expect(summary.history_entry_count).toBe(3);
  });

  it("handles mixed seeds and history together", () => {
    const seeds: ReadonlyArray<SeedEntry> = [
      makeSeed("a", true),
      makeSeed("b", false),
      makeSeed("c", true),
    ];
    let history = emptyHistory();
    history = addHistoryEntry(history, makeHistoryEntry("e1"));
    history = addHistoryEntry(history, makeHistoryEntry("e2"));
    const summary = buildDiscoveryPlanningSummary(seeds, history);
    expect(summary.total_seed_count).toBe(3);
    expect(summary.staged_seed_count).toBe(2);
    expect(summary.history_entry_count).toBe(2);
  });

  it("is deterministic: same input always produces same output", () => {
    const seeds: ReadonlyArray<SeedEntry> = [makeSeed("a"), makeSeed("b", false)];
    let history = emptyHistory();
    history = addHistoryEntry(history, makeHistoryEntry("e1"));
    const s1 = buildDiscoveryPlanningSummary(seeds, history);
    const s2 = buildDiscoveryPlanningSummary(seeds, history);
    expect(s1).toEqual(s2);
  });

  it("exports empty summary constant with all zeros", () => {
    expect(EMPTY_DISCOVERY_PLANNING_SUMMARY.staged_seed_count).toBe(0);
    expect(EMPTY_DISCOVERY_PLANNING_SUMMARY.total_seed_count).toBe(0);
    expect(EMPTY_DISCOVERY_PLANNING_SUMMARY.history_entry_count).toBe(0);
  });
});
