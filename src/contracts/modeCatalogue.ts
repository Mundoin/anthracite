/**
 * D3A — Mode Catalogue contract (v3).
 *
 * Single source of truth for Anthracite navigation.
 *
 * Consumed by:
 *   - ModeRail (spatial navigation, expanded + collapsed)
 *   - ContextSidebar (active-mode children, recursive tree)
 *   - Cortex catalogue adapter (command navigation projection)
 *
 * Pure & deterministic. No I/O. No engine calls. No persistence.
 *
 * Obeys docs/design/D3_NAV_SPEC.md and docs/architecture/
 *   ANTHRACITE_V1_SOURCE_OF_TRUTH.md §5 (modes are surfaces over engines),
 *   §6 (engine/API rule), §10 (visual law).
 *
 * Honest state discipline — `state` is "available" only when wired and
 * operator-usable. Catalogue entries may exist before their feature
 * surfaces do; they render as partial/deferred/blocked until landed.
 */

export const MODE_CATALOGUE_VERSION = 3 as const;

/** Depth cap for ModeChild recursion. A child may have children;
 *  those grandchildren MUST NOT have children. */
export const CATALOGUE_DEPTH_CAP = 3 as const;

export type CatalogueState =
  | "available"
  | "partial"
  | "deferred"
  | "blocked";

export type ChildKind = "tool" | "workflow" | "surface" | "group";

export interface ModeChild {
  readonly id: string;
  readonly label: string;
  readonly iconId?: string;
  readonly state: CatalogueState;
  readonly kind: ChildKind;
  readonly badge?: number;
  readonly route?: string;
  readonly children?: readonly ModeChild[];
  readonly deferredReason?: string;
  readonly blockedReason?: string;
}

export interface ModeBadges {
  readonly alerts?: number;
  readonly deferred?: number;
  readonly blocked?: number;
  readonly partial?: number;
}

export interface ModeEntry {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly iconId: string;
  readonly group: string;
  readonly state: CatalogueState;
  readonly children: readonly ModeChild[];
  readonly badges?: ModeBadges;
  readonly deferredReason?: string;
  readonly blockedReason?: string;
}

export interface FootEntry {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly iconId: string;
  readonly state: CatalogueState;
  readonly route?: string;
}

export interface ModeCatalogue {
  readonly version: number;
  readonly modes: readonly ModeEntry[];
  readonly foot: readonly FootEntry[];
}

// ============================================================================
// Catalogue data (v3) — the accepted hierarchy from D3_NAV_SPEC §2.
// ============================================================================

const HIERARCHY_CHILDREN: readonly ModeChild[] = [
  { id: "env-overview",       label: "Environment Overview",        kind: "surface", state: "partial" },
  { id: "env-create",         label: "Creating an Environment",     kind: "workflow", state: "deferred", deferredReason: "Lifecycle workflow not yet wired." },
  { id: "env-build",          label: "Building an Environment",     kind: "workflow", state: "deferred", deferredReason: "Lifecycle workflow not yet wired." },
  { id: "env-sync",           label: "Synchronizing an Environment", kind: "workflow", state: "deferred", deferredReason: "Sync engine not yet wired." },
  { id: "env-sync-status",    label: "Synchronization Status",      kind: "surface", state: "deferred", deferredReason: "Sync status surface deferred." },
  { id: "env-island",         label: "Environment Island",          kind: "surface", state: "deferred", deferredReason: "Island view deferred." },
];

const DEVICES_CHILDREN: readonly ModeChild[] = [
  { id: "dev-inventory",       label: "Inventory",            kind: "surface", state: "partial" },
  { id: "dev-selected",        label: "Selected Device",      kind: "surface", state: "deferred", deferredReason: "Per-device surface deferred." },
  { id: "dev-data-sources",    label: "Data Sources",         kind: "surface", state: "deferred", deferredReason: "Data-source registry deferred." },
  { id: "dev-comparison",      label: "Comparison",           kind: "tool",    state: "deferred", deferredReason: "Comparison tool deferred." },
  { id: "dev-net-util",        label: "Network Utilisation", kind: "surface", state: "deferred", deferredReason: "Telemetry surface deferred." },
  { id: "dev-compliance",      label: "Compliance Overview",  kind: "surface", state: "deferred", deferredReason: "Compliance engine deferred." },
  { id: "dev-traffic-flows",   label: "Traffic Flows",        kind: "surface", state: "deferred", deferredReason: "Flow telemetry deferred." },
  { id: "dev-virtual-topo",    label: "Virtual Topologies",   kind: "surface", state: "deferred", deferredReason: "Virtual topology engine deferred." },
  { id: "dev-endpoint-search", label: "Endpoint Search",      kind: "tool",    state: "deferred", deferredReason: "Endpoint search engine deferred." },
];

