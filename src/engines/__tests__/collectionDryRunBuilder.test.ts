/**
 * V1CE — Collection Dry-Run Builder tests.
 */

import { describe, it, expect } from "vitest";
import {
  buildCollectionDryRun,
  buildDemoCollectionDryRun,
} from "../collectionDryRunBuilder";
import {
  buildCollectionTarget,
  type CollectionTarget,
} from "../../types/collectionTarget";
import { validateCollectionDryRun } from "../../types/collectionDryRun";

const T = "2026-05-25T11:00:00Z";

function baseTarget(overrides: Partial<CollectionTarget> = {}): CollectionTarget {
  return {
    ...buildCollectionTarget({
      id: "tgt-test-01",
      name: "Test target",
      seed: { kind: "hostname", value: "test.example.net" },
      access_methods: ["ssh"],
      scope: ["inventory", "topology_neighbors"],
      credential_ref: "cred://ro-test",
      created_at: T,
    }),
    ...overrides,
  };
}

describe("buildCollectionDryRun — verdicts", () => {
  it("returns 'ready' for a clean target with credential bound", () => {
    const r = buildCollectionDryRun({ target: baseTarget(), generated_at: T });
    expect(r.verdict).toBe("ready");
    expect(r.no_contact).toBe(true);
    expect(r.receipt_preview).not.toBeNull();
  });

  it("returns 'warning' when credential_ref is null (no plaintext)", () => {
    const r = buildCollectionDryRun({
      target: baseTarget({ credential_ref: null }),
      generated_at: T,
    });
    expect(r.verdict).toBe("warning");
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.receipt_preview).not.toBeNull();
  });

  it("returns 'blocked' for disabled targets and emits no preview", () => {
    const r = buildCollectionDryRun({
      target: baseTarget({ enabled: false }),
      generated_at: T,
    });
    expect(r.verdict).toBe("blocked");
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.receipt_preview).toBeNull();
  });

  it("returns 'blocked' when underlying target validation fails", () => {
    const r = buildCollectionDryRun({
      target: baseTarget({ name: "" }),
      generated_at: T,
    });
    expect(r.verdict).toBe("blocked");
    expect(r.receipt_preview).toBeNull();
  });
});

describe("buildCollectionDryRun — plan + preview shape", () => {
  it("plan mirrors target id, name, methods, scope, contact policy", () => {
    const target = baseTarget();
    const r = buildCollectionDryRun({ target, generated_at: T });
    expect(r.plan.target_id).toBe(target.id);
    expect(r.plan.target_name).toBe(target.name);
    expect(r.plan.access_methods).toEqual(target.access_methods);
    expect(r.plan.scope_attempted).toEqual(target.scope);
    expect(r.plan.contact_policy_summary).toContain("read_only=true");
    expect(r.plan.expected_source_kind).toBe("live");
  });

  it("preview receipt is V1CD-shaped: source 'live', method matches, observed_at = generated_at, all accepted", () => {
    const r = buildCollectionDryRun({ target: baseTarget(), generated_at: T });
    const preview = r.receipt_preview!;
    expect(preview.source_kind).toBe("live");
    expect(preview.method).toBe("ssh");
    expect(preview.observed_at).toBe(T);
    expect(preview.counts.attempted).toBe(2);
    expect(preview.counts.accepted).toBe(2);
    expect(preview.warnings.length).toBeGreaterThan(0);
  });

  it("is deterministic — same input yields equal output", () => {
    const a = buildCollectionDryRun({ target: baseTarget(), generated_at: T });
    const b = buildCollectionDryRun({ target: baseTarget(), generated_at: T });
    expect(a).toEqual(b);
  });
});

describe("validateCollectionDryRun", () => {
  it("accepts a ready dry-run", () => {
    const r = buildCollectionDryRun({ target: baseTarget(), generated_at: T });
    expect(validateCollectionDryRun(r).ok).toBe(true);
  });

  it("accepts a blocked dry-run with null preview", () => {
    const r = buildCollectionDryRun({
      target: baseTarget({ enabled: false }),
      generated_at: T,
    });
    expect(validateCollectionDryRun(r).ok).toBe(true);
  });

  it("rejects a tampered ready dry-run with null preview", () => {
    const r = buildCollectionDryRun({ target: baseTarget(), generated_at: T });
    const tampered = { ...r, receipt_preview: null };
    expect(validateCollectionDryRun(tampered).ok).toBe(false);
  });

  it("rejects a tampered no_contact=false", () => {
    const r = buildCollectionDryRun({ target: baseTarget(), generated_at: T });
    const tampered = { ...r, no_contact: false as unknown as true };
    expect(validateCollectionDryRun(tampered).ok).toBe(false);
  });
});

describe("buildDemoCollectionDryRun", () => {
  it("demo dry-run uses V1CC demo target id and validates", () => {
    const r = buildDemoCollectionDryRun();
    expect(r.plan.target_id).toBe("tgt-demo-edge-01");
    expect(validateCollectionDryRun(r).ok).toBe(true);
    expect(r.verdict === "ready" || r.verdict === "warning").toBe(true);
  });
});
