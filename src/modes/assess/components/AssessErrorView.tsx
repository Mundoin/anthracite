/**
 * V1W-R — ASSESS error view.
 *
 * Visible and specific failure reason (A7). No silent fallback to
 * empty state; the operator must explicitly retry or close.
 */

import type { JSX } from "react";

import type { LoadErrorReason } from "../assessTypes";

export interface AssessErrorViewProps {
  readonly reason: LoadErrorReason;
  readonly message: string;
  readonly onRetry: () => void;
  readonly onClose: () => void;
}

export function AssessErrorView({
  reason,
  message,
  onRetry,
  onClose,
}: AssessErrorViewProps): JSX.Element {
  return (
    <section className="assess-error" aria-label="Assessment load failed">
      <div className="intake-error" role="alert">
        <div className="intake-error__head">
          <span className="intake-tag intake-tag--err">
            ERROR · {labelReason(reason)}
          </span>
        </div>
        <div className="intake-error__body">
          <div className="assess-error__heading">Could not load file.</div>
          {message.length > 0 && (
            <div className="assess-error__message">{message}</div>
          )}
        </div>
      </div>
      <div className="assess-error__actions">
        <button
          type="button"
          className="intake-btn intake-btn--primary"
          onClick={onRetry}
          aria-label="Try another file"
        >
          Try another file
        </button>
        <button
          type="button"
          className="intake-btn"
          onClick={onClose}
          aria-label="Close"
        >
          Close
        </button>
      </div>
    </section>
  );
}

function labelReason(reason: LoadErrorReason): string {
  switch (reason) {
    case "read_failed":
      return "read failed";
    case "invalid_json":
      return "invalid JSON";
    case "wrong_export_version":
      return "unsupported export version";
    case "wrong_kind":
      return "wrong export kind";
    case "shape_mismatch":
      return "shape mismatch";
  }
}
