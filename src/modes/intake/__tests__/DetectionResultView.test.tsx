import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ConfigDetectionResult } from "../../../types/configDetection";
import { DetectionResultView } from "../components/DetectionResultView";

function build(overrides: Partial<ConfigDetectionResult> = {}): ConfigDetectionResult {
  return {
    best_match: {
      platform_id: "cisco-iosxe",
      vendor: "cisco",
      os_family: "iosxe",
      os_version_raw: null,
      os_version_normalized: null,
      detection_confidence: 0.95,
    },
    candidates: [
      {
        platform_id: "cisco-iosxe",
        score: 12.5,
        normalized_score: 0.95,
        match_count: 8,
        distinct_signature_count: 5,
      },
      {
        platform_id: "juniper-junos",
        score: 1.5,
        normalized_score: 0.1,
        match_count: 1,
        distinct_signature_count: 1,
      },
    ],
    evidence: [
      {
        platform_id: "cisco-iosxe",
        signature_id: "version-ios-xe",
        category: "header",
        weight: 5.0,
        line_number: 1,
        preview: "! IOS-XE version 17.6.4",
        reason: "header banner",
      },
    ],
    confidence: 0.95,
    warnings: [],
    scanned_line_count: 100,
    total_line_count: 100,
    ...overrides,
  };
}

describe("DetectionResultView", () => {
  it("shows best match platform id", () => {
    render(
      <DetectionResultView
        result={build()}
        isManualOverride={false}
        selectedPlatformId="cisco-iosxe"
      />,
    );
    expect(screen.getAllByText("cisco-iosxe").length).toBeGreaterThan(0);
  });

  it("renders all candidates even when a best match exists", () => {
    render(
      <DetectionResultView
        result={build()}
        isManualOverride={false}
        selectedPlatformId="cisco-iosxe"
      />,
    );
    expect(screen.getByText("juniper-junos")).toBeInTheDocument();
  });

  it("surfaces low_confidence warning prominently", () => {
    render(
      <DetectionResultView
        result={build({
          warnings: [{ kind: "low_confidence", best_score: 0.4 }],
        })}
        isManualOverride={false}
        selectedPlatformId="cisco-iosxe"
      />,
    );
    expect(screen.getByText("LOW CONFIDENCE")).toBeInTheDocument();
    expect(screen.getByText("low_confidence")).toBeInTheDocument();
  });

  it("displays no-best-match state when detection has no winner", () => {
    render(
      <DetectionResultView
        result={build({ best_match: null, warnings: [{ kind: "no_signatures_matched" }] })}
        isManualOverride={false}
        selectedPlatformId={null}
      />,
    );
    expect(screen.getByText("(no best match)")).toBeInTheDocument();
    expect(screen.getByText("NO SIGNATURES MATCHED")).toBeInTheDocument();
  });

  it("marks selection as MANUAL OVERRIDE when override flag is true", () => {
    render(
      <DetectionResultView
        result={build()}
        isManualOverride
        selectedPlatformId="juniper-junos"
      />,
    );
    expect(screen.getByText("MANUAL OVERRIDE")).toBeInTheDocument();
  });

  it("renders evidence rows verbatim including preview text", () => {
    render(
      <DetectionResultView
        result={build()}
        isManualOverride={false}
        selectedPlatformId="cisco-iosxe"
      />,
    );
    expect(screen.getByText("! IOS-XE version 17.6.4")).toBeInTheDocument();
  });
});
