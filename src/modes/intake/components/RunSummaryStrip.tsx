/**
 * V1Q RunSummaryStrip — horizontal aggregate-counts strip
 * rendered above the BatchSummaryView table (INTAKE) and
 * above the loaded artifact view (ASSESS).
 *
 * V1Y shared display contract — see
 * docs/architecture/FINDINGS_DISPLAY_CONTRACT.md.
 *
 * Honesty rules (binding):
 *   - All counts render verbatim from `display.summary.*`.
 *     No client-side counting in this component.
 *   - Severity chips with zero counts STILL render — same
 *     discipline as V1P's clean_rules list. Hiding zero
 *     counts would lose the "we looked and found nothing"
 *     signal.
 *   - mode="author": Analyse/Re-run/Copy/Save/ExportStatus
 *     actions render under their existing conditionals.
 *   - mode="viewer": all action buttons are suppressed;
 *     counts render unchanged. `onAnalyse`, `onReRun`,
 *     `disabled`, `exportStatus`, and the export callbacks
 *     are ignored.
 *   - Buttons disable while `disabled` prop OR while run is
 *     in_progress (author mode only).
 *   - No assessment vocabulary anywhere.
 */

import type { JSX } from "react";

import type {
  FindingsDisplayMode,
  FindingsDisplaySummary,
} from "../../../types/findingsDisplay";
import type { DiscoveryImportPreviewStatus } from "../IntakePanel";

export type BatchRunExportFormat = "json" | "markdown";

export type BatchRunExportStatus =
  | { readonly kind: "copied"; readonly format: BatchRunExportFormat }
  | { readonly kind: "saved"; readonly format: BatchRunExportFormat }
  | {
      readonly kind: "failed";
      readonly format: BatchRunExportFormat;
      readonly message: string;
    };

export interface RunSummaryStripProps {
  readonly display: FindingsDisplaySummary | null;
  readonly mode: FindingsDisplayMode;
  readonly onAnalyse?: () => void;
  readonly onReRun?: () => void;
  readonly disabled?: boolean;
  readonly onCopyJson?: () => void;
  readonly onCopyMarkdown?: () => void;
  readonly onSaveJson?: () => void;
  readonly onSaveMarkdown?: () => void;
  readonly exportStatus?: BatchRunExportStatus | null;
  // V1AH — Discovery import preview.
  readonly activeEnvironmentId?: string | null;
  readonly discoveryImportableCount?: number;
  readonly discoveryPreviewStatus?: DiscoveryImportPreviewStatus;
  readonly onPreviewDiscoveryImport?: () => void;
}

export function RunSummaryStrip(props: RunSummaryStripProps): JSX.Element {
  const {
    display,
    mode,
    onAnalyse,
    onReRun,
    disabled,
    onCopyJson,
    onCopyMarkdown,
    onSaveJson,
    onSaveMarkdown,
    exportStatus,
    activeEnvironmentId,
    discoveryImportableCount,
    discoveryPreviewStatus,
    onPreviewDiscoveryImport,
  } = props;

  const inProgress = display?.status === "in_progress";
  const isComplete =
    display?.status === "complete" ||
    display?.status === "complete_with_failures";
  const isIdle = display === null || display.status === "idle";
  const isAuthor = mode === "author";
  const showAnalyse = isAuthor && isIdle && onAnalyse != null;
  const showReRun = isAuthor && isComplete && onReRun != null;
  const showExports =
    isAuthor && isComplete && onCopyJson != null && onCopyMarkdown != null;
  const buttonsDisabled = (disabled ?? false) || inProgress;
  const showDiscoveryPreview =
    isAuthor &&
    isComplete &&
    onPreviewDiscoveryImport != null &&
    (activeEnvironmentId != null && (discoveryImportableCount ?? 0) > 0);

  return (
    <div
      className={
        "intake-run-summary-strip" +
        (inProgress ? " intake-run-summary-strip--in-progress" : "")
      }
      aria-label="Batch run summary"
    >
      <div className="intake-run-summary-strip__counts">
        <CountsLine display={display} inProgress={inProgress} />
      </div>
      <div className="intake-run-summary-strip__actions">
        {showAnalyse && (
          <button
            type="button"
            className="intake-btn intake-btn--primary intake-btn--tiny"
            onClick={onAnalyse}
            disabled={buttonsDisabled}
            aria-label="Analyse batch"
          >
            Analyse batch
          </button>
        )}
        {showReRun && (
          <button
            type="button"
            className="intake-btn intake-btn--tiny"
            onClick={onReRun}
            disabled={buttonsDisabled}
            aria-label="Re-run analysis"
          >
            Re-run analysis
          </button>
        )}
        {showExports && (
          <BatchRunExportActions
            onCopyJson={onCopyJson!}
            onCopyMarkdown={onCopyMarkdown!}
            onSaveJson={onSaveJson}
            onSaveMarkdown={onSaveMarkdown}
            disabled={buttonsDisabled}
            status={exportStatus ?? null}
          />
        )}
        {showDiscoveryPreview && (
          <DiscoveryImportPreviewAction
            onPreviewDiscoveryImport={onPreviewDiscoveryImport!}
            importableCount={discoveryImportableCount ?? 0}
            status={discoveryPreviewStatus ?? { kind: "idle" }}
            disabled={buttonsDisabled || discoveryPreviewStatus?.kind === "running"}
          />
        )}
      </div>
    </div>
  );
}

