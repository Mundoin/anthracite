import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { JSX } from "react";
import {
  ThemeProvider,
  useTheme,
  isThemeId,
  DEFAULT_THEME,
  THEME_IDS,
  type ThemeId,
} from "../ThemeContext";

function Probe(): JSX.Element {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="probe-theme">{theme}</span>
      {THEME_IDS.map((id) => (
        <button
          key={id}
          type="button"
          data-testid={`set-${id}`}
          onClick={() => setTheme(id)}
        >
          {id}
        </button>
      ))}
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it("default theme is light-industrial", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(DEFAULT_THEME).toBe("light-industrial");
    expect(screen.getByTestId("probe-theme").textContent).toBe("light-industrial");
    expect(document.documentElement.dataset.theme).toBe("light-industrial");
  });

  it("setTheme updates context value and root data-theme attribute", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    act(() => {
      screen.getByTestId("set-graphite-command").click();
    });
    expect(screen.getByTestId("probe-theme").textContent).toBe("graphite-command");
    expect(document.documentElement.dataset.theme).toBe("graphite-command");

    act(() => {
      screen.getByTestId("set-technical-blueprint").click();
    });
    expect(screen.getByTestId("probe-theme").textContent).toBe("technical-blueprint");
    expect(document.documentElement.dataset.theme).toBe("technical-blueprint");
  });

  it("isThemeId guard accepts valid ids and rejects junk", () => {
    expect(isThemeId("light-industrial")).toBe(true);
    expect(isThemeId("graphite-command")).toBe(true);
    expect(isThemeId("technical-blueprint")).toBe(true);
    expect(isThemeId("nope")).toBe(false);
    expect(isThemeId(42)).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });

  it("respects explicit initial prop", () => {
    const initial: ThemeId = "technical-blueprint";
    render(
      <ThemeProvider initial={initial}>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe-theme").textContent).toBe("technical-blueprint");
    expect(document.documentElement.dataset.theme).toBe("technical-blueprint");
  });
});
