import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsMode } from "../SettingsMode";
import { ThemeProvider } from "../../../contexts/ThemeContext";

function renderWithTheme(): void {
  render(
    <ThemeProvider>
      <SettingsMode />
    </ThemeProvider>,
  );
}

describe("SettingsMode", () => {
  it("renders Display and Operator headings", () => {
    renderWithTheme();
    expect(screen.getByRole("heading", { name: /Display/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Operator/i })).toBeInTheDocument();
  });

  it("renders all three theme options", () => {
    renderWithTheme();
    expect(screen.getByTestId("settings-theme-option-light-industrial")).toBeInTheDocument();
    expect(screen.getByTestId("settings-theme-option-graphite-command")).toBeInTheDocument();
    expect(screen.getByTestId("settings-theme-option-technical-blueprint")).toBeInTheDocument();
  });

  it("default selection is light-industrial", () => {
    renderWithTheme();
    const opt = screen.getByTestId("settings-theme-option-light-industrial");
    expect(opt.dataset.selected).toBe("true");
  });

  it("selecting graphite-command updates root data-theme", () => {
    renderWithTheme();
    const radio = screen
      .getByTestId("settings-theme-option-graphite-command")
      .querySelector("input[type=\"radio\"]") as HTMLInputElement;
    fireEvent.click(radio);
    expect(document.documentElement.dataset.theme).toBe("graphite-command");
  });

  it("selecting technical-blueprint updates root data-theme", () => {
    renderWithTheme();
    const radio = screen
      .getByTestId("settings-theme-option-technical-blueprint")
      .querySelector("input[type=\"radio\"]") as HTMLInputElement;
    fireEvent.click(radio);
    expect(document.documentElement.dataset.theme).toBe("technical-blueprint");
  });

  it("renders the footer note", () => {
    renderWithTheme();
    expect(screen.getByText(/More settings land as modes come online/)).toBeInTheDocument();
  });
});
