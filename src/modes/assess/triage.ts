/**
 * V1X — ASSESS triage helpers (pure, deterministic, immutable).
 *
 * All filtering, grouping, and identity derivation lives here. The
 * loaded `BatchRunExport` artifact is treated as read-only input;
 * helpers must never mutate it.
 *
 * Honesty rules (binding, mirror ASSESS_SURFACE_CONTRACT §V1X):
 *   - Counts shown on chips come from helpers in this file, not
 *     ad-hoc JSX expressions.
 *   - Helpers regroup or hide rows; they do not transform finding
 *     content.
 *   - Whole-artifact totals must use `artifact.summary.*` directly.
 *   - Filter-visible counts are clearly distinct from whole totals
 *     at the call site.
 */

import type {
  BatchRunExport,
  BatchRunExportDevice,
  BatchRunExportFinding,
} from "../../types/batchRunExport";
import type { Severity } from "../../types/validator";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const SEVERITY_ORDER: ReadonlyArray<Severity> = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

/**
 * Extra "categories" treated as severity-chip options when the
 * artifact contains data for them. They sit alongside the five real
 * severities but represent device-level facts, not finding
 * severities.
 */
export type SeverityChip = Severity | "clean" | "skipped";

// -----------------------------------------------------------------------------
// Device identity
// -----------------------------------------------------------------------------

export interface DeviceIdentity {
  readonly slice_id: string;
  readonly hostname: string | null;
  readonly platform_id: string | null;
  readonly vendor: string | null;
  readonly os_family: string | null;
  readonly stage_status: BatchRunExportDevice["stage_status"];
  readonly source_filename: string | null;
  readonly entry_path: string | null;
  readonly archive_name: string | null;
  readonly findingCount: number;
  readonly highestSeverity: Severity | null;
  readonly hasSkippedRules: boolean;
  readonly isClean: boolean;
}

export function deviceIdentity(d: BatchRunExportDevice): DeviceIdentity {
  const findings = d.validation_report?.findings ?? [];
  const skipped = d.validation_report?.skipped_rules ?? [];
  let highest: Severity | null = null;
  let highestRank = 0;
  for (const f of findings) {
    const rank = SEVERITY_RANK[f.severity];
    if (rank > highestRank) {
      highestRank = rank;
      highest = f.severity;
    }
  }
  const isClean =
    d.stage_status === "complete" &&
    d.validation_report !== null &&
    findings.length === 0 &&
    skipped.length === 0;
  return {
    slice_id: d.slice_id,
    hostname: d.hostname_hint,
    platform_id: d.selected_platform?.platform_id ?? null,
    vendor: d.selected_platform?.vendor ?? null,
    os_family: d.selected_platform?.os_family ?? null,
    stage_status: d.stage_status,
    source_filename: d.source_provenance?.entry_path ?? null,
    entry_path: d.source_provenance?.entry_path ?? null,
    archive_name: d.source_provenance?.archive_name ?? null,
    findingCount: findings.length,
    highestSeverity: highest,
    hasSkippedRules: skipped.length > 0,
    isClean,
  };
}

// -----------------------------------------------------------------------------
// Default expansion
// -----------------------------------------------------------------------------

/**
 * Devices with findings expand by default. Clean / skipped / failed
 * devices collapse by default. Returns a frozen Set keyed by
 * slice_id.
 */
export function defaultExpandedSliceIds(
  artifact: BatchRunExport,
): ReadonlySet<string> {
  const out = new Set<string>();
  for (const d of artifact.devices) {
    const id = deviceIdentity(d);
    if (id.findingCount > 0) out.add(id.slice_id);
  }
  return out;
}

// -----------------------------------------------------------------------------
// Chip option derivation
// -----------------------------------------------------------------------------

/**
 * Set of severity-chip options that have at least one device's
 * worth of representation in the loaded artifact. Ordered: real
 * severities (critical→info) first, then `clean`, then `skipped`.
 */
