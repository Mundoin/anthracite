/**
 * D3A — Cortex catalogue adapter (Worker D).
 *
 * Pure module: ModeCatalogue → flat CortexEntry[] suitable for Cortex search/jump.
 *
 * Exported API:
 *   - buildCortexIndex(catalogue) — pure expansion of catalogue into searchable entries
 *   - getCortexIndex(catalogue) — memoized wrapper (same version+identity = same reference)
 *   - searchCortexIndex(index, query) — substring filter on label + breadcrumb
 *   - groupCortexEntries(entries) — scope-based sectioning (modes, tools, workflows, surfaces, groups, foot)
 *
 * No React. No I/O. No state. Pure & deterministic.
 *
 * Obeys D3_NAV_SPEC §7 (Cortex jump — Concept D behaviour).
 */

import type {
  CatalogueState,
  ChildKind,
  ModeBadges,
  ModeCatalogue,
} from "../../contracts/modeCatalogue";

// ============================================================================
// Type definitions — match §7 spec exactly.
// ============================================================================

export type CortexScope = "modes" | "tools" | "workflows" | "surfaces" | "groups" | "foot";

export interface CortexModeEntry {
  readonly kind: "mode";
  readonly entryId: string;
  readonly modeId: string;
  readonly label: string;
  readonly iconId: string;
  readonly state: CatalogueState;
  readonly badges?: ModeBadges;
  readonly breadcrumb: readonly string[]; // [group, mode.label]
  readonly scope: CortexScope; // "modes"
  readonly deferredReason?: string;
  readonly blockedReason?: string;
}

export interface CortexChildEntry {
  readonly kind: "child";
  readonly entryId: string;
  readonly modeId: string;
  readonly childPath: readonly string[];
  readonly label: string;
  readonly iconId: string;
  readonly state: CatalogueState;
  readonly childKind: ChildKind;
  readonly breadcrumb: readonly string[]; // [group, mode.label, ...ancestor labels, child.label]
  readonly depth: number;
  readonly badge?: number;
  readonly scope: CortexScope; // derived from kind
  readonly deferredReason?: string;
  readonly blockedReason?: string;
}

export interface CortexFootEntry {
  readonly kind: "foot";
  readonly entryId: string;
  readonly modeId: string;
  readonly label: string;
  readonly iconId: string;
  readonly state: CatalogueState;
  readonly breadcrumb: readonly string[]; // ["Foot", foot.label]
  readonly scope: CortexScope; // "foot"
}

export type CortexEntry = CortexModeEntry | CortexChildEntry | CortexFootEntry;

// ============================================================================
// Core builder — pure projection.
// ============================================================================

/**
 * Pure: ModeCatalogue → readonly CortexEntry[]. Stable order:
 *   1. all mode entries in catalogue order
 *   2. all flattened child entries in DFS pre-order under their mode
 *   3. all foot entries in foot order
 *
 * Each mode block is emitted BEFORE its children. Children appear depth-first.
 */
export function buildCortexIndex(catalogue: ModeCatalogue): readonly CortexEntry[] {
  const out: CortexEntry[] = [];

  // Emit all modes first
  for (const mode of catalogue.modes) {
    out.push({
      kind: "mode",
      entryId: mode.id,
      modeId: mode.id,
      label: mode.label,
      iconId: mode.iconId,
      state: mode.state,
      badges: mode.badges,
      breadcrumb: [mode.group, mode.label],
      scope: "modes",
      deferredReason: mode.deferredReason,
      blockedReason: mode.blockedReason,
    });
  }

  // Emit all child entries in DFS pre-order under their modes
  for (const mode of catalogue.modes) {
    walkChildrenForCortex(
      mode.children,
      mode.id,
      [mode.group, mode.label],
      [],
      1,
      mode.iconId,
      out,
    );
  }

  // Emit all foot entries
  for (const foot of catalogue.foot) {
    out.push({
      kind: "foot",
      entryId: `foot/${foot.id}`,
      modeId: foot.id,
      label: foot.label,
      iconId: foot.iconId,
      state: foot.state,
      breadcrumb: ["Foot", foot.label],
      scope: "foot",
    });
  }

  return out;
}

