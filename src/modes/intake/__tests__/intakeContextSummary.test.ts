/**
 * V1BO — Intake context summary tests.
 *
 * Tests buildIntakeContextSummary for correctness and redaction guarantees.
 */

import { describe, it, expect } from "vitest";
import { buildIntakeContextSummary } from "../intakeContextSummary";
import { initialIntakeState } from "../intakeTypes";
import {
  EMPTY_WORKBENCH_INTAKE_SUMMARY,
  type WorkbenchIntakeSummary,
} from "../../../state/workbenchContextSummary";
import type { IntakeState, IntakeStatus, IntakeErrorStage } from "../intakeTypes";

describe("buildIntakeContextSummary", () => {
  /**
   * Test 1: Initial/empty IntakeState → EMPTY_WORKBENCH_INTAKE_SUMMARY equivalent.
   */
  it("should return empty summary for initial state", () => {
    const result = buildIntakeContextSummary(initialIntakeState);
    expect(result).toEqual(EMPTY_WORKBENCH_INTAKE_SUMMARY);
    expect(result.current_platform_id).toBeNull();
    expect(result.parse_status).toBe("idle");
    expect(result.parsed_device_count).toBe(0);
    expect(result.finding_count).toBe(0);
  });

  /**
   * Test 2: State with detected platform → current_platform_id populated.
   */
  it("should populate current_platform_id when platform is selected", () => {
    const state: IntakeState = {
      ...initialIntakeState,
      status: "detected",
      selectedPlatform: {
        platform_id: "cisco_ios",
        vendor: "cisco",
        os_family: "ios",
        os_version_raw: "15.2(4)M11",
        os_version_normalized: "15.2",
        detection_confidence: 0.95,
      },
    };

    const result = buildIntakeContextSummary(state);
    expect(result.current_platform_id).toBe("cisco_ios");
    expect(result.parse_status).toBe("detected");
  });

  /**
   * Test 3: State with parsed single config → parse_status === "parsed".
   */
  it("should return parsed status when device is populated", () => {
    const state: IntakeState = {
      ...initialIntakeState,
      status: "parsed",
      selectedPlatform: {
        platform_id: "juniper_junos",
        vendor: "juniper",
        os_family: "junos",
        os_version_raw: "20.1R1",
        os_version_normalized: "20.1",
        detection_confidence: 0.98,
      },
      device: {
        hostname: "router-1",
        platform: {
          platform_id: "juniper_junos",
          vendor: "juniper",
          os_family: "junos",
          os_version_raw: "20.1R1",
          os_version_normalized: "20.1",
          detection_confidence: 0.98,
        },
        interfaces: [],
        routes: [],
        vlans: [],
        raw_config: "system { hostname router-1; }",
      },
      receipt: {
        device_hostname: "router-1",
        platform_id: "juniper_junos",
        intake_source: "paste",
        timestamp: "2024-01-01T00:00:00Z",
        receipt_id: "rcpt-001",
      },
    };

    const result = buildIntakeContextSummary(state);
    expect(result.parse_status).toBe("parsed");
    expect(result.parsed_device_count).toBe(1);
  });

  /**
   * Test 4: State with failed parse → parse_status === "failed".
   */
  it("should return failed status when error stage is set", () => {
    const state: IntakeState = {
      ...initialIntakeState,
      status: "error",
      errorStage: "parse",
      errorMessage: "Parsing failed: unexpected token",
    };

    const result = buildIntakeContextSummary(state);
    expect(result.parse_status).toBe("failed");
    expect(result.parsed_device_count).toBe(0);
  });

  /**
   * Test 5: State with batch results of N devices → parsed_device_count === N.
   */
  it("should count completed devices from batch run", () => {
    const state: IntakeState = {
      ...initialIntakeState,
      status: "parsed",
      batchStatus: "split_complete",
      batch: {
        originalText: "config1\n---\nconfig2\n---\nconfig3",
        originalSource: { kind: "paste", filename: null, byte_size: 100 },
        splitResult: {
          method: { kind: "auto" },
          slices: [
            { slice_id: "s1", kind: "candidate", text: "config1", source_range: [0, 7] },
            { slice_id: "s2", kind: "candidate", text: "config2", source_range: [10, 17] },
            { slice_id: "s3", kind: "candidate", text: "config3", source_range: [20, 27] },
          ],
        },
        perSliceDetection: {},
        drilledSliceId: null,
        archiveInventory: null,
        archiveProvenance: {},
        archiveName: null,
        batchRun: {
          source: { kind: "paste" },
          status: "in_progress",
          epoch: 1,
          devices: [
            {
              slice_id: "s1",
              hostname_hint: "dev1",
              source_provenance: null,
              stage_status: "complete",
              detection_result: null,
              selected_platform: {
                platform_id: "cisco_ios",
                vendor: "cisco",
                os_family: "ios",
                os_version_raw: "15.2",
                os_version_normalized: "15.2",
                detection_confidence: 0.95,
              },
              is_manual_override: false,
              device_model: null,
              receipt: null,
              validation_report: null,
              stage_error: null,
            },
            {
              slice_id: "s2",
              hostname_hint: "dev2",
              source_provenance: null,
              stage_status: "complete",
              detection_result: null,
              selected_platform: {
                platform_id: "juniper_junos",
                vendor: "juniper",
                os_family: "junos",
                os_version_raw: "20.1",
                os_version_normalized: "20.1",
                detection_confidence: 0.98,
              },
              is_manual_override: false,
              device_model: null,
              receipt: null,
              validation_report: null,
              stage_error: null,
            },
            {
              slice_id: "s3",
              hostname_hint: null,
              source_provenance: null,
              stage_status: "failed",
              detection_result: null,
              selected_platform: null,
              is_manual_override: false,
              device_model: null,
              receipt: null,
              validation_report: null,
              stage_error: { stage: "parse", message: "Parse error" },
            },
          ],
          summary: {
            total_count: 3,
            parsed_count: 2,
            failed_count: 1,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 2,
            severity_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
          },
        },
      },
    };

    const result = buildIntakeContextSummary(state);
    // 2 complete + 1 failed = 3 total terminal states
    expect(result.parsed_device_count).toBe(3);
  });

  /**
   * Test 6: Redaction guarantee — raw configs / credentials do NOT leak.
   */
  it("should not leak raw config text or credentials in summary", () => {
    const sensitiveConfig = `
interface GigabitEthernet0/0/0
 ip address 192.168.1.1 255.255.255.0
 description WAN Link
 speed 1000
!
line vty 0 15
 password super_secret_password_12345
 transport input ssh
!
crypto preshared-key 0xDEADBEEF
    `;

    const state: IntakeState = {
      ...initialIntakeState,
      status: "parsed",
      text: sensitiveConfig,
      selectedPlatform: {
        platform_id: "cisco_ios",
        vendor: "cisco",
        os_family: "ios",
        os_version_raw: "15.2",
        os_version_normalized: "15.2",
        detection_confidence: 0.95,
      },
      device: {
        hostname: "router-1",
        platform: {
          platform_id: "cisco_ios",
          vendor: "cisco",
          os_family: "ios",
          os_version_raw: "15.2",
          os_version_normalized: "15.2",
          detection_confidence: 0.95,
        },
        interfaces: [],
        routes: [],
        vlans: [],
        raw_config: sensitiveConfig,
      },
      receipt: {
        device_hostname: "router-1",
        platform_id: "cisco_ios",
        intake_source: "paste",
        timestamp: "2024-01-01T00:00:00Z",
        receipt_id: "rcpt-001",
      },
      validationReport: {
        device_hostname: "router-1",
        validation_id: "val-001",
        timestamp: "2024-01-01T00:00:00Z",
        results: [
          {
            rule_id: "rule-1",
            name: "Check IP config",
            status: "pass",
            details: null,
          },
        ],
        findings: [],
      },
    };

    const result = buildIntakeContextSummary(state);

    // Verify no sensitive data in summary
    const summaryStr = JSON.stringify(result);
    expect(summaryStr).not.toContain("super_secret_password");
    expect(summaryStr).not.toContain("DEADBEEF");
    expect(summaryStr).not.toContain("192.168.1.1");
    expect(summaryStr).not.toContain(sensitiveConfig);

    // Verify only safe fields are present
    expect(Object.keys(result).sort()).toEqual([
      "current_platform_id",
      "finding_count",
      "parse_status",
      "parsed_device_count",
    ]);
  });

  /**
   * Test 7: Parsing status transitions.
   */
  it("should correctly map all status transitions", () => {
    const statuses: Array<{ input: IntakeStatus; expected: string }> = [
      { input: "idle", expected: "idle" },
      { input: "input_ready", expected: "idle" },
      { input: "detecting", expected: "idle" },
      { input: "detected", expected: "detected" },
      { input: "parsing", expected: "parsing" },
      { input: "parsed", expected: "parsed" },
      { input: "error", expected: "failed" },
    ];

    statuses.forEach(({ input, expected }) => {
      const state: IntakeState = {
        ...initialIntakeState,
        status: input,
      };
      const result = buildIntakeContextSummary(state);
      expect(result.parse_status).toBe(expected, `Failed for status: ${input}`);
    });
  });

  /**
   * Test 8: Finding count from validation report.
   */
  it("should count findings from validation report", () => {
    const state: IntakeState = {
      ...initialIntakeState,
      status: "parsed",
      validationReport: {
        device_hostname: "router-1",
        validation_id: "val-001",
        timestamp: "2024-01-01T00:00:00Z",
        results: [],
        findings: [
          { finding_id: "f1", rule_id: "rule-1", severity: "warning", description: "Issue 1" },
          { finding_id: "f2", rule_id: "rule-2", severity: "error", description: "Issue 2" },
          { finding_id: "f3", rule_id: "rule-3", severity: "info", description: "Issue 3" },
        ],
      },
    };

    const result = buildIntakeContextSummary(state);
    expect(result.finding_count).toBe(3);
  });

  /**
   * Test 9: No findings when validation report is null.
   */
  it("should return 0 findings when validation report is absent", () => {
    const state: IntakeState = {
      ...initialIntakeState,
      status: "parsed",
      validationReport: null,
    };

    const result = buildIntakeContextSummary(state);
    expect(result.finding_count).toBe(0);
  });
});
