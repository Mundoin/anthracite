import { describe, expect, it } from "vitest";
import { projectDiagnose } from "../diagnoseProjection";
import type { DiscoveryDeviceRecord } from "../../../types/discovery";
import type { TopologyView } from "../../../types/topology";

/**
 * Regression: V1AW Diagnose mode white-screen.
 *
 * Projection must never throw on partial / malformed DeviceModel
 * payloads or TopologyView sub-objects, even though the static type
 * declares them required. Runtime payloads from Rust/IPC may evolve
 * faster than the TS types in transient states.
 */
describe("projectDiagnose — defensive against partial payloads", () => {
  it("ignores devices with missing device_model", () => {
    const bad = {
      id: "rec-1",
      source_kind: "intake_import",
      source_label: null,
      ingested_at: "2026-05-19T00:00:00Z",
      device_model: undefined,
    } as unknown as DiscoveryDeviceRecord;

    expect(() =>
      projectDiagnose({ devices: [bad], topology: null }),
    ).not.toThrow();
    const m = projectDiagnose({ devices: [bad], topology: null });
    expect(m.answers).toEqual([]);
  });

  it("ignores devices where nested DeviceModel arrays are missing", () => {
    const bad = {
      id: "rec-2",
      source_kind: "intake_import",
      source_label: "host-2",
      ingested_at: "2026-05-19T00:00:00Z",
      device_model: {
        identity: { hostname: "host-2" },
        platform: { platform_id: null, vendor: null },
        // services / interfaces / unknown_lines deliberately missing
      },
    } as unknown as DiscoveryDeviceRecord;

    expect(() =>
      projectDiagnose({ devices: [bad], topology: null }),
    ).not.toThrow();
    const m = projectDiagnose({ devices: [bad], topology: null });
    expect(Array.isArray(m.answers)).toBe(true);
  });

  it("treats a TopologyView with missing stats sub-objects as benign", () => {
    const partial = {
      environment_id: "env-1",
      nodes: [],
      edges: [],
      adjacency_readiness: undefined,
      projection_stats: undefined,
      evidence_stats: undefined,
    } as unknown as TopologyView;

    expect(() =>
      projectDiagnose({ devices: [], topology: partial }),
    ).not.toThrow();
    const m = projectDiagnose({ devices: [], topology: partial });
    expect(m.is_empty_input).toBe(false);
    expect(Array.isArray(m.answers)).toBe(true);
  });

  it("handles a TopologyView with missing nodes/edges arrays", () => {
    const partial = {
      environment_id: "env-2",
      nodes: undefined,
      edges: undefined,
      adjacency_readiness: { fact_source_state: "none_available", fact_sources: [], eligible_node_count: 0 },
      projection_stats: {},
      evidence_stats: {},
    } as unknown as TopologyView;

    expect(() =>
      projectDiagnose({ devices: [], topology: partial }),
    ).not.toThrow();
  });

  it("handles non-array devices argument", () => {
    expect(() =>
      projectDiagnose({
        devices: undefined as unknown as ReadonlyArray<DiscoveryDeviceRecord>,
        topology: null,
      }),
    ).not.toThrow();
  });

  it("handles a record with missing identity.hostname (emits missing-hostname rule)", () => {
    const bad = {
      id: "rec-3",
      source_kind: "intake_import",
      source_label: "label-3",
      ingested_at: "2026-05-19T00:00:00Z",
      device_model: {
        identity: {},
        platform: { platform_id: null, vendor: null },
        interfaces: [],
        services: [],
        unknown_lines: [],
      },
    } as unknown as DiscoveryDeviceRecord;

    const m = projectDiagnose({ devices: [bad], topology: null });
    const ids = m.answers.map((a) => a.id);
    expect(ids).toContain("identity:missing_hostname:rec-3");
  });

  it("handles an interface with missing ipv4_addresses/ipv6_addresses arrays", () => {
    const bad = {
      id: "rec-4",
      source_kind: "intake_import",
      source_label: "host-4",
      ingested_at: "2026-05-19T00:00:00Z",
      device_model: {
        identity: { hostname: "host-4" },
        platform: { platform_id: "cisco-iosxe", vendor: "cisco" },
        interfaces: [
          {
            name: "Gi0/0",
            description: "uplink",
            admin_state: "up",
            // ipv4_addresses/ipv6_addresses deliberately missing
          },
        ],
        services: [],
        unknown_lines: [],
      },
    } as unknown as DiscoveryDeviceRecord;

    expect(() =>
      projectDiagnose({ devices: [bad], topology: null }),
    ).not.toThrow();
    const m = projectDiagnose({ devices: [bad], topology: null });
    const ids = m.answers.map((a) => a.id);
    expect(ids).toContain("interfaces:described_no_addressing:rec-4");
  });
});
