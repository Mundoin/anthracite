import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type {
  BatchRunExport,
  BatchRunExportDevice,
} from "../../../types/batchRunExport";
import { AssessMetadataHeader } from "../components/AssessMetadataHeader";

function emptySummary(): BatchRunExport["summary"] {
  return {
    total_count: 0,
    parsed_count: 0,
    failed_count: 0,
    skipped_count: 0,
    pending_count: 0,
    with_findings_count: 0,
    clean_count: 0,
    severity_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  };
}

function emptyOmissions(): BatchRunExport["omitted"] {
  return {
    raw_config_text: "omitted_by_default",
    detection_evidence_preview: "omitted_to_avoid_raw_config_excerpt",
    finding_raw_excerpt: "omitted_to_avoid_raw_config_excerpt",
    device_model: "omitted_use_receipt_summary",
    timestamps: "omitted_for_determinism",
    batch_run_epoch: "omitted_frontend_control_only",
  };
}

function makeArtifact(over: Partial<BatchRunExport> = {}): BatchRunExport {
  return {
    export_version: 1,
    kind: "batch_run_export",
    batch_run_status: "complete",
    source: { kind: "paste" },
    summary: emptySummary(),
    generated_by: { app_name: "Anthracite", stage: "V1R" },
    versions: {
      validator_versions: [1],
      rule_pack_versions: [2],
      parser_versions: ["1.0.0"],
      registry_versions: ["1"],
    },
    devices: [],
    omitted: emptyOmissions(),
    ...over,
  };
}

function makeDevice(
  slice_id: string,
  platform_id: string | null,
  vendor: string | null,
  parser_version: string | null,
): BatchRunExportDevice {
  return {
    slice_id,
    hostname_hint: null,
    source_provenance: null,
    stage_status: "complete",
    selected_platform: platform_id
      ? {
          platform_id,
          vendor,
          os_family: null,
          os_version_raw: null,
          os_version_normalized: null,
          detection_confidence: null,
        }
      : null,
    is_manual_override: false,
    detection_summary: null,
    receipt_summary: null,
    validation_report: parser_version
      ? {
          validator_version: 1,
          rule_pack_version: 2,
          context: {
            platform_id,
            parser_id: platform_id,
            parser_version,
            selection_mode: "from_detection",
            detection_confidence: null,
            detection_source: null,
            source_context: null,
          },
          findings: [],
          clean_rules: [],
          skipped_rules: [],
        }
      : null,
    finding_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    stage_error: null,
  };
}

describe("AssessMetadataHeader", () => {
  it("renders Metadata heading and labelled rows", () => {
    render(
      <AssessMetadataHeader
        artifact={makeArtifact()}
        filename="batch-run.json"
      />,
    );
    expect(
      screen.getByRole("region", { name: "Assessment metadata" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Metadata")).toBeInTheDocument();
    expect(screen.getByText("File")).toBeInTheDocument();
    expect(screen.getByText("batch-run.json")).toBeInTheDocument();
  });

  it("renders supported export version as '1 (supported)' with no '(unsupported)' suffix", () => {
    render(
      <AssessMetadataHeader
        artifact={makeArtifact()}
        filename="x.json"
      />,
    );
    expect(screen.getByText("1 (supported)")).toBeInTheDocument();
    expect(screen.queryByText(/unsupported/i)).toBeNull();
  });

  it("renders 'not recorded' for empty optional version arrays", () => {
    render(
      <AssessMetadataHeader
        artifact={makeArtifact({
          versions: {
            validator_versions: [],
            rule_pack_versions: [],
            parser_versions: [],
            registry_versions: [],
          },
        })}
        filename="x.json"
      />,
    );
    expect(screen.getAllByText("not recorded").length).toBeGreaterThanOrEqual(
      4,
    );
  });

  it("renders multi-version arrays as comma-joined", () => {
    render(
      <AssessMetadataHeader
        artifact={makeArtifact({
          versions: {
            validator_versions: [1, 2],
            rule_pack_versions: [2, 3],
            parser_versions: ["1.0.0", "2.0.0"],
            registry_versions: ["1"],
          },
        })}
        filename="x.json"
      />,
    );
    expect(screen.getByText("v1, v2")).toBeInTheDocument();
    expect(screen.getByText("v2, v3")).toBeInTheDocument();
    expect(screen.getByText("1.0.0, 2.0.0")).toBeInTheDocument();
  });

  it("renders generated_by as 'Anthracite · V1R'", () => {
    render(
      <AssessMetadataHeader artifact={makeArtifact()} filename="x.json" />,
    );
    expect(screen.getByText("Anthracite · V1R")).toBeInTheDocument();
  });

  it("renders archive source name", () => {
    render(
      <AssessMetadataHeader
        artifact={makeArtifact({
          source: { kind: "archive", archive_name: "site.zip" },
        })}
        filename="x.json"
      />,
    );
    expect(screen.getByText("site.zip")).toBeInTheDocument();
  });

  it("renders Platforms section with one row per platform/parser group", () => {
    render(
      <AssessMetadataHeader
        artifact={makeArtifact({
          devices: [
            makeDevice("s1", "cisco-iosxe", "cisco", "3"),
            makeDevice("s2", "cisco-iosxe", "cisco", "3"),
            makeDevice("s3", "juniper-junos", "juniper", "2"),
          ],
        })}
        filename="x.json"
      />,
    );
    const list = screen.getByRole("list", {
      name: "Platforms and parser versions",
    });
    expect(list).toBeInTheDocument();
    expect(screen.getByText("cisco-iosxe")).toBeInTheDocument();
    expect(screen.getByText("juniper-junos")).toBeInTheDocument();
    expect(screen.getByText("parser v3")).toBeInTheDocument();
    expect(screen.getByText("parser v2")).toBeInTheDocument();
    expect(screen.getByText("2 devices")).toBeInTheDocument();
    expect(screen.getByText("1 device")).toBeInTheDocument();
  });

  it("omits Platforms section when artifact has no devices", () => {
    render(
      <AssessMetadataHeader artifact={makeArtifact()} filename="x.json" />,
    );
    expect(
      screen.queryByRole("list", { name: "Platforms and parser versions" }),
    ).toBeNull();
  });

  it("renders 'parser version not recorded' for groups with absent parser version", () => {
    render(
      <AssessMetadataHeader
        artifact={makeArtifact({
          devices: [makeDevice("s1", "arista-eos", "arista", null)],
        })}
        filename="x.json"
      />,
    );
    expect(screen.getByText("parser version not recorded")).toBeInTheDocument();
  });

  it("renders 'unknown platform' bucket when devices lack selected_platform", () => {
    render(
      <AssessMetadataHeader
        artifact={makeArtifact({
          devices: [makeDevice("s1", null, null, null)],
        })}
        filename="x.json"
      />,
    );
    expect(screen.getByText("unknown platform")).toBeInTheDocument();
  });
});
