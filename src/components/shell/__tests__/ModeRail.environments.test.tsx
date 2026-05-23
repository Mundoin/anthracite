import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeRail, type ModeId } from "../ModeRail";
import { MODE_CATALOGUE } from "../../../contracts/modeCatalogue";

describe("ModeRail — Environments mode", () => {
  it("Environments entry appears in Foundation group", () => {
    const onChange = vi.fn();
    render(<ModeRail active="environments" onChange={onChange} catalogue={MODE_CATALOGUE} />);

    const environmentsButton = screen.getByRole("button", { name: /Environments/i });
    expect(environmentsButton).toBeInTheDocument();
  });

  it("Environments is positioned above Hierarchy in Foundation", () => {
    const onChange = vi.fn();
    render(<ModeRail active="environments" onChange={onChange} catalogue={MODE_CATALOGUE} />);

    const allButtons = screen.getAllByRole("button");
    const environmentsIndex = allButtons.findIndex((btn) =>
      btn.textContent?.includes("Environments")
    );
    const hierarchyIndex = allButtons.findIndex((btn) =>
      btn.textContent?.includes("Hierarchy")
    );

    expect(environmentsIndex).toBeGreaterThan(-1);
    expect(hierarchyIndex).toBeGreaterThan(-1);
    expect(environmentsIndex).toBeLessThan(hierarchyIndex);
  });

  it("Clicking Environments calls onChange with 'environments'", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModeRail active="hierarchy" onChange={onChange} catalogue={MODE_CATALOGUE} />);

    const environmentsButton = screen.getByRole("button", { name: /Environments/i });
    await user.click(environmentsButton);

    expect(onChange).toHaveBeenCalledWith("environments");
  });

  it("Environments button is highlighted when active", () => {
    const onChange = vi.fn();
    render(<ModeRail active="environments" onChange={onChange} catalogue={MODE_CATALOGUE} />);

    const environmentsButton = screen.getByRole("button", { name: /Environments/i });
    expect(environmentsButton).toHaveAttribute("aria-current", "page");
  });
});
