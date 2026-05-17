import type {
  BatchRunSeverityCounts,
  BatchRunSource,
  BatchRunStatus,
  DeviceStageError,
  DeviceStageStatus,
} from "./batchRun";
import type { ArchiveEntryRef } from "./archiveIntake";
import type {
  DetectionWarning,
  SignatureCategory,
} from "./configDetection";
import type { PlatformRef } from "./networkModel";
import type {
  RuleId,
  Severity,
  SignalCategory,
  SkipReason,
  ValidatorContext,
} from "./validator";

export interface BatchRunExport {
  readonly export_version: 1;
  readonly kind: "batch_run_export";
  readonly batch_run_status: BatchRunStatus;
  readonly source: BatchRunSource;
  readonly summary: BatchRunExportSummary;
  readonly generated_by: BatchRunExportGeneratedBy;
  readonly versions: BatchRunExportVersions;
  readonly devices: ReadonlyArray<BatchRunExportDevice>;
  readonly omitted: BatchRunExportOmissions;
}

export interface BatchRunExportSummary {
  readonly total_count: number;
  readonly parsed_count: number;
  readonly failed_count: number;
  readonly skipped_count: number;
  readonly pending_count: number;
  readonly with_findings_count: number;
  readonly clean_count: number;
  readonly severity_counts: BatchRunSeverityCounts;
}

export interface BatchRunExportGeneratedBy {
  readonly app_name: "Anthracite";
  readonly stage: "V1R";
}

export interface BatchRunExportVersions {
  readonly validator_versions: ReadonlyArray<number>;
  readonly rule_pack_versions: ReadonlyArray<number>;
  readonly parser_versions: ReadonlyArray<string>;
  readonly registry_versions: ReadonlyArray<string>;
}

export interface BatchRunExportDevice {
  readonly slice_id: string;
  readonly hostname_hint: string | null;
  readonly source_provenance: ArchiveEntryRef | null;
  readonly stage_status: DeviceStageStatus;
  readonly selected_platform: PlatformRef | null;
  readonly is_manual_override: boolean;
  readonly detection_summary: BatchRunExportDetectionSummary | null;
  readonly receipt_summary: BatchRunExportReceiptSummary | null;
  readonly validation_report: BatchRunExportValidationReport | null;
  readonly finding_counts: Record<Severity, number>;
  readonly stage_error: DeviceStageError | null;
}

export interface BatchRunExportDetectionSummary {
  readonly best_match: PlatformRef | null;
  readonly confidence: number;
  readonly scanned_line_count: number;
  readonly total_line_count: number;
  readonly warnings: ReadonlyArray<DetectionWarning>;
  readonly candidates: ReadonlyArray<BatchRunExportDetectionCandidate>;
  readonly evidence: ReadonlyArray<BatchRunExportDetectionEvidence>;
}

export interface BatchRunExportDetectionCandidate {
  readonly platform_id: string;
  readonly score: number;
  readonly normalized_score: number;
  readonly match_count: number;
  readonly distinct_signature_count: number;
}

export interface BatchRunExportDetectionEvidence {
  readonly platform_id: string;
  readonly signature_id: string;
  readonly category: SignatureCategory;
  readonly weight: number;
  readonly line_number: number;
  readonly reason: string;
}

export interface BatchRunExportReceiptSummary {
  readonly hostname: string | null;
  readonly platform_id: string | null;
  readonly os_version: string | null;
  readonly source: string | null;
  readonly source_kind: string | null;
  readonly byte_size: number | null;
  readonly line_count: number | null;
  readonly parser_version: string | null;
  readonly registry_version: string | null;
  readonly score: number | null;
  readonly coverage_ratio: number;
  readonly parsed_line_count: number;
  readonly unknown_line_count: number;
  readonly observed_maturity: string | null;
  readonly areas: ReadonlyArray<BatchRunExportReceiptArea>;
  readonly warnings: ReadonlyArray<string>;
  readonly unknowns_truncated: boolean;
}

export interface BatchRunExportReceiptArea {
  readonly name: string;
  readonly status: string;
  readonly populated_count: number;
}

export interface BatchRunExportValidationReport {
  readonly validator_version: number;
  readonly rule_pack_version: number;
  readonly context: ValidatorContext;
  readonly findings: ReadonlyArray<BatchRunExportFinding>;
  readonly clean_rules: ReadonlyArray<RuleId>;
  readonly skipped_rules: ReadonlyArray<BatchRunExportSkippedRule>;
}

export interface BatchRunExportFinding {
  readonly finding_key: string;
  readonly rule_id: RuleId;
  readonly rule_version: number;
  readonly severity: Severity;
  readonly signal: SignalCategory;
  readonly title: string;
  readonly evidence: ReadonlyArray<BatchRunExportEvidence>;
  readonly affected_area: string;
  readonly recommendation: string | null;
}

export interface BatchRunExportEvidence {
  readonly kind: string;
  readonly model_path: string | null;
  readonly line_start: number | null;
  readonly line_end: number | null;
  readonly note: string | null;
}

export interface BatchRunExportSkippedRule {
  readonly rule_id: RuleId;
  readonly reason: SkipReason;
  readonly area: string | null;
}

export interface BatchRunExportOmissions {
  readonly raw_config_text: "omitted_by_default";
  readonly detection_evidence_preview: "omitted_to_avoid_raw_config_excerpt";
  readonly finding_raw_excerpt: "omitted_to_avoid_raw_config_excerpt";
  readonly device_model: "omitted_use_receipt_summary";
  readonly timestamps: "omitted_for_determinism";
  readonly batch_run_epoch: "omitted_frontend_control_only";
}
