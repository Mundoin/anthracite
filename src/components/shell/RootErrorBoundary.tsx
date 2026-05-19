import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from "react";

export interface RootErrorBoundaryProps {
  readonly children: ReactNode;
}

interface RootErrorBoundaryState {
  readonly error: Error | null;
  readonly info: ErrorInfo | null;
}

const PANEL: CSSProperties = {
  position: "fixed",
  inset: "0",
  background: "#1a0d0a",
  color: "#f5d8d2",
  padding: "32px 36px",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  fontSize: "13px",
  lineHeight: 1.5,
  overflow: "auto",
  zIndex: 2147483647,
};

const TITLE: CSSProperties = {
  margin: "0 0 12px",
  fontSize: "18px",
  color: "#ff6a55",
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const STACK: CSSProperties = {
  marginTop: "16px",
  padding: "12px 14px",
  background: "#0d0805",
  border: "1px solid #3a2620",
  borderRadius: "3px",
  whiteSpace: "pre-wrap",
  fontSize: "12px",
  color: "#d8c8c0",
  maxHeight: "60vh",
  overflow: "auto",
};

const HINT: CSSProperties = {
  marginTop: "16px",
  fontStyle: "italic",
  color: "#b4a098",
};

/**
 * Root-level boundary, placed above AppShell so a throw anywhere in
 * App.tsx, AppShell, TitleBar, ModeRail, StatusBar etc. renders a
 * visible recovery panel instead of leaving the user with a blank
 * window (React 18 unmounts an unboundary'd root on uncaught render
 * error).
 *
 * The ModeErrorBoundary inside AppShell still handles per-mode
 * recovery without losing the shell. This boundary is the last line
 * of defense for anything above the mode body.
 */
export class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  override state: RootErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error, info: null };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, info });
    if (typeof console !== "undefined" && console.error) {
      console.error(
        "[RootErrorBoundary] caught uncaught render error:",
        error,
        info.componentStack,
      );
    }
  }

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    const stack = this.state.info?.componentStack?.trim() ?? "";
    return (
      <div
        role="alert"
        aria-label="App root render error"
        data-testid="root-error-boundary"
        style={PANEL}
      >
        <h1 style={TITLE} data-testid="root-error-title">
          Anthracite shell render error
        </h1>
        <p data-testid="root-error-message">
          {this.state.error.name}: {this.state.error.message}
        </p>
        {stack !== "" && (
          <pre style={STACK} data-testid="root-error-stack">
            {stack}
          </pre>
        )}
        <p style={HINT}>
          A render exception escaped the mode-level boundary. Reload
          the app (Ctrl+R) to recover. Console logs prefixed with
          <code> [RootErrorBoundary] </code>
          and <code> [GlobalError] </code> carry the full trace.
        </p>
      </div>
    );
  }
}
