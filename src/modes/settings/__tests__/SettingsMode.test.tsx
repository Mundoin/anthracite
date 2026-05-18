import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsMode } from "../SettingsMode";

describe("SettingsMode", () => {
  it("renders Display and Operator headings", () => {
    render(<SettingsMode />);
    expect(screen.getByRole("heading", { name: /Display/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Operator/i })).toBeInTheDocument();
  });

  it("renders the locked theme row", () => {
    render(<SettingsMode />);
    expect(screen.getByText("Industrial dark · locked at V1")).toBeInTheDocument();
  });

  it("renders the footer note", () => {
    render(<SettingsMode />);
    expect(screen.getByText(/More settings land as modes come online/)).toBeInTheDocument();
  });

  it("no interactive elements", () => {
    render(<SettingsMode />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