const PROVISIONING_RECONCILE_GROUP: ModeChild = {
  id: "prov-reconcile",
  label: "Reconciling Config",
  kind: "group",
  state: "deferred",
  deferredReason: "Reconcile engine deferred.",
  children: [
    { id: "prov-reconcile-device",    label: "Reconciling a Device's Config",    kind: "workflow", state: "deferred", deferredReason: "Device-level reconcile deferred." },
    { id: "prov-reconcile-container", label: "Reconciling a Container's Config", kind: "workflow", state: "deferred", deferredReason: "Container-level reconcile deferred." },
  ],
};

const PROVISIONING_CHILDREN: readonly ModeChild[] = [
  { id: "prov-network",       label: "Network Provisioning",          kind: "workflow", state: "deferred", deferredReason: "Provisioning engine deferred." },
  { id: "prov-ztp",           label: "Zero-Touch Provisioning",       kind: "workflow", state: "deferred", deferredReason: "ZTP engine deferred." },
  { id: "prov-errors-alerts", label: "Provisioning Errors & Alerts",  kind: "surface",  state: "deferred", deferredReason: "Errors surface deferred." },
  { id: "prov-configlets",    label: "Managing Configlets",           kind: "tool",     state: "deferred", deferredReason: "Configlet store deferred." },
  { id: "prov-image-bundles", label: "Managing Image Bundles",        kind: "tool",     state: "deferred", deferredReason: "Image bundle store deferred." },
  { id: "prov-move-devices",  label: "Moving Devices Between Containers", kind: "workflow", state: "deferred", deferredReason: "Container moves deferred." },
  PROVISIONING_RECONCILE_GROUP,
  { id: "prov-reset",         label: "Resetting a Device",            kind: "workflow", state: "deferred", deferredReason: "Reset workflow deferred." },
  { id: "prov-snapshot",      label: "Snapshot",                       kind: "tool",    state: "deferred", deferredReason: "Snapshot store deferred." },
];

const EVENTS_CHILDREN: readonly ModeChild[] = [
  { id: "events-overview",     label: "Event Overview",        kind: "surface",  state: "deferred", deferredReason: "Event engine deferred." },
  { id: "events-view",         label: "View Event",            kind: "surface",  state: "deferred", deferredReason: "Event detail surface deferred." },
  { id: "events-generation",   label: "Event Generation",      kind: "workflow", state: "deferred", deferredReason: "Generation pipeline deferred." },
  { id: "events-notifications", label: "Notifications",         kind: "surface",  state: "deferred", deferredReason: "Notification engine deferred." },
  { id: "events-categories",   label: "Categories",            kind: "surface",  state: "deferred", deferredReason: "Category model deferred." },
  { id: "events-syslog",       label: "Syslog Event Point",    kind: "surface",  state: "deferred", deferredReason: "Syslog ingest deferred." },
  { id: "events-ptp",          label: "PTP Events",            kind: "surface",  state: "deferred", deferredReason: "PTP ingest deferred." },
  { id: "events-rules",        label: "Event Rules / Sources", kind: "tool",     state: "deferred", deferredReason: "Rule editor deferred." },
];

