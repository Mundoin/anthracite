/**
 * V1W-R — ASSESS loaded view.
 *
 * Renders a successfully loaded `BatchRunExport` artifact read-only
 * (A5). All counts and findings come verbatim from JSON fields; no
 * client-side aggregation (A1, A2). Devices render in
 * `artifact.devices[]` order without re-sorting (A3).
 *
 * Adapters here are structural reshapes (e.g. RunSummaryStrip
 * expects a `BatchRun`, but ASSESS has a `BatchRunExport` whose
 * summary/status/source shapes are identical). No computed counts
 * are introduced; the adapter copies existing JSON fields straight
 * across.
 */

import type { JSX } from "react";

import { FindingsPanel } from "../../intake/components/FindingsPanel";
import { RunSummaryStrip } from "../../intake/components/RunSummaryStrip";
import type {
  BatchRun,
  BatchRunDevice,
} from "../../../types/batchRun";
import type {
  BatchRunExport,
  BatchRunExportDevice,
  BatchRunExportEvidence,
  BatchRunExportFinding,
  BatchRunExportValidationReport,
} from "../../../types/batchRunExport";
import type {
  Evidence,
  EvidenceKind,
  Finding,
  ValidationReport,
} from "../../../types/validator";

export interface AssessLoadedViewProps {
  readonly artifact: BatchRunExport;
  readonly filename: string;
  readonly onClose: () => void;
}

export function AssessLoadedView({
  artifact,
  filename,
  onClose,
}: AssessLoadedViewProps): JSX.Element {
  const syntheticBatchRun = toBatchRun(artifact);
  const noop = (): void => {
    /* viewer-only: no orchestration callbacks */
  };

  return (
    <section className="assess-loaded" aria-label="Loaded assessment">
      <header className="assess-loaded__header">
        <div className="assess-loaded__title">
          <span className="assess-loaded__heading">Assessment</span>
          <span className="intake-muted">
            {" · Loaded from "}
            <span className="intake-mono">{filename}</span>
          </span>
        </div>
        <button
          type="button"
          className="intake-btn"
          onClick={onClose}
          aria-label="Close assessment"
        >
          Close assessment
        </button>
      </header>

      <div className="assess-loaded__summary">
        <RunSummaryStrip
          batchRun={syntheticBatchRun}
          onAnalyse={noop}
          onReRun={noop}
          disabled={true}
        />
      </div>

      <div className="assess-loaded__devices">
        {artifact.devices.length === 0 ? (
          <div className="intake-muted assess-loaded__empty-devices">
            No devices in this batch run.
          </div>
        ) : (
          artifact.devices.map((d) => (
            <DeviceBlock key={d.slice_id} device={d} />
          ))
        )}
      </div>
    </section>
  );
}

interface DeviceBlockProps {
  readonly device: BatchRunExportDevice;
}

function DeviceBlock({ device }: DeviceBlockProps): JSX.Element {
  const hostname = device.hostname_hint ?? device.slice_id;
  return (
    <article
      className="assess-device"
      aria-label={`Device ${device.slice_id}`}
    >
      <header className="assess-device__header">
        <span className="assess-device__name intake-mono">{hostname}</span>
        <span className="intake-muted">
          {" · "}
          {device.slice_id}
          {" · "}
          {device.stage_status}
        </span>
      </header>
      {device.validation_report ? (
        <FindingsPanel report={toValidationReport(device.validation_report)} />
      ) : (
        <div className="intake-muted assess-device__no-report">
          no validation report
        </div>
      )}
    </article>
  );
}

/**
 * Build a `BatchRun` view of the export's run-level fields for
 * `RunSummaryStrip`. The summary/status/source shapes are identical
 * between `BatchRun` and `BatchRunExport`; devices are reshaped to
 * the minimum the strip touches (it reads only summary/status).
 */
function toBatchRun(artifact: BatchRunExport): BatchRun {
  const devices: ReadonlyArray<BatchRunDevice> = artifact.devices.map((d) =>
    toBatchRunDevice(d),
  );
  return {
    source: artifact.source,
    devices,
    summary: artifact.summary,
    status: artifact.batch_run_status,
    epoch: 0,
  };
}

/**
 * Shape adapter only. Fields the export omits by contract
 * (`device_model`, `receipt`, etc.) are set to null. No values are
 * invented; nulls are honest absences.
 */
function toBatchRunDevice(d: BatchRunExportDevice): BatchRunDevice {
  return {
    slice_id: d.slice_id,
    hostname_hint: d.hostname_hint,
    source_provenance: d.source_provenance,
    stage_status: d.stage_status,
    detection_result: null,
    selected_platform: d.selected_platform,
    is_manual_override: d.is_manual_override,
    device_model: null,
    receipt: null,
    validation_report: d.validation_report
      ? toValidationReport(d.validation_report)
      : null,
    stage_error: d.stage_error,
  };
}

/**
 * Reshape `BatchRunExportValidationReport` into the canonical
 * `ValidationReport` for `FindingsPanel` consumption. The export
 * contract omits `raw_excerpt` from evidence
 * (`omitted_to_avoid_raw_config_excerpt`); the adapter sets it to
 * null, which `FindingsPanel` renders as absence — A1 preserved.
 */
function toValidationReport(
  r: BatchRunExportValidationReport,
): ValidationReport {
  return {
    validator_version: r.validator_version,
    rule_pack_version: r.rule_pack_version,
    context: r.context,
    findings: r.findings.map((f) => toFinding(f)),
    clean_rules: r.clean_rules,
    skipped_rules: r.skipped_rules,
  };
}

function toFinding(f: BatchRunExportFinding): Finding {
  return {
    finding_key: f.finding_key,
    rule_id: f.rule_id,
    rule_version: f.rule_version,
    severity: f.severity,
    signal: f.signal,
    title: f.title,
    evidence: f.evidence.map((e) => toEvidence(e)),
    affected_area: f.affected_area,
    recommendation: f.recommendation,
  };
}

function toEvidence(e: BatchRunExportEvidence): Evidence {
  return {
    kind: e.kind as EvidenceKind,
    model_path: e.model_path,
    line_start: e.line_start,
    line_end: e.line_end,
    raw_excerpt: null,
    note: e.note,
  };
}
