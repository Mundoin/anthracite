/**
 * V1BL — Crawl Preview model tests.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { SeedEntry } from "../seedPlanner";
import {
  buildCrawlPreview,
  toCrawlPreviewMarkdown,
  _resetCrawlPreviewIdCounter,
  nextCrawlPreviewId,
  type CrawlPreviewOptions,
} from "../crawlPreview";

function makeSeed(overrides?: Partial<SeedEntry>): SeedEntry {
  return {
    id: "seed_1",
    host_or_cidr: "192.168.1.1",
    label: "Test Seed",
    platform_hint: "iosxe",
    transport_intent: "ssh",
    port: 22,
    credential_profile_label: "lab-ssh",
    source_kind: "seed_device",
    notes: "",
    enabled: true,
    ...overrides,
  };
}

function makeDefaultOptions(): CrawlPreviewOptions {
  return {
    max_depth: 2,
    max_nodes: 10,
    expansion_sources: ["lldp", "cdp"],
    stop_on_duplicate: true,
    stop_on_platform_unknown: false,
    allow_cidr_expansion: false,
    include_disabled_seeds: false,
    preferred_transport: "ssh",
  };
}

describe("buildCrawlPreview", () => {
  beforeEach(() => {
    _resetCrawlPreviewIdCounter();
  });

  it("returns empty preview when seeds list is empty", () => {
    const summary = buildCrawlPreview([], makeDefaultOptions(), "2026-05-20T10:00:00Z");
    expect(summary.active_seed_count).toBe(0);
    expect(summary.excluded_seed_count).toBe(0);
    expect(summary.next_action).toBe("add_seed");
    expect(summary.seed_plans).toHaveLength(0);
  });

  it("creates frontier entry at depth 0 for valid SSH seed", () => {
    const seed = makeSeed({
      id: "seed_1",
      host_or_cidr: "router.lab",
      platform_hint: "iosxe",
      transport_intent: "ssh",
    });
    const summary = buildCrawlPreview([seed], makeDefaultOptions(), "2026-05-20T10:00:00Z");

    expect(summary.active_seed_count).toBe(1);
    expect(summary.frontier).toHaveLength(1);
    expect(summary.frontier[0]).toEqual({
      depth: 0,
      host_or_cidr: "router.lab",
      seed_id: "seed_1",
    });
    expect(summary.next_action).toBe("ready_for_crawl_execution_future");
  });

  it("blocks seed with invalid port", () => {
    const seed = makeSeed({
      id: "seed_bad_port",
      port: 99999,
    });
    const summary = buildCrawlPreview([seed], makeDefaultOptions(), "2026-05-20T10:00:00Z");

    expect(summary.active_seed_count).toBe(0);
    expect(summary.blocked_seeds).toHaveLength(1);
    expect(summary.blocked_seeds[0].reason).toBe("invalid_seed");
    expect(summary.next_action).toBe("fix_seed_plan");
  });

  it("blocks seed missing credential profile for SSH", () => {
    const seed = makeSeed({
      id: "seed_no_cred",
      transport_intent: "ssh",
      credential_profile_label: "",
    });
    const summary = buildCrawlPreview([seed], makeDefaultOptions(), "2026-05-20T10:00:00Z");

    expect(summary.active_seed_count).toBe(0);
    expect(summary.blocked_seeds).toHaveLength(1);
    // Missing credential is detected during validation and results in invalid_seed
    expect(summary.blocked_seeds[0].reason).toBe("invalid_seed");
    expect(summary.next_action).toBe("fix_seed_plan");
  });

  it("excludes disabled seeds unless include_disabled_seeds is true", () => {
    const enabled = makeSeed({ id: "seed_enabled", enabled: true });
    const disabled = makeSeed({ id: "seed_disabled", enabled: false });

    const summary = buildCrawlPreview(
      [enabled, disabled],
      makeDefaultOptions(),
      "2026-05-20T10:00:00Z",
    );

    expect(summary.active_seed_count).toBe(1);
    expect(summary.excluded_seed_count).toBe(1);
    expect(summary.frontier).toHaveLength(1);
  });

  it("treats CIDR as literal frontier entry without expansion", () => {
    const seed = makeSeed({
      id: "seed_cidr",
      host_or_cidr: "10.0.0.0/24",
    });
    const summary = buildCrawlPreview([seed], makeDefaultOptions(), "2026-05-20T10:00:00Z");

    expect(summary.active_seed_count).toBe(1);
    expect(summary.frontier).toHaveLength(1);
    expect(summary.frontier[0].host_or_cidr).toBe("10.0.0.0/24");

    // Check that CIDR expansion warning is in the seed plan
    expect(summary.seed_plans[0].warnings).toContain(
      "CIDR expansion deferred — crawl treats as single frontier entry.",
    );
  });

  it("blocks seed with unknown platform when stop_on_platform_unknown is true", () => {
    const seed = makeSeed({
      id: "seed_unknown",
      platform_hint: "unknown",
    });
    const opts = makeDefaultOptions();
    opts.stop_on_platform_unknown = true;

    const summary = buildCrawlPreview([seed], opts, "2026-05-20T10:00:00Z");

    expect(summary.active_seed_count).toBe(0);
    expect(summary.blocked_seeds).toHaveLength(1);
    expect(summary.blocked_seeds[0].reason).toBe("unknown_platform_blocked");
  });

  it("includes seed with unknown platform when stop_on_platform_unknown is false", () => {
    const seed = makeSeed({
      id: "seed_unknown",
      platform_hint: "unknown",
    });
    const opts = makeDefaultOptions();
    opts.stop_on_platform_unknown = false;

    const summary = buildCrawlPreview([seed], opts, "2026-05-20T10:00:00Z");

    expect(summary.active_seed_count).toBe(1);
    expect(summary.blocked_seeds).toHaveLength(0);
    expect(summary.seed_plans[0].warnings).toContain(
      "Unknown platform — crawler will need a hint.",
    );
  });

  it("triggers adjust_crawl_limits when active seeds exceed max_nodes", () => {
    const seeds = [
      makeSeed({ id: "s1" }),
      makeSeed({ id: "s2" }),
      makeSeed({ id: "s3" }),
    ];
    const opts = makeDefaultOptions();
    opts.max_nodes = 2;

    const summary = buildCrawlPreview(seeds, opts, "2026-05-20T10:00:00Z");

    expect(summary.active_seed_count).toBe(3);
    expect(summary.next_action).toBe("adjust_crawl_limits");
    expect(summary.warnings).toContain(
      "Active seed count (3) exceeds max_nodes (2). Adjust crawl limits.",
    );
  });

  it("includes planned_depths from 0 to max_depth", () => {
    const seed = makeSeed();
    const opts = makeDefaultOptions();
    opts.max_depth = 3;

    const summary = buildCrawlPreview([seed], opts, "2026-05-20T10:00:00Z");

    expect(summary.planned_depths).toEqual([0, 1, 2, 3]);
  });

  it("generates correct command labels per platform and transport", () => {
    // iOS XE with LLDP + CDP
    const iosxe = makeSeed({
      id: "s_iosxe",
      platform_hint: "iosxe",
      transport_intent: "ssh",
    });
    const opts = makeDefaultOptions();
    opts.expansion_sources = ["lldp", "cdp"];

    const summary = buildCrawlPreview([iosxe], opts, "2026-05-20T10:00:00Z");

    expect(summary.seed_plans[0].planned_command_labels).toContain("show lldp neighbors");
    expect(summary.seed_plans[0].planned_command_labels).toContain("show cdp neighbors");
  });

  it("excludes command labels for unknown platform", () => {
    const seed = makeSeed({
      id: "s_unknown",
      platform_hint: "unknown",
      transport_intent: "ssh",
    });
    const summary = buildCrawlPreview([seed], makeDefaultOptions(), "2026-05-20T10:00:00Z");

    expect(summary.seed_plans[0].planned_command_labels).toHaveLength(0);
  });

  it("generates deterministic ID when id_provider is supplied", () => {
    let idCounter = 0;
    const provider = () => {
      idCounter++;
      return `custom_id_${idCounter}`;
    };

    const summary = buildCrawlPreview(
      [makeSeed()],
      makeDefaultOptions(),
      "2026-05-20T10:00:00Z",
      provider,
    );

    expect(summary.crawl_preview_id).toBe("custom_id_1");
  });
});

describe("toCrawlPreviewMarkdown", () => {
  beforeEach(() => {
    _resetCrawlPreviewIdCounter();
  });

  it("produces deterministic markdown for the same input", () => {
    const seed = makeSeed({ id: "s1", host_or_cidr: "10.0.0.1" });
    const opts = makeDefaultOptions();
    const ts = "2026-05-20T10:00:00Z";

    // Use a fixed id provider so the preview id is deterministic
    const provider = () => "fixed_preview_id";
    const summary1 = buildCrawlPreview([seed], opts, ts, provider);
    const md1 = toCrawlPreviewMarkdown(summary1);

    const summary2 = buildCrawlPreview([seed], opts, ts, provider);
    const md2 = toCrawlPreviewMarkdown(summary2);

    expect(md1).toBe(md2);
  });

  it("includes honesty footer", () => {
    const summary = buildCrawlPreview(
      [makeSeed()],
      makeDefaultOptions(),
      "2026-05-20T10:00:00Z",
    );
    const md = toCrawlPreviewMarkdown(summary);

    expect(md).toContain("Preview only — no device contact, no recursive crawl execution.");
  });

  it("redacts secret material in markdown", () => {
    // Create a summary with a warning that contains secret-looking text
    const seed = makeSeed();
    const opts = makeDefaultOptions();
    const summary = buildCrawlPreview([seed], opts, "2026-05-20T10:00:00Z");

    // Manually inject a warning with secret material to test redaction
    const summaryWithSecret = {
      ...summary,
      warnings: ["Do not use password 'secret123' here"],
    };

    const md = toCrawlPreviewMarkdown(summaryWithSecret);

    // "password" should be redacted
    expect(md).toContain("[redacted]");
    expect(md).not.toContain("password");
  });

  it("includes all sections: frontier, per-seed plan, blocked seeds, warnings", () => {
    const validSeed = makeSeed({ id: "s_valid" });
    const blockingSeed = makeSeed({ id: "s_blocked", port: 99999 });

    const summary = buildCrawlPreview(
      [validSeed, blockingSeed],
      makeDefaultOptions(),
      "2026-05-20T10:00:00Z",
    );
    const md = toCrawlPreviewMarkdown(summary);

    expect(md).toContain("## Frontier");
    expect(md).toContain("## Per-seed plan");
    expect(md).toContain("## Blocked seeds");
  });
});

describe("nextCrawlPreviewId", () => {
  beforeEach(() => {
    _resetCrawlPreviewIdCounter();
  });

  it("increments counter with default prefix", () => {
    const id1 = nextCrawlPreviewId();
    const id2 = nextCrawlPreviewId();

    expect(id1).toBe("crawl_preview_1");
    expect(id2).toBe("crawl_preview_2");
  });

  it("respects custom prefix", () => {
    const id = nextCrawlPreviewId("custom");

    expect(id).toMatch(/^custom_/);
  });
});
