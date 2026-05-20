/**
 * Coverage Map — deterministic field-level projection.
 *
 * Aggregates DiscoveryDeviceRecord[] into per-field coverage counts.
 * No fetch, no device contact, no mutation, no persistence.
 *
 * Doctrine: docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md (consuming records).
 * Stage: V1BM (Coverage Map — honest local projection).
 */

import type { DiscoveryDeviceRecord } from "../../types/discovery";

export interface CoverageRow {
  readonly field: string; // human label, e.g. "Hostname"
  readonly category: string; // "Identity" | "Platform" | "Provenance"
  readonly populated: number; // count of records where field present
  readonly missing: number; // count of records where field null/empty
  readonly total: number; // populated + missing
  readonly populated_pct: number; // 0..100, rounded to 1 decimal
}

export interface CoverageMapModel {
  readonly total_records: number;
  readonly rows: readonly CoverageRow[];
  readonly per_source_kind: ReadonlyArray<{ kind: string; count: number }>;
  readonly per_vendor: ReadonlyArray<{ vendor: string; count: number }>;
}

/**
 * Build Coverage Map from discovery records.
 *
 * Fields projected (one CoverageRow each):
 *   Identity: hostname, chassis
 *   Platform: vendor, platform_id, os_family, os_version_normalized
 *   Provenance: source_label, last_seen, confidence, slice_id
 *
 * "populated" = value !== null AND value !== "" (for strings) / value !== null (for numbers).
 * Rows in fixed order. per_source_kind + per_vendor sorted by count desc, then key asc.
 * Vendor bucket "(unknown)" for nulls.
 *
 * Empty records → total_records:0, rows:[], per_source_kind:[], per_vendor:[].
 */
export function buildCoverageMap(
  records: readonly DiscoveryDeviceRecord[],
): CoverageMapModel {
  const total = records.length;

  if (total === 0) {
    return {
      total_records: 0,
      rows: [],
      per_source_kind: [],
      per_vendor: [],
    };
  }

  // Track field populations
  const fieldCounts: Record<
    string,
    { populated: number; missing: number }
  > = {
    // Identity
    hostname: { populated: 0, missing: 0 },
    chassis: { populated: 0, missing: 0 },
    // Platform
    vendor: { populated: 0, missing: 0 },
    platform_id: { populated: 0, missing: 0 },
    os_family: { populated: 0, missing: 0 },
    os_version_normalized: { populated: 0, missing: 0 },
    // Provenance
    source_label: { populated: 0, missing: 0 },
    last_seen: { populated: 0, missing: 0 },
    confidence: { populated: 0, missing: 0 },
    slice_id: { populated: 0, missing: 0 },
  };

  // Track source kinds
  const sourceKindCounts: Map<string, number> = new Map();
  // Track vendors
  const vendorCounts: Map<string, number> = new Map();

  for (const record of records) {
    // Identity
    if (record.device_model.identity.hostname !== null && record.device_model.identity.hostname !== "") {
      fieldCounts.hostname.populated++;
    } else {
      fieldCounts.hostname.missing++;
    }

    if (record.device_model.identity.chassis !== null && record.device_model.identity.chassis !== "") {
      fieldCounts.chassis.populated++;
    } else {
      fieldCounts.chassis.missing++;
    }

    // Platform
    const vendor = record.device_model.platform.vendor;
    if (vendor !== null && vendor !== "") {
      fieldCounts.vendor.populated++;
      vendorCounts.set(vendor, (vendorCounts.get(vendor) ?? 0) + 1);
    } else {
      fieldCounts.vendor.missing++;
      vendorCounts.set("(unknown)", (vendorCounts.get("(unknown)") ?? 0) + 1);
    }

    if (record.device_model.platform.platform_id !== null && record.device_model.platform.platform_id !== "") {
      fieldCounts.platform_id.populated++;
    } else {
      fieldCounts.platform_id.missing++;
    }

    if (record.device_model.platform.os_family !== null && record.device_model.platform.os_family !== "") {
      fieldCounts.os_family.populated++;
    } else {
      fieldCounts.os_family.missing++;
    }

    if (
      record.device_model.platform.os_version_normalized !== null &&
      record.device_model.platform.os_version_normalized !== ""
    ) {
      fieldCounts.os_version_normalized.populated++;
    } else {
      fieldCounts.os_version_normalized.missing++;
    }

    // Provenance
    if (record.source_label !== null && record.source_label !== "") {
      fieldCounts.source_label.populated++;
    } else {
      fieldCounts.source_label.missing++;
    }

    if (record.last_seen !== null && record.last_seen !== "") {
      fieldCounts.last_seen.populated++;
    } else {
      fieldCounts.last_seen.missing++;
    }

    if (record.confidence !== null) {
      fieldCounts.confidence.populated++;
    } else {
      fieldCounts.confidence.missing++;
    }

    if (record.slice_id !== null && record.slice_id !== "") {
      fieldCounts.slice_id.populated++;
    } else {
      fieldCounts.slice_id.missing++;
    }

    // Source kind
    sourceKindCounts.set(record.source_kind, (sourceKindCounts.get(record.source_kind) ?? 0) + 1);
  }

  // Build rows in deterministic order
  const fieldDefinitions: Array<{
    key: string;
    label: string;
    category: string;
  }> = [
    // Identity
    { key: "hostname", label: "Hostname", category: "Identity" },
    { key: "chassis", label: "Chassis", category: "Identity" },
    // Platform
    { key: "vendor", label: "Vendor", category: "Platform" },
    { key: "platform_id", label: "Platform ID", category: "Platform" },
    { key: "os_family", label: "OS Family", category: "Platform" },
    { key: "os_version_normalized", label: "OS Version", category: "Platform" },
    // Provenance
    { key: "source_label", label: "Source Label", category: "Provenance" },
    { key: "last_seen", label: "Last Seen", category: "Provenance" },
    { key: "confidence", label: "Confidence", category: "Provenance" },
    { key: "slice_id", label: "Slice ID", category: "Provenance" },
  ];

  const rows: CoverageRow[] = fieldDefinitions.map(({ key, label, category }) => {
    const counts = fieldCounts[key];
    const populated_pct =
      total > 0 ? Math.round((counts.populated / total) * 1000) / 10 : 0;
    return {
      field: label,
      category,
      populated: counts.populated,
      missing: counts.missing,
      total,
      populated_pct,
    };
  });

  // Sort per_source_kind: desc by count, then asc by kind
  const perSourceKind = Array.from(sourceKindCounts.entries())
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.kind.localeCompare(b.kind);
    });

  // Sort per_vendor: desc by count, then asc by vendor
  const perVendor = Array.from(vendorCounts.entries())
    .map(([vendor, count]) => ({ vendor, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.vendor.localeCompare(b.vendor);
    });

  return {
    total_records: total,
    rows,
    per_source_kind: perSourceKind,
    per_vendor: perVendor,
  };
}
