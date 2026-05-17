import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AssessErrorView } from "../components/AssessErrorView";

describe("AssessErrorView", () => {
  it("renders the heading and provided message", () => {
    render(
      <AssessErrorView
        reason="invalid_json"
        message="Unexpected token at position 0"
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Could not load file.")).toBeInTheDocument();
    expect(
      screen.getByText("Unexpected token at position 0"),
    ).toBeInTheDocument();
    expect(screen.getByText(/invalid JSON/)).toBeInTheDocument();
  });

  it("calls onRetry when Try another file is clicked", async () => {
    const onRetry = vi.fn();
    render(
      <AssessErrorView
        reason="read_failed"
        message="x"
        onRetry={onRetry}
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Try another file" }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Close is clicked", async () => {
    const onClose = vi.fn();
    render(
      <AssessErrorView
        reason="wrong_export_version"
        message="version 2"
        onRetry={vi.fn()}
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
