import { describe, expect, it } from "vitest";

import { validateBatchRunExport } from "../loadBatchRunJson";

function validMinimal(): Record<string, unknown> {
  return {
    export_version: 1,
    kind: "batch_run_export",
    batch_run_status: "complete",
    source: { kind: "paste" },
    summary: {
      total_count: 0,
      parsed_count: 0,
      failed_count: 0,
      skipped_count: 0,
      pending_count: 0,
      with_findings_count: 0,
      clean_count: 0,
      severity_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    },
    generated_by: { app_name: "Anthracite", stage: "V1R" },
    versions: {
      validator_versions: [],
      rule_pack_versions: [],
      parser_versions: [],
      registry_versions: [],
    },
    devices: [],
    omitted: {
      raw_config_text: "omitted_by_default",
      detection_evidence_preview: "omitted_to_avoid_raw_config_excerpt",
      finding_raw_excerpt: "omitted_to_avoid_raw_config_excerpt",
      device_model: "omitted_use_receipt_summary",
      timestamps: "omitted_for_determinism",
      batch_run_epoch: "omitted_frontend_control_only",
    },
  };
}

describe("validateBatchRunExport", () => {
  it("accepts a valid minimal export", () => {
    const result = validateBatchRunExport(validMinimal());
    expect(result.kind).toBe("ok");
  });

  it("accepts a valid export with empty devices array", () => {
    const a = validMinimal();
    a.devices = [];
    const result = validateBatchRunExport(a);
    expect(result.kind).toBe("ok");
  });

  it("rejects non-object top-level value", () => {
    const result = validateBatchRunExport("not an object");
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toBe("shape_mismatch");
    }
  });

  it("rejects when export_version is missing", () => {
    const a = validMinimal();
    delete a.export_version;
    const result = validateBatchRunExport(a);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toBe("shape_mismatch");
    }
  });

  it("rejects export_version === 2 with wrong_export_version", () => {
    const a = validMinimal();
    a.export_version = 2;
    const result = validateBatchRunExport(a);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toBe("wrong_export_version");
    }
  });

  it("rejects kind === 'something_else' with wrong_kind", () => {
    const a = validMinimal();
    a.kind = "something_else";
    const result = validateBatchRunExport(a);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toBe("wrong_kind");
    }
  });

  it("rejects when devices is missing", () => {
    const a = validMinimal();
    delete a.devices;
    const result = validateBatchRunExport(a);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toBe("shape_mismatch");
    }
  });

  it("rejects when devices is not an array", () => {
    const a = validMinimal();
    a.devices = "not an array";
    const result = validateBatchRunExport(a);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toBe("shape_mismatch");
    }
  });

  it("rejects when summary count field missing", () => {
    const a = validMinimal();
    const s = a.summary as Record<string, unknown>;
    delete s.total_count;
    const result = validateBatchRunExport(a);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toBe("shape_mismatch");
    }
  });

  it("rejects when severity_counts severity key missing", () => {
    const a = validMinimal();
    const s = a.summary as Record<string, unknown>;
    s.severity_counts = { critical: 0, high: 0, medium: 0, low: 0 };
    const result = validateBatchRunExport(a);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toBe("shape_mismatch");
    }
  });

  it("rejects when generated_by.app_name is wrong", () => {
    const a = validMinimal();
    a.generated_by = { app_name: "NotAnthracite", stage: "V1R" };
    const result = validateBatchRunExport(a);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toBe("shape_mismatch");
    }
  });

  it("rejects when generated_by is missing", () => {
    const a = validMinimal();
    delete a.generated_by;
    const result = validateBatchRunExport(a);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.reason).toBe("shape_mismatch");
    }
  });
});
