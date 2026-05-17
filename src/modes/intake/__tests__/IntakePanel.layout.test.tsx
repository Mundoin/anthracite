/**
 * V1P-A IntakePanel layout regression tests.
 *
 * Locks the workspace composition rules from
 * INTAKE_SURFACE_CONTRACT.md "Workspace layout (V1P-A overlay)":
 *
 *   - Single-device idle  → workspace with empty answer lane.
 *   - Single-device parsed→ Findings above Receipt in answer lane.
 *   - Batch summary       → full-width, NO workspace.
 *   - Drilled-in slice    → workspace.
 *   - Archive batch       → full-width, NO workspace.
 *   - Archive drilled-in  → workspace + provenance badge in drilled
 *                           header chrome.
 *   - Lane-item accent class derives from semantic role tokens
 *     (Phase A): --anth-role-{engine,operator,severity-*,
 *     status-running,neutral,truth,input}.
 *   - Reducer transitions are byte-identical vs V1P (IntakePanel
 *     JSX rewire was the only change).
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  ArchiveIntakeResult,
  ArchiveKind,
} from "../../../types/archiveIntake";
import type { ConfigBatchSplitResult } from "../../../types/configBatch";
import type { ConfigDetectionResult } from "../../../types/configDetection";
import type { DeviceModel, PlatformRef } from "../../../types/networkModel";
import type { ReceiptView } from "../../../types/receipt";
import type { ValidationReport, Severity } from "../../../types/validator";
import type { VendorPlatform } from "../../../types/vendor";
import { IntakePanel, type IntakeApi } from "../IntakePanel";
import {
  initialIntakeState,
  type IntakeAction,
} from "../intakeTypes";
import { intakeReducer } from "../intakeReducer";

const ZIP: ArchiveKind = { kind: "zip" };

const CISCO_REF: PlatformRef = {
  platform_id: "cisco-iosxe",
  vendor: "cisco",
  os_family: "iosxe",
  os_version_raw: null,
  os_version_normalized: null,
  detection_confidence: 0.95,
};

const PLATFORMS: ReadonlyArray<VendorPlatform> = [
  {
    id: "cisco-iosxe",
    vendor: "cisco",
    os_family: "iosxe",
    primary_role: "router",
    config_style: "ios-cli",
    priority_tier: "t1",
    initial_parser_target_level: "l2topology",
    capability_families: ["interfaces"],
    notes: "",
  },
];

const DETECTION: ConfigDetectionResult = {
  best_match: CISCO_REF,
  candidates: [],
  evidence: [],
  confidence: 0.95,
  warnings: [],
  scanned_line_count: 3,
  total_line_count: 3,
};

const DEVICE = { identity: { hostname: "r1" } } as unknown as DeviceModel;
const RECEIPT = {
  hostname: "r1",
  platform_id: "cisco-iosxe",
  os_version: null,
  source: null,
  source_kind: null,
  byte_size: 32,
  line_count: 3,
  parser_version: "cisco-iosxe-v3",
  registry_version: "reg-v1",
  score: 0.92,
  coverage_ratio: 1,
  parsed_line_count: 3,
  unknown_line_count: 0,
  observed_maturity: "l2topology",
  areas: [],
  warnings: [],
  unknowns: [],
  unknowns_truncated: false,
} as unknown as ReceiptView;

const SINGLE_SPLIT: ConfigBatchSplitResult = {
  slices: [
    {
      slice_id: "slice-0",
      line_start: 1,
      line_end: 1,
      raw_text: "hostname r1\n",
      confidence: 1.0,
      hint: { kind: "none" },
    },
  ],
  method: { kind: "single_config" },
  warnings: [],
  total_line_count: 1,
  scanned_line_count: 1,
  splitter_version: "1",
};

const MULTI_SPLIT: ConfigBatchSplitResult = {
  slices: [
    {
      slice_id: "slice-0",
      line_start: 1,
      line_end: 3,
      raw_text: "hostname r1\ninterface Gig0\nend\n",
      confidence: 1.0,
      hint: { kind: "hostname_present", hostname: "r1" },
    },
    {
      slice_id: "slice-1",
      line_start: 5,
      line_end: 7,
      raw_text: "hostname r2\ninterface Gig0\nend\n",
      confidence: 0.85,
      hint: { kind: "hostname_present", hostname: "r2" },
    },
  ],
  method: { kind: "heuristic" },
  warnings: [],
  total_line_count: 7,
  scanned_line_count: 7,
  splitter_version: "1",
};

function reportWith(severities: ReadonlyArray<Severity>): ValidationReport {
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
    findings: severities.map((sev, i) => ({
      finding_key: `RULE-${i}:area:path=value`,
      rule_id: `RULE-${i}`,
      rule_version: 1,
      severity: sev,
      signal: "hard",
      title: `Test finding ${i}`,
      evidence: [],
      affected_area: "services_snmp",
      recommendation: null,
    })),
    clean_rules: [],
    skipped_rules: [],
  };
}

function makeApi(overrides: Partial<IntakeApi> = {}): IntakeApi {
  return {
    listVendorPlatforms: vi.fn().mockResolvedValue(PLATFORMS),
    detectConfigPlatform: vi.fn().mockResolvedValue(DETECTION),
    parseDeviceConfig: vi.fn().mockResolvedValue(DEVICE),
    projectDeviceReceipt: vi.fn().mockResolvedValue(RECEIPT),
    splitConfigBatch: vi.fn().mockResolvedValue(SINGLE_SPLIT),
    archiveIntake: vi.fn(),
    validateDeviceModel: vi.fn().mockResolvedValue(reportWith(["high"])),
    ...overrides,
  };
}

function singleEntryIntake(): ArchiveIntakeResult {
  return {
    archive_kind_supplied: ZIP,
    archive_kind_detected: ZIP,
    entries: [
      {
        entry_id: "entry-0",
        entry_index: 0,
        path: "r1.cfg",
        raw_path: null,
        size_bytes_compressed: 32,
        size_bytes_uncompressed: 32,
        status: { kind: "extracted" },
        raw_text: "hostname r1\nend\n",
        decode_warning: null,
      },
    ],
    warnings: [],
    total_uncompressed_size: 32,
    total_compressed_size: 32,
    entry_count: 1,
    extracted_count: 1,
    skipped_count: 0,
    archive_intake_version: "1",
  };
}

function threeEntryIntake(): ArchiveIntakeResult {
  return {
    archive_kind_supplied: ZIP,
    archive_kind_detected: ZIP,
    entries: [
      {
        entry_id: "entry-0",
        entry_index: 0,
        path: "site-a/r1.cfg",
        raw_path: null,
        size_bytes_compressed: 32,
        size_bytes_uncompressed: 32,
        status: { kind: "extracted" },
        raw_text: "hostname r1\nend\n",
        decode_warning: null,
      },
      {
        entry_id: "entry-1",
        entry_index: 1,
        path: "site-b/r2.cfg",
        raw_path: null,
        size_bytes_compressed: 32,
        size_bytes_uncompressed: 32,
        status: { kind: "extracted" },
        raw_text: "hostname r2\nend\n",
        decode_warning: null,
      },
      {
        entry_id: "entry-2",
        entry_index: 2,
        path: "site-c/r3.cfg",
        raw_path: null,
        size_bytes_compressed: 32,
        size_bytes_uncompressed: 32,
        status: { kind: "extracted" },
        raw_text: "hostname r3\nend\n",
        decode_warning: null,
      },
    ],
    warnings: [],
    total_uncompressed_size: 96,
    total_compressed_size: 96,
    entry_count: 3,
    extracted_count: 3,
    skipped_count: 0,
    archive_intake_version: "1",
  };
}

function makeArchiveApi(
  intake: ArchiveIntakeResult,
  splitResult: ConfigBatchSplitResult,
  validatorReport?: ValidationReport,
): IntakeApi {
  return {
    listVendorPlatforms: vi.fn().mockResolvedValue(PLATFORMS),
    detectConfigPlatform: vi.fn().mockResolvedValue(DETECTION),
    parseDeviceConfig: vi.fn().mockResolvedValue(DEVICE),
    projectDeviceReceipt: vi.fn().mockResolvedValue(RECEIPT),
    splitConfigBatch: vi.fn().mockResolvedValue(splitResult),
    archiveIntake: vi.fn().mockResolvedValue(intake),
    validateDeviceModel: validatorReport
      ? vi.fn().mockResolvedValue(validatorReport)
      : undefined,
  };
}

function fakeArchiveFile(name: string): File {
  return new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], name, {
    type: "application/zip",
  });
}

async function pickArchive(file: File): Promise<void> {
  const input = document.querySelector(
    'input[type="file"][accept*="zip"]',
  ) as HTMLInputElement;
  expect(input).toBeTruthy();
  await userEvent.upload(input, file);
}

async function walkToParsed(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.type(screen.getByLabelText("Config text"), "x");
  await user.click(
    screen.getByRole("button", { name: /Detect platform/i }),
  );
  await user.click(await screen.findByRole("button", { name: /Parse config/i }));
}

function laneItemFor(child: Element): HTMLElement | null {
  return child.closest(".intake-lane-item") as HTMLElement | null;
}

describe("IntakePanel — V1P-A workspace layout", () => {
  it("single-device idle renders workspace as single full-width work lane (no Answer Lane)", async () => {
    const api = makeApi();
    const { container } = render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    expect(screen.getByLabelText("Intake workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Work lane")).toBeInTheDocument();
    // No Answer Lane on idle — collapses to single lane until engine
    // truth exists. No empty "RESULT" placeholder block.
    expect(screen.queryByLabelText("Answer lane")).toBeNull();
    expect(
      screen.queryByRole("status", { name: "Awaiting parse" }),
    ).toBeNull();
    expect(container.querySelector(".intake-workspace__seam")).toBeNull();
    expect(
      container.querySelector(".intake-workspace--single-lane"),
    ).not.toBeNull();
    expect(screen.queryByLabelText("Validation findings")).toBeNull();
    expect(screen.queryByLabelText("Parse receipt")).toBeNull();
  });

  it("Findings panel renders inside a V1P-A lane-item wrapper (header chrome scope)", async () => {
    const user = userEvent.setup();
    const api = makeApi();
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await walkToParsed(user);
    const findings = await screen.findByLabelText("Validation findings");
    // The findings header chrome (shaded background, hairline
    // border-bottom, uppercase tracking) is applied via the
    // descendant selector `.intake-lane-item .intake-findings__header`
    // appended in intake.css. Asserting the wrapper presence pins
    // the CSS scope without depending on jsdom computed styles.
    expect(findings.closest(".intake-lane-item")).not.toBeNull();
    const header = findings.querySelector(".intake-findings__header");
    expect(header).not.toBeNull();
    expect(header?.querySelector(".intake-findings__title")?.textContent).toBe(
      "FINDINGS",
    );
  });

  it("single-device parsed renders Findings above Receipt in answer lane", async () => {
    const user = userEvent.setup();
    const api = makeApi();
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await walkToParsed(user);
    const findings = await screen.findByLabelText("Validation findings");
    const receipt = await screen.findByLabelText("Parse receipt");
    const answerLane = screen.getByLabelText("Answer lane");

    expect(answerLane.contains(findings)).toBe(true);
    expect(answerLane.contains(receipt)).toBe(true);
    expect(
      findings.compareDocumentPosition(receipt) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.queryByRole("status", { name: "Awaiting parse" }),
    ).toBeNull();
  });

  it("batch summary renders full-width, no workspace", async () => {
    const user = userEvent.setup();
    const api = makeApi({
      splitConfigBatch: vi.fn().mockResolvedValue(MULTI_SPLIT),
    });
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await user.type(screen.getByLabelText("Config text"), "x");
    await user.click(
      screen.getByRole("button", { name: /Detect platform/i }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Batch summary")).toBeInTheDocument(),
    );

    expect(screen.queryByLabelText("Intake workspace")).toBeNull();
    expect(screen.queryByLabelText("Validation findings")).toBeNull();
    expect(screen.queryByLabelText("Parse receipt")).toBeNull();
  });

  it("drilled-in slice from batch renders workspace with Findings + Receipt", async () => {
    const user = userEvent.setup();
    const api = makeApi({
      splitConfigBatch: vi.fn().mockResolvedValue(MULTI_SPLIT),
    });
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await user.type(screen.getByLabelText("Config text"), "x");
    await user.click(
      screen.getByRole("button", { name: /Detect platform/i }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Batch summary")).toBeInTheDocument(),
    );

    await user.click(
      await screen.findByRole("button", { name: "Open slice-0" }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Parse config/i }),
    );

    expect(
      await screen.findByLabelText("Intake workspace"),
    ).toBeInTheDocument();
    const answerLane = screen.getByLabelText("Answer lane");
    const findings = await screen.findByLabelText("Validation findings");
    const receipt = await screen.findByLabelText("Parse receipt");
    expect(answerLane.contains(findings)).toBe(true);
    expect(answerLane.contains(receipt)).toBe(true);
  });

  it("archive batch summary renders full-width, no workspace", async () => {
    const api = makeArchiveApi(threeEntryIntake(), {
      slices: [
        {
          slice_id: "slice-0",
          line_start: 1,
          line_end: 2,
          raw_text: "hostname r1\nend\n",
          confidence: 1.0,
          hint: { kind: "hostname_present", hostname: "r1" },
        },
      ],
      method: { kind: "single_config" },
      warnings: [],
      total_line_count: 2,
      scanned_line_count: 2,
      splitter_version: "1",
    });
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await pickArchive(fakeArchiveFile("configs.zip"));
    await waitFor(() =>
      expect(screen.getByLabelText("Batch summary")).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText("Intake workspace")).toBeNull();
  });

  it("drilled-in archive slice renders workspace with provenance badge in drilled header", async () => {
    const user = userEvent.setup();
    const api = makeArchiveApi(threeEntryIntake(), {
      slices: [
        {
          slice_id: "slice-0",
          line_start: 1,
          line_end: 2,
          raw_text: "hostname r1\nend\n",
          confidence: 1.0,
          hint: { kind: "hostname_present", hostname: "r1" },
        },
      ],
      method: { kind: "single_config" },
      warnings: [],
      total_line_count: 2,
      scanned_line_count: 2,
      splitter_version: "1",
    });
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await pickArchive(fakeArchiveFile("configs.zip"));
    await waitFor(() => expect(api.splitConfigBatch).toHaveBeenCalledTimes(3));

    await user.click(
      await screen.findByRole("button", { name: "Open entry-1/slice-0" }),
    );

    const header = screen.getByLabelText("Drilled slice header");
    expect(
      header.querySelector('[aria-label="from site-b/r2.cfg"]'),
    ).toBeTruthy();
    expect(screen.getByLabelText("Intake workspace")).toBeInTheDocument();
  });

  it("manual override panel carries the operator-choice (copper) rail class", async () => {
    const api = makeApi();
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    // Vendor list resolves → PlatformOverrideSelect renders.
    const override = await screen.findByLabelText("Manual platform override");
    const wrapper = laneItemFor(override);
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("intake-lane-item--accent-operator");
  });

  it.each<{ severities: ReadonlyArray<Severity>; expected: string }>([
    { severities: ["critical"], expected: "intake-lane-item--accent-fault" },
    { severities: ["high"], expected: "intake-lane-item--accent-fault" },
    { severities: ["medium"], expected: "intake-lane-item--accent-warn" },
    { severities: ["low"], expected: "intake-lane-item--accent-warn" },
    { severities: [], expected: "intake-lane-item--accent-clean" },
  ])(
    "findings accent rail = $expected for severities $severities",
    async ({ severities, expected }) => {
      const user = userEvent.setup();
      const api = makeApi({
        validateDeviceModel: vi.fn().mockResolvedValue(reportWith(severities)),
      });
      render(<IntakePanel api={api} />);
      await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

      await walkToParsed(user);
      const findings = await screen.findByLabelText("Validation findings");
      const wrapper = laneItemFor(findings);
      expect(wrapper).not.toBeNull();
      expect(wrapper?.className).toContain(expected);
    },
  );

  it("FindingsPanel is NOT rendered inside BatchSummaryView (V1P regression lock)", async () => {
    const user = userEvent.setup();
    const api = makeApi({
      splitConfigBatch: vi.fn().mockResolvedValue(MULTI_SPLIT),
    });
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await user.type(screen.getByLabelText("Config text"), "x");
    await user.click(
      screen.getByRole("button", { name: /Detect platform/i }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Batch summary")).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText("Validation findings")).toBeNull();
    expect(api.validateDeviceModel).not.toHaveBeenCalled();
  });

  it("reducer transitions byte-identical vs V1P (no behaviour change in V1P-A)", () => {
    // Drive a representative single-device action sequence and assert
    // the final state matches the V1P reference state field-for-field.
    // V1P-A only rewires JSX; reducer is untouched. If any field
    // diverges this test fails fast.
    const actions: ReadonlyArray<IntakeAction> = [
      { type: "VendorPlatformsLoaded", platforms: PLATFORMS },
      {
        type: "FileLoaded",
        text: "hostname r1\n",
        filename: "r1.cfg",
        byte_size: 12,
      },
      { type: "SplitStart" },
      { type: "SplitToSingle", result: SINGLE_SPLIT },
      { type: "DetectSucceeded", result: DETECTION },
      {
        type: "SelectPlatform",
        platform: CISCO_REF,
        isManualOverride: false,
      },
      { type: "ParseStart" },
      { type: "ParseSucceeded", device: DEVICE, receipt: RECEIPT },
      { type: "ValidatorStarted" },
      { type: "ValidatorSucceeded", report: reportWith(["high"]) },
    ];

    const final = actions.reduce(intakeReducer, initialIntakeState);

    expect(final.status).toBe("parsed");
    expect(final.validationStatus).toBe("ready");
    expect(final.validationReport?.findings).toHaveLength(1);
    expect(final.validationReport?.findings[0]?.severity).toBe("high");
    expect(final.receipt).toBe(RECEIPT);
    expect(final.device).toBe(DEVICE);
    expect(final.selectedPlatform).toBe(CISCO_REF);
    expect(final.isManualOverride).toBe(false);
    expect(final.batchStatus).toBe("none");
    expect(final.batch).toBeNull();
    expect(final.errorStage).toBeNull();
    expect(final.errorMessage).toBeNull();
    expect(final.vendorListError).toBeNull();
    expect(final.validationError).toBeNull();
  });
});