export function presentSeverityChips(
  artifact: BatchRunExport,
): ReadonlyArray<SeverityChip> {
  const present = new Set<SeverityChip>();
  for (const d of artifact.devices) {
    const id = deviceIdentity(d);
    if (id.isClean) present.add("clean");
    if (id.hasSkippedRules) present.add("skipped");
    for (const f of d.validation_report?.findings ?? []) {
      present.add(f.severity);
    }
  }
  const out: SeverityChip[] = [];
  for (const s of SEVERITY_ORDER) if (present.has(s)) out.push(s);
  if (present.has("clean")) out.push("clean");
  if (present.has("skipped")) out.push("skipped");
  return out;
}

/**
 * Distinct rule IDs that appear in any device's findings, sorted
 * ascending.
 */
export function distinctRuleIds(
  artifact: BatchRunExport,
): ReadonlyArray<string> {
  const set = new Set<string>();
  for (const d of artifact.devices) {
    for (const f of d.validation_report?.findings ?? []) {
      set.add(f.rule_id);
    }
  }
  return [...set].sort();
}

// -----------------------------------------------------------------------------
// Filter / search application
// -----------------------------------------------------------------------------

export interface TriageFilters {
  readonly search: string;
  readonly severities: ReadonlySet<SeverityChip>;
  readonly ruleIds: ReadonlySet<string>;
}

export const EMPTY_FILTERS: TriageFilters = {
  search: "",
  severities: new Set<SeverityChip>(),
  ruleIds: new Set<string>(),
};

export function filtersAreActive(filters: TriageFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.severities.size > 0 ||
    filters.ruleIds.size > 0
  );
}

/**
 * Decide whether a single finding survives the active filters.
 * Severity OR rule filters require a match; search matches any of
 * rule_id / title; if no search and no rule/severity filter is
 * active for findings, all findings pass.
 */
