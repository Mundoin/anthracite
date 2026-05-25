import { describe, it, expect } from "vitest";
import {
  createFabricatedTopologySourceInfo,
  createDemoTopologySourceInfo,
  createImportedTopologySourceInfo,
  createLiveTopologySourceInfo,
  unknownTopologySourceInfo,
  formatSourceKindLabel,
  formatSourceKindHeaderLabel,
  formatFreshnessLabel,
  formatSourceProvenance,
  FABRICATOR_PRODUCER,
} from "../topologySource";

describe("topologySource — fabricated builder", () => {
  it("returns kind 'fabricated' with deterministic generated_at", () => {
    const s = createFabricatedTopologySourceInfo({
      environment_id: "env-fab-demo",
      environment_name: "Micro Lab",
    });
    expect(s.kind).toBe("fabricated");
    expect(s.environment_id).toBe("env-fab-demo");
    expect(s.label).toBe("Fabricated · Micro Lab");
    expect(s.generated_at).toBe("lab-deterministic");
    expect(s.freshness).toBe("static");
    expect(s.producer).toBe(FABRICATOR_PRODUCER);
  });

  it("handles missing environment_name", () => {
    const s = createFabricatedTopologySourceInfo({ environment_id: "env-x" });
    expect(s.label).toBe("Fabricated");
  });

  it("is deterministic (same input → same output)", () => {
    const a = createFabricatedTopologySourceInfo({
      environment_id: "e",
      environment_name: "n",
    });
    const b = createFabricatedTopologySourceInfo({
      environment_id: "e",
      environment_name: "n",
    });
    expect(a).toEqual(b);
  });
});

describe("topologySource — demo / imported / live / unknown builders", () => {
  it("demo builder", () => {
    const s = createDemoTopologySourceInfo({ label: "Sample 7" });
    expect(s.kind).toBe("demo");
    expect(s.label).toBe("Sample 7");
    expect(s.freshness).toBe("static");
  });

  it("imported builder with observed_at → freshness 'fresh'", () => {
    const s = createImportedTopologySourceInfo({
      label: "Capture #4",
      observed_at: "2026-05-25T10:00:00Z",
      evidence: ["pcap"],
    });
    expect(s.kind).toBe("imported");
    expect(s.freshness).toBe("fresh");
    expect(s.evidence).toEqual(["pcap"]);
  });

  it("imported builder without observed_at → freshness 'unknown'", () => {
    const s = createImportedTopologySourceInfo({ label: "X" });
    expect(s.freshness).toBe("unknown");
  });

  it("live builder is a type-safe stub (NOT live collection)", () => {
    const s = createLiveTopologySourceInfo({
      label: "Prod region eu-1",
      observed_at: "2026-05-25T10:05:00Z",
      producer: "snmp-collector/0.0.0-stub",
    });
    expect(s.kind).toBe("live");
    expect(s.freshness).toBe("fresh");
    expect(s.producer).toBe("snmp-collector/0.0.0-stub");
  });

  it("unknown fallback", () => {
    const s = unknownTopologySourceInfo();
    expect(s.kind).toBe("unknown");
    expect(s.freshness).toBe("unknown");
  });
});

describe("topologySource — label formatters", () => {
  it("formats all source kinds", () => {
    expect(formatSourceKindLabel("fabricated")).toBe("Fabricated");
    expect(formatSourceKindLabel("demo")).toBe("Demo");
    expect(formatSourceKindLabel("imported")).toBe("Imported");
    expect(formatSourceKindLabel("live")).toBe("Live");
    expect(formatSourceKindLabel("unknown")).toBe("Unknown");
  });

  it("formats all freshness values", () => {
    expect(formatFreshnessLabel("static")).toBe("Static");
    expect(formatFreshnessLabel("fresh")).toBe("Fresh");
    expect(formatFreshnessLabel("stale")).toBe("Stale");
    expect(formatFreshnessLabel("unknown")).toBe("Unknown");
  });
});

describe("topologySource — V1BY-HF1 header provenance formatter", () => {
  it("maps fabricated kind to 'Generated Lab' in header label", () => {
    expect(formatSourceKindHeaderLabel("fabricated")).toBe("Generated Lab");
    expect(formatSourceKindHeaderLabel("demo")).toBe("Demo");
    expect(formatSourceKindHeaderLabel("imported")).toBe("Imported");
    expect(formatSourceKindHeaderLabel("live")).toBe("Live");
    expect(formatSourceKindHeaderLabel("unknown")).toBe("Unknown");
  });

  it("formats consolidated provenance: fabricated/static → 'Generated Lab · Static'", () => {
    const s = createFabricatedTopologySourceInfo({ environment_id: "e" });
    expect(formatSourceProvenance(s)).toBe("Generated Lab · Static");
  });

  it("formats consolidated provenance: live/fresh → 'Live · Fresh'", () => {
    const s = createLiveTopologySourceInfo({
      label: "L",
      observed_at: "2026-05-25T00:00:00Z",
      producer: "p",
    });
    expect(formatSourceProvenance(s)).toBe("Live · Fresh");
  });

  it("formats consolidated provenance: demo/static → 'Demo · Static'", () => {
    const s = createDemoTopologySourceInfo({ label: "Demo" });
    expect(formatSourceProvenance(s)).toBe("Demo · Static");
  });

  it("formats consolidated provenance: imported with observed_at → 'Imported · Fresh'", () => {
    const s = createImportedTopologySourceInfo({
      label: "X",
      observed_at: "2026-05-25T00:00:00Z",
    });
    expect(formatSourceProvenance(s)).toBe("Imported · Fresh");
  });

  it("formats consolidated provenance: undefined source → 'Unknown · Unknown'", () => {
    expect(formatSourceProvenance(undefined)).toBe("Unknown · Unknown");
  });

  it("formats consolidated provenance: unknown fallback → 'Unknown · Unknown'", () => {
    expect(formatSourceProvenance(unknownTopologySourceInfo())).toBe(
      "Unknown · Unknown",
    );
  });
});
