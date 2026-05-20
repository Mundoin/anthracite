/**
 * V1BQ — CrawlPreviewContextSummary unit tests.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_CRAWL_PREVIEW_CONTEXT_SUMMARY,
  buildCrawlPreviewContextSummary,
} from "../crawlPreviewContextSummary";
import { buildCrawlPreview, type CrawlPreviewOptions } from "../crawlPreview";
import type { SeedEntry } from "../seedPlanner";

const OPTIONS: CrawlPreviewOptions = {
  max_depth: 1,
  max_nodes: 10,
  expansion_sources: ["lldp"],
  stop_on_duplicate: true,
  stop_on_platform_unknown: false,
  allow_cidr_expansion: false,
  include_disabled_seeds: false,
  preferred_transport: "ssh",
};

function makeSeed(overrides: Partial<SeedEntry> = {}): SeedEntry {
  return {
    id: "s1",
    host_or_cidr: "10.0.0.1",
    label: "edge-1",
    platform_hint: "iosxe",
    transport_intent: "ssh",
    port: 22,
    credential_profile_label: "lab-creds",
    source_kind: "seed_device",
    notes: "",
    enabled: true,
    ...overrides,
  };
}

describe("buildCrawlPreviewContextSummary", () => {
  it("returns zeroed counts when preview has no seeds", () => {
    const preview = buildCrawlPreview([], OPTIONS, "2026-05-20T00:00:00Z", () => "p_0");
    const summary = buildCrawlPreviewContextSummary(preview);

    expect(summary.frontier_count).toBe(0);
    expect(summary.active_seed_count).toBe(0);
    expect(summary.blocked_seed_count).toBe(0);
    expect(summary.warning_count).toBe(0);
    expect(summary.last_preview_id).toBe("p_0");
    expect(summary.last_preview_generated_at).toBe("2026-05-20T00:00:00Z");
  });

  it("reflects frontier count from active seeds", () => {
    const seeds: SeedEntry[] = [
      makeSeed({ id: "s1", host_or_cidr: "10.0.0.1" }),
      makeSeed({ id: "s2", host_or_cidr: "10.0.0.2" }),
      makeSeed({ id: "s3", host_or_cidr: "10.0.0.3" }),
    ];
    const preview = buildCrawlPreview(seeds, OPTIONS, "2026-05-20T00:00:00Z", () => "p_1");
    const summary = buildCrawlPreviewContextSummary(preview);

    expect(summary.frontier_count).toBe(3);
    expect(summary.active_seed_count).toBe(3);
  });

  it("reflects blocked_seed_count when seeds are missing credential profile", () => {
    const seeds: SeedEntry[] = [
      makeSeed({ id: "s1", credential_profile_label: "" }),
      makeSeed({ id: "s2", credential_profile_label: "" }),
    ];
    const preview = buildCrawlPreview(seeds, OPTIONS, "2026-05-20T00:00:00Z", () => "p_2");
    const summary = buildCrawlPreviewContextSummary(preview);

    expect(summary.blocked_seed_count).toBeGreaterThan(0);
    expect(summary.frontier_count).toBe(0);
  });

  it("reflects warning_count from preview warnings", () => {
    // Drive a top-level warning by overflowing max_nodes
    const seeds: SeedEntry[] = Array.from({ length: 4 }, (_, i) =>
      makeSeed({ id: `s${i}`, host_or_cidr: `10.0.0.${i + 1}` }),
    );
    const options: CrawlPreviewOptions = { ...OPTIONS, max_nodes: 1 };
    const preview = buildCrawlPreview(seeds, options, "2026-05-20T00:00:00Z", () => "p_3");
    const summary = buildCrawlPreviewContextSummary(preview);

    expect(summary.warning_count).toBeGreaterThan(0);
  });

  it("REDACTION: summary contains no host strings or per-seed labels", () => {
    const seeds: SeedEntry[] = [
      makeSeed({
        id: "s_secret",
        host_or_cidr: "10.0.0.99",
        label: "edge-secret",
        credential_profile_label: "super-secret-creds",
        notes: "password=hunter2",
      }),
    ];
    const preview = buildCrawlPreview(seeds, OPTIONS, "2026-05-20T00:00:00Z", () => "p_safe");
    const summary = buildCrawlPreviewContextSummary(preview);

    const serialised = JSON.stringify(summary);
    expect(serialised).not.toContain("10.0.0.99");
    expect(serialised).not.toContain("edge-secret");
    expect(serialised).not.toContain("super-secret-creds");
    expect(serialised).not.toContain("hunter2");
    expect(serialised).not.toContain("password");
  });

  it("is deterministic: identical inputs produce identical output", () => {
    const seeds: SeedEntry[] = [makeSeed({ id: "s1" })];
    const a = buildCrawlPreviewContextSummary(
      buildCrawlPreview(seeds, OPTIONS, "2026-05-20T00:00:00Z", () => "p_x"),
    );
    const b = buildCrawlPreviewContextSummary(
      buildCrawlPreview(seeds, OPTIONS, "2026-05-20T00:00:00Z", () => "p_x"),
    );
    expect(a).toEqual(b);
  });

  it("EMPTY default carries explicit nulls for last_preview fields", () => {
    expect(EMPTY_CRAWL_PREVIEW_CONTEXT_SUMMARY.last_preview_id).toBeNull();
    expect(EMPTY_CRAWL_PREVIEW_CONTEXT_SUMMARY.last_preview_generated_at).toBeNull();
    expect(EMPTY_CRAWL_PREVIEW_CONTEXT_SUMMARY.frontier_count).toBe(0);
  });
});
