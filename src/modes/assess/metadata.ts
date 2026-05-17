/**
 * V1Z — ASSESS metadata helpers (pure, deterministic, immutable).
 *
 * All metadata surfaced by `AssessMetadataHeader` comes through this
 * module. The loaded `BatchRunExport` artifact is treated as
 * read-only input; helpers must never mutate it.
 *
 * Honesty rules (binding, mirror ASSESS_SURFACE_CONTRACT §V1Z):
 *   - Every value traces to a field on `BatchRunExport` or to the
 *     loaded file handle's name. No invented current-state, no
 *     inferred network state, no freshness/risk/score computation.
 *   - Missing optional metadata is reported explicitly (`null`
 *     value + present `label`); rendering decides whether to show
 *     "not recorded" or omit. Helpers don't fabricate placeholders.
 *   - Version comparison is literal: an export_version is supported
 *     iff it appears in `SUPPORTED_EXPORT_VERSIONS`. Validator,
 *     rule-pack, and parser versions are surfaced as artifact
 *     metadata only — no frontend-local "current" exists for them,
 *     so no comparison is performed.
 */

import type {
  BatchRunExport,
  BatchRunExportDevice,
} from "../../types/batchRunExport";

/**
 * Frontend-local list of `export_version` values the V1Z loader
 * accepts. Mirrors the literal check in `loadBatchRunJson.ts`.
 * Adding a value here without a corresponding loader update is a
 * bug; see ASSESS_SURFACE_CONTRACT §V1Z.
 */
export const SUPPORTED_EXPORT_VERSIONS: ReadonlyArray<number> = [1];

export function isExportVersionSupported(v: unknown): boolean {
  return typeof v === "number" && SUPPORTED_EXPORT_VERSIONS.includes(v);
}

// -----------------------------------------------------------------------------
// Source description
// -----------------------------------------------------------------------------

/**
 * Plain-text describe of `artifact.source`. Returns the
 * archive name / file name when the source carries one, or
 * `"pasted input"` for the paste variant. Never invents a value.
 */
export function describeSource(artifact: BatchRunExport): string {
  const s = artifact.source;
  switch (s.kind) {
    case "paste":
      return "pasted input";
    case "file":
      return s.filename;
    case "archive":
      return s.archive_name;
  }
}

// -----------------------------------------------------------------------------
// Parser / platform grouping
// -----------------------------------------------------------------------------

export interface ParserPlatformGroup {
  /** `platform_id` from `selected_platform`, or `null` when the
   *  device's platform was not recorded on the export. */
  readonly platform_id: string | null;
  /** `vendor` from `selected_platform`, or `null`. */
  readonly vendor: string | null;
  /** Set of distinct `parser_version` strings observed across the
   *  group's devices. The artifact omits per-device parser version
   *  on `BatchRunExportDevice` directly; this set is derived from
   *  `validation_report.context.parser_version` when present. */
  readonly parser_versions: ReadonlyArray<string>;
  /** Count of devices in the group. */
  readonly device_count: number;
}

/**
 * Group devices by `(platform_id, vendor)`. Within each group,
 * collect the distinct parser versions observed via the per-device
 * validation report's `context.parser_version`.
 *
 * - Devices without a `selected_platform` form a single
 *   "unknown platform" group keyed by `(null, null)`.
 * - Devices whose parser version is absent contribute nothing to
 *   the group's `parser_versions` set; the absence is honest.
 * - Group order is stable: insertion order over the device array,
 *   with the unknown-platform group appearing wherever its first
 *   member did.
 */
export function parserPlatformGroups(
  artifact: BatchRunExport,
): ReadonlyArray<ParserPlatformGroup> {
  interface Bucket {
    platform_id: string | null;
    vendor: string | null;
    parser_versions: Set<string>;
    device_count: number;
  }
  const buckets = new Map<string, Bucket>();
  const order: string[] = [];
  for (const d of artifact.devices) {
    const platform_id = d.selected_platform?.platform_id ?? null;
    const vendor = d.selected_platform?.vendor ?? null;
    const key = `${platform_id ?? ""}::${vendor ?? ""}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        platform_id,
        vendor,
        parser_versions: new Set<string>(),
        device_count: 0,
      };
      buckets.set(key, b);
      order.push(key);
    }
    b.device_count += 1;
    const pv = parserVersionFor(d);
    if (pv !== null) b.parser_versions.add(pv);
  }
  return order.map((k) => {
    const b = buckets.get(k)!;
    return {
      platform_id: b.platform_id,
      vendor: b.vendor,
      parser_versions: [...b.parser_versions].sort(),
      device_count: b.device_count,
    };
  });
}

function parserVersionFor(d: BatchRunExportDevice): string | null {
  return d.validation_report?.context?.parser_version ?? null;
}

// -----------------------------------------------------------------------------
// Metadata rows
// -----------------------------------------------------------------------------

/**
 * Rendered as a single labelled line in `AssessMetadataHeader`.
 * `value === null` means the artifact does not carry the field and
 * the component will render the configured missing-field label.
 */
export interface MetadataRow {
  readonly label: string;
  readonly value: string | null;
}

/**
 * Derive the metadata rows surfaced by `AssessMetadataHeader`.
 * Input is the loaded artifact + the loader-provided filename.
 *
 * Rows always present (filename, export version, supported flag,
 * generated-by stage, source, device count) come straight from
 * artifact fields and the loader-provided filename. Optional rows
 * (validator/rule-pack/parser/registry versions) are emitted with
 * `value === null` when absent so the consumer can render "not
 * recorded" instead of dropping the label silently.
 */
export function metadataRows(
  artifact: BatchRunExport,
  filename: string,
): ReadonlyArray<MetadataRow> {
  const v = artifact.versions;
  const out: MetadataRow[] = [
    { label: "File", value: filename },
    {
      label: "Export version",
      value: `${artifact.export_version}${
        isExportVersionSupported(artifact.export_version)
          ? " (supported)"
          : " (unsupported)"
      }`,
    },
    {
      label: "Generated by",
      value: `${artifact.generated_by.app_name} · ${artifact.generated_by.stage}`,
    },
    { label: "Source", value: describeSource(artifact) },
    {
      label: "Devices",
      value: String(artifact.devices.length),
    },
    {
      label: "Validator version(s)",
      value: joinNumberArray(v.validator_versions),
    },
    {
      label: "Rule pack version(s)",
      value: joinNumberArray(v.rule_pack_versions),
    },
    {
      label: "Parser version(s)",
      value: joinStringArray(v.parser_versions),
    },
    {
      label: "Registry version(s)",
      value: joinStringArray(v.registry_versions),
    },
  ];
  return out;
}

function joinNumberArray(xs: ReadonlyArray<number>): string | null {
  if (xs.length === 0) return null;
  return xs.map((n) => `v${n}`).join(", ");
}

function joinStringArray(xs: ReadonlyArray<string>): string | null {
  if (xs.length === 0) return null;
  return xs.join(", ");
}

/**
 * Operator-facing label used when an optional metadata row's value
 * is `null`. Centralised so renderers stay consistent.
 */
export const MISSING_METADATA_LABEL = "not recorded";
