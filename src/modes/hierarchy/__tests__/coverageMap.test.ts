import { describe, expect, it } from "vitest";
import { buildCoverageMap } from "../coverageMap";
import type { DiscoveryDeviceRecord } from "../../../types/discovery";
import type { DeviceModel } from "../../../types/networkModel";

function makeDeviceModel(over: {
  hostname?: string | null;
  chassis?: string | null;
  vendor?: string | null;
  platform_id?: string | null;
  os_family?: string | null;
  os_version_normalized?: string | null;
} = {}): DeviceModel {
  return {
    identity: {
      hostname: over.hostname ?? null,
      chassis: over.chassis ?? null,
      serial_numbers: [],
      management_ips: [],
      last_change_marker: null,
    },
    platform: {
      platform_id: over.platform_id ?? null,
      vendor: over.vendor ?? null,
      os_family: over.os_family ?? null,
      os_version_raw: null,
      os_version_normalized: over.os_version_normalized ?? null,
      detection_confidence: null,
    },
    evidence: {
      source: null,
      source_kind: null,
      captured_at: null,
      parser_version: null,
      registry_version: null,
      fixture_corpus_version: null,
      byte_size: null,
      line_count: null,
    },
    interfaces: [],
    vlans: [],
    vrfs: [],
    static_routes: [],
    routing_protocols: {
      bgp: [],
      ospf: [],
      eigrp: [],
      isis: [],
    },
    acls: [],
    firewall_zones: [],
    nat_rules: [],
    tunnels: [],
    qos_policies: [],
    lag_groups: [],
    services: [],
    topology_hints: [],
    findings: [],
    unknown_lines: [],
    parse_confidence: {
      maturity_observed: null,
      score: null,
      parsed_line_count: 0,
      unknown_line_count: 0,
      warnings: [],
    },
  } as unknown as DeviceModel;
}

function makeRecord(
  id: string,
  environment_id: string,
  over: {
    hostname?: string | null;
    chassis?: string | null;
    vendor?: string | null;
    platform_id?: string | null;
    os_family?: string | null;
    os_version_normalized?: string | null;
    source_kind?: "intake_import" | "live_collection" | "manual";
    source_label?: string | null;
    confidence?: number | null;
    last_seen?: string | null;
    slice_id?: string | null;
  } = {},
): DiscoveryDeviceRecord {
  return {
    id,
    environment_id,
    source_kind: over.source_kind ?? "intake_import",
    confidence: over.confidence ?? null,
    last_seen: over.last_seen ?? null,
    device_model: makeDeviceModel({
      hostname: over.hostname,
      chassis: over.chassis,
      vendor: over.vendor,
      platform_id: over.platform_id,
      os_family: over.os_family,
      os_version_normalized: over.os_version_normalized,
    }),
    source_label: over.source_label ?? null,
    slice_id: over.slice_id ?? null,
  };
}

