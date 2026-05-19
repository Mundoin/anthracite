import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { JSX } from "react";
import { ModeErrorBoundary } from "../ModeErrorBoundary";

function Crash({ message }: { readonly message: string }): JSX.Element {
  throw new Error(message);
}

function Ok({ label }: { readonly label: string }): JSX.Element {
  return <div data-testid="ok">{label}</div>;
}

describe("ModeErrorBoundary", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  it("renders children when no error", () => {
    render(
      <ModeErrorBoundary modeId="hierarchy">
        <Ok label="hi" />
      </ModeErrorBoundary>,
    );
    expect(screen.getByTestId("ok").textContent).toBe("hi");
  });

  it("renders fallback panel when child throws", () => {
    render(
      <ModeErrorBoundary modeId="diagnose">
        <Crash message="boom from diagnose" />
      </ModeErrorBoundary>,
    );
    expect(screen.getByTestId("mode-error-boundary")).toBeTruthy();
    expect(screen.getByTestId("mode-error-mode").textContent).toContain(
      "diagnose",
    );
    expect(screen.getByTestId("mode-error-message").textContent).toContain(
      "boom from diagnose",
    );
  });

  it("resets via key change when active mode switches", () => {
    const { rerender } = render(
      <ModeErrorBoundary key="diagnose" modeId="diagnose">
        <Crash message="diagnose crash" />
      </ModeErrorBoundary>,
    );
    expect(screen.getByTestId("mode-error-boundary")).toBeTruthy();

    rerender(
      <ModeErrorBoundary key="intake" modeId="intake">
        <Ok label="intake ok" />
      </ModeErrorBoundary>,
    );
    expect(screen.queryByTestId("mode-error-boundary")).toBeNull();
    expect(screen.getByTestId("ok").textContent).toBe("intake ok");
  });

  it("fallback panel has inline visibility styles (dark-shell readability)", () => {
    render(
      <ModeErrorBoundary modeId="diagnose">
        <Crash message="visual test" />
      </ModeErrorBoundary>,
    );
    const panel = screen.getByTestId("mode-error-boundary") as HTMLElement;
    expect(panel.style.background).not.toBe("");
    expect(panel.style.color).not.toBe("");
    expect(panel.style.border).not.toBe("");
    expect(panel.style.padding).not.toBe("");
  });

  it("does not let a crashed mode poison the next mode (regression: V1AW white-screen)", () => {
    // First render: Diagnose crashes.
    const { rerender } = render(
      <ModeErrorBoundary key="diagnose" modeId="diagnose">
        <Crash message="diagnose render crash" />
      </ModeErrorBoundary>,
    );
    expect(screen.getByTestId("mode-error-title").textContent).toContain(
      "crashed",
    );

    // Switch to Intake — should render fine, not stay in error state.
    rerender(
      <ModeErrorBoundary key="intake" modeId="intake">
        <Ok label="intake content" />
      </ModeErrorBoundary>,
    );
    expect(screen.getByTestId("ok").textContent).toBe("intake content");

    // Switch to Settings — also fine.
    rerender(
      <ModeErrorBoundary key="settings" modeId="settings">
        <Ok label="settings content" />
      </ModeErrorBoundary>,
    );
    expect(screen.getByTestId("ok").textContent).toBe("settings content");
  });
});
