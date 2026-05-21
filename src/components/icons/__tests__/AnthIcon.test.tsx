/**
 * D1B — AnthIcon sanity tests.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnthIcon } from "../AnthIcon";
import { resolveIcon, listIcons, ICON_IDS } from "../iconRegistry";

describe("AnthIcon — D1B", () => {
  it("renders a known icon with default testid", () => {
    render(<AnthIcon id="mode-discovery" />);
    const el = screen.getByTestId("anth-icon-mode-discovery");
    expect(el).toBeInTheDocument();
    expect(el.getAttribute("data-icon-id")).toBe("mode-discovery");
    expect(el.getAttribute("data-icon-unknown")).toBeNull();
  });

  it("renders unknown id with fallback flag (no crash)", () => {
    render(<AnthIcon id="does-not-exist" />);
    const el = screen.getByTestId("anth-icon-does-not-exist");
    expect(el.getAttribute("data-icon-unknown")).toBe("true");
  });

  it("honors testid override", () => {
    render(<AnthIcon id="cortex" testid="cortex-mark" />);
    expect(screen.getByTestId("cortex-mark")).toBeInTheDocument();
  });

  it("sets aria-label and role=img when title provided", () => {
    render(<AnthIcon id="status-ok" title="OK status" />);
    const el = screen.getByTestId("anth-icon-status-ok");
    expect(el.getAttribute("aria-label")).toBe("OK status");
    expect(el.getAttribute("role")).toBe("img");
  });

  it("registry resolves all listed ids", () => {
    for (const id of ICON_IDS) {
      expect(resolveIcon(id)).not.toBeNull();
    }
  });

  it("registry returns null for unknown id", () => {
    expect(resolveIcon("totally-fake")).toBeNull();
  });

  it("listIcons by group filters correctly", () => {
    const modeIcons = listIcons("mode");
    expect(modeIcons.length).toBeGreaterThan(0);
    for (const i of modeIcons) {
      expect(i.group).toBe("mode");
    }
  });
});
