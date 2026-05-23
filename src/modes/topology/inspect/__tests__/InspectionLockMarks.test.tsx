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

  it("file contains no @babylonjs/core import", () => {
    const src = readFileSync(
      resolve(__dirname, "../InspectionLockMarks.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/from\s+["']@babylonjs\/core["']/);
  });
});