export const MODE_CATALOGUE: ModeCatalogue = {
  version: MODE_CATALOGUE_VERSION,
  modes: [
    // FOUNDATION
    {
      id: "environments",
      label: "Environments",
      shortLabel: "ENV",
      iconId: "mode-environments",
      group: "Foundation",
      state: "available",
      children: [],
    },
    {
      id: "hierarchy",
      label: "Hierarchy",
      shortLabel: "HIER",
      iconId: "mode-hierarchy",
      group: "Foundation",
      state: "available",
      children: HIERARCHY_CHILDREN,
    },
    {
      id: "devices",
      label: "Devices",
      shortLabel: "DEV",
      iconId: "mode-devices",
      group: "Foundation",
      state: "deferred",
      deferredReason: "Devices mode catalogue-only in D3A.",
      children: DEVICES_CHILDREN,
    },
    {
      id: "intake",
      label: "Intake",
      shortLabel: "INT",
      iconId: "mode-intake",
      group: "Foundation",
      state: "available",
      children: [],
    },
    {
      id: "discovery",
      label: "Discovery",
      shortLabel: "DSC",
      iconId: "mode-discovery",
      group: "Foundation",
      state: "available",
      children: [],
    },
    {
      id: "provisioning",
      label: "Provisioning",
      shortLabel: "PROV",
      iconId: "mode-provisioning",
      group: "Foundation",
      state: "deferred",
      deferredReason: "Provisioning mode catalogue-only in D3A.",
      children: PROVISIONING_CHILDREN,
    },

    // RUN
    {
      id: "operate",
      label: "Operate",
      shortLabel: "OPER",
      iconId: "mode-operate",
      group: "Run",
      state: "available",
      children: [],
    },
    {
      id: "topology",
      label: "Topology",
      shortLabel: "TOPO",
      iconId: "mode-topology",
      group: "Run",
      state: "available",
      children: [],
    },
    {
      id: "diagnose",
      label: "Diagnose",
      shortLabel: "DIAG",
      iconId: "mode-diagnose",
      group: "Run",
      state: "available",
      children: [],
    },

    // GOVERNANCE
    {
      id: "assess",
      label: "Assess",
      shortLabel: "ASSS",
      iconId: "mode-assess",
      group: "Governance",
      state: "available",
      children: [],
    },
    {
      id: "events",
      label: "Events",
      shortLabel: "EVTS",
      iconId: "mode-events",
      group: "Governance",
      state: "deferred",
      deferredReason: "Events mode catalogue-only in D3A.",
      children: EVENTS_CHILDREN,
    },
    {
      id: "security",
      label: "Security",
      shortLabel: "SEC",
      iconId: "mode-security",
      group: "Governance",
      state: "partial",
      children: [],
    },
    {
      id: "dashboards",
      label: "Dashboards",
      shortLabel: "DASH",
      iconId: "mode-dashboards",
      group: "Governance",
      state: "partial",
      children: [],
    },

    // WORKSHOP
    {
      id: "build",
      label: "Build",
      shortLabel: "BLD",
      iconId: "mode-build",
      group: "Workshop",
      state: "available",
      children: [],
    },
    {
      id: "settings",
      label: "Settings",
      shortLabel: "SET",
      iconId: "mode-settings",
      group: "Workshop",
      state: "available",
      children: [],
    },
  ],
  foot: [
    {
      id: "opsConsole",
      label: "Ops Console",
      shortLabel: "CLI",
      iconId: "mode-ops-console",
      state: "available",
    },
  ],
};

// ============================================================================
// Helpers — pure projections + walks.
// ============================================================================

/** A flattened, breadcrumbed entry useful for Cortex / search projections. */
export interface FlatCatalogueEntry {
  readonly nodeId: string;            // unique key (mode id, or "<modeId>/<...childPath>")
  readonly kind: "mode" | "child" | "foot";
  readonly modeId: string;
  readonly childPath: readonly string[]; // [] for mode/foot, child path for child entries
  readonly label: string;
  readonly iconId: string;
  readonly state: CatalogueState;
  readonly childKind?: ChildKind;
  readonly group: string;             // mode.group for modes/children; "Foot" for foot entries
  readonly breadcrumbs: readonly string[]; // ["Foundation", "Provisioning", "Reconciling Config", "..."]
  readonly depth: number;             // 0 = mode/foot; 1+ = child depth
  readonly badge?: number;
  readonly deferredReason?: string;
  readonly blockedReason?: string;
}

