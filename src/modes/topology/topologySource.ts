/**
 * V1BY — Topology Source Contract.
 *
 * Source-neutral metadata describing where a topology view came from.
 * One contract for fabricated / demo / imported / future-live producers.
 * Pure types + helper builders. No I/O, no live collection.
 */

export type TopologySourceKind =
  | "fabricated"   // generated lab via Fabricator engine
  | "demo"         // demo / sample data (non-generated, e.g. fixtures)
  | "imported"     // user-imported evidence (PCAPs, configs, snapshots — future)
  | "live"         // live discovery (SNMP/SSH/etc — future, NOT IMPLEMENTED)
  | "unknown";

export type TopologyFreshness =
  | "static"   // deterministic, no time component (fabricated, demo)
  | "fresh"    // recently observed, within tolerance
  | "stale"    // observed but old
  | "unknown";

export interface TopologySourceInfo {
  readonly kind: TopologySourceKind;
  readonly environment_id?: string;
  readonly label: string;              // operator-facing one-liner
  readonly observed_at?: string;       // ISO string OR "lab-deterministic"
  readonly generated_at?: string;      // ISO string OR "lab-deterministic"
  readonly freshness?: TopologyFreshness;
  readonly producer?: string;          // engine/adapter id, e.g. "fabricator/0.1.0"
  readonly evidence?: readonly string[]; // free-form evidence tags
}

/** Producer string for the Fabricator/lab engine. Versioned for future audit. */
export const FABRICATOR_PRODUCER = "fabricator/0.1.0" as const;

/**
 * Build source info for a Fabricator/generated lab environment.
 * Deterministic — no Date.now() reads. `generated_at` is the
 * deterministic literal "lab-deterministic" because lab payloads
 * have no real-time component.
 */
export function createFabricatedTopologySourceInfo(input: {
  readonly environment_id: string;
  readonly environment_name?: string;
}): TopologySourceInfo {
  return {
    kind: "fabricated",
    environment_id: input.environment_id,
    label: input.environment_name
      ? `Fabricated · ${input.environment_name}`
      : "Fabricated",
    generated_at: "lab-deterministic",
    freshness: "static",
    producer: FABRICATOR_PRODUCER,
    evidence: ["synthetic"],
  };
}

/** Build source info for a demo/sample (non-generated) view. */
export function createDemoTopologySourceInfo(input: {
  readonly environment_id?: string;
  readonly label?: string;
}): TopologySourceInfo {
  return {
    kind: "demo",
    environment_id: input.environment_id,
    label: input.label ?? "Demo",
    generated_at: "lab-deterministic",
    freshness: "static",
    producer: "demo/static",
    evidence: ["demo"],
  };
}

/**
 * Build source info for imported evidence (PCAPs, configs, ad-hoc).
 * Type-level seam — real import adapters will produce this with
 * proper observed_at + evidence. No collection here.
 */
export function createImportedTopologySourceInfo(input: {
  readonly environment_id?: string;
  readonly label: string;
  readonly observed_at?: string;
  readonly evidence?: readonly string[];
  readonly producer?: string;
}): TopologySourceInfo {
  return {
    kind: "imported",
    environment_id: input.environment_id,
    label: input.label,
    observed_at: input.observed_at,
    freshness: input.observed_at ? "fresh" : "unknown",
    producer: input.producer ?? "imported/unknown",
    evidence: input.evidence,
  };
}

/**
 * V1BY seam — future live discovery source. No SNMP/SSH/polling
 * executed here; this is a type-safe placeholder so the contract
 * can represent a live producer once it exists.
 */
export function createLiveTopologySourceInfo(input: {
  readonly environment_id?: string;
  readonly label: string;
  readonly observed_at: string;
  readonly producer: string;
  readonly evidence?: readonly string[];
}): TopologySourceInfo {
  return {
    kind: "live",
    environment_id: input.environment_id,
    label: input.label,
    observed_at: input.observed_at,
    freshness: "fresh",
    producer: input.producer,
    evidence: input.evidence,
  };
}

/** Fallback when a view has no source attached (legacy/unknown). */
export function unknownTopologySourceInfo(label = "Unknown"): TopologySourceInfo {
  return { kind: "unknown", label, freshness: "unknown" };
}

/** Operator-friendly labels for source kind + freshness. */
export function formatSourceKindLabel(kind: TopologySourceKind): string {
  switch (kind) {
    case "fabricated": return "Fabricated";
    case "demo":       return "Demo";
    case "imported":   return "Imported";
    case "live":       return "Live";
    case "unknown":    return "Unknown";
  }
}

export function formatFreshnessLabel(freshness: TopologyFreshness): string {
  switch (freshness) {
    case "static":  return "Static";
    case "fresh":   return "Fresh";
    case "stale":   return "Stale";
    case "unknown": return "Unknown";
  }
}

/**
 * V1BY-HF1 — operator-facing source kind label for the header provenance
 * group. Diverges from `formatSourceKindLabel` only for fabricated, which
 * reads as "Generated Lab" in the consolidated header so the operator
 * sees an environment-shaped phrase, not the internal contract name.
 */
export function formatSourceKindHeaderLabel(kind: TopologySourceKind): string {
  switch (kind) {
    case "fabricated": return "Generated Lab";
    case "demo":       return "Demo";
    case "imported":   return "Imported";
    case "live":       return "Live";
    case "unknown":    return "Unknown";
  }
}

/**
 * V1BY-HF1 — single compact provenance string for the topology header.
 * Format: "<source> · <freshness>". Replaces the previous trio
 * (SOURCE pill + FRESHNESS pill + GENERATED-LAB badge) with one calm
 * monospace group.
 */
export function formatSourceProvenance(info: TopologySourceInfo | undefined): string {
  const kind = info?.kind ?? "unknown";
  const freshness = info?.freshness ?? "unknown";
  return `${formatSourceKindHeaderLabel(kind)} · ${formatFreshnessLabel(freshness)}`;
}

/**
 * V1BY documentation — future Diagnose handoff payload shape.
 * NOT implemented yet. Recorded here so the contract is visible
 * at the seam. When Diagnose lands, it consumes this exact shape
 * from the affected-focus path:
 *
 *   {
 *     environment_id: string;
 *     source: TopologySourceInfo;
 *     selected: { id, label, state };
 *     affected: { edge_ids, neighbor_ids };
 *     worst_state: LabOperationalState;
 *     focus_counts: Record<LabOperationalState, number>;
 *     timing: { observed_at?, generated_at? };
 *   }
 *
 * V1BY does not build this object; it ensures every piece exists.
 */
