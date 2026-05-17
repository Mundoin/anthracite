import type {
  BatchRunExport,
  BatchRunExportDevice,
  BatchRunExportFinding,
} from "../../../types/batchRunExport";
import type { Severity } from "../../../types/validator";

export function renderBatchRunMarkdown(exported: BatchRunExport): string {
  const lines: string[] = [
    "# Anthracite Batch Run",
    "",
    "## Summary",
    `- Status: ${exported.batch_run_status}`,
    `- Devices: ${exported.summary.total_count}`,
    `- Parsed: ${exported.summary.parsed_count}`,
    `- Failed: ${exported.summary.failed_count}`,
    `- Skipped: ${exported.summary.skipped_count}`,
    `- With findings: ${exported.summary.with_findings_count}`,
    `- Clean: ${exported.summary.clean_count}`,
    `- Critical: ${exported.summary.severity_counts.critical}`,
    `- High: ${exported.summary.severity_counts.high}`,
    `- Medium: ${exported.summary.severity_counts.medium}`,
    `- Low: ${exported.summary.severity_counts.low}`,
    `- Info: ${exported.summary.severity_counts.info}`,
    "",
    "## Source",
    `- Kind: ${exported.source.kind}`,
    ...sourceLines(exported.source),
    "- Raw config text: omitted by default",
    "",
    "## Versions",
    `- Validator: ${joinOrNone(exported.versions.validator_versions)}`,
    `- Rule pack: ${joinOrNone(exported.versions.rule_pack_versions)}`,
    `- Parser: ${joinOrNone(exported.versions.parser_versions)}`,
    `- Registry: ${joinOrNone(exported.versions.registry_versions)}`,
    "",
    "## Devices",
  ];

  for (const device of exported.devices) {
    lines.push(...deviceLines(device), "");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function sourceLines(source: BatchRunExport["source"]): string[] {
  if (source.kind === "archive") {
    return [`- Archive: ${source.archive_name}`];
  }
  if (source.kind === "file") {
    return [`- File: ${source.filename}`];
  }
  return [];
}

function deviceLines(device: BatchRunExportDevice): string[] {
  const label = device.receipt_summary?.hostname ?? device.hostname_hint ?? "(unknown)";
  const lines = [
    `### ${device.slice_id} — ${label}`,
    `- Platform: ${device.selected_platform?.platform_id ?? "(none)"}`,
    `- Detection: ${describeDetection(device)}`,
    `- Stage: ${device.stage_status}`,
    `- Manual override: ${device.is_manual_override ? "yes" : "no"}`,
  ];

  if (device.stage_error) {
    lines.push(
      `- Error: ${device.stage_error.stage} — ${device.stage_error.message}`,
    );
  }

  lines.push("- Findings:");
  if (!device.validation_report) {
    lines.push("  - (none available)");
  } else if (device.validation_report.findings.length === 0) {
    lines.push("  - clean");
  } else {
    for (const finding of device.validation_report.findings) {
      lines.push(...findingLines(finding));
    }
  }

  lines.push("- Receipt summary:");
  const receipt = device.receipt_summary;
  if (!receipt) {
    lines.push("  - (none available)");
  } else {
    lines.push(
      `  - Hostname: ${receipt.hostname ?? "(unknown)"}`,
      `  - Platform id: ${receipt.platform_id ?? "(unknown)"}`,
      `  - Line count: ${receipt.line_count ?? "(unknown)"}`,
      `  - Coverage: ${receipt.coverage_ratio.toFixed(2)}`,
      `  - Parsed lines: ${receipt.parsed_line_count}`,
      `  - Unknown lines: ${receipt.unknown_line_count}`,
      `  - Parser version: ${receipt.parser_version ?? "(unknown)"}`,
      `  - Registry version: ${receipt.registry_version ?? "(unknown)"}`,
      `  - Selected mode: ${
        device.validation_report?.context.selection_mode ??
        (device.is_manual_override ? "manual_override" : "from_detection")
      }`,
    );
  }

  lines.push("- Provenance:");
  const p = device.source_provenance;
  if (!p) {
    lines.push("  - (none)");
  } else {
    lines.push(
      `  - Entry: ${p.entry_path}`,
      `  - Entry id: ${p.entry_id}`,
      `  - Archive: ${p.archive_name ?? "(none)"}`,
    );
  }

  return lines;
}

function findingLines(finding: BatchRunExportFinding): string[] {
  const lines = [
    `  - ${severityLabel(finding.severity)} ${finding.rule_id} — ${finding.title}`,
    `    - Affected area: ${finding.affected_area}`,
    `    - Signal: ${finding.signal}`,
  ];
  if (finding.recommendation) {
    lines.push(`    - Recommendation: ${finding.recommendation}`);
  }
  for (const evidence of finding.evidence) {
    const range =
      evidence.line_start == null
        ? "(line unknown)"
        : evidence.line_end != null && evidence.line_end !== evidence.line_start
          ? `lines ${evidence.line_start}-${evidence.line_end}`
          : `line ${evidence.line_start}`;
    lines.push(
      `    - Evidence: ${evidence.kind}; ${evidence.model_path ?? "(no model path)"}; ${range}${evidence.note ? `; ${evidence.note}` : ""}`,
    );
  }
  return lines;
}

function describeDetection(device: BatchRunExportDevice): string {
  const det = device.detection_summary;
  if (!det) return "(none)";
  const platform = det.best_match?.platform_id ?? "(no match)";
  return `${platform} @ ${det.confidence.toFixed(2)}`;
}

function severityLabel(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "CRITICAL";
    case "high":
      return "HIGH";
    case "medium":
      return "MEDIUM";
    case "low":
      return "LOW";
    case "info":
      return "INFO";
  }
}

function joinOrNone(values: ReadonlyArray<number | string>): string {
  return values.length === 0 ? "(none)" : values.join(", ");
}
