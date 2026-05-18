/**
 * Diagnose Seed — display contract (V1AW).
 *
 * Pure-frontend deterministic answer model. Produced by
 * `diagnoseProjection.ts` over already-available DeviceModel +
 * TopologyView data. No engine wire types, no Tauri command, no new
 * DeviceModel fields.
 *
 * Operator question: "What should I inspect first, and why?"
 *
 * Doctrine: `docs/architecture/DIAGNOSE_SEED_CONTRACT.md`.
 */

export const DIAGNOSE_CONTRACT_VERSION = 1;

export type DiagnoseSeverity = "critical" | "warning" | "info";

export type DiagnoseCategory =
  | "management_access"
  | "identity"
  | "interfaces"
  | "topology_evidence"
  | "platform_support"
  | "parser_scope";

export interface DiagnoseEvidence {
  readonly label: string;
  readonly value: string;
  readonly source: string | null;
}

export interface DiagnoseAnswer {
  /** Stable, sort-friendly id. Convention: `{category}:{rule}:{key}`. */
  readonly id: string;
  readonly severity: DiagnoseSeverity;
  readonly category: DiagnoseCategory;
  readonly title: string;
  readonly affected_devices: ReadonlyArray<string>;
  readonly why_it_matters: string;
  readonly evidence: ReadonlyArray<DiagnoseEvidence>;
  readonly suggested_inspection_target: string;
  /** Honest provenance label — `"discovery_inventory"`, `"topology_view"`,
   *  `"intake_paste"`, etc. Never invented. */
  readonly source_label: string | null;
}

export interface DiagnoseCategoryCount {
  readonly category: DiagnoseCategory;
  readonly count: number;
}

export interface DiagnoseSummary {
  readonly total_answers: number;
  readonly critical_count: number;
  readonly warning_count: number;
  readonly info_count: number;
  readonly per_category: ReadonlyArray<DiagnoseCategoryCount>;
}

export interface DiagnoseModel {
  readonly answers: ReadonlyArray<DiagnoseAnswer>;
  readonly summary: DiagnoseSummary;
  /** True when the projection had nothing to consume (no devices, no
   *  topology view). Renders an honest empty state. */
  readonly is_empty_input: boolean;
}

/** Deferred answer groups documented here so the UI can reference the
 *  stable vocabulary without inventing strings. */
export const DIAGNOSE_DEFERRED_GROUPS: ReadonlyArray<string> = Object.freeze([
  "interface_mtu_outliers",
  "vlan_consistency",
  "vrf_route_target_alignment",
  "routing_protocol_neighbor_health",
  "policy_drift",
]);

export const DIAGNOSE_CATEGORY_LABELS: Readonly<Record<DiagnoseCategory, string>> = {
  management_access: "Management access",
  identity: "Identity",
  interfaces: "Interfaces",
  topology_evidence: "Topology evidence",
  platform_support: "Platform support",
  parser_scope: "Parser scope",
};

export const DIAGNOSE_SEVERITY_LABELS: Readonly<Record<DiagnoseSeverity, string>> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

/** Sort weight for severity (lower number = higher priority). */
export const DIAGNOSE_SEVERITY_ORDER: Readonly<Record<DiagnoseSeverity, number>> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/** Sort weight for category (lower number = higher priority). Aligns with
 *  "what should I inspect first" — management access and identity are
 *  always the first cards an operator should read. */
export const DIAGNOSE_CATEGORY_ORDER: Readonly<Record<DiagnoseCategory, number>> = {
  management_access: 0,
  identity: 1,
  interfaces: 2,
  topology_evidence: 3,
  platform_support: 4,
  parser_scope: 5,
};
