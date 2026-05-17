import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AssessEmptyState } from "../components/AssessEmptyState";

describe("AssessEmptyState", () => {
  it("renders the open button and helper line", () => {
    render(<AssessEmptyState onOpen={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Open assessment file" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Open a saved Batch Run export/i),
    ).toBeInTheDocument();
  });

  it("calls onOpen when the button is clicked", async () => {
    const onOpen = vi.fn();
    render(<AssessEmptyState onOpen={onOpen} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Open assessment file" }),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("disables the open button when disabled prop is true", () => {
    render(<AssessEmptyState onOpen={vi.fn()} disabled={true} />);
    expect(
      screen.getByRole("button", { name: "Open assessment file" }),
    ).toBeDisabled();
  });
});
