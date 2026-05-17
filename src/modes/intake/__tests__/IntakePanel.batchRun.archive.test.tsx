/**
 * V1Q × V1O-B — BatchRun over archive input.
 *
 * Verifies provenance preservation across Analyse-batch and
 * drill-down with stored results.
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
import type { ValidationReport } from "../../../types/validator";
import type { VendorPlatform } from "../../../types/vendor";
import { IntakePanel, type IntakeApi } from "../IntakePanel";

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
  scanned_line_count: 1,
  total_line_count: 1,
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

const REPORT: ValidationReport = {
  validator_version: 1,
  rule_pack_version: 1,
  context: {
    platform_id: "cisco-iosxe",
    parser_id: "cisco-iosxe",
    parser_version: "v3",
    selection_mode: "from_detection",
    detection_confidence: 0.95,
    detection_source: "best_match",
    source_context: null,
  },
  findings: [],
  clean_rules: [],
  skipped_rules: [],
};

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

const SINGLE_SLICE_RESULT: ConfigBatchSplitResult = {
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
};

function makeArchiveApi(): IntakeApi {
  return {
    listVendorPlatforms: vi.fn().mockResolvedValue(PLATFORMS),
    detectConfigPlatform: vi.fn().mockResolvedValue(DETECTION),
    parseDeviceConfig: vi.fn().mockResolvedValue(DEVICE),
    projectDeviceReceipt: vi.fn().mockResolvedValue(RECEIPT),
    splitConfigBatch: vi.fn().mockResolvedValue(SINGLE_SLICE_RESULT),
    archiveIntake: vi.fn().mockResolvedValue(threeEntryIntake()),
    validateDeviceModel: vi.fn().mockResolvedValue(REPORT),
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

describe("IntakePanel × V1Q BatchRun — archive provenance", () => {
  it("archive batch summary still carries ArchiveSourceBadge per row after Analyse batch", async () => {
    const user = userEvent.setup();
    const api = makeArchiveApi();
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await pickArchive(fakeArchiveFile("configs.zip"));
    await waitFor(() =>
      expect(api.splitConfigBatch).toHaveBeenCalledTimes(3),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Batch summary")).toBeInTheDocument(),
    );

    expect(screen.getByLabelText("from site-a/r1.cfg")).toBeInTheDocument();
    expect(screen.getByLabelText("from site-b/r2.cfg")).toBeInTheDocument();
    expect(screen.getByLabelText("from site-c/r3.cfg")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Analyse batch" }));
    await waitFor(() =>
      expect(api.parseDeviceConfig).toHaveBeenCalledTimes(3),
    );
    await waitFor(() =>
      expect(api.validateDeviceModel).toHaveBeenCalledTimes(3),
    );
    // Provenance badges still present post-analyse.
    expect(screen.getByLabelText("from site-a/r1.cfg")).toBeInTheDocument();
  });

  it("drilled-in archive slice after Analyse shows ArchiveSourceBadge in the drilled chrome", async () => {
    const user = userEvent.setup();
    const api = makeArchiveApi();
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await pickArchive(fakeArchiveFile("configs.zip"));
    await waitFor(() =>
      expect(api.splitConfigBatch).toHaveBeenCalledTimes(3),
    );
    await user.click(screen.getByRole("button", { name: "Analyse batch" }));
    await waitFor(() =>
      expect(api.validateDeviceModel).toHaveBeenCalledTimes(3),
    );

    await user.click(
      await screen.findByRole("button", { name: "Open entry-1/slice-0" }),
    );
    const header = screen.getByLabelText("Drilled slice header");
    expect(
      header.querySelector('[aria-label="from site-b/r2.cfg"]'),
    ).toBeTruthy();
    // Stored-results path: workspace + receipt rendered without
    // additional parse/validate calls.
    expect(api.parseDeviceConfig).toHaveBeenCalledTimes(3);
    expect(api.validateDeviceModel).toHaveBeenCalledTimes(3);
  });

  it("Re-run on archive batch keeps provenance", async () => {
    const user = userEvent.setup();
    const api = makeArchiveApi();
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await pickArchive(fakeArchiveFile("configs.zip"));
    await waitFor(() =>
      expect(api.splitConfigBatch).toHaveBeenCalledTimes(3),
    );
    await user.click(screen.getByRole("button", { name: "Analyse batch" }));
    await waitFor(() =>
      expect(api.validateDeviceModel).toHaveBeenCalledTimes(3),
    );

    await user.click(screen.getByRole("button", { name: "Re-run analysis" }));
    await waitFor(() =>
      expect(api.parseDeviceConfig).toHaveBeenCalledTimes(6),
    );
    expect(screen.getByLabelText("from site-a/r1.cfg")).toBeInTheDocument();
    expect(screen.getByLabelText("from site-c/r3.cfg")).toBeInTheDocument();
  });
});