export function findingMatches(
  f: BatchRunExportFinding,
  filters: TriageFilters,
): boolean {
  if (filters.severities.size > 0) {
    // Only the real severity members of the chip set narrow
    // findings; `clean` and `skipped` are device-level chips that
    // do not constrain individual finding rows. If only device-
    // level chips are selected, findings are unconstrained here.
    const sevSet = new Set<Severity>();
    for (const s of filters.severities) {
      if (s !== "clean" && s !== "skipped") sevSet.add(s);
    }
    if (sevSet.size > 0 && !sevSet.has(f.severity)) return false;
  }
  if (filters.ruleIds.size > 0 && !filters.ruleIds.has(f.rule_id)) {
    return false;
  }
  const q = filters.search.trim().toLowerCase();
  if (q.length > 0) {
    const hay = `${f.rule_id} ${f.title}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export interface VisibleDevice {
  readonly device: BatchRunExportDevice;
  readonly identity: DeviceIdentity;
  readonly visibleFindings: ReadonlyArray<BatchRunExportFinding>;
}

/**
 * Apply filters + search across the artifact's devices. Returns a
 * fresh array whose entries hold the original device reference, its
 * derived identity, and the subset of findings the operator should
 * see. No input mutation.
 *
 * Visibility rules:
 *   - Search may match device identity strings (hostname / slice /
 *     platform / vendor / entry_path / archive) OR finding strings
 *     (rule_id / title). A device is "identity-matched" if the
 *     query matches its identity strings only.
 *   - Severity/rule filters constrain findings. A device with no
 *     surviving findings is hidden when filters are active, unless
 *     the device-level `clean` or `skipped` chip is selected and
 *     the device qualifies for that chip.
 *   - With no filters active, every device is visible with all its
 *     findings.
 */
export function applyTriage(
  artifact: BatchRunExport,
  filters: TriageFilters,
): ReadonlyArray<VisibleDevice> {
  const active = filtersAreActive(filters);
  const q = filters.search.trim().toLowerCase();
  const wantClean = filters.severities.has("clean");
  const wantSkipped = filters.severities.has("skipped");
  const sevOnlyDeviceChips =
    filters.severities.size > 0 &&
    [...filters.severities].every((s) => s === "clean" || s === "skipped");

  const out: VisibleDevice[] = [];
  for (const d of artifact.devices) {
    const identity = deviceIdentity(d);
    const identityHit = q.length > 0 && deviceIdentityMatches(identity, q);
    const findings = d.validation_report?.findings ?? [];
    const visibleFindings = findings.filter((f) => findingMatches(f, filters));

    if (!active) {
      out.push({ device: d, identity, visibleFindings: findings });
      continue;
    }

    const deviceChipHit =
      (wantClean && identity.isClean) ||
      (wantSkipped && identity.hasSkippedRules);

    // When only device-level chips are selected, devices qualify
    // by chip membership; otherwise they must have surviving
    // findings or be an identity-search hit.
    if (sevOnlyDeviceChips && filters.ruleIds.size === 0 && q.length === 0) {
      if (deviceChipHit) {
        out.push({ device: d, identity, visibleFindings: findings });
      }
      continue;
    }

    if (visibleFindings.length > 0 || deviceChipHit) {
      out.push({ device: d, identity, visibleFindings });
      continue;
    }

    if (identityHit && filters.severities.size === 0 && filters.ruleIds.size === 0) {
      // Pure identity search: keep the device with no findings
      // visible so the operator sees the match context.
      out.push({ device: d, identity, visibleFindings: [] });
    }
  }
  return out;
}

function deviceIdentityMatches(id: DeviceIdentity, q: string): boolean {
  const parts: Array<string | null> = [
    id.slice_id,
    id.hostname,
    id.platform_id,
    id.vendor,
    id.os_family,
    id.entry_path,
    id.archive_name,
  ];
  for (const p of parts) {
    if (p && p.toLowerCase().includes(q)) return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// Counts
// -----------------------------------------------------------------------------

export type SeverityChipCounts = ReadonlyMap<SeverityChip, number>;

/**
 * Per-chip count derived from the unfiltered artifact. These are
 * the totals shown beside chip labels — they reflect what is in the
 * file, not what is currently visible.
 *
 * For real severities: total finding count of that severity across
 * all devices. For `clean`: count of clean devices. For `skipped`:
 * count of devices with at least one skipped rule.
 */
export function severityChipCounts(
  artifact: BatchRunExport,
): SeverityChipCounts {
  const map = new Map<SeverityChip, number>();
  for (const s of SEVERITY_ORDER) map.set(s, 0);
  let cleanCount = 0;
  let skippedDeviceCount = 0;
  for (const d of artifact.devices) {
    const id = deviceIdentity(d);
    if (id.isClean) cleanCount += 1;
    if (id.hasSkippedRules) skippedDeviceCount += 1;
    for (const f of d.validation_report?.findings ?? []) {
      map.set(f.severity, (map.get(f.severity) ?? 0) + 1);
    }
  }
  map.set("clean", cleanCount);
  map.set("skipped", skippedDeviceCount);
  return map;
}

/**
 * Per-rule-ID finding count across the artifact. Stable order
 * matches `distinctRuleIds`.
 */
export function ruleIdCounts(
  artifact: BatchRunExport,
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const d of artifact.devices) {
    for (const f of d.validation_report?.findings ?? []) {
      map.set(f.rule_id, (map.get(f.rule_id) ?? 0) + 1);
    }
  }
  return map;
}

// -----------------------------------------------------------------------------
// By-severity grouping
// -----------------------------------------------------------------------------

export interface SeverityGroupRow {
  readonly identity: DeviceIdentity;
  readonly finding: BatchRunExportFinding;
}

export interface SeverityGroup {
  readonly severity: Severity;
  readonly rows: ReadonlyArray<SeverityGroupRow>;
}

/**
 * Regroup the visible findings under severity headings. Severities
 * appear in `SEVERITY_ORDER`; groups with zero rows are omitted.
 * No new totals are invented; this is a re-window over the same
 * finding objects emitted by `applyTriage`.
 */
export function groupBySeverity(
  visible: ReadonlyArray<VisibleDevice>,
): ReadonlyArray<SeverityGroup> {
  const buckets = new Map<Severity, SeverityGroupRow[]>();
  for (const s of SEVERITY_ORDER) buckets.set(s, []);
  for (const v of visible) {
    for (const f of v.visibleFindings) {
      buckets.get(f.severity)!.push({ identity: v.identity, finding: f });
    }
  }
  const out: SeverityGroup[] = [];
  for (const s of SEVERITY_ORDER) {
    const rows = buckets.get(s)!;
    if (rows.length > 0) out.push({ severity: s, rows });
  }
  return out;
}
