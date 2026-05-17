/**
 * V1Y ASSESS display adapter — wire-type to internal-type.
 *
 * Reshapes BatchRunExportValidationReport (V1R wire type) into the
 * canonical ValidationReport for FindingsPanel. The
 * `raw_excerpt: null` substitution is contract-driven: V1R exports
 * omit raw excerpts per the export contract's
 * finding_raw_excerpt: "omitted_to_avoid_raw_config_excerpt"
 * omission. The null-fill is not aggregation — it reflects the
 * wire-type contract.
 *
 * See docs/architecture/FINDINGS_DISPLAY_CONTRACT.md F6.
 */

import type {
  BatchRunExport,
  BatchRunExportFinding,
  BatchRunExportValidationReport,
} from "../../types/batchRunExport";
import type { FindingsDisplaySummary } from "../../types/findingsDisplay";
import type {
  Evidence,
  EvidenceKind,
  Finding,
  ValidationReport,
} from "../../types/validator";

/**
 * Project an export artifact into the shared display summary.
 * Pure — copies `status` and `summary`.
 */
export function exportAsDisplaySummary(
  artifact: BatchRunExport,
): FindingsDisplaySummary {
  return {
    status: artifact.batch_run_status,
    summary: artifact.summary,
  };
}

/**
 * Reshape an export ValidationReport into the canonical
 * ValidationReport. Restricts findings to a visible subset (V1X
 * triage-filter input). Pure.
 */
export function exportReportAsValidationReport(
  r: BatchRunExportValidationReport,
  visibleFindings: ReadonlyArray<BatchRunExportFinding>,
): ValidationReport {
  return {
    validator_version: r.validator_version,
    rule_pack_version: r.rule_pack_version,
    context: r.context,
    findings: visibleFindings.map(exportFindingAsFinding),
    clean_rules: r.clean_rules,
    skipped_rules: r.skipped_rules,
  };
}

function exportFindingAsFinding(f: BatchRunExportFinding): Finding {
  return {
    finding_key: f.finding_key,
    rule_id: f.rule_id,
    rule_version: f.rule_version,
    severity: f.severity,
    signal: f.signal,
    title: f.title,
    evidence: f.evidence.map((e) => ({
      kind: e.kind as EvidenceKind,
      model_path: e.model_path,
      line_start: e.line_start,
      line_end: e.line_end,
      raw_excerpt: null,
      note: e.note,
    } satisfies Evidence)),
    affected_area: f.affected_area,
    recommendation: f.recommendation,
  };
}
