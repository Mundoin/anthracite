import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModeRail, type ModeId } from "../ModeRail";

/**
 * Regression: V1AW live-smoke "blank window on top-level mode click".
 *
 * Make sure ModeRail controls cannot accidentally:
 * - submit a form (no <button> without type="button" inside a form)
 * - trigger anchor default navigation (no <a href> elements)
 * - emit anything other than a valid ModeId
 */
describe("ModeRail — no-navigation guarantees", () => {
  it("does not render any anchor or form element", () => {
    const { container } = render(
      <ModeRail active="hierarchy" onChange={() => {}} />,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
  });

  it("any actual <button> element uses type='button' (no implicit submit)", () => {
    const { container } = render(
      <ModeRail active="hierarchy" onChange={() => {}} />,
    );
    const buttons = container.querySelectorAll("button");
    buttons.forEach((b) => {
      expect(b.getAttribute("type")).toBe("button");
    });
  });

  it("emits valid ModeId values only", () => {
    const seen: string[] = [];
    render(
      <ModeRail
        active="hierarchy"
        onChange={(id: ModeId) => {
          seen.push(id);
        }}
      />,
    );
    const validIds: readonly string[] = [
      "hierarchy",
      "devices",
      "intake",
      "discovery",
      "provisioning",
      "operate",
      "topology",
      "diagnose",
      "assess",
      "events",
      "security",
      "dashboards",
      "build",
      "settings",
      "opsConsole",
    ];
    // Click every interactive item.
    const items = screen.getAllByRole("button");
    items.forEach((el) => {
      fireEvent.click(el);
    });
    seen.forEach((id) => {
      expect(validIds).toContain(id);
    });
    expect(seen.length).toBeGreaterThan(0);
  });

  it("includes Intake / Settings / Diagnose / Assess as clickable controls", () => {
    const handler = vi.fn();
    render(<ModeRail active="hierarchy" onChange={handler} />);
    fireEvent.click(screen.getByLabelText("Intake"));
    fireEvent.click(screen.getByLabelText("Settings"));
    fireEvent.click(screen.getByLabelText("Diagnose"));
    fireEvent.click(screen.getByLabelText("Assess"));
    const calls = handler.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(["intake", "settings", "diagnose", "assess"]);
  });
});
