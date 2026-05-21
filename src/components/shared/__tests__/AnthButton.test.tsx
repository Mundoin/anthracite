/**
 * D1B — AnthButton sanity tests.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnthButton } from "../AnthButton";

describe("AnthButton — D1B", () => {
  it("renders default secondary variant with default testid + label", () => {
    render(
      <div className="anth">
        <AnthButton>Click</AnthButton>
      </div>,
    );
    const el = screen.getByTestId("anth-btn-secondary");
    expect(el).toBeInTheDocument();
    expect(el.getAttribute("data-variant")).toBe("secondary");
    expect(el).toHaveTextContent("Click");
  });

  it("supports all 9 variants", () => {
    const variants = [
      "primary",
      "secondary",
      "ghost",
      "toolbar",
      "danger",
      "success",
      "rail",
      "chip-action",
      "icon-only",
    ] as const;
    for (const v of variants) {
      const { unmount } = render(
        <div className="anth">
          <AnthButton variant={v} testid={`b-${v}`}>
            {v === "icon-only" ? null : "x"}
          </AnthButton>
        </div>,
      );
      const el = screen.getByTestId(`b-${v}`);
      expect(el.getAttribute("data-variant")).toBe(v);
      expect(el.className).toContain(`anth-btn--${v}`);
      unmount();
    }
  });

  it("respects disabled (no click fires)", async () => {
    const onClick = vi.fn();
    render(
      <div className="anth">
        <AnthButton onClick={onClick} disabled testid="b-disabled">x</AnthButton>
      </div>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId("b-disabled"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("fires onClick when enabled", async () => {
    const onClick = vi.fn();
    render(
      <div className="anth">
        <AnthButton onClick={onClick} testid="b-go">x</AnthButton>
      </div>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId("b-go"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("pressed/selected attributes propagate", () => {
    render(
      <div className="anth">
        <AnthButton pressed selected testid="b-state">x</AnthButton>
      </div>,
    );
    const el = screen.getByTestId("b-state");
    expect(el.getAttribute("aria-pressed")).toBe("true");
    expect(el.getAttribute("data-pressed")).toBe("true");
    expect(el.getAttribute("data-selected")).toBe("true");
    expect(el.className).toContain("is-pressed");
    expect(el.className).toContain("is-selected");
  });

  it("icon-only suppresses label render", () => {
    render(
      <div className="anth">
        <AnthButton variant="icon-only" iconId="settings" testid="b-icon">
          ignored
        </AnthButton>
      </div>,
    );
    const el = screen.getByTestId("b-icon");
    expect(el.querySelector(".anth-btn__label")).toBeNull();
    expect(screen.getByTestId("b-icon-icon")).toBeInTheDocument();
  });

  it("leading + trailing icon render with derived testids", () => {
    render(
      <div className="anth">
        <AnthButton
          iconId="status-ok"
          trailingIconId="chevron-right"
          testid="b-icons"
        >
          Go
        </AnthButton>
      </div>,
    );
    expect(screen.getByTestId("b-icons-icon")).toBeInTheDocument();
    expect(screen.getByTestId("b-icons-trailing")).toBeInTheDocument();
  });
});
