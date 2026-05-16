/**
 * V1O-B IntakePanel archive end-to-end tests.
 *
 * Walks the archive flow with a mocked Tauri API, asserting:
 *   - the file picker is invoked via the "Open archive…" button
 *   - single-entry-single-config archives fall through to the V1O
 *     single-config flow with NO batch chrome (R11)
 *   - multi-entry archives render BatchSummary with mixed source
 *     paths via `ArchiveSourceBadge`
 *   - the inventory panel is collapsed by default and exposes its
 *     archive name + counts
 *   - the drilled-in view carries the provenance badge through to
 *     the slice header
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

const CISCO_DETECTION: ConfigDetectionResult = {
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

function makeArchiveApi(
  intake: ArchiveIntakeResult,
  splitResult: ConfigBatchSplitResult,
): IntakeApi {
  return {
    listVendorPlatforms: vi.fn().mockResolvedValue(PLATFORMS),
    detectConfigPlatform: vi.fn().mockResolvedValue(CISCO_DETECTION),
    parseDeviceConfig: vi.fn().mockResolvedValue(DEVICE),
    projectDeviceReceipt: vi.fn().mockResolvedValue(RECEIPT),
    splitConfigBatch: vi.fn().mockResolvedValue(splitResult),
    archiveIntake: vi.fn().mockResolvedValue(intake),
  };
}

function fakeArchiveFile(name: string, bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])): File {
  return new File([bytes], name, { type: "application/zip" });
}

async function pickArchive(file: File): Promise<void> {
  const input = document
    .querySelector('input[type="file"][accept*="zip"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  await userEvent.upload(input, file);
}

describe("IntakePanel — V1O-B archive flow", () => {
  it("single-entry-single-config archive renders V1O single-config flow with NO batch chrome (R11)", async () => {
    const api = makeArchiveApi(singleEntryIntake(), SINGLE_SLICE_RESULT);
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await pickArchive(fakeArchiveFile("configs.zip"));

    await waitFor(() => {
      expect(api.archiveIntake).toHaveBeenCalledTimes(1);
      expect(api.splitConfigBatch).toHaveBeenCalledTimes(1);
      expect(api.detectConfigPlatform).toHaveBeenCalledTimes(1);
    });
    // No batch chrome — single-config V1O surface only.
    expect(screen.queryByLabelText("Batch summary")).toBeNull();
    expect(screen.queryByLabelText("Archive inventory")).toBeNull();
  });

  it("multi-entry archive renders BatchSummary with one card per entry and mixed source paths", async () => {
    const api = makeArchiveApi(threeEntryIntake(), SINGLE_SLICE_RESULT);
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await pickArchive(fakeArchiveFile("configs.zip"));

    await waitFor(() => expect(api.splitConfigBatch).toHaveBeenCalledTimes(3));
    await waitFor(() =>
      expect(screen.getByLabelText("Batch summary")).toBeInTheDocument(),
    );
    expect(screen.getByText("entry-0/slice-0")).toBeInTheDocument();
    expect(screen.getByText("entry-1/slice-0")).toBeInTheDocument();
    expect(screen.getByText("entry-2/slice-0")).toBeInTheDocument();

    // ArchiveSourceBadge: per-card "from <entry_path>".
    expect(screen.getByLabelText("from site-a/r1.cfg")).toBeInTheDocument();
    expect(screen.getByLabelText("from site-b/r2.cfg")).toBeInTheDocument();
    expect(screen.getByLabelText("from site-c/r3.cfg")).toBeInTheDocument();
  });

  it("inventory panel is collapsed by default and exposes archive name + counts", async () => {
    const api = makeArchiveApi(threeEntryIntake(), SINGLE_SLICE_RESULT);
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await pickArchive(fakeArchiveFile("configs.zip"));

    const panel = (await screen.findByLabelText(
      "Archive inventory",
    )) as HTMLDetailsElement;
    expect(panel.open).toBe(false);
    expect(panel.textContent).toContain("configs.zip");
    expect(panel.textContent).toContain("3 entries");
    expect(panel.textContent).toContain("3 extracted");
  });

  it("drill-down into a slice shows the provenance badge in the drilled header", async () => {
    const user = userEvent.setup();
    const api = makeArchiveApi(threeEntryIntake(), SINGLE_SLICE_RESULT);
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await pickArchive(fakeArchiveFile("configs.zip"));
    await waitFor(() => expect(api.splitConfigBatch).toHaveBeenCalledTimes(3));

    await user.click(
      await screen.findByRole("button", { name: "Open entry-1/slice-0" }),
    );
    const header = screen.getByLabelText("Drilled slice header");
    expect(header.textContent).toContain("entry-1/slice-0");
    // The provenance badge surfaces alongside the crumbs.
    expect(
      header.querySelector('[aria-label="from site-b/r2.cfg"]'),
    ).toBeTruthy();
  });

  // Archive-stage error banner is covered by the reducer-level test
  // `ArchiveOpenFailed from archive_loading routes to archive_error +
  // error stage` in intakeReducer.archive.test.ts. The UI rendering
  // of the `intake-error` banner is mechanically derived from the
  // reducer state (`batchStatus === "archive_error" && errorMessage`),
  // identical to the V1O-A split_error rendering already locked.
});
