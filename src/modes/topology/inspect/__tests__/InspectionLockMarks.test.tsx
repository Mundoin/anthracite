/**
 * V1BI — InspectionLockMarks unit tests.
 * Pure SVG component; no Babylon, no providers needed.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { InspectionLockMarks } from "../InspectionLockMarks";

describe("InspectionLockMarks", () => {
  it("renders nothing in the map phase", () => {
    const { container } = render(<InspectionLockMarks phase="map" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders with stage='lock' during the entering phase", () => {
    render(<InspectionLockMarks phase="entering" />);
    const overlay = screen.getByTestId("inspection-lock-marks");
    expect(overlay).toHaveAttribute("data-stage", "lock");
    expect(screen.getByTestId("ilm-stencil")).toHaveTextContent(
      /ENTERING HARDWARE INSPECTION/i,
    );
  });

  it("renders with stage='release' during the exiting phase", () => {
    render(<InspectionLockMarks phase="exiting" />);
    const overlay = screen.getByTestId("inspection-lock-marks");
    expect(overlay).toHaveAttribute("data-stage", "release");
    expect(screen.getByTestId("ilm-stencil")).toHaveTextContent(
      /RELEASING INSPECTION/i,
    );
  });

  it("renders with stage='settled' in the scene phase (corner brackets only)", () => {
    render(<InspectionLockMarks phase="scene" />);
    const overlay = screen.getByTestId("inspection-lock-marks");
    expect(overlay).toHaveAttribute("data-stage", "settled");
  });

  it("anchor + viewport produce data-anchored='true' with CSS percent vars", () => {
    const { container } = render(
      <InspectionLockMarks
        phase="entering"
        anchor={{ x: 300, y: 150, w: 80, h: 30 }}
        viewport={{ w: 600, h: 300 }}
      />,
    );
    const el = container.querySelector(
      "[data-testid='inspection-lock-marks']",
    ) as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el!.getAttribute("data-anchored")).toBe("true");
    // centre of anchor is 340,165 → 56.66% / 55% of viewport
    const styleAttr = el!.getAttribute("style") ?? "";
    expect(styleAttr).toMatch(/--ilm-anchor-x:\s*56\.\d+%/);
    expect(styleAttr).toMatch(/--ilm-anchor-y:\s*55(\.\d+)?%/);
  });

  it("falls back to centre when no anchor is supplied", () => {
    const { container } = render(<InspectionLockMarks phase="entering" />);
    const el = container.querySelector(
      "[data-testid='inspection-lock-marks']",
    ) as HTMLElement | null;
    expect(el!.getAttribute("data-anchored")).toBe("false");
    const styleAttr = el!.getAttribute("style") ?? "";
    expect(styleAttr).toMatch(/--ilm-anchor-x:\s*50%/);
    expect(styleAttr).toMatch(/--ilm-anchor-y:\s*50%/);
  });

  it("file contains no @babylonjs/core import", () => {
    const src = readFileSync(
      resolve(__dirname, "../InspectionLockMarks.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/from\s+["']@babylonjs\/core["']/);
  });
});
