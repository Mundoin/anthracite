/**
 * V1Q batchRunSummary — pure aggregation tests.
 *
 * Every count rule from
 * `INTAKE_SURFACE_CONTRACT.md` "Batch run (V1Q overlay)"
 * has an assertion here. React renders verbatim from
 * `batchRun.summary.*`; if this file ever drifts from the
 * doc, fix the doc OR fix the helper — never the
 * components.
 */

import { describe, expect, it } from "vitest";

import type {
  BatchRunDevice,
  BatchRunSummary,
  DeviceStageStatus,
} from "../../../types/batchRun";
import type { Finding, Severity, ValidationReport } from "../../../types/validator";
import {
  deriveBatchRunStatus,
  deriveBatchRunSummary,
} from "../orchestration/batchRunSummary";

function reportWith(severities: ReadonlyArray<Severity>): ValidationReport {
  const findings: ReadonlyArray<Finding> = severities.map((sev, i) => ({
    finding_key: `RULE-${i}:area:path=value${i}`,
    rule_id: `RULE-${i}`,
    rule_version: 1,
    severity: sev,
    signal: "hard",
    title: `Finding ${i}`,
    evidence: [],
    affected_area: "services_snmp",
    recommendation: null,
  }));
  return {
    validator_version: 1,
    rule_pack_version: 1,
    context: {
      platform_id: "cisco-iosxe",
      parser_id: "cisco-iosxe",
      parser_version: "cisco-iosxe-v3",
      selection_mode: "from_detection",
      detection_confidence: 0.95,
      detection_source: "best_match",
      source_context: null,
    },
    findings,
    clean_rules: [],
    skipped_rules: [],
  };
}

function device(
  sliceId: string,
  stage: DeviceStageStatus,
  report?: ValidationReport,
): BatchRunDevice {
  return {
    slice_id: sliceId,
    hostname_hint: null,
    source_provenance: null,
    stage_status: stage,
    detection_result: null,
    selected_platform: null,
    is_manual_override: false,
    device_model: null,
    receipt: null,
    validation_report: report ?? null,
    stage_error: null,
  };
}

describe("deriveBatchRunSummary", () => {
  it("empty devices → zero counts everywhere", () => {
    const s = deriveBatchRunSummary([]);
    const expected: BatchRunSummary = {
      total_count: 0,
      parsed_count: 0,
      failed_count: 0,
      skipped_count: 0,
      pending_count: 0,
      with_findings_count: 0,
      clean_count: 0,
      severity_counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
    };
    expect(s).toStrictEqual(expected);
  });

  it("one pending device → pending_count 1, total 1", () => {
    const s = deriveBatchRunSummary([device("a", "pending")]);
    expect(s.total_count).toBe(1);
    expect(s.pending_count).toBe(1);
    expect(s.parsed_count).toBe(0);
  });

  it("one complete device with 2 high + 1 medium → with_findings_count 1, severity sums", () => {
    const s = deriveBatchRunSummary([
      device("a", "complete", reportWith(["high", "high", "medium"])),
    ]);
    expect(s.parsed_count).toBe(1);
    expect(s.with_findings_count).toBe(1);
    expect(s.clean_count).toBe(0);
    expect(s.severity_counts.high).toBe(2);
    expect(s.severity_counts.medium).toBe(1);
    expect(s.severity_counts.low).toBe(0);
  });

  it("mix: 2 clean, 1 with findings, 1 failed → counts + status complete_with_failures", () => {
    const devices: ReadonlyArray<BatchRunDevice> = [
      device("a", "complete", reportWith([])),
      device("b", "complete", reportWith([])),
      device("c", "complete", reportWith(["medium"])),
      device("d", "failed"),
    ];
    const s = deriveBatchRunSummary(devices);
    expect(s.parsed_count).toBe(3);
    expect(s.with_findings_count).toBe(1);
    expect(s.clean_count).toBe(2);
    expect(s.failed_count).toBe(1);
    expect(s.severity_counts.medium).toBe(1);

    expect(deriveBatchRunStatus(devices, true)).toBe("complete_with_failures");
  });

  it("all complete clean → status complete, clean_count == total", () => {
    const devices: ReadonlyArray<BatchRunDevice> = [
      device("a", "complete", reportWith([])),
      device("b", "complete", reportWith([])),
    ];
    expect(deriveBatchRunSummary(devices).clean_count).toBe(2);
    expect(deriveBatchRunStatus(devices, true)).toBe("complete");
  });

  it("mid-run with one pending → status in_progress", () => {
    const devices: ReadonlyArray<BatchRunDevice> = [
      device("a", "complete", reportWith([])),
      device("b", "parsing"),
    ];
    expect(deriveBatchRunStatus(devices, true)).toBe("in_progress");
  });

  it("not yet analysed → status idle even with devices present", () => {
    const devices: ReadonlyArray<BatchRunDevice> = [device("a", "pending")];
    expect(deriveBatchRunStatus(devices, false)).toBe("idle");
  });

  it("severity ordering in input does not affect counts (sums are commutative)", () => {
    const a = deriveBatchRunSummary([
      device("x", "complete", reportWith(["high", "low", "medium"])),
    ]);
    const b = deriveBatchRunSummary([
      device("x", "complete", reportWith(["medium", "high", "low"])),
    ]);
    expect(a.severity_counts).toStrictEqual(b.severity_counts);
  });

  it("determinism: same input twice → identical output bytes (JSON equality)", () => {
    const devices: ReadonlyArray<BatchRunDevice> = [
      device("a", "complete", reportWith(["high"])),
      device("b", "complete", reportWith([])),
      device("c", "failed"),
    ];
    const a = JSON.stringify(deriveBatchRunSummary(devices));
    const b = JSON.stringify(deriveBatchRunSummary(devices));
    expect(a).toBe(b);
  });

  it("skipped device contributes to skipped_count only", () => {
    const s = deriveBatchRunSummary([device("a", "skipped")]);
    expect(s.skipped_count).toBe(1);
    expect(s.parsed_count).toBe(0);
    expect(s.failed_count).toBe(0);
    expect(s.pending_count).toBe(0);
  });

  it("complete with critical+info → both surfaced in severity counts", () => {
    const s = deriveBatchRunSummary([
      device("a", "complete", reportWith(["critical", "info"])),
    ]);
    expect(s.severity_counts.critical).toBe(1);
    expect(s.severity_counts.info).toBe(1);
    expect(s.with_findings_count).toBe(1);
  });
});
