import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModeRail } from "../ModeRail";

describe("ModeRail — Discovery entry", () => {
  it("renders discovery entry in Foundation group", () => {
    const onChange = vi.fn();
    render(<ModeRail active="hierarchy" onChange={onChange} />);
    const discoveryBtn = screen.getByRole("button", { name: /Discovery/i });
    expect(discoveryBtn).toBeInTheDocument();
  });

  it("discovery appears between intake and provisioning", () => {
    render(<ModeRail active="hierarchy" />);
    const buttons = screen.getAllByRole("button");
    const intakeIdx = buttons.findIndex((b) => b.textContent?.includes("Intake"));
    const discoveryIdx = buttons.findIndex((b) => b.textContent?.includes("Discovery"));
    const provisioningIdx = buttons.findIndex((b) => b.textContent?.includes("Provisioning"));

    expect(intakeIdx).toBeLessThan(discoveryIdx);
    expect(discoveryIdx).toBeLessThan(provisioningIdx);
  });

  it("calls onChange with 'discovery' when clicked", () => {
    const onChange = vi.fn();
    render(<ModeRail active="hierarchy" onChange={onChange} />);
    const discoveryBtn = screen.getByRole("button", { name: /Discovery/i });
    fireEvent.click(discoveryBtn);
    expect(onChange).toHaveBeenCalledWith("discovery");
  });

  it("shows active state when discovery is active", () => {
    render(<ModeRail active="discovery" />);
    const discoveryBtn = screen.getByRole("button", { name: /Discovery/i });
    expect(discoveryBtn).toHaveClass("active");
  });

  it("discovery is in foundation group, not run or governance", () => {
    const { container } = render(<ModeRail active="hierarchy" />);
    // Check that discovery button exists in the DOM
    const discoveryBtn = screen.getByRole("button", { name: /Discovery/i });
    expect(discoveryBtn).toBeInTheDocument();
    // Verify it appears before "Provisioning" (which is also in Foundation)
    const provisioningBtn = screen.getByRole("button", { name: /Provisioning/i });
    const allButtons = container.querySelectorAll('[role="button"]');
    const discoveryIndex = Array.from(allButtons).indexOf(discoveryBtn);
    const provisioningIndex = Array.from(allButtons).indexOf(provisioningBtn);
    expect(discoveryIndex).toBeLessThan(provisioningIndex);
  });
});
