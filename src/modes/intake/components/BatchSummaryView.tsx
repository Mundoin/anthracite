import type { JSX } from "react";
import type { ArchiveEntryRef } from "../../../types/archiveIntake";
import type {
  BatchWarning,
  ConfigBatchSplitResult,
  ConfigSlice,
  SliceHint,
  SplitMethod,
} from "../../../types/configBatch";
import type { PerSliceDetection } from "../intakeTypes";
import { ArchiveSourceBadge } from "./ArchiveSourceBadge";

export interface BatchSummaryViewProps {
  readonly result: ConfigBatchSplitResult;
  readonly perSliceDetection: Readonly<Record<string, PerSliceDetection>>;
  readonly onOpenSlice: (sliceId: string) => void;
  readonly onTreatAsSingleConfig: () => void;
  readonly disabled: boolean;
  /**
   * V1O-B archive provenance map (slice_id → entry ref). Optional —
   * absent for V1O-A paste/file splits. When present, each slice
   * card is decorated with an `ArchiveSourceBadge`.
   */
  readonly archiveProvenance?: Readonly<Record<string, ArchiveEntryRef>>;
}

export function BatchSummaryView(props: BatchSummaryViewProps): JSX.Element {
  const {
    result,
    perSliceDetection,
    onOpenSlice,
    onTreatAsSingleConfig,
    disabled,
    archiveProvenance,
  } = props;
  const ambiguousOrLow = result.warnings.some(
    (w) =>
      w.kind === "ambiguous_boundary" ||
      w.kind === "low_confidence_split" ||
      w.kind === "unusually_large_batch",
  );
  return (
    <section className="intake-batch" aria-label="Batch summary">
      <header className="intake-section__header">
        <div className="intake-section__title">
          BATCH SUMMARY ·{" "}
          {result.slices.length.toLocaleString("en-US")}{" "}
          {result.slices.length === 1 ? "device" : "devices"}
        </div>
        <div className="intake-section__meta">
          method · {describeMethod(result.method)} · splitter v{result.splitter_version}
        </div>
      </header>

      <div className="intake-batch__sub">
        <div className="intake-batch__meta">
          scanned {result.scanned_line_count.toLocaleString("en-US")} /{" "}
          {result.total_line_count.toLocaleString("en-US")} lines
        </div>
        {ambiguousOrLow && (
          <button
            type="button"
            className="intake-btn"
            onClick={onTreatAsSingleConfig}
            disabled={disabled}
            aria-label="Treat as single config"
          >
            Treat as single config
          </button>
        )}
      </div>

      <BatchWarningsPanel warnings={result.warnings} />

      <BatchSlicesList
        slices={result.slices}
        perSliceDetection={perSliceDetection}
        onOpenSlice={onOpenSlice}
        disabled={disabled}
        archiveProvenance={archiveProvenance}
      />
    </section>
  );
}

interface BatchSlicesListProps {
  readonly slices: ReadonlyArray<ConfigSlice>;
  readonly perSliceDetection: Readonly<Record<string, PerSliceDetection>>;
  readonly onOpenSlice: (sliceId: string) => void;
  readonly disabled: boolean;
  readonly archiveProvenance?: Readonly<Record<string, ArchiveEntryRef>>;
}