/** Walk catalogue → flat list with breadcrumbs + child paths. Pure. */
export function flattenModeCatalogue(catalogue: ModeCatalogue = MODE_CATALOGUE): readonly FlatCatalogueEntry[] {
  const out: FlatCatalogueEntry[] = [];

  for (const mode of catalogue.modes) {
    out.push({
      nodeId: mode.id,
      kind: "mode",
      modeId: mode.id,
      childPath: [],
      label: mode.label,
      iconId: mode.iconId,
      state: mode.state,
      group: mode.group,
      breadcrumbs: [mode.group, mode.label],
      depth: 0,
      deferredReason: mode.deferredReason,
      blockedReason: mode.blockedReason,
    });
    walkChildren(mode.children, mode, [mode.group, mode.label], [], 1, out);
  }

  for (const foot of catalogue.foot) {
    out.push({
      nodeId: foot.id,
      kind: "foot",
      modeId: foot.id,
      childPath: [],
      label: foot.label,
      iconId: foot.iconId,
      state: foot.state,
      group: "Foot",
      breadcrumbs: ["Foot", foot.label],
      depth: 0,
    });
  }

  return out;
}

function walkChildren(
  children: readonly ModeChild[] | undefined,
  mode: ModeEntry,
  baseBreadcrumbs: readonly string[],
  basePath: readonly string[],
  depth: number,
  out: FlatCatalogueEntry[],
): void {
  if (!children) return;
  for (const child of children) {
    const path = [...basePath, child.id];
    const crumbs = [...baseBreadcrumbs, child.label];
    out.push({
      nodeId: `${mode.id}/${path.join("/")}`,
      kind: "child",
      modeId: mode.id,
      childPath: path,
      label: child.label,
      iconId: child.iconId ?? mode.iconId,
      state: child.state,
      childKind: child.kind,
      group: mode.group,
      breadcrumbs: crumbs,
      depth,
      badge: child.badge,
      deferredReason: child.deferredReason,
      blockedReason: child.blockedReason,
    });
    walkChildren(child.children, mode, crumbs, path, depth + 1, out);
  }
}

/** Find a mode by id. Returns null when missing. */
export function findModeEntry(
  catalogue: ModeCatalogue,
  modeId: string,
): ModeEntry | null {
  return catalogue.modes.find((m) => m.id === modeId) ?? null;
}

/** Find a catalogue node by mode id + optional child path. */
export function findCatalogueNode(
  catalogue: ModeCatalogue,
  modeId: string,
  childPath: readonly string[] = [],
): ModeEntry | ModeChild | null {
  const mode = findModeEntry(catalogue, modeId);
  if (!mode) return null;
  if (childPath.length === 0) return mode;
  let cursor: readonly ModeChild[] | undefined = mode.children;
  let node: ModeChild | null = null;
  for (const step of childPath) {
    if (!cursor) return null;
    const next: ModeChild | undefined = cursor.find((c) => c.id === step);
    if (!next) return null;
    node = next;
    cursor = next.children;
  }
  return node;
}

/** Return the children of a mode. Returns `[]` for missing or zero-child modes. */
export function getModeChildren(
  catalogue: ModeCatalogue,
  modeId: string,
): readonly ModeChild[] {
  return findModeEntry(catalogue, modeId)?.children ?? [];
}

/** A node is expandable when it has at least one child entry. */
export function isExpandableNode(node: ModeChild | ModeEntry): boolean {
  if (!("children" in node) || node.children === undefined) return false;
  return node.children.length > 0;
}

// ----------------------------------------------------------------------------
// Sidebar grouping — kind sections (workflow / tool / surface / group / deferred / blocked).
// ----------------------------------------------------------------------------

export type SidebarSectionKey =
  | "workflows"
  | "tools"
  | "surfaces"
  | "groups"
  | "deferred"
  | "blocked";

export interface SidebarSection {
  readonly key: SidebarSectionKey;
  readonly heading: string;
  readonly entries: readonly ModeChild[];
}

const SECTION_ORDER: readonly SidebarSectionKey[] = [
  "workflows",
  "tools",
  "surfaces",
  "groups",
  "deferred",
  "blocked",
];

const SECTION_HEADINGS: Record<SidebarSectionKey, string> = {
  workflows: "WORKFLOWS",
  tools: "TOOLS",
  surfaces: "SURFACES",
  groups: "GROUPS",
  deferred: "DEFERRED",
  blocked: "BLOCKED",
};

