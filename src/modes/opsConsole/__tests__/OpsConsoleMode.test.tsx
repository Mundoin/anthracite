import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OpsConsoleMode } from "../OpsConsoleMode";
import { MODE_STATUS } from "../../../data/modeStatus";

describe("OpsConsoleMode", () => {
  it("renders Engines heading", () => {
    render(<OpsConsoleMode />);
    expect(screen.getByRole("heading", { name: /Engines/i })).toBeInTheDocument();
  });

  it("engine list has correct row count — all non-opsConsole ModeIds", () => {
    render(<OpsConsoleMode />);
    const expectedCount = Object.keys(MODE_STATUS).filter((id) => id !== "opsConsole").length;
    expect(screen.getAllByRole("listitem")).toHaveLength(expectedCount);
  });

  it("built modes render connected pill", () => {
    const { container } = render(<OpsConsoleMode />);
    const builtCount = (Object.entries(MODE_STATUS) as [string, typeof MODE_STATUS[keyof typeof MODE_STATUS]][])
      .filter(([id, s]) => id !== "opsConsole" && s.state === "built").length;
    expect(container.querySelectorAll(".ocm-pill--built").length).toBe(builtCount);
  });

  it("no interactive elements", () => {
    render(<OpsConsoleMode />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
