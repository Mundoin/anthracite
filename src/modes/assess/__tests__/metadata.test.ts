import { describe, expect, it } from "vitest";

import type {
  BatchRunExport,
  BatchRunExportDevice,
} from "../../../types/batchRunExport";
import {
  SUPPORTED_EXPORT_VERSIONS,
  describeSource,
  isExportVersionSupported,
  metadataRows,
  parserPlatformGroups,
} from "../metadata";

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
  platform: {
    platform_id: string | null;
    vendor: string | null;
  } | null,
  parser_version: string | null,
): BatchRunExportDevice {
  return {
    slice_id,
    hostname_hint: null,
    source_provenance: null,
    stage_status: "complete",
    selected_platform: platform
      ? {
          platform_id: platform.platform_id,
          vendor: platform.vendor,
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
            platform_id: platform?.platform_id ?? null,
            parser_id: platform?.platform_id ?? null,
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

describe("isExportVersionSupported", () => {
  it("accepts 1", () => {
    expect(isExportVersionSupported(1)).toBe(true);
  });

  it("rejects 2", () => {
    expect(isExportVersionSupported(2)).toBe(false);
  });

  it("rejects non-numbers", () => {
    expect(isExportVersionSupported("1")).toBe(false);
    expect(isExportVersionSupported(null)).toBe(false);
    expect(isExportVersionSupported(undefined)).toBe(false);
  });

  it("SUPPORTED_EXPORT_VERSIONS contains 1 at V1Z", () => {
    expect(SUPPORTED_EXPORT_VERSIONS).toContain(1);
  });
});

describe("describeSource", () => {
  it("renders paste source", () => {
    expect(describeSource(makeArtifact({ source: { kind: "paste" } }))).toBe(
      "pasted input",
    );
  });

  it("renders file source with filename", () => {
    expect(
      describeSource(
        makeArtifact({ source: { kind: "file", filename: "router-a.cfg" } }),
      ),
    ).toBe("router-a.cfg");
  });

  it("renders archive source with archive_name", () => {
    expect(
      describeSource(
        makeArtifact({
          source: { kind: "archive", archive_name: "site-b.zip" },
        }),
      ),
    ).toBe("site-b.zip");
  });
});

describe("parserPlatformGroups", () => {
  it("returns empty array for no devices", () => {
    expect(parserPlatformGroups(makeArtifact())).toEqual([]);
  });

  it("groups two devices on the same platform", () => {
    const a = makeArtifact({
      devices: [
        makeDevice("s1", { platform_id: "cisco-iosxe", vendor: "cisco" }, "3"),
        makeDevice("s2", { platform_id: "cisco-iosxe", vendor: "cisco" }, "3"),
      ],
    });
    const g = parserPlatformGroups(a);
    expect(g).toHaveLength(1);
    expect(g[0].platform_id).toBe("cisco-iosxe");
    expect(g[0].vendor).toBe("cisco");
    expect(g[0].device_count).toBe(2);
    expect(g[0].parser_versions).toEqual(["3"]);
  });

  it("collects distinct parser versions within a group", () => {
    const a = makeArtifact({
      devices: [
        makeDevice("s1", { platform_id: "cisco-iosxe", vendor: "cisco" }, "3"),
        makeDevice("s2", { platform_id: "cisco-iosxe", vendor: "cisco" }, "4"),
      ],
    });
    const g = parserPlatformGroups(a);
    expect(g).toHaveLength(1);
    expect(g[0].parser_versions).toEqual(["3", "4"]);
  });

  it("groups devices without selected_platform into a single null-platform bucket", () => {
    const a = makeArtifact({
      devices: [
        makeDevice("s1", null, null),
        makeDevice("s2", null, null),
        makeDevice(
          "s3",
          { platform_id: "juniper-junos", vendor: "juniper" },
          "2",
        ),
      ],
    });
    const g = parserPlatformGroups(a);
    expect(g).toHaveLength(2);
    const unknown = g.find((x) => x.platform_id === null);
    expect(unknown?.device_count).toBe(2);
    expect(unknown?.vendor).toBeNull();
    expect(unknown?.parser_versions).toEqual([]);
  });

  it("omits parser version contribution when parser_version absent", () => {
    const a = makeArtifact({
      devices: [
        makeDevice("s1", { platform_id: "arista-eos", vendor: "arista" }, null),
      ],
    });
    const g = parserPlatformGroups(a);
    expect(g[0].parser_versions).toEqual([]);
  });

  it("preserves insertion order across mixed platforms", () => {
    const a = makeArtifact({
      devices: [
        makeDevice("s1", { platform_id: "cisco-iosxe", vendor: "cisco" }, "3"),
        makeDevice(
          "s2",
          { platform_id: "juniper-junos", vendor: "juniper" },
          "2",
        ),
        makeDevice(
          "s3",
          { platform_id: "arista-eos", vendor: "arista" },
          "2",
        ),
      ],
    });
    const g = parserPlatformGroups(a);
    expect(g.map((x) => x.platform_id)).toEqual([
      "cisco-iosxe",
      "juniper-junos",
      "arista-eos",
    ]);
  });
});

describe("metadataRows", () => {
  it("emits all baseline rows for a normal artifact", () => {
    const rows = metadataRows(makeArtifact(), "anthracite-batch-run.json");
    const labels = rows.map((r) => r.label);
    expect(labels).toEqual([
      "File",
      "Export version",
      "Generated by",
      "Source",
      "Devices",
      "Validator version(s)",
      "Rule pack version(s)",
      "Parser version(s)",
      "Registry version(s)",
    ]);
  });

  it("File row carries the loader-provided filename verbatim", () => {
    const rows = metadataRows(makeArtifact(), "x.json");
    expect(rows.find((r) => r.label === "File")?.value).toBe("x.json");
  });

  it("Export version row shows '1 (supported)' for supported version", () => {
    const rows = metadataRows(makeArtifact(), "x.json");
    expect(rows.find((r) => r.label === "Export version")?.value).toBe(
      "1 (supported)",
    );
  });

  it("Export version row appends '(unsupported)' for unsupported version", () => {
    // Stress-test path even though the loader rejects these.
    const a = { ...makeArtifact(), export_version: 99 as 1 };
    const rows = metadataRows(a, "x.json");
    expect(rows.find((r) => r.label === "Export version")?.value).toBe(
      "99 (unsupported)",
    );
  });

  it("Generated by row concatenates app_name and stage", () => {
    const rows = metadataRows(makeArtifact(), "x.json");
    expect(rows.find((r) => r.label === "Generated by")?.value).toBe(
      "Anthracite · V1R",
    );
  });

  it("Devices row reports artifact.devices.length", () => {
    const a = makeArtifact({
      devices: [
        makeDevice("s1", { platform_id: "cisco-iosxe", vendor: "cisco" }, "3"),
        makeDevice("s2", { platform_id: "cisco-iosxe", vendor: "cisco" }, "3"),
      ],
    });
    const rows = metadataRows(a, "x.json");
    expect(rows.find((r) => r.label === "Devices")?.value).toBe("2");
  });

  it("optional version rows return null when version arrays are empty", () => {
    const a = makeArtifact({
      versions: {
        validator_versions: [],
        rule_pack_versions: [],
        parser_versions: [],
        registry_versions: [],
      },
    });
    const rows = metadataRows(a, "x.json");
    expect(rows.find((r) => r.label === "Validator version(s)")?.value).toBeNull();
    expect(rows.find((r) => r.label === "Rule pack version(s)")?.value).toBeNull();
    expect(rows.find((r) => r.label === "Parser version(s)")?.value).toBeNull();
    expect(rows.find((r) => r.label === "Registry version(s)")?.value).toBeNull();
  });

  it("renders multi-version arrays joined with commas", () => {
    const a = makeArtifact({
      versions: {
        validator_versions: [1, 2],
        rule_pack_versions: [2, 3],
        parser_versions: ["1.0.0", "2.0.0"],
        registry_versions: ["1", "2"],
      },
    });
    const rows = metadataRows(a, "x.json");
    expect(rows.find((r) => r.label === "Validator version(s)")?.value).toBe(
      "v1, v2",
    );
    expect(rows.find((r) => r.label === "Rule pack version(s)")?.value).toBe(
      "v2, v3",
    );
    expect(rows.find((r) => r.label === "Parser version(s)")?.value).toBe(
      "1.0.0, 2.0.0",
    );
    expect(rows.find((r) => r.label === "Registry version(s)")?.value).toBe(
      "1, 2",
    );
  });

  it("does not mutate the input artifact", () => {
    const a = makeArtifact({
      devices: [
        makeDevice("s1", { platform_id: "cisco-iosxe", vendor: "cisco" }, "3"),
      ],
    });
    const snap = JSON.parse(JSON.stringify(a));
    metadataRows(a, "x.json");
    parserPlatformGroups(a);
    describeSource(a);
    expect(JSON.parse(JSON.stringify(a))).toEqual(snap);
  });
});
