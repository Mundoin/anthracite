/**
 * D3C — ModeRail keyboard tests (Right, Home, End, aria-current).
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ModeRail } from "../ModeRail";

describe("ModeRail · D3C keyboard", () => {
  it("ArrowRight calls onRequestSidebarFocus when supplied", () => {
    const onChange = vi.fn();
    const onRequestSidebarFocus = vi.fn();
    render(
      <ModeRail
        active="hierarchy"
        onChange={onChange}
        onRequestSidebarFocus={onRequestSidebarFocus}
      />,
    );
    const rail = screen.getByTestId("nav-rail");
    fireEvent.keyDown(rail, { key: "ArrowRight" });
    expect(onRequestSidebarFocus).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ArrowRight is a no-op when onRequestSidebarFocus is not provided", () => {
    const onChange = vi.fn();
    render(<ModeRail active="hierarchy" onChange={onChange} />);
    const rail = screen.getByTestId("nav-rail");
    fireEvent.keyDown(rail, { key: "ArrowRight" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Home jumps to the first mode", () => {
    const onChange = vi.fn();
    render(<ModeRail active="settings" onChange={onChange} />);
    fireEvent.keyDown(screen.getByTestId("nav-rail"), { key: "Home" });
    expect(onChange).toHaveBeenCalledWith("environments");
  });

  it("End jumps to the last focusable item (opsConsole foot)", () => {
    const onChange = vi.fn();
    render(<ModeRail active="hierarchy" onChange={onChange} />);
    fireEvent.keyDown(screen.getByTestId("nav-rail"), { key: "End" });
    expect(onChange).toHaveBeenCalledWith("opsConsole");
  });

  it("Active mode row carries aria-current='page'", () => {
    render(<ModeRail active="operate" />);
    const row = screen.getByTestId("nav-rail-mode-operate");
    expect(row.getAttribute("aria-current")).toBe("page");
  });

  it("Inactive mode row has no aria-current", () => {
    render(<ModeRail active="operate" />);
    const row = screen.getByTestId("nav-rail-mode-hierarchy");
    expect(row.getAttribute("aria-current")).toBeNull();
  });

  it("Active foot entry carries aria-current='page'", () => {
    render(<ModeRail active="opsConsole" />);
    const row = screen.getByTestId("nav-rail-foot-opsConsole");
    expect(row.getAttribute("aria-current")).toBe("page");
  });
});
