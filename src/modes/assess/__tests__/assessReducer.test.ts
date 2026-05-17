import { describe, expect, it } from "vitest";

import type { BatchRunExport } from "../../../types/batchRunExport";
import { assessReducer } from "../assessReducer";
import { initialAssessState, type AssessState } from "../assessTypes";

const MIN_ARTIFACT: BatchRunExport = {
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

describe("assessReducer — legal transitions", () => {
  it("empty + OpenRequested → loading", () => {
    const next = assessReducer(initialAssessState, { type: "OpenRequested" });
    expect(next).toEqual({ kind: "loading" });
  });

  it("loading + LoadSucceeded → loaded", () => {
    const next = assessReducer(
      { kind: "loading" },
      {
        type: "LoadSucceeded",
        artifact: MIN_ARTIFACT,
        filename: "run.json",
      },
    );
    expect(next).toEqual({
      kind: "loaded",
      artifact: MIN_ARTIFACT,
      filename: "run.json",
    });
  });

  it("loading + LoadFailed → error", () => {
    const next = assessReducer(
      { kind: "loading" },
      {
        type: "LoadFailed",
        reason: "invalid_json",
        message: "boom",
      },
    );
    expect(next).toEqual({
      kind: "error",
      reason: "invalid_json",
      message: "boom",
    });
  });

  it("loading + LoadCancelled → empty", () => {
    const next = assessReducer({ kind: "loading" }, { type: "LoadCancelled" });
    expect(next).toEqual({ kind: "empty" });
  });

  it("loaded + CloseRequested → empty", () => {
    const next = assessReducer(
      { kind: "loaded", artifact: MIN_ARTIFACT, filename: "run.json" },
      { type: "CloseRequested" },
    );
    expect(next).toEqual({ kind: "empty" });
  });

  it("loaded + OpenRequested → loading", () => {
    const next = assessReducer(
      { kind: "loaded", artifact: MIN_ARTIFACT, filename: "run.json" },
      { type: "OpenRequested" },
    );
    expect(next).toEqual({ kind: "loading" });
  });

  it("error + RetryRequested → loading", () => {
    const next = assessReducer(
      { kind: "error", reason: "read_failed", message: "x" },
      { type: "RetryRequested" },
    );
    expect(next).toEqual({ kind: "loading" });
  });

  it("error + CloseRequested → empty", () => {
    const next = assessReducer(
      { kind: "error", reason: "read_failed", message: "x" },
      { type: "CloseRequested" },
    );
    expect(next).toEqual({ kind: "empty" });
  });
});

describe("assessReducer — illegal transitions are no-ops (same reference)", () => {
  const cases: ReadonlyArray<{
    label: string;
    state: AssessState;
    action: Parameters<typeof assessReducer>[1];
  }> = [
    {
      label: "empty + LoadSucceeded",
      state: { kind: "empty" },
      action: {
        type: "LoadSucceeded",
        artifact: MIN_ARTIFACT,
        filename: "x",
      },
    },
    {
      label: "empty + LoadFailed",
      state: { kind: "empty" },
      action: { type: "LoadFailed", reason: "read_failed", message: "x" },
    },
    {
      label: "empty + LoadCancelled",
      state: { kind: "empty" },
      action: { type: "LoadCancelled" },
    },
    {
      label: "empty + RetryRequested",
      state: { kind: "empty" },
      action: { type: "RetryRequested" },
    },
    {
      label: "empty + CloseRequested",
      state: { kind: "empty" },
      action: { type: "CloseRequested" },
    },
    {
      label: "loading + OpenRequested",
      state: { kind: "loading" },
      action: { type: "OpenRequested" },
    },
    {
      label: "loading + CloseRequested",
      state: { kind: "loading" },
      action: { type: "CloseRequested" },
    },
    {
      label: "loading + RetryRequested",
      state: { kind: "loading" },
      action: { type: "RetryRequested" },
    },
    {
      label: "loaded + LoadSucceeded",
      state: { kind: "loaded", artifact: MIN_ARTIFACT, filename: "x" },
      action: {
        type: "LoadSucceeded",
        artifact: MIN_ARTIFACT,
        filename: "y",
      },
    },
    {
      label: "loaded + LoadCancelled",
      state: { kind: "loaded", artifact: MIN_ARTIFACT, filename: "x" },
      action: { type: "LoadCancelled" },
    },
    {
      label: "loaded + RetryRequested",
      state: { kind: "loaded", artifact: MIN_ARTIFACT, filename: "x" },
      action: { type: "RetryRequested" },
    },
    {
      label: "error + OpenRequested",
      state: { kind: "error", reason: "read_failed", message: "x" },
      action: { type: "OpenRequested" },
    },
    {
      label: "error + LoadSucceeded",
      state: { kind: "error", reason: "read_failed", message: "x" },
      action: {
        type: "LoadSucceeded",
        artifact: MIN_ARTIFACT,
        filename: "y",
      },
    },
    {
      label: "error + LoadCancelled",
      state: { kind: "error", reason: "read_failed", message: "x" },
      action: { type: "LoadCancelled" },
    },
  ];

  for (const c of cases) {
    it(`${c.label} → no-op`, () => {
      const next = assessReducer(c.state, c.action);
      expect(Object.is(next, c.state)).toBe(true);
    });
  }
});
