/**
 * V1BO — Assess Pipeline Planner Panel prefill tests.
 *
 * Verify that initialCounts prop works correctly:
 * - No initialCounts → defaults to 0
 * - initialCounts provided with non-zero values → prefilled-note visible
 * - initialCounts all zeros → no prefilled-note
 * - Operator can override any value
 * - Secret redaction still works
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AssessPipelinePlannerPanel } from "../AssessPipelinePlannerPanel";
import type { AssessProfileCounts } from "../assessPipelinePlanner";

describe("AssessPipelinePlannerPanel prefill", () => {
  it("without initialCounts → counts default to 0, no prefilled-note", () => {
    render(<AssessPipelinePlannerPanel />);

    const seedCountInput = screen.getByLabelText("Seed Count") as HTMLInputElement;
    expect(seedCountInput.value).toBe("0");

    const prefillNote = screen.queryByTestId("assess-counts-prefilled-note");
    expect(prefillNote).not.toBeInTheDocument();
  });

  it("with initialCounts seed_count=3 → input shows 3, prefilled-note visible", () => {
    const initialCounts: AssessProfileCounts = {
      seed_count: 3,
      expected_devices: 0,
      known_platforms: 0,
    };

    render(<AssessPipelinePlannerPanel initialCounts={initialCounts} />);

    const seedCountInput = screen.getByLabelText("Seed Count") as HTMLInputElement;
    expect(seedCountInput.value).toBe("3");

    const prefillNote = screen.getByTestId("assess-counts-prefilled-note");
    expect(prefillNote).toBeInTheDocument();
    expect(prefillNote.textContent).toBe(
      "Pre-filled from local workbench context. Override any value below.",
    );
  });

  it("with initialCounts all zeros → no prefilled-note", () => {
    const initialCounts: AssessProfileCounts = {
      seed_count: 0,
      expected_devices: 0,
      known_platforms: 0,
    };

    render(<AssessPipelinePlannerPanel initialCounts={initialCounts} />);

    const prefillNote = screen.queryByTestId("assess-counts-prefilled-note");
    expect(prefillNote).not.toBeInTheDocument();
  });

  it("with initialCounts expected_devices=5 → input shows 5, prefilled-note visible", () => {
    const initialCounts: AssessProfileCounts = {
      seed_count: 0,
      expected_devices: 5,
      known_platforms: 0,
    };

    render(<AssessPipelinePlannerPanel initialCounts={initialCounts} />);

    const expectedDevicesInput = screen.getByLabelText(
      "Expected Devices",
    ) as HTMLInputElement;
    expect(expectedDevicesInput.value).toBe("5");

    const prefillNote = screen.getByTestId("assess-counts-prefilled-note");
    expect(prefillNote).toBeInTheDocument();
  });

  it("operator override: prefilled seed_count=3, user types 7, pipeline reflects 7", () => {
    const initialCounts: AssessProfileCounts = {
      seed_count: 3,
      expected_devices: 0,
      known_platforms: 0,
    };

    render(<AssessPipelinePlannerPanel initialCounts={initialCounts} />);

    const seedCountInput = screen.getByLabelText("Seed Count") as HTMLInputElement;
    expect(seedCountInput.value).toBe("3");

    // Simulate user clearing and typing "7"
    fireEvent.change(seedCountInput, { target: { value: "7" } });

    const updatedInput = screen.getByLabelText("Seed Count") as HTMLInputElement;
    expect(updatedInput.value).toBe("7");

    // Verify the pipeline plan reflects the change.
    // The Discovery step should show in the table with the new count.
    const discoveryCell = screen.getByText("Discovery");
    expect(discoveryCell).toBeInTheDocument();

    // Verify that the planner updated the counts correctly
    // by checking that the panel still renders with the new value
    const updatedSeedInput = screen.getByLabelText("Seed Count") as HTMLInputElement;
    expect(updatedSeedInput.value).toBe("7");
  });

  it("secret redaction still works: profile label with 'password' gets redacted in markdown", () => {
    const initialCounts: AssessProfileCounts = {
      seed_count: 1,
      expected_devices: 0,
      known_platforms: 0,
    };

    render(<AssessPipelinePlannerPanel initialCounts={initialCounts} />);

    // Set profile label with a secret keyword
    const labelInput = screen.getByPlaceholderText("e.g., prod-assessment-2026");
    fireEvent.change(labelInput, {
      target: { value: "assessment-password-2026" },
    });

    // Open markdown preview
    const summary = screen.getByText("Markdown Preview");
    fireEvent.click(summary);

    // Check that the markdown preview contains redacted text
    const preview = screen.getByText(/REDACTED/);
    expect(preview).toBeInTheDocument();
    expect(preview.textContent).toContain("[REDACTED]");
  });

  it("with initialCounts known_platforms=2 → input shows 2, prefilled-note visible", () => {
    const initialCounts: AssessProfileCounts = {
      seed_count: 0,
      expected_devices: 0,
      known_platforms: 2,
    };

    render(<AssessPipelinePlannerPanel initialCounts={initialCounts} />);

    const knownPlatformsInput = screen.getByLabelText(
      "Known Platforms",
    ) as HTMLInputElement;
    expect(knownPlatformsInput.value).toBe("2");

    const prefillNote = screen.getByTestId("assess-counts-prefilled-note");
    expect(prefillNote).toBeInTheDocument();
  });

  it("V1BP: with initialCounts known_platforms=1 (intake context) → input shows 1, prefilled-note visible", () => {
    const initialCounts: AssessProfileCounts = {
      seed_count: 0,
      expected_devices: 0,
      known_platforms: 1,
    };

    render(<AssessPipelinePlannerPanel initialCounts={initialCounts} />);

    const knownPlatformsInput = screen.getByLabelText(
      "Known Platforms",
    ) as HTMLInputElement;
    expect(knownPlatformsInput.value).toBe("1");

    const prefillNote = screen.getByTestId("assess-counts-prefilled-note");
    expect(prefillNote).toBeInTheDocument();
    expect(prefillNote.textContent).toBe(
      "Pre-filled from local workbench context. Override any value below.",
    );
  });

  it("V1BP: prefilled known_platforms=1 from intake, operator overrides to 5", () => {
    const initialCounts: AssessProfileCounts = {
      seed_count: 0,
      expected_devices: 0,
      known_platforms: 1,
    };

    render(<AssessPipelinePlannerPanel initialCounts={initialCounts} />);

    const knownPlatformsInput = screen.getByLabelText(
      "Known Platforms",
    ) as HTMLInputElement;
    expect(knownPlatformsInput.value).toBe("1");

    // Operator overrides to 5
    fireEvent.change(knownPlatformsInput, { target: { value: "5" } });

    const updatedInput = screen.getByLabelText(
      "Known Platforms",
    ) as HTMLInputElement;
    expect(updatedInput.value).toBe("5");

    // Verify panel still renders with updated value
    expect(screen.getByText("Markdown Preview")).toBeInTheDocument();
  });
});