function BatchSlicesList(props: BatchSlicesListProps): JSX.Element {
  const { slices, perSliceDetection, onOpenSlice, disabled, archiveProvenance } = props;
  return (
    <div className="intake-subblock">
      <div className="intake-subblock__title">SLICES ({slices.length})</div>
      {slices.length === 0 ? (
        <div className="intake-empty">(no slices)</div>
      ) : (
        <table className="intake-table intake-batch__slices" aria-label="Batch slices">
          <thead>
            <tr>
              <th>Slice</th>
              <th>Label</th>
              <th>Lines</th>
              <th>Splitter conf.</th>
              <th>Detection</th>
              <th>{""}</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => {
              const det = perSliceDetection[slice.slice_id];
              const provenance = archiveProvenance?.[slice.slice_id];
              return (
                <tr key={slice.slice_id}>
                  <td>{slice.slice_id}</td>
                  <td>
                    {describeHint(slice.hint)}
                    {provenance && (
                      <>
                        {" "}
                        <ArchiveSourceBadge provenance={provenance} />
                      </>
                    )}
                  </td>
                  <td className="intake-num">
                    {slice.line_start === slice.line_end
                      ? slice.line_start
                      : `${slice.line_start}–${slice.line_end}`}
                  </td>
                  <td>
                    <SplitConfidence value={slice.confidence} />
                  </td>
                  <td>
                    <DetectionCell entry={det} />
                  </td>
                  <td className="intake-batch__action">
                    <button
                      type="button"
                      className="intake-btn intake-btn--tiny intake-btn--primary"
                      onClick={() => onOpenSlice(slice.slice_id)}
                      disabled={disabled}
                      aria-label={`Open ${slice.slice_id}`}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function describeHint(hint: SliceHint): string {
  if (hint.kind === "hostname_present") return hint.hostname;
  if (hint.kind === "vendor_header_detected") return `header: ${hint.header}`;
  return "(no hint)";
}

function describeMethod(method: SplitMethod): string {
  switch (method.kind) {
    case "explicit_separator":
      return `explicit · ${method.pattern}`;
    case "heuristic":
      return "heuristic";
    case "single_config":
      return "single config";
    case "no_split_possible":
      return "no split possible";
  }
}

function SplitConfidence({ value }: { readonly value: number }): JSX.Element {
  const low = value <= 0.5;
  return (
    <span className={`intake-mono${low ? " intake-confidence--low" : ""}`}>
      {value.toFixed(2)}
      {low && <span className="intake-tag intake-tag--warn">LOW</span>}
    </span>
  );
}

function DetectionCell({ entry }: { readonly entry: PerSliceDetection | undefined }): JSX.Element {
  if (!entry || entry.status === "pending") {
    return <span className="intake-muted">detecting…</span>;
  }
  if (entry.status === "failed") {
    return <span className="intake-tag intake-tag--err">FAILED</span>;
  }
  const best = entry.result.best_match;
  if (!best) {
    return <span className="intake-tag intake-tag--warn">NO MATCH</span>;
  }
  const conf = entry.result.confidence;
  const lowConf = entry.result.warnings.some((w) => w.kind === "low_confidence");
  return (
    <span className="intake-mono">
      {best.platform_id ?? "(unset)"}
      <span className="intake-muted"> · {conf.toFixed(2)}</span>
      {lowConf && <span className="intake-tag intake-tag--warn">LOW</span>}
    </span>
  );
}

interface BatchWarningsPanelProps {
  readonly warnings: ReadonlyArray<BatchWarning>;
}

function BatchWarningsPanel({ warnings }: BatchWarningsPanelProps): JSX.Element {
  return (
    <div className="intake-subblock">
      <div className="intake-subblock__title">
        SPLITTER WARNINGS ({warnings.length})
      </div>
      {warnings.length === 0 ? (
        <div className="intake-empty">(none)</div>
      ) : (
        <ul className="intake-list">
          {warnings.map((w, i) => (
            <li key={i} className="intake-list__item">
              <span className="intake-tag intake-tag--warn">{w.kind}</span>
              <span className="intake-list__detail">{describeWarning(w)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function describeWarning(w: BatchWarning): string {
  switch (w.kind) {
    case "empty_input":
      return "Input was empty.";
    case "whitespace_only":
      return "Input contained only whitespace.";
    case "input_truncated":
      return `Truncated: ${w.scanned.toLocaleString("en-US")} of ${w.total.toLocaleString("en-US")} lines scanned.`;
    case "no_split_possible":
      return "No split possible from this input.";
    case "no_separators_found":
      return "No explicit separators found in the input.";
    case "ambiguous_boundary":
      return `Ambiguous boundary near line ${w.near_line.toLocaleString("en-US")}.`;
    case "empty_slice_produced":
      return `Slice ${w.slice_id} contained no content between its separators.`;
    case "low_confidence_split":
      return `Slice ${w.slice_id} was split with low confidence; verify before parsing.`;
    case "unusually_large_batch":
      return `Input would yield ${w.device_count.toLocaleString("en-US")} devices; capped to display limit.`;
  }
}
