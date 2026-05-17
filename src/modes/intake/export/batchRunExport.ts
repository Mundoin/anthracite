import type {
  BatchRun,
  BatchRunDevice,
} from "../../../types/batchRun";
import type {
  BatchRunExport,
  BatchRunExportDevice,
  BatchRunExportValidationReport,
} from "../../../types/batchRunExport";
import type { Severity, ValidationReport } from "../../../types/validator";

type MutableSeverityCounts = Record<Severity, number>;

export function buildBatchRunExport(batchRun: BatchRun): BatchRunExport {
  const devices = batchRun.devices.map(exportDevice);
  return {
    export_version: 1,
    kind: "batch_run_export",
    batch_run_status: batchRun.status,
    source: batchRun.source,
    summary: {
      total_count: batchRun.summary.total_count,
      parsed_count: batchRun.summary.parsed_count,
      failed_count: batchRun.summary.failed_count,
      skipped_count: batchRun.summary.skipped_count,
      pending_count: batchRun.summary.pending_count,
      with_findings_count: batchRun.summary.with_findings_count,
      clean_count: batchRun.summary.clean_count,
      severity_counts: {
        critical: batchRun.summary.severity_counts.critical,
        high: batchRun.summary.severity_counts.high,
        medium: batchRun.summary.severity_counts.medium,
        low: batchRun.summary.severity_counts.low,
        info: batchRun.summary.severity_counts.info,
      },
    },
    generated_by: {
      app_name: "Anthracite",
      stage: "V1R",
    },
    versions: collectVersions(devices),
    devices,
    omitted: {
      raw_config_text: "omitted_by_default",
      detection_evidence_preview: "omitted_to_avoid_raw_config_excerpt",
      finding_raw_excerpt: "omitted_to_avoid_raw_config_excerpt",
      device_model: "omitted_use_receipt_summary",
      timestamps: "omitted_for_determinism",
      batch_run_epoch: "omitted_frontend_control_only",
    },
  };
}

export function stringifyBatchRunExport(exported: BatchRunExport): string {
  return `${JSON.stringify(exported, null, 2)}\n`;
}

function exportDevice(device: BatchRunDevice): BatchRunExportDevice {
  return {
    slice_id: device.slice_id,
    hostname_hint: device.hostname_hint,
    source_provenance: device.source_provenance,
    stage_status: device.stage_status,
    selected_platform: device.selected_platform,
    is_manual_override: device.is_manual_override,
    detection_summary: device.detection_result
      ? {
          best_match: device.detection_result.best_match,
          confidence: device.detection_result.confidence,
          scanned_line_count: device.detection_result.scanned_line_count,
          total_line_count: device.detection_result.total_line_count,
          warnings: device.detection_result.warnings,
          candidates: device.detection_result.candidates.map((c) => ({
            platform_id: c.platform_id,
            score: c.score,
            normalized_score: c.normalized_score,
            match_count: c.match_count,
            distinct_signature_count: c.distinct_signature_count,
          })),
          evidence: device.detection_result.evidence.map((e) => ({
            platform_id: e.platform_id,
            signature_id: e.signature_id,
            category: e.category,
            weight: e.weight,
            line_number: e.line_number,
            reason: e.reason,
          })),
        }
      : null,
    receipt_summary: device.receipt
      ? {
          hostname: device.receipt.hostname,
          platform_id: device.receipt.platform_id,
          os_version: device.receipt.os_version,
          source: device.receipt.source,
          source_kind: device.receipt.source_kind,
          byte_size: device.receipt.byte_size,
          line_count: device.receipt.line_count,
          parser_version: device.receipt.parser_version,
          registry_version: device.receipt.registry_version,
          score: device.receipt.score,
          coverage_ratio: device.receipt.coverage_ratio,
          parsed_line_count: device.receipt.parsed_line_count,
          unknown_line_count: device.receipt.unknown_line_count,
          observed_maturity: device.receipt.observed_maturity,
          areas: device.receipt.areas.map((a) => ({
            name: a.name,
            status: a.status,
            populated_count: a.populated_count,
          })),
          warnings: device.receipt.warnings,
          unknowns_truncated: device.receipt.unknowns_truncated,
        }
      : null,
    validation_report: device.validation_report
      ? exportValidationReport(device.validation_report)
      : null,
    finding_counts: countSeverities(device.validation_report),
    stage_error: device.stage_error,
  };
}

function exportValidationReport(
  report: ValidationReport,
): BatchRunExportValidationReport {
  return {
    validator_version: report.validator_version,
    rule_pack_version: report.rule_pack_version,
    context: report.context,
    findings: report.findings.map((f) => ({
      finding_key: f.finding_key,
      rule_id: f.rule_id,
      rule_version: f.rule_version,
      severity: f.severity,
      signal: f.signal,
      title: f.title,
      evidence: f.evidence.map((e) => ({
        kind: e.kind,
        model_path: e.model_path,
        line_start: e.line_start,
        line_end: e.line_end,
        note: e.note,
      })),
      affected_area: f.affected_area,
      recommendation: f.recommendation,
    })),
    clean_rules: report.clean_rules,
    skipped_rules: report.skipped_rules.map((r) => ({
      rule_id: r.rule_id,
      reason: r.reason,
      area: r.area,
    })),
  };
}

function countSeverities(
  report: ValidationReport | null,
): Record<Severity, number> {
  const out: MutableSeverityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  if (!report) return out;
  for (const finding of report.findings) {
    out[finding.severity] += 1;
  }
  return out;
}

function collectVersions(
  devices: ReadonlyArray<BatchRunExportDevice>,
): BatchRunExport["versions"] {
  const validatorVersions = new Set<number>();
  const rulePackVersions = new Set<number>();
  const parserVersions = new Set<string>();
  const registryVersions = new Set<string>();

  for (const device of devices) {
    if (device.validation_report) {
      validatorVersions.add(device.validation_report.validator_version);
      rulePackVersions.add(device.validation_report.rule_pack_version);
      const parserVersion = device.validation_report.context.parser_version;
      if (parserVersion) parserVersions.add(parserVersion);
    }
    const receipt = device.receipt_summary;
    if (receipt?.parser_version) parserVersions.add(receipt.parser_version);
    if (receipt?.registry_version) registryVersions.add(receipt.registry_version);
  }

  return {
    validator_versions: [...validatorVersions].sort((a, b) => a - b),
    rule_pack_versions: [...rulePackVersions].sort((a, b) => a - b),
    parser_versions: [...parserVersions].sort(),
    registry_versions: [...registryVersions].sort(),
  };
}
