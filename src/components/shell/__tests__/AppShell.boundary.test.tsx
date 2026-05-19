import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { JSX } from "react";
import { AppShell } from "../AppShell";
import type { ModeId } from "../ModeRail";

function Ok({ label }: { readonly label: string }): JSX.Element {
  return <div data-testid="mode-ok">{label}</div>;
}

function Crash({ message }: { readonly message: string }): JSX.Element {
  throw new Error(message);
}

/**
 * Audit confirmation tests for V1AW white-screen hotfix:
 * the ModeErrorBoundary lives inside AppShell so every top-level mode
 * branch in App.tsx gets the same crash isolation through a single
 * touchpoint (the AppShell `children` prop). ModeRail / TitleBar /
 * StatusBar stay outside the boundary so the user can still switch
 * modes after a crash.
 */
describe("AppShell — ModeErrorBoundary integration", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  function renderShell(
    activeMode: ModeId,
    child: JSX.Element,
  ): ReturnType<typeof render> {
    return render(
      <AppShell
        env={null}
        crumbs={[activeMode]}
        activeMode={activeMode}
        onModeChange={() => {}}
      >
        {child}
      </AppShell>,
    );
  }

  it("renders normal child when no crash", () => {
    renderShell("hierarchy", <Ok label="hierarchy content" />);
    expect(screen.getByTestId("mode-ok").textContent).toBe(
      "hierarchy content",
    );
  });

  it.each<ModeId>(["settings", "diagnose", "intake", "assess", "topology", "opsConsole"])(
    "isolates a crashing %s child into the boundary (ModeRail still mounts)",
    (mode) => {
      renderShell(mode, <Crash message={`${mode} crash`} />);
      // Fallback rendered:
      expect(screen.getByTestId("mode-error-boundary")).toBeTruthy();
      expect(screen.getByTestId("mode-error-mode").textContent).toContain(mode);
      // Shell chrome survives the crash:
      expect(screen.getByLabelText("Workspace")).toBeTruthy();
    },
  );

  it("recovers content when active mode switches from crashed to healthy", () => {
    const { rerender } = render(
      <AppShell
        env={null}
        crumbs={["diagnose"]}
        activeMode="diagnose"
        onModeChange={() => {}}
      >
        <Crash message="diagnose crash" />
      </AppShell>,
    );
    expect(screen.getByTestId("mode-error-boundary")).toBeTruthy();

    rerender(
      <AppShell
        env={null}
        crumbs={["settings"]}
        activeMode="settings"
        onModeChange={() => {}}
      >
        <Ok label="settings content" />
      </AppShell>,
    );
    expect(screen.queryByTestId("mode-error-boundary")).toBeNull();
    expect(screen.getByTestId("mode-ok").textContent).toBe("settings content");
  });

  it("switching hierarchy -> settings does not unmount the shell", () => {
    const { rerender } = render(
      <AppShell
        env={null}
        crumbs={["hierarchy"]}
        activeMode="hierarchy"
        onModeChange={() => {}}
      >
        <Ok label="hierarchy" />
      </AppShell>,
    );
    expect(screen.getByLabelText("Workspace")).toBeTruthy();
    rerender(
      <AppShell
        env={null}
        crumbs={["settings"]}
        activeMode="settings"
        onModeChange={() => {}}
      >
        <Ok label="settings" />
      </AppShell>,
    );
    expect(screen.getByLabelText("Workspace")).toBeTruthy();
    expect(screen.getByTestId("mode-ok").textContent).toBe("settings");
  });

  it("switching hierarchy -> diagnose does not unmount the shell even if diagnose crashes", () => {
    const { rerender } = render(
      <AppShell
        env={null}
        crumbs={["hierarchy"]}
        activeMode="hierarchy"
        onModeChange={() => {}}
      >
        <Ok label="hierarchy" />
      </AppShell>,
    );
    expect(screen.getByLabelText("Workspace")).toBeTruthy();
    rerender(
      <AppShell
        env={null}
        crumbs={["diagnose"]}
        activeMode="diagnose"
        onModeChange={() => {}}
      >
        <Crash message="diagnose crash" />
      </AppShell>,
    );
    expect(screen.getByLabelText("Workspace")).toBeTruthy();
    expect(screen.getByTestId("mode-error-boundary")).toBeTruthy();
  });
});
