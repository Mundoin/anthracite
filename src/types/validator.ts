/**
 * Validator Engine — TypeScript surface (V1P).
 *
 * Mirrors `src-tauri/src/engines/validator/types.rs`. Rust is the
 * authoritative wire shape; this file describes what the Tauri
 * command boundary returns. Renaming a shipped field is forbidden.
 *
 * Pair docs:
 *   - `docs/architecture/VALIDATOR_ENGINE_CONTRACT.md`
 *   - `docs/architecture/RULE_PACK_MGMT_HYG_V1.md`
 *   - `docs/architecture/INTAKE_SURFACE_CONTRACT.md` (Findings panel)
 */

export type RuleId = string;

export type Severity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type SignalCategory = "hard" | "derived" | "heuristic";

export type SelectionMode = "from_detection" | "manual_override";

export type DetectionSource =
  | "best_match"
  | "tied"
  | "fallback"
  | "manual_override"
  | "not_applicable";

export type SourceKind = "paste" | "file" | "archive_entry" | "slice";

export interface SourceContext {
  readonly kind: SourceKind | null;
  readonly label: string | null;
  readonly archive_name: string | null;
  readonly slice_id: string | null;
}

export interface ValidatorContext {
  readonly platform_id: string | null;
  readonly parser_id: string | null;
  readonly parser_version: string | null;
  readonly selection_mode: SelectionMode;
  readonly detection_confidence: number | null;
  readonly detection_source: DetectionSource | null;
  readonly source_context: SourceContext | null;
}

export type EvidenceKind =
  | "model_path"
  | "service_note_fact"
  | "unknown_line_ref";

export interface Evidence {
  readonly kind: EvidenceKind;
  readonly model_path: string | null;
  readonly line_start: number | null;
  readonly line_end: number | null;
  readonly raw_excerpt: string | null;
  readonly note: string | null;
}

export type SkipReason =
  | "area_not_in_scope"
  | "area_absent"
  | "insufficient_data";

export interface SkippedRule {
  readonly rule_id: RuleId;
  readonly reason: SkipReason;
  readonly area: string | null;
}

export interface Finding {
  readonly finding_key: string;
  readonly rule_id: RuleId;
  readonly rule_version: number;
  readonly severity: Severity;
  readonly signal: SignalCategory;
  readonly title: string;
  readonly evidence: ReadonlyArray<Evidence>;
  readonly affected_area: string;
  readonly recommendation: string | null;
}

export interface ValidationReport {
  readonly validator_version: number;
  readonly rule_pack_version: number;
  readonly context: ValidatorContext;
  readonly findings: ReadonlyArray<Finding>;
  readonly clean_rules: ReadonlyArray<RuleId>;
  readonly skipped_rules: ReadonlyArray<SkippedRule>;
}
