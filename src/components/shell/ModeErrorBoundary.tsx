import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from "react";

const FALLBACK_STYLE: CSSProperties = {
  padding: "24px 28px",
  margin: "16px",
  background: "#1b1410",
  border: "1px solid #c84a3a",
  borderRadius: "4px",
  color: "#f5d8d2",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  fontSize: "13px",
  lineHeight: 1.5,
  minHeight: "120px",
  overflow: "auto",
};

const TITLE_STYLE: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "15px",
  fontWeight: 600,
  color: "#ff6a55",
  letterSpacing: "0.02em",
};

const STACK_STYLE: CSSProperties = {
  marginTop: "12px",
  padding: "10px 12px",
  background: "#0d0a08",
  border: "1px solid #3a2620",
  borderRadius: "3px",
  whiteSpace: "pre-wrap",
  fontSize: "12px",
  color: "#d8c8c0",
  maxHeight: "240px",
  overflow: "auto",
};

const HINT_STYLE: CSSProperties = {
  marginTop: "12px",
  fontStyle: "italic",
  color: "#b4a098",
};

export interface ModeErrorBoundaryProps {
  readonly children: ReactNode;
  readonly modeId?: string;
}

interface ModeErrorBoundaryState {
  readonly error: Error | null;
  readonly info: ErrorInfo | null;
}

/**
 * Catches render-time exceptions inside a mode body and shows a
 * recoverable error panel instead of letting React unmount the whole
 * App tree to a white screen.
 *
 * Reset semantics: callers should re-mount this boundary on mode
 * change by passing `key={activeMode}`. That guarantees a crashed
 * mode never poisons subsequent mode renders.
 */
export class ModeErrorBoundary extends Component<
  ModeErrorBoundaryProps,
  ModeErrorBoundaryState
> {
  override state: ModeErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error): ModeErrorBoundaryState {
    return { error, info: null };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, info });
    if (typeof console !== "undefined" && console.error) {
      console.error(
        `[ModeErrorBoundary] mode=${this.props.modeId ?? "(unknown)"} crashed:`,
        error,
        info.componentStack,
      );
    }
  }

  override render(): ReactNode {
    if (this.state.error === null) {
      return this.props.children;
    }
    const stack = this.state.info?.componentStack?.trim() ?? "";
    return (
      <div
        className="anth-mode-error"
        role="alert"
        aria-label="Mode render error"
        data-testid="mode-error-boundary"
        style={FALLBACK_STYLE}
      >
        <h2 data-testid="mode-error-title" style={TITLE_STYLE}>
          Mode crashed during render
        </h2>
        <p data-testid="mode-error-mode" style={{ margin: "4px 0" }}>
          Mode: <code>{this.props.modeId ?? "(unknown)"}</code>
        </p>
        <p data-testid="mode-error-message" style={{ margin: "4px 0" }}>
          {this.state.error.name}: {this.state.error.message}
        </p>
        {stack !== "" && (
          <pre
            className="anth-mode-error__stack"
            data-testid="mode-error-stack"
            style={STACK_STYLE}
          >
            {stack}
          </pre>
        )}
        <p className="anth-mode-error__hint" style={HINT_STYLE}>
          Switch to another mode in the rail to recover. This boundary
          resets when the active mode changes.
        </p>
      </div>
    );
  }
}