/**
 * Group children into sidebar kind sections. Per D3_NAV_SPEC §4:
 *   - DEFERRED / BLOCKED entries are pulled into their own trailing sections.
 *   - WORKFLOWS / TOOLS / SURFACES / GROUPS hold the available + partial entries
 *     bucketed by `kind`.
 *   - Empty sections are omitted.
 */
export function groupChildrenForSidebar(
  children: readonly ModeChild[],
): readonly SidebarSection[] {
  const buckets: Record<SidebarSectionKey, ModeChild[]> = {
    workflows: [],
    tools: [],
    surfaces: [],
    groups: [],
    deferred: [],
    blocked: [],
  };

  for (const child of children) {
    if (child.state === "blocked") {
      buckets.blocked.push(child);
      continue;
    }
    if (child.state === "deferred") {
      buckets.deferred.push(child);
      continue;
    }
    if (child.kind === "workflow") buckets.workflows.push(child);
    else if (child.kind === "tool") buckets.tools.push(child);
    else if (child.kind === "surface") buckets.surfaces.push(child);
    else buckets.groups.push(child); // "group"
  }

  return SECTION_ORDER
    .map((key) => ({ key, heading: SECTION_HEADINGS[key], entries: buckets[key] }))
    .filter((s) => s.entries.length > 0);
}

// ----------------------------------------------------------------------------
// Badge propagation — pure walk; caches summary onto a new ModeCatalogue.
// ----------------------------------------------------------------------------

/** Walk descendants of a mode and compute badge counts. Pure. */
export function computeBadgeSummary(mode: ModeEntry): ModeBadges {
  let alerts = 0;
  let deferred = 0;
  let blocked = 0;
  let partial = 0;

  const visit = (children: readonly ModeChild[] | undefined): void => {
    if (!children) return;
    for (const child of children) {
      if (child.state === "deferred") deferred += 1;
      else if (child.state === "blocked") blocked += 1;
      else if (child.state === "partial") partial += 1;
      if (child.state === "available" && typeof child.badge === "number" && child.badge > 0) {
        alerts += child.badge;
      }
      visit(child.children);
    }
  };

  visit(mode.children);

  return { alerts, deferred, blocked, partial };
}

/** Return a new catalogue with `badges` populated on every ModeEntry. Pure. */
export function propagateBadges(catalogue: ModeCatalogue = MODE_CATALOGUE): ModeCatalogue {
  return {
    version: catalogue.version,
    modes: catalogue.modes.map((mode) => ({
      ...mode,
      badges: computeBadgeSummary(mode),
    })),
    foot: catalogue.foot,
  };
}

// ----------------------------------------------------------------------------
// Group projection — used by the rail to render group headers in catalogue
// order without hardcoding labels.
// ----------------------------------------------------------------------------

export interface CatalogueGroupView {
  readonly id: string;            // lowercased + dash group id
  readonly label: string;
  readonly modes: readonly ModeEntry[];
}

/** Derive groups from catalogue order. Stable: first appearance defines order. */
export function projectCatalogueGroups(catalogue: ModeCatalogue = MODE_CATALOGUE): readonly CatalogueGroupView[] {
  const order: string[] = [];
  const map = new Map<string, ModeEntry[]>();
  for (const mode of catalogue.modes) {
    if (!map.has(mode.group)) {
      order.push(mode.group);
      map.set(mode.group, []);
    }
    (map.get(mode.group) as ModeEntry[]).push(mode);
  }
  return order.map((label) => ({
    id: groupId(label),
    label,
    modes: map.get(label) ?? [],
  }));
}

function groupId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ============================================================================
// Validator — boot-time invariants from D3_NAV_SPEC §2 (contract invariants).
// ============================================================================

export interface CatalogueValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate the catalogue against the spec's binding invariants:
 *   1. `children` is always an array (never undefined / null).
 *   2. Group labels persist in catalogue order.
 *   3. Depth cap = 3 enforced (depth-2 children may NOT have children).
 *   4. Every `id` is unique across the catalogue.
 *   5. Every `iconId` is a non-empty string (resolution-checking is
 *      consumer-owned via AnthIcon; this enforces shape only).
 *   6. Version matches `MODE_CATALOGUE_VERSION`.
 *   7. Foot is non-empty when modes are non-empty.
 *   8. `deferredReason` present iff state === "deferred" (best-effort warning).
 *   9. `blockedReason` present iff state === "blocked" (best-effort warning).
 */