interface DiscoveryImportPreviewActionProps {
  readonly onPreviewDiscoveryImport: () => void;
  readonly importableCount: number;
  readonly status: DiscoveryImportPreviewStatus;
  readonly disabled: boolean;
}

interface BatchRunExportActionsProps {
  readonly onCopyJson: () => void;
  readonly onCopyMarkdown: () => void;
  readonly onSaveJson?: () => void;
  readonly onSaveMarkdown?: () => void;
  readonly disabled: boolean;
  readonly status: BatchRunExportStatus | null;
}

function BatchRunExportActions(props: BatchRunExportActionsProps): JSX.Element {
  const { onCopyJson, onCopyMarkdown, onSaveJson, onSaveMarkdown, disabled, status } = props;
  return (
    <>
      <button
        type="button"
        className="intake-btn intake-btn--tiny"
        onClick={onCopyJson}
        disabled={disabled}
        aria-label="Copy JSON"
      >
        Copy JSON
      </button>
      <button
        type="button"
        className="intake-btn intake-btn--tiny"
        onClick={onCopyMarkdown}
        disabled={disabled}
        aria-label="Copy Markdown"
      >
        Copy Markdown
      </button>
      {onSaveJson && (
        <button
          type="button"
          className="intake-btn intake-btn--tiny"
          onClick={onSaveJson}
          disabled={disabled}
          aria-label="Save JSON"
        >
          Save JSON
        </button>
      )}
      {onSaveMarkdown && (
        <button
          type="button"
          className="intake-btn intake-btn--tiny"
          onClick={onSaveMarkdown}
          disabled={disabled}
          aria-label="Save Markdown"
        >
          Save Markdown
        </button>
      )}
      {status && <ExportStatusView status={status} />}
    </>
  );
}

function DiscoveryImportPreviewAction(
  props: DiscoveryImportPreviewActionProps,
): JSX.Element {
  const { onPreviewDiscoveryImport, importableCount, status, disabled } = props;
  return (
    <>
      <button
        type="button"
        className="intake-btn intake-btn--tiny"
        onClick={onPreviewDiscoveryImport}
        disabled={disabled}
        aria-label="Preview Discovery Import"
      >
        Preview Discovery Import ({importableCount})
      </button>
      <DiscoveryImportPreviewStatusView status={status} />
    </>
  );
}

function DiscoveryImportPreviewStatusView({
  status,
}: {
  readonly status: DiscoveryImportPreviewStatus;
}): JSX.Element | null {
  if (status.kind === "idle") return null;
  if (status.kind === "running") {
    return (
      <span
        className="intake-run-export-status"
        role="status"
        aria-label="Discovery preview running"
      >
        previewing…
      </span>
    );
  }
  if (status.kind === "failed") {
    return (
      <span
        className="intake-run-export-status intake-run-export-status--failed"
        role="alert"
      >
        preview failed: {status.message}
      </span>
    );
  }
  // ready
  const s = status.preview.summary;
  return (
    <span
      className="intake-run-export-status intake-run-export-status--ok"
      role="status"
      aria-label="Discovery preview result"
    >
      preview: {s.accepted_count} accepted · {s.rejected_count} rejected
    </span>
  );
}