describe("buildCoverageMap", () => {
  it("returns empty model for empty records", () => {
    const model = buildCoverageMap([]);
    expect(model.total_records).toBe(0);
    expect(model.rows).toHaveLength(0);
    expect(model.per_source_kind).toHaveLength(0);
    expect(model.per_vendor).toHaveLength(0);
  });

  it("single fully-populated record shows 1/0/100 on all rows", () => {
    const records = [
      makeRecord("r1", "env1", {
        hostname: "router-core-01",
        chassis: "ASR9006",
        vendor: "Cisco",
        platform_id: "asr9006",
        os_family: "IOS XR",
        os_version_normalized: "7.8.1",
        source_label: "intake-vol-1",
        confidence: 0.95,
        last_seen: "2026-05-20T10:30:00Z",
        slice_id: "slice-001",
      }),
    ];
    const model = buildCoverageMap(records);
    expect(model.total_records).toBe(1);
    expect(model.rows).toHaveLength(10);

    for (const row of model.rows) {
      expect(row.total).toBe(1);
      expect(row.populated).toBe(1);
      expect(row.missing).toBe(0);
      expect(row.populated_pct).toBe(100);
    }
  });

  it("single fully-null record shows 0/1/0 on all rows", () => {
    const records = [makeRecord("r1", "env1")];
    const model = buildCoverageMap(records);
    expect(model.total_records).toBe(1);
    expect(model.rows).toHaveLength(10);

    for (const row of model.rows) {
      expect(row.total).toBe(1);
      expect(row.populated).toBe(0);
      expect(row.missing).toBe(1);
      expect(row.populated_pct).toBe(0);
    }
  });

  it("mixed records compute correct counts and percentages", () => {
    const records = [
      makeRecord("r1", "env1", { hostname: "device-1" }),
      makeRecord("r2", "env1", { hostname: "device-2" }),
      makeRecord("r3", "env1"), // null hostname
      makeRecord("r4", "env1", { hostname: "device-4" }),
    ];
    const model = buildCoverageMap(records);
    expect(model.total_records).toBe(4);

    const hostnameRow = model.rows.find((r) => r.field === "Hostname")!;
    expect(hostnameRow.populated).toBe(3);
    expect(hostnameRow.missing).toBe(1);
    expect(hostnameRow.total).toBe(4);
    expect(hostnameRow.populated_pct).toBe(75);
  });

  it("percentage rounds to 1 decimal place", () => {
    const records = [
      makeRecord("r1", "env1", { hostname: "device-1" }),
      makeRecord("r2", "env1"),
      makeRecord("r3", "env1"),
    ];
    const model = buildCoverageMap(records);

    const hostnameRow = model.rows.find((r) => r.field === "Hostname")!;
    // 1/3 = 0.333... rounded to 1 decimal = 33.3
    expect(hostnameRow.populated_pct).toBe(33.3);
  });

  it("per_source_kind sorted desc by count, then asc by kind", () => {
    const records = [
      makeRecord("r1", "env1", { source_kind: "intake_import" }),
      makeRecord("r2", "env1", { source_kind: "intake_import" }),
      makeRecord("r3", "env1", { source_kind: "manual" }),
      makeRecord("r4", "env1", { source_kind: "intake_import" }),
      makeRecord("r5", "env1", { source_kind: "live_collection" }),
    ];
    const model = buildCoverageMap(records);

    expect(model.per_source_kind).toHaveLength(3);
    // intake_import: 3, manual: 1, live_collection: 1
    // Expected order: intake_import (3), then live_collection and manual (both 1, sorted asc by kind)
    expect(model.per_source_kind[0]).toEqual({ kind: "intake_import", count: 3 });
    expect(model.per_source_kind[1]).toEqual({ kind: "live_collection", count: 1 });
    expect(model.per_source_kind[2]).toEqual({ kind: "manual", count: 1 });
  });

  it("per_vendor uses (unknown) bucket for null vendor", () => {
    const records = [
      makeRecord("r1", "env1", { vendor: "Cisco" }),
      makeRecord("r2", "env1", { vendor: "Arista" }),
      makeRecord("r3", "env1"), // vendor null
      makeRecord("r4", "env1"), // vendor null
    ];
    const model = buildCoverageMap(records);

    expect(model.per_vendor).toHaveLength(3);
    // Cisco: 1, Arista: 1, (unknown): 2
    // Expected order: (unknown) (2), then Arista and Cisco (both 1, sorted asc)
    expect(model.per_vendor[0]).toEqual({ vendor: "(unknown)", count: 2 });
    expect(model.per_vendor[1]).toEqual({ vendor: "Arista", count: 1 });
    expect(model.per_vendor[2]).toEqual({ vendor: "Cisco", count: 1 });
  });

  it("per_vendor sorted desc by count, then asc by vendor", () => {
    const records = [
      makeRecord("r1", "env1", { vendor: "Juniper" }),
      makeRecord("r2", "env1", { vendor: "Juniper" }),
      makeRecord("r3", "env1", { vendor: "Cisco" }),
      makeRecord("r4", "env1", { vendor: "Juniper" }),
      makeRecord("r5", "env1", { vendor: "Cisco" }),
      makeRecord("r6", "env1", { vendor: "Cisco" }),
    ];
    const model = buildCoverageMap(records);

    expect(model.per_vendor).toHaveLength(2);
    // Cisco: 3, Juniper: 3, then both have count 3, sorted asc by vendor
    expect(model.per_vendor[0]).toEqual({ vendor: "Cisco", count: 3 });
    expect(model.per_vendor[1]).toEqual({ vendor: "Juniper", count: 3 });
  });

  it("rows in correct order: Identity, Platform, Provenance", () => {
    const records = [makeRecord("r1", "env1")];
    const model = buildCoverageMap(records);

    const fieldOrder = model.rows.map((r) => r.field);
    // Identity
    expect(fieldOrder.slice(0, 2)).toEqual(["Hostname", "Chassis"]);
    // Platform
    expect(fieldOrder.slice(2, 6)).toEqual([
      "Vendor",
      "Platform ID",
      "OS Family",
      "OS Version",
    ]);
    // Provenance
    expect(fieldOrder.slice(6, 10)).toEqual([
      "Source Label",
      "Last Seen",
      "Confidence",
      "Slice ID",
    ]);
  });

  it("empty string counts as missing for string fields", () => {
    const records = [
      makeRecord("r1", "env1", { hostname: "" }),
      makeRecord("r2", "env1", { hostname: "device-2" }),
    ];
    const model = buildCoverageMap(records);

    const hostnameRow = model.rows.find((r) => r.field === "Hostname")!;
    expect(hostnameRow.populated).toBe(1);
    expect(hostnameRow.missing).toBe(1);
    expect(hostnameRow.populated_pct).toBe(50);
  });

  it("confidence (number) counts null as missing", () => {
    const records = [
      makeRecord("r1", "env1", { confidence: 0.95 }),
      makeRecord("r2", "env1", { confidence: null }),
      makeRecord("r3", "env1", { confidence: 0.5 }),
    ];
    const model = buildCoverageMap(records);

    const confRow = model.rows.find((r) => r.field === "Confidence")!;
    expect(confRow.populated).toBe(2);
    expect(confRow.missing).toBe(1);
    expect(confRow.populated_pct).toBeCloseTo(66.7, 1);
  });

  it("category field matches expected values", () => {
    const records = [makeRecord("r1", "env1")];
    const model = buildCoverageMap(records);

    const categories = model.rows.map((r) => r.category);
    const uniqueCategories = new Set(categories);
    expect(uniqueCategories).toEqual(
      new Set(["Identity", "Platform", "Provenance"]),
    );
  });

  it("all rows have total equal to total_records", () => {
    const records = [
      makeRecord("r1", "env1"),
      makeRecord("r2", "env1"),
      makeRecord("r3", "env1"),
    ];
    const model = buildCoverageMap(records);

    for (const row of model.rows) {
      expect(row.total).toBe(model.total_records);
    }
  });
});
