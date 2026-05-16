import type { JSX } from "react";
import type { IntakeErrorStage, IntakeStatus } from "../intakeTypes";

export interface ParseStatusViewProps {
  readonly status: IntakeStatus;
  readonly errorStage: IntakeErrorStage | null;
  readonly errorMessage: string | null;
  readonly selectedPlatformId: string | null;
  readonly isManualOverride: boolean;
  readonly onParse: () => void;
  readonly onDismissError: () => void;
}

export function ParseStatusView(props: ParseStatusViewProps): JSX.Element {
  const {
    status,
    errorStage,
    errorMessage,
    selectedPlatformId,
    isManualOverride,
    onParse,
    onDismissError,
  } = props;

  const canParse =
    status === "detected" && selectedPlatformId !== null;

  return (
    <section className="intake-parse" aria-label="Parse status">
      <header className="intake-section__header">
        <div className="intake-section__title">PARSE</div>
        <div className="intake-section__meta">
          <StatusBadge status={status} />
        </div>
      </header>

      <div className="intake-parse__row">
        <div className="intake-kv">
          <div className="intake-kv__k">Will use platform</div>
          <div className="intake-kv__v">
            {selectedPlatformId ?? <span className="intake-muted">(none — select one)</span>}
            {selectedPlatformId && isManualOverride && (
              <span className="intake-tag intake-tag--manual">MANUAL</span>
            )}
            {selectedPlatformId && !isManualOverride && (
              <span className="intake-tag intake-tag--detect">FROM DETECTION</span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="intake-btn intake-btn--primary"
          onClick={onParse}
          disabled={!canParse}
        >
          {status === "parsing" ? "Parsing…" : "Parse config"}
        </button>
      </div>

      {status === "error" && errorMessage && (
        <div className="intake-error" role="alert">
          <div className="intake-error__head">
            <span className="intake-tag intake-tag--err">
              ERROR · {errorStage ?? "unknown"}
            </span>
            <button
              type="button"
              className="intake-btn intake-btn--tiny"
              onClick={onDismissError}
            >
              Dismiss
            </button>
          </div>
          <div className="intake-error__body">{errorMessage}</div>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { readonly status: IntakeStatus }): JSX.Element {
  const cls = `intake-status intake-status--${status}`;
  return <span className={cls}>{status}</span>;
}
