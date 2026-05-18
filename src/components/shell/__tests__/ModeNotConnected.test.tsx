import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModeNotConnected } from "../ModeNotConnected";

const BASE = {
  modeId: "topology" as const,
  modeLabel: "Topology",
  engineName: "Topology Engine",
};

describe("ModeNotConnected", () => {
  it("renders modeLabel", () => {
    render(<ModeNotConnected {...BASE} />);
    expect(screen.getByRole("heading")).toHaveTextContent("TOPOLOGY");
  });

  it("renders engineName followed by not connected", () => {
    render(<ModeNotConnected {...BASE} />);
    expect(screen.getByText("Topology Engine")).toBeInTheDocument();
    expect(screen.getByText("not connected")).toBeInTheDocument();
  });

  it("renders DataSourceTag with state=not_connected", () => {
    const { container } = render(<ModeNotConnected {...BASE} />);
    expect(container.querySelector('[data-state="not_connected"]')).not.toBeNull();
  });

  it("renders plannedStage when prop present", () => {
    render(<ModeNotConnected {...BASE} plannedStage="V2A" />);
    expect(screen.getByText("Planned: V2A")).toBeInTheDocument();
  });

  it("omits plannedStage when prop absent", () => {
    render(<ModeNotConnected {...BASE} />);
    expect(screen.queryByText(/Planned:/)).toBeNull();
  });

  it("no interactive elements", () => {
    render(<ModeNotConnected {...BASE} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
