import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { JSX } from "react";
import { RootErrorBoundary } from "../RootErrorBoundary";

function Ok({ label }: { readonly label: string }): JSX.Element {
  return <div data-testid="ok">{label}</div>;
}

function Crash({ message }: { readonly message: string }): JSX.Element {
  throw new Error(message);
}

describe("RootErrorBoundary", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  it("passes children through when no error", () => {
    render(
      <RootErrorBoundary>
        <Ok label="root content" />
      </RootErrorBoundary>,
    );
    expect(screen.getByTestId("ok").textContent).toBe("root content");
  });

  it("renders visible fallback when child throws (full-root white-screen guard)", () => {
    render(
      <RootErrorBoundary>
        <Crash message="catastrophic shell render error" />
      </RootErrorBoundary>,
    );
    const panel = screen.getByTestId("root-error-boundary") as HTMLElement;
    expect(panel).toBeTruthy();
    expect(screen.getByTestId("root-error-title").textContent).toContain(
      "render error",
    );
    expect(screen.getByTestId("root-error-message").textContent).toContain(
      "catastrophic shell render error",
    );
    // Inline styles guarantee visibility even if app CSS failed to load:
    expect(panel.style.background).not.toBe("");
    expect(panel.style.color).not.toBe("");
    expect(panel.style.position).toBe("fixed");
    expect(panel.style.zIndex).not.toBe("");
  });

  it("logs the error with [RootErrorBoundary] prefix", () => {
    render(
      <RootErrorBoundary>
        <Crash message="logged crash" />
      </RootErrorBoundary>,
    );
    const calls = errSpy.mock.calls.map((args) => String(args[0] ?? ""));
    expect(calls.some((c) => c.includes("[RootErrorBoundary]"))).toBe(true);
  });
});
