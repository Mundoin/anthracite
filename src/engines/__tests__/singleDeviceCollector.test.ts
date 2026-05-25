/**
 * V1CF — Single-Device Collector runner tests.
 */

import { describe, it, expect } from "vitest";
import {
  runSingleDeviceCollection,
  buildDemoSingleDeviceRun,
} from "../singleDeviceCollector";
import {
  buildCollectionTarget,
  type CollectionTarget,
} from "../../types/collectionTarget";
import { validateCollectionReceipt } from "../../types/collectionReceipt";

const T = "2026-05-25T12:00:00Z";

function demoTargetLike(overrides: Partial<CollectionTarget> = {}): CollectionTarget {
  return {
    ...buildCollectionTarget({
      id: "tgt-demo-edge-01",
      name: "Demo Edge",
      seed: { kind: "hostname", value: "edge-rtr-01" },
      access_methods: ["ssh", "snmp"],
      scope: ["inventory", "version_facts", "topology_neighbors"],
      credential_ref: "cred://ro-default",
      created_at: T,
    }),
    ...overrides,
  };
}

describe("runSingleDeviceCollection — happy path", () => {
  it("returns status='ok' for the demo target and emits a V1CD receipt", () => {
    const run = runSingleDeviceCollection({ target: demoTargetLike(), generated_at: T });
    expect(run.status).toBe("ok");
    expect(run.no_field_contact).toBe(true);
    expect(run.fixture_id).toBe("fixture-edge-rtr-01-iosxe");
    expect(run.receipt).not.toBeNull();
  });

  it("receipt counts auto-derive (inventory + version + 2 neighbours = 4)", () => {
    const run = runSingleDeviceCollection({ target: demoTargetLike(), generated_at: T });
    const r = run.receipt!;
    expect(r.counts.attempted).toBe(4);
    expect(r.counts.accepted).toBe(4);
    expect(r.counts.rejected).toBe(0);
    expect(r.counts.failed).toBe(0);
  });

  it("emitted receipt validates via V1CD validator", () => {
    const run = runSingleDeviceCollection({ target: demoTargetLike(), generated_at: T });
    expect(validateCollectionReceipt(run.receipt!).ok).toBe(true);
  });

  it("prefers ssh when target supports it", () => {
    const run = runSingleDeviceCollection({ target: demoTargetLike(), generated_at: T });
    expect(run.receipt?.method).toBe("ssh");
  });

  it("receipt source_kind is 'demo' (fixture-backed honesty)", () => {
    const run = runSingleDeviceCollection({ target: demoTargetLike(), generated_at: T });
    expect(run.receipt?.source_kind).toBe("demo");
  });

  it("interface_summary scope adds an interface evidence entry", () => {
    const run = runSingleDeviceCollection({
      target: demoTargetLike({
        scope: ["inventory", "interface_summary"],
      }),
      generated_at: T,
    });
    const ids = run.receipt!.evidence.map((e) => e.fact);
    expect(ids).toContain("interface_summary");
  });

  it("config_read scope produces a failed entry (fixture cannot supply config)", () => {
    const run = runSingleDeviceCollection({
      target: demoTargetLike({ scope: ["inventory", "config_read"] }),
      generated_at: T,
    });
    expect(run.receipt!.counts.failed).toBe(1);
    expect(
      run.receipt!.evidence.find((e) => e.fact === "config_read")?.status,
    ).toBe("failed");
  });

  it("is deterministic — same input yields equal output", () => {
    const a = runSingleDeviceCollection({ target: demoTargetLike(), generated_at: T });
    const b = runSingleDeviceCollection({ target: demoTargetLike(), generated_at: T });
    expect(a).toEqual(b);
  });
});

describe("runSingleDeviceCollection — guardrails", () => {
  it("returns status='blocked' for disabled target", () => {
    const run = runSingleDeviceCollection({
      target: demoTargetLike({ enabled: false }),
      generated_at: T,
    });
    expect(run.status).toBe("blocked");
    expect(run.receipt).toBeNull();
  });

  it("returns status='blocked' when V1CC validation fails", () => {
    const run = runSingleDeviceCollection({
      target: demoTargetLike({ name: "" }),
      generated_at: T,
    });
    expect(run.status).toBe("blocked");
    expect(run.receipt).toBeNull();
  });

  it("returns status='error' when no fixture is registered", () => {
    const run = runSingleDeviceCollection({
      target: demoTargetLike({ id: "tgt-unknown" }),
      generated_at: T,
    });
    expect(run.status).toBe("error");
    expect(run.receipt).toBeNull();
  });
});

describe("buildDemoSingleDeviceRun", () => {
  it("demo run is ok and validates", () => {
    const run = buildDemoSingleDeviceRun();
    expect(run.status).toBe("ok");
    expect(validateCollectionReceipt(run.receipt!).ok).toBe(true);
  });
});
