import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { IntakeWorkspace } from "../components/IntakeWorkspace";

describe("IntakeWorkspace", () => {
  it("renders both lanes when both props supplied", () => {
    render(
      <IntakeWorkspace
        workLane={<div data-testid="work-content">work</div>}
        answerLane={<div data-testid="answer-content">answer</div>}
      />,
    );
    expect(screen.getByLabelText("Work lane")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer lane")).toBeInTheDocument();
    expect(screen.getByTestId("work-content")).toBeInTheDocument();
    expect(screen.getByTestId("answer-content")).toBeInTheDocument();
  });

  it("collapses to single full-width work lane when answerLane is null", () => {
    const { container } = render(
      <IntakeWorkspace
        workLane={<div data-testid="work-content">work</div>}
        answerLane={null}
      />,
    );
    expect(screen.getByLabelText("Work lane")).toBeInTheDocument();
    expect(screen.queryByLabelText("Answer lane")).toBeNull();
    expect(container.querySelector(".intake-workspace__seam")).toBeNull();
    expect(
      screen.queryByRole("status", { name: "Awaiting parse" }),
    ).toBeNull();
    // Single-lane class applied so CSS can collapse grid columns.
    expect(
      container.querySelector(".intake-workspace--single-lane"),
    ).not.toBeNull();
  });

  it("renders provided answerLane content alongside work lane and seam", () => {
    const { container } = render(
      <IntakeWorkspace
        workLane={<div data-testid="work-content">work</div>}
        answerLane={<div data-testid="real-answer">real</div>}
      />,
    );
    expect(screen.getByTestId("real-answer")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer lane")).toBeInTheDocument();
    expect(container.querySelector(".intake-workspace__seam")).not.toBeNull();
    // Two-lane: single-lane modifier must NOT be present.
    expect(
      container.querySelector(".intake-workspace--single-lane"),
    ).toBeNull();
  });

  it("custom ariaLabel propagates to the workspace section", () => {
    render(
      <IntakeWorkspace
        workLane={<div>w</div>}
        answerLane={<div>a</div>}
        ariaLabel="Custom workspace"
      />,
    );
    expect(screen.getByLabelText("Custom workspace")).toBeInTheDocument();
  });

  it("defaults to 'Intake workspace' aria-label when not supplied", () => {
    render(
      <IntakeWorkspace
        workLane={<div>w</div>}
        answerLane={<div>a</div>}
      />,
    );
    expect(screen.getByLabelText("Intake workspace")).toBeInTheDocument();
  });

  it("work lane appears BEFORE answer lane in document order", () => {
    render(
      <IntakeWorkspace
        workLane={<div>w</div>}
        answerLane={<div>a</div>}
      />,
    );
    const work = screen.getByLabelText("Work lane");
    const answer = screen.getByLabelText("Answer lane");
    // Node.DOCUMENT_POSITION_FOLLOWING === 4: work is followed by answer.
    expect(work.compareDocumentPosition(answer) & 4).toBe(4);
  });

  it("renders a seam between the lanes", () => {
    const { container } = render(
      <IntakeWorkspace
        workLane={<div>w</div>}
        answerLane={<div>a</div>}
      />,
    );
    const seam = container.querySelector(".intake-workspace__seam");
    expect(seam).not.toBeNull();
    expect(seam?.getAttribute("aria-hidden")).toBe("true");
  });
});