function walkChildrenForCortex(
  children: readonly any[] | undefined,
  modeId: string,
  baseBreadcrumb: readonly string[],
  basePath: readonly string[],
  depth: number,
  modeIconId: string,
  out: CortexEntry[],
): void {
  if (!children) return;
  for (const child of children) {
    const path = [...basePath, child.id];
    const breadcrumb = [...baseBreadcrumb, child.label];
    const scope = scopeFromKind(child.kind);

    out.push({
      kind: "child",
      entryId: `${modeId}/${path.join("/")}`,
      modeId,
      childPath: path,
      label: child.label,
      iconId: child.iconId ?? modeIconId, // fallback to mode's icon
      state: child.state,
      childKind: child.kind,
      breadcrumb,
      depth,
      badge: child.badge,
      scope,
      deferredReason: child.deferredReason,
      blockedReason: child.blockedReason,
    });

    // Recurse into children (DFS pre-order)
    walkChildrenForCortex(child.children, modeId, breadcrumb, path, depth + 1, modeIconId, out);
  }
}

function scopeFromKind(kind: ChildKind): CortexScope {
  switch (kind) {
    case "workflow":
      return "workflows";
    case "tool":
      return "tools";
    case "surface":
      return "surfaces";
    case "group":
      return "groups";
    default:
      return "groups"; // fallback
  }
}

// ============================================================================
// Memoization — WeakMap keyed on catalogue identity.
// ============================================================================

const memo = new WeakMap<ModeCatalogue, readonly CortexEntry[]>();

/**
 * Cheap memo helper keyed on catalogue version. Re-emits the same array reference
 * for the same version+identity. Use a single module-private WeakMap.
 * Pure (no observable side effects).
 */
export function getCortexIndex(catalogue: ModeCatalogue): readonly CortexEntry[] {
  let cached = memo.get(catalogue);
  if (!cached) {
    cached = buildCortexIndex(catalogue);
    memo.set(catalogue, cached);
  }
  return cached;
}

// ============================================================================
// Search helper — case-insensitive substring matching.
// ============================================================================

/**
 * Filter helper — case-insensitive substring match on label OR any breadcrumb segment.
 * Returns entries that match. Stable order preserved from buildCortexIndex.
 * Empty query returns the full index.
 */
export function searchCortexIndex(
  index: readonly CortexEntry[],
  query: string,
): readonly CortexEntry[] {
  if (!query || query.length === 0) {
    return index;
  }

  const normalized = query.toLowerCase();
  return index.filter((entry) => {
    const labelMatch = entry.label.toLowerCase().includes(normalized);
    const breadcrumbMatch = entry.breadcrumb.some((seg) =>
      seg.toLowerCase().includes(normalized),
    );
    return labelMatch || breadcrumbMatch;
  });
}

// ============================================================================
// Grouping helper — scope-based sectioning.
// ============================================================================

export interface CortexSection {
  readonly scope: CortexScope;
  readonly heading: string; // "MODES" | "WORKFLOWS" | "TOOLS" | "SURFACES" | "GROUPS" | "FOOT"
  readonly entries: readonly CortexEntry[];
}

const SECTION_ORDER: readonly CortexScope[] = [
  "modes",
  "workflows",
  "tools",
  "surfaces",
  "groups",
  "foot",
];

const SECTION_HEADINGS: Record<CortexScope, string> = {
  modes: "MODES",
  workflows: "WORKFLOWS",
  tools: "TOOLS",
  surfaces: "SURFACES",
  groups: "GROUPS",
  foot: "FOOT",
};

/**
 * Section grouping helper — bucket the entries by scope in a fixed order:
 *   modes, workflows, tools, surfaces, groups, foot
 * Returns ordered sections. Sections with zero entries are omitted.
 */
export function groupCortexEntries(
  entries: readonly CortexEntry[],
): readonly CortexSection[] {
  const buckets: Record<CortexScope, CortexEntry[]> = {
    modes: [],
    workflows: [],
    tools: [],
    surfaces: [],
    groups: [],
    foot: [],
  };

  for (const entry of entries) {
    buckets[entry.scope].push(entry);
  }

  return SECTION_ORDER
    .map((scope) => ({
      scope,
      heading: SECTION_HEADINGS[scope],
      entries: buckets[scope],
    }))
    .filter((s) => s.entries.length > 0);
}