function ExportStatusView({
  status,
}: {
  readonly status: BatchRunExportStatus;
}): JSX.Element {
  const label = status.format === "json" ? "JSON" : "Markdown";
  if (status.kind === "copied") {
    return (
      <span
        className="intake-run-export-status intake-run-export-status--ok"
        role="status"
        aria-label="Export copied"
      >
        copied {label}
      </span>
    );
  }
  if (status.kind === "saved") {
    return (
      <span
        className="intake-run-export-status intake-run-export-status--ok"
        role="status"
        aria-label="Export saved"
      >
        saved {label}
      </span>
    );
  }
  return (
    <span
      className="intake-run-export-status intake-run-export-status--failed"
      role="alert"
    >
      failed {label}: {status.message}
    </span>
  );
}

interface CountsLineProps {
  readonly display: FindingsDisplaySummary | null;
  readonly inProgress: boolean;
}

function CountsLine({ display, inProgress }: CountsLineProps): JSX.Element {
  if (display === null) {
    return (
      <span className="intake-mono intake-muted">
        0 devices · (not yet analysed)
      </span>
    );
  }
  const s = display.summary;
  const isIdle = display.status === "idle";
  if (isIdle) {
    return (
      <span className="intake-mono intake-muted">
        {s.total_count} device{s.total_count === 1 ? "" : "s"} · (not yet analysed)
      </span>
    );
  }

  return (
    <span className="intake-mono">
      <Chip label={`${s.total_count} device${s.total_count === 1 ? "" : "s"}`} />
      <Sep />
      <Chip label={`${s.parsed_count} parsed`} />
      <Sep />
      <Chip
        label={`${s.failed_count} failed`}
        modifier={s.failed_count > 0 ? "fault" : null}
      />
      <Sep />
      <Chip label={`${s.with_findings_count} with findings`} />
      <Sep />
      <Chip label={`${s.clean_count} clean`} />
      <SevChips display={display} />
      {inProgress && (
        <>
          {" "}
          <span
            className="intake-tag intake-tag--detect"
            role="status"
            aria-label="Analysing"
          >
            Analysing…
          </span>
        </>
      )}
    </span>
  );
}

function SevChips({ display }: { readonly display: FindingsDisplaySummary }): JSX.Element {
  const c = display.summary.severity_counts;
  return (
    <span className="intake-run-summary-strip__sev-chips">
      <Sep />
      <SevChip label="C" count={c.critical} kind="fault" />
      <Sep />
      <SevChip label="H" count={c.high} kind="fault" />
      <Sep />
      <SevChip label="M" count={c.medium} kind="warn" />
      <Sep />
      <SevChip label="L" count={c.low} kind="warn" />
      <Sep />
      <SevChip label="I" count={c.info} kind="neutral" />
    </span>
  );
}

function Sep(): JSX.Element {
  return <span className="intake-muted"> · </span>;
}

interface ChipProps {
  readonly label: string;
  readonly modifier?: "fault" | "warn" | "clean" | null;
}

function Chip({ label, modifier }: ChipProps): JSX.Element {
  const className =
    "intake-run-summary-strip__chip" +
    (modifier ? ` intake-run-summary-strip__chip--${modifier}` : "");
  return <span className={className}>{label}</span>;
}

interface SevChipProps {
  readonly label: string;
  readonly count: number;
  readonly kind: "fault" | "warn" | "neutral";
}

function SevChip({ label, count, kind }: SevChipProps): JSX.Element {
  const className =
    `intake-run-summary-strip__chip intake-run-summary-strip__chip--${
      count > 0 ? kind : "muted"
    }`;
  return (
    <span className={className} aria-label={`severity ${label} count`}>
      {label} {count}
    </span>
  );
}