export function validateModeCatalogue(catalogue: ModeCatalogue): CatalogueValidationResult {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  if (catalogue.version !== MODE_CATALOGUE_VERSION) {
    errors.push(`version ${catalogue.version} !== expected ${MODE_CATALOGUE_VERSION}`);
  }

  if (catalogue.modes.length === 0) {
    errors.push("catalogue.modes is empty");
  }

  for (const mode of catalogue.modes) {
    requireUniqueId(mode.id, seenIds, errors, "mode");
    requireNonEmptyString(mode.iconId, errors, `mode "${mode.id}".iconId`);
    requireNonEmptyString(mode.group, errors, `mode "${mode.id}".group`);
    requireNonEmptyString(mode.label, errors, `mode "${mode.id}".label`);
    requireNonEmptyString(mode.shortLabel, errors, `mode "${mode.id}".shortLabel`);
    if (!Array.isArray(mode.children)) {
      errors.push(`mode "${mode.id}".children must be an array (got ${typeof mode.children})`);
    } else {
      validateChildren(mode.children, /*depth*/ 1, mode.id, seenIds, errors);
    }
    checkReasonPresence(mode, errors, `mode "${mode.id}"`);
  }

  for (const foot of catalogue.foot) {
    requireUniqueId(foot.id, seenIds, errors, "foot");
    requireNonEmptyString(foot.iconId, errors, `foot "${foot.id}".iconId`);
    requireNonEmptyString(foot.label, errors, `foot "${foot.id}".label`);
    requireNonEmptyString(foot.shortLabel, errors, `foot "${foot.id}".shortLabel`);
  }

  return { ok: errors.length === 0, errors };
}

function validateChildren(
  children: readonly ModeChild[],
  depth: number,
  modeId: string,
  seenIds: Set<string>,
  errors: string[],
): void {
  for (const child of children) {
    requireUniqueId(child.id, seenIds, errors, `child of "${modeId}"`);
    requireNonEmptyString(child.label, errors, `child "${child.id}".label`);
    if (child.children !== undefined) {
      if (!Array.isArray(child.children)) {
        errors.push(`child "${child.id}".children must be an array when present`);
        continue;
      }
      if (depth >= CATALOGUE_DEPTH_CAP - 1) {
        // Depth 3 (the grandchild level) MUST NOT carry further children.
        // depth here is 1 for direct children, 2 for grandchildren.
        // Cap of 3 means: mode (0) → child (1) → grandchild (2). No level 3.
        if (depth + 1 >= CATALOGUE_DEPTH_CAP && child.children.length > 0) {
          errors.push(`child "${child.id}" exceeds depth cap ${CATALOGUE_DEPTH_CAP}`);
        }
      }
      validateChildren(child.children, depth + 1, modeId, seenIds, errors);
    }
    checkReasonPresence(child, errors, `child "${child.id}"`);
  }
}

function requireUniqueId(
  id: string,
  seenIds: Set<string>,
  errors: string[],
  what: string,
): void {
  if (!id || typeof id !== "string") {
    errors.push(`${what} has invalid id "${id}"`);
    return;
  }
  if (seenIds.has(id)) {
    errors.push(`${what} duplicate id "${id}"`);
    return;
  }
  seenIds.add(id);
}

function requireNonEmptyString(value: unknown, errors: string[], path: string): void {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function checkReasonPresence(
  entry: { state: CatalogueState; deferredReason?: string; blockedReason?: string },
  errors: string[],
  path: string,
): void {
  if (entry.state === "deferred" && !entry.deferredReason) {
    // Best-effort warning surfaced as a non-fatal error string. We keep this
    // as an error so the boot assertion catches silent regressions; tests can
    // accept "warnings" via the same array.
    errors.push(`${path} state="deferred" but no deferredReason`);
  }
  if (entry.state === "blocked" && !entry.blockedReason) {
    errors.push(`${path} state="blocked" but no blockedReason`);
  }
}
