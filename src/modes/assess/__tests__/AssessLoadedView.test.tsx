import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { BatchRunExport } from "../../../types/batchRunExport";
import { AssessLoadedView } from "../components/AssessLoadedView";

function makeArtifact(overrides: Partial<BatchRunExport> = {}): BatchRunExport {
  return {
    export_version: 1,
    kind: "batch_run_export",
    batch_run_status: "complete",
    source: { kind: "paste" },
    summary: {
      total_count: 2,
      parsed_count: 2,
      failed_count: 0,
      skipped_count: 0,
      pending_count: 0,
      with_findings_count: 1,
      clean_count: 1,
      severity_counts: { critical: 1, high: 2, medium: 3, low: 4, info: 5 },
    },
    generated_by: { app_name: "Anthracite", stage: "V1R" },
    versions: {
      validator_versions: [1],
      rule_pack_versions: [2],
      parser_versions: ["1.0.0"],
      registry_versions: ["1"],
    },
    devices: [
      {
        slice_id: "slice_a",
        hostname_hint: "rtr-a",
        source_provenance: null,
        stage_status: "complete",
        selected_platform: null,
        is_manual_override: false,
        detection_summary: null,
        receipt_summary: null,
        validation_report: {
          validator_version: 1,
          rule_pack_version: 2,
          context: {
            platform_id: null,
            parser_id: null,
            parser_version: null,
            selection_mode: "from_detection",
            detection_confidence: null,
            detection_source: null,
            source_context: null,
          },
          findings: [],
          clean_rules: ["rule-1"],
          skipped_rules: [],
        },
        finding_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        stage_error: null,
      },
      {
        slice_id: "slice_b",
        hostname_hint: null,
        source_provenance: null,
        stage_status: "complete",
        selected_platform: null,
        is_manual_override: false,
        detection_summary: null,
        receipt_summary: null,
        validation_report: {
          validator_version: 1,
          rule_pack_version: 2,
          context: {
            platform_id: null,
            parser_id: null,
            parser_version: null,
            selection_mode: "from_detection",
            detection_confidence: null,
            detection_source: null,
            source_context: null,
          },
          findings: [],
          clean_rules: [],
          skipped_rules: [],
        },
        finding_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        stage_error: null,
      },
    ],
    omitted: {
      raw_config_text: "omitted_by_default",
      detection_evidence_preview: "omitted_to_avoid_raw_config_excerpt",
      finding_raw_excerpt: "omitted_to_avoid_raw_config_excerpt",
      device_model: "omitted_use_receipt_summary",
      timestamps: "omitted_for_determinism",
      batch_run_epoch: "omitted_frontend_control_only",
    },
    ...overrides,
  };
}

