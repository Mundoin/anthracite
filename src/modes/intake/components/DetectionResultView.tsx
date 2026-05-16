import type { JSX } from "react";
import type {
  ConfigDetectionResult,
  DetectionEvidence,
  DetectionWarning,
} from "../../../types/configDetection";

export interface DetectionResultViewProps {
  readonly result: ConfigDetectionResult;
  readonly isManualOverride: boolean;
  readonly selectedPlatformId: string | null;
}

export function DetectionResultView(props: DetectionResultViewProps): JSX.Element {
  const { result, isManualOverride, selectedPlatformId } = props;
  const best = result.best_match;
  const confidencePct = formatConfidence(result.confidence);
  const lowConfidence = hasWarning(result.warnings, "low_confidence");
  const ambiguous = hasWarning(result.warnings, "ambiguous");
  const noSignatures = hasWarning(result.warnings, "no_signatures_matched");
  const empty = hasWarning(result.warnings, "empty_input");

  return (
    <section className="intake-detect" aria-label="Detection result">
      <header className="intake-section__header">
        <div className="intake-section__title">DETECTION</div>
        <div className="intake-section__meta">
          scanned {result.scanned_line_count.toLocaleString("en-US")} /
          {" "}{result.total_line_count.toLocaleString("en-US")} lines
        </div>
      </header>

      <div className="intake-detect__summary">
        <div className="intake-kv">
          <div className="intake-kv__k">Best match</div>
          <div className="intake-kv__v">
            {best?.platform_id ?? <span className="intake-muted">(no best match)</span>}
            {best?.vendor && <span className="intake-muted"> · {best.vendor}</span>}
            {best?.os_family && <span className="intake-muted"> / {best.os_family}</span>}
          </div>
        </div>
        <div className="intake-kv">
          <div className="intake-kv__k">Confidence</div>
          <div
            className={`intake-kv__v intake-confidence${lowConfidence ? " intake-confidence--low" : ""}`}
          >
            {confidencePct}
            {lowConfidence && <span className="intake-tag intake-tag--warn">LOW CONFIDENCE</span>}
            {ambiguous && <span className="intake-tag intake-tag--warn">AMBIGUOUS</span>}
            {noSignatures && <span className="intake-tag intake-tag--err">NO SIGNATURES MATCHED</span>}
            {empty && <span className="intake-tag intake-tag--err">EMPTY INPUT</span>}
          </div>
        </div>
        <div className="intake-kv">
          <div className="intake-kv__k">Selection</div>
          <div className="intake-kv__v">
            {selectedPlatformId ?? <span className="intake-muted">(none)</span>}
            {isManualOverride && (
              <span className="intake-tag intake-tag--manual">MANUAL OVERRIDE</span>
            )}
            {!isManualOverride && selectedPlatformId && (
              <span className="intake-tag intake-tag--detect">FROM DETECTION</span>
            )}
          </div>
        </div>
      </div>

      <CandidatesTable
        candidates={result.candidates}
        selectedPlatformId={selectedPlatformId}
        bestPlatformId={best?.platform_id ?? null}
      />

      <WarningsList warnings={result.warnings} />

      <EvidenceList evidence={result.evidence} />
    </section>
  );
}

interface CandidatesTableProps {
  readonly candidates: ReadonlyArray<ConfigDetectionResult["candidates"][number]>;
  readonly selectedPlatformId: string | null;
  readonly bestPlatformId: string | null;
}

function CandidatesTable(props: CandidatesTableProps): JSX.Element {
  const { candidates, selectedPlatformId, bestPlatformId } = props;
  if (candidates.length === 0) {
    return (
      <div className="intake-empty">No candidate platforms.</div>
    );
  }
  return (
    <div className="intake-subblock">
      <div className="intake-subblock__title">CANDIDATES ({candidates.length})</div>
      <table className="intake-table" aria-label="Detection candidates">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Score</th>
            <th>Normalized</th>
            <th>Matches</th>
            <th>Distinct sigs</th>
            <th>Mark</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => {
            const isBest = c.platform_id === bestPlatformId;
            const isSelected = c.platform_id === selectedPlatformId;
            return (
              <tr key={c.platform_id} className={isSelected ? "is-selected" : ""}>
                <td>{c.platform_id}</td>
                <td className="intake-num">{c.score.toFixed(2)}</td>
                <td className="intake-num">{c.normalized_score.toFixed(3)}</td>
                <td className="intake-num">{c.match_count}</td>
                <td className="intake-num">{c.distinct_signature_count}</td>
                <td>
                  {isBest && <span className="intake-tag intake-tag--detect">BEST</span>}
                  {isSelected && !isBest && (
                    <span className="intake-tag intake-tag--manual">SELECTED</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WarningsList({ warnings }: { readonly warnings: ReadonlyArray<DetectionWarning> }): JSX.Element {
  if (warnings.length === 0) {
    return (
      <div className="intake-subblock">
        <div className="intake-subblock__title">WARNINGS (0)</div>
        <div className="intake-empty">(none)</div>
      </div>
    );
  }
  return (
    <div className="intake-subblock">
      <div className="intake-subblock__title">WARNINGS ({warnings.length})</div>
      <ul className="intake-list">
        {warnings.map((w, i) => (
          <li key={i} className="intake-list__item">
            <span className="intake-tag intake-tag--warn">{w.kind}</span>
            <span className="intake-list__detail">{describeWarning(w)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceList({ evidence }: { readonly evidence: ReadonlyArray<DetectionEvidence> }): JSX.Element {
  if (evidence.length === 0) {
    return (
      <div className="intake-subblock">
        <div className="intake-subblock__title">EVIDENCE (0)</div>
        <div className="intake-empty">(none)</div>
      </div>
    );
  }
  return (
    <div className="intake-subblock">
      <div className="intake-subblock__title">EVIDENCE ({evidence.length})</div>
      <table className="intake-table" aria-label="Detection evidence">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Sig</th>
            <th>Cat</th>
            <th>Weight</th>
            <th>Line</th>
            <th>Preview</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((e, i) => (
            <tr key={`${e.platform_id}-${e.signature_id}-${i}`}>
              <td>{e.platform_id}</td>
              <td>{e.signature_id}</td>
              <td><span className="intake-tag intake-tag--cat">{e.category}</span></td>
              <td className="intake-num">{e.weight.toFixed(2)}</td>
              <td className="intake-num">{e.line_number}</td>
              <td className="intake-mono">{e.preview}</td>
              <td>{e.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hasWarning(
  warnings: ReadonlyArray<DetectionWarning>,
  kind: DetectionWarning["kind"],
): boolean {
  return warnings.some((w) => w.kind === kind);
}

function describeWarning(w: DetectionWarning): string {
  switch (w.kind) {
    case "empty_input":
      return "Input was empty.";
    case "input_truncated":
      return `Truncated: ${w.scanned.toLocaleString("en-US")} of ${w.total.toLocaleString("en-US")} lines scanned.`;
    case "low_confidence":
      return `Best score ${w.best_score.toFixed(2)} below confidence threshold.`;
    case "ambiguous":
      return `Top ${w.top_score.toFixed(2)} vs runner-up ${w.runner_up_score.toFixed(2)}.`;
    case "no_signatures_matched":
      return "No registered signatures matched.";
  }
}

function formatConfidence(c: number): string {
  if (Number.isNaN(c)) return "(NaN)";
  return c.toFixed(3);
}
