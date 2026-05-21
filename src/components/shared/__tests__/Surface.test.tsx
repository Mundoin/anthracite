/**
 * D1B — Surface sanity tests.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Surface } from "../Surface";

describe("Surface — D1B", () => {
  it("renders default panel variant with default testid", () => {
    render(
      <div className="anth">
        <Surface>panel body</Surface>
      </div>,
    );
    const el = screen.getByTestId("surface-panel");
    expect(el).toBeInTheDocument();
    expect(el.getAttribute("data-variant")).toBe("panel");
    expect(el).toHaveTextContent("panel body");
  });

  it("supports all variants", () => {
    const variants = [
      "panel",
      "card",
      "raised",
      "inset",
      "toolbar",
      "overlay",
    ] as const;
    for (const v of variants) {
      const { unmount } = render(
        <div className="anth">
          <Surface variant={v} testid={`s-${v}`}>x</Surface>
        </div>,
      );
      const el = screen.getByTestId(`s-${v}`);
      expect(el.getAttribute("data-variant")).toBe(v);
      expect(el.className).toContain(`anth-surface--${v}`);
      unmount();
    }
  });

  it("padding attribute reflects padding prop", () => {
    render(
      <div className="anth">
        <Surface padding="tight" testid="s-pad">x</Surface>
      </div>,
    );
    expect(screen.getByTestId("s-pad").getAttribute("data-padding")).toBe(
      "tight",
    );
  });

  it("renders with custom `as` tag", () => {
    render(
      <div className="anth">
        <Surface as="section" testid="s-section">x</Surface>
      </div>,
    );
    const el = screen.getByTestId("s-section");
    expect(el.tagName.toLowerCase()).toBe("section");
  });

  it("honors aria-label", () => {
    render(
      <div className="anth">
        <Surface ariaLabel="Inspector body" testid="s-aria">x</Surface>
      </div>,
    );
    expect(screen.getByTestId("s-aria").getAttribute("aria-label")).toBe(
      "Inspector body",
    );
  });
});