describe("AssessLoadedView", () => {
  it("renders the filename sub-line", () => {
    render(
      <AssessLoadedView
        artifact={makeArtifact()}
        filename="anthracite-batch-run.json"
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText("anthracite-batch-run.json"),
    ).toBeInTheDocument();
  });

  it("renders one DeviceBlock per device in JSON order", () => {
    render(
      <AssessLoadedView
        artifact={makeArtifact()}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    const blocks = screen.getAllByRole("article");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toHaveAttribute("aria-label", "Device slice_a");
    expect(blocks[1]).toHaveAttribute("aria-label", "Device slice_b");
  });

  it("renders severity chips from artifact.summary.severity_counts verbatim", () => {
    render(
      <AssessLoadedView
        artifact={makeArtifact()}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("severity C count")).toHaveTextContent(
      "C 1",
    );
    expect(screen.getByLabelText("severity H count")).toHaveTextContent(
      "H 2",
    );
    expect(screen.getByLabelText("severity M count")).toHaveTextContent(
      "M 3",
    );
    expect(screen.getByLabelText("severity L count")).toHaveTextContent(
      "L 4",
    );
    expect(screen.getByLabelText("severity I count")).toHaveTextContent(
      "I 5",
    );
  });

  it("calls onClose when Close assessment is clicked", async () => {
    const onClose = vi.fn();
    render(
      <AssessLoadedView
        artifact={makeArtifact()}
        filename="x.json"
        onClose={onClose}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Close assessment" }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders a no-report placeholder for devices missing validation_report (after expand)", async () => {
    const artifact = makeArtifact({
      devices: [
        {
          slice_id: "slice_a",
          hostname_hint: "rtr-a",
          source_provenance: null,
          stage_status: "failed",
          selected_platform: null,
          is_manual_override: false,
          detection_summary: null,
          receipt_summary: null,
          validation_report: null,
          finding_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
          stage_error: { stage: "parse", message: "boom" },
        },
      ],
    });
    render(
      <AssessLoadedView
        artifact={artifact}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    // V1X collapses non-findings devices by default — expand it.
    await userEvent.click(
      screen.getByRole("button", { expanded: false }),
    );
    expect(screen.getByText("no validation report")).toBeInTheDocument();
  });

  it("renders an empty-devices message when artifact has zero devices", () => {
    const artifact = makeArtifact({ devices: [] });
    render(
      <AssessLoadedView
        artifact={artifact}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No devices in this batch run."),
    ).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------------
// V1X triage behaviour
// -----------------------------------------------------------------------------

function makeFinding(rule_id: string, severity: "high" | "low" | "info") {
  return {
    finding_key: `${rule_id}-${severity}`,
    rule_id,
    rule_version: 1,
    severity,
    signal: "hard" as const,
    title: `title ${rule_id}`,
    evidence: [],
    affected_area: "x",
    recommendation: null,
  };
}

function makeArtifactWithFindings(): BatchRunExport {
  const base = makeArtifact();
  return {
    ...base,
    summary: {
      ...base.summary,
      total_count: 3,
      with_findings_count: 2,
      clean_count: 1,
      severity_counts: { critical: 0, high: 1, medium: 0, low: 1, info: 1 },
    },
    devices: [
      {
        slice_id: "slice_with_findings",
        hostname_hint: "rtr-a",
        source_provenance: null,
        stage_status: "complete",
        selected_platform: {
          platform_id: "cisco-iosxe",
          vendor: "cisco",
          os_family: "iosxe",
          os_version_raw: null,
          os_version_normalized: null,
          detection_confidence: null,
        },
        is_manual_override: false,
        detection_summary: null,
        receipt_summary: null,
        validation_report: {
          validator_version: 1,
          rule_pack_version: 2,
          context: {
            platform_id: "cisco-iosxe",
            parser_id: "cisco-iosxe",
            parser_version: null,
            selection_mode: "from_detection",
            detection_confidence: null,
            detection_source: null,
            source_context: null,
          },
          findings: [makeFinding("R-NTP-1", "high"), makeFinding("R-DNS-2", "low")],
          clean_rules: [],
          skipped_rules: [],
        },
        finding_counts: { critical: 0, high: 1, medium: 0, low: 1, info: 0 },
        stage_error: null,
      },
      {
        slice_id: "slice_clean",
        hostname_hint: "rtr-b",
        source_provenance: null,
        stage_status: "complete",
        selected_platform: null,
        is_manual_override: false,
        detection_summary: null,
        receipt_summary: null,
        validation_report: {
          validator_version: 1,
          rule_pack_version: 2,
          context: {
            platform_id: null,
            parser_id: null,
            parser_version: null,
            selection_mode: "from_detection",
            detection_confidence: null,
            detection_source: null,
            source_context: null,
          },
          findings: [],
          clean_rules: [],
          skipped_rules: [],
        },
        finding_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        stage_error: null,
      },
      {
        slice_id: "slice_info",
        hostname_hint: "rtr-c",
        source_provenance: null,
        stage_status: "complete",
        selected_platform: null,
        is_manual_override: false,
        detection_summary: null,
        receipt_summary: null,
        validation_report: {
          validator_version: 1,
          rule_pack_version: 2,
          context: {
            platform_id: null,
            parser_id: null,
            parser_version: null,
            selection_mode: "from_detection",
            detection_confidence: null,
            detection_source: null,
            source_context: null,
          },
          findings: [makeFinding("R-BANNER-3", "info")],
          clean_rules: [],
          skipped_rules: [],
        },
        finding_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 1 },
        stage_error: null,
      },
    ],
  };
}

describe("AssessLoadedView — V1X triage", () => {
  it("renders the triage header with search input and view toggle", () => {
    render(
      <AssessLoadedView
        artifact={makeArtifactWithFindings()}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("searchbox", { name: "Search devices and findings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "By device" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "By severity" }),
    ).toBeInTheDocument();
  });

  it("renders severity chips for severities present in the artifact", () => {
    render(
      <AssessLoadedView
        artifact={makeArtifactWithFindings()}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /High/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Low/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Info/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clean/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Critical/ }),
    ).not.toBeInTheDocument();
  });

  it("renders rule-id chips for distinct rules in the artifact", () => {
    render(
      <AssessLoadedView
        artifact={makeArtifactWithFindings()}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /R-NTP-1/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /R-DNS-2/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /R-BANNER-3/ }),
    ).toBeInTheDocument();
  });

  it("severity chip toggle filters visible devices", async () => {
    render(
      <AssessLoadedView
        artifact={makeArtifactWithFindings()}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
    await userEvent.click(screen.getByRole("button", { name: /High/ }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("article")).toHaveAttribute(
      "aria-label",
      "Device slice_with_findings",
    );
  });

  it("search filters devices by hostname", async () => {
    render(
      <AssessLoadedView
        artifact={makeArtifactWithFindings()}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search devices and findings" }),
      "rtr-c",
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("article")).toHaveAttribute(
      "aria-label",
      "Device slice_info",
    );
  });

  it("by-severity view groups findings under severity headings", async () => {
    render(
      <AssessLoadedView
        artifact={makeArtifactWithFindings()}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "By severity" }));
    expect(screen.getByLabelText("Severity high")).toBeInTheDocument();
    expect(screen.getByLabelText("Severity low")).toBeInTheDocument();
    expect(screen.getByLabelText("Severity info")).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("collapse/expand toggle on a device works", async () => {
    render(
      <AssessLoadedView
        artifact={makeArtifactWithFindings()}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    // Both findings-bearing devices expand by default (2). Collapse
    // one and confirm only one remains expanded.
    const toggles = screen.getAllByRole("button", { expanded: true });
    expect(toggles).toHaveLength(2);
    await userEvent.click(toggles[0]);
    expect(screen.queryAllByRole("button", { expanded: true })).toHaveLength(
      1,
    );
  });

  it("Clear filters button restores full visibility", async () => {
    render(
      <AssessLoadedView
        artifact={makeArtifactWithFindings()}
        filename="x.json"
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /High/ }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    await userEvent.click(
      screen.getByRole("button", { name: "Clear filters" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
});
