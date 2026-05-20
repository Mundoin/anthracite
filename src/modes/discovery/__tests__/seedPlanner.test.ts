/**
 * V1BK — Seed Planner pure model tests.
 *
 * Covers all validation rules + next-action priorities + Markdown
 * determinism + secret-material absence in the Markdown receipt.
 */

import { describe, expect, it } from "vitest";
import {
  buildSeedPlanSummary,
  toSeedPlanMarkdown,
  type SeedEntry,
} from "../seedPlanner";

const T = "2026-05-20T00:00:00.000Z";

function seed(over: Partial<SeedEntry> = {}): SeedEntry {
  return {
    id: "s1",
    host_or_cidr: "10.0.0.1",
    label: "edge-1",
    platform_hint: "iosxe",
    transport_intent: "ssh",
    port: 22,
    credential_profile_label: "lab-default",
    source_kind: "seed_device",
    notes: "",
    enabled: true,
    ...over,
  };
}

describe("seedPlanner — next action", () => {
  it("empty plan → add_seed", () => {
    const s = buildSeedPlanSummary([], T);
    expect(s.next_action).toBe("add_seed");
    expect(s.active_count).toBe(0);
  });

  it("one valid ssh seed → ready_for_crawl_preview", () => {
    const s = buildSeedPlanSummary([seed()], T);
    expect(s.next_action).toBe("ready_for_crawl_preview");
    expect(s.valid_count).toBe(1);
    expect(s.invalid_count).toBe(0);
  });

  it("invalid seed → fix_seed_errors", () => {
    const s = buildSeedPlanSummary(
      [seed({ port: -1 })],
      T,
    );
    expect(s.next_action).toBe("fix_seed_errors");
    expect(s.invalid_count).toBe(1);
  });

  it("ssh seed missing credential label → attach_credential_profile", () => {
    const s = buildSeedPlanSummary(
      [seed({ credential_profile_label: "" })],
      T,
    );
    expect(s.next_action).toBe("fix_seed_errors");
    // missing cred label is now an issue, not just a next-action signal —
    // ensure the issue is recorded
    expect(s.issues.some((i) => i.kind === "credential_label_missing")).toBe(
      true,
    );
  });

  it("only manual/unknown transport → review_manual_plan", () => {
    const s = buildSeedPlanSummary(
      [
        seed({
          id: "s2",
          host_or_cidr: "10.0.0.2",
          transport_intent: "manual",
          port: null,
          credential_profile_label: "",
        }),
      ],
      T,
    );
    expect(s.next_action).toBe("review_manual_plan");
    expect(s.valid_count).toBe(1);
  });
});

describe("seedPlanner — validation rules", () => {
  it("empty host emits host_missing", () => {
    const s = buildSeedPlanSummary(
      [seed({ host_or_cidr: "  " })],
      T,
    );
    expect(s.issues.some((i) => i.kind === "host_missing")).toBe(true);
  });

  it("invalid port rejected", () => {
    const s = buildSeedPlanSummary([seed({ port: 70000 })], T);
    expect(s.issues.some((i) => i.kind === "port_invalid")).toBe(true);
  });

  it("missing port for ssh emits port_required", () => {
    const s = buildSeedPlanSummary([seed({ port: null })], T);
    expect(s.issues.some((i) => i.kind === "port_required")).toBe(true);
  });

  it("duplicate host flagged", () => {
    const s = buildSeedPlanSummary(
      [seed({ id: "a" }), seed({ id: "b" })],
      T,
    );
    expect(s.issues.some((i) => i.kind === "duplicate_host")).toBe(true);
  });

  it("disabled seed excluded from active count", () => {
    const s = buildSeedPlanSummary(
      [seed(), seed({ id: "s2", host_or_cidr: "10.0.0.2", enabled: false })],
      T,
    );
    expect(s.active_count).toBe(1);
    expect(s.disabled_count).toBe(1);
  });

  it("unknown platform raises warning", () => {
    const s = buildSeedPlanSummary(
      [seed({ platform_hint: "unknown" })],
      T,
    );
    expect(s.warnings.some((w) => w.toLowerCase().includes("unknown platform"))).toBe(
      true,
    );
  });

  it("CIDR range accepted as staged intent without expansion", () => {
    const s = buildSeedPlanSummary(
      [seed({ host_or_cidr: "10.0.0.0/24", transport_intent: "manual", port: null, credential_profile_label: "" })],
      T,
    );
    expect(s.valid_count).toBe(1);
    expect(s.issues.length).toBe(0);
    // Markdown must mention the literal CIDR, not expanded hosts
    const md = toSeedPlanMarkdown(s);
    expect(md).toContain("10.0.0.0/24");
    expect(md).not.toContain("10.0.0.255");
  });
});

describe("seedPlanner — Markdown receipt", () => {
  it("is deterministic for same input", () => {
    const a = buildSeedPlanSummary([seed()], T);
    const b = buildSeedPlanSummary([seed()], T);
    expect(toSeedPlanMarkdown(a)).toBe(toSeedPlanMarkdown(b));
  });

  it("contains no secret-material strings", () => {
    const s = buildSeedPlanSummary(
      [
        seed({ credential_profile_label: "lab-default" }),
        seed({
          id: "s2",
          host_or_cidr: "10.0.0.2",
          label: "edge-2",
          credential_profile_label: "prod-noc",
        }),
      ],
      T,
    );
    const md = toSeedPlanMarkdown(s);
    expect(md.toLowerCase()).not.toContain("password");
    expect(md.toLowerCase()).not.toContain("private_key");
    expect(md.toLowerCase()).not.toContain("private-key");
    expect(md.toLowerCase()).not.toContain("passphrase");
  });

  it("lists active and disabled seeds in separate sections", () => {
    const s = buildSeedPlanSummary(
      [
        seed(),
        seed({ id: "s2", host_or_cidr: "10.0.0.2", enabled: false }),
      ],
      T,
    );
    const md = toSeedPlanMarkdown(s);
    expect(md).toContain("## Active seeds");
    expect(md).toContain("## Disabled seeds");
  });
});
