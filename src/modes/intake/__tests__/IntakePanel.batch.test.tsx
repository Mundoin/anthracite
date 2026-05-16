import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ConfigBatchSplitResult } from "../../../types/configBatch";
import type { ConfigDetectionResult } from "../../../types/configDetection";
import type { DeviceModel, PlatformRef } from "../../../types/networkModel";
import type { ReceiptView } from "../../../types/receipt";
import type { VendorPlatform } from "../../../types/vendor";
import { IntakePanel, type IntakeApi } from "../IntakePanel";

const CISCO_REF: PlatformRef = {
  platform_id: "cisco-iosxe",
  vendor: "cisco",
  os_family: "iosxe",
  os_version_raw: null,
  os_version_normalized: null,
  detection_confidence: 0.95,
};

const JUNOS_REF: PlatformRef = {
  platform_id: "juniper-junos",
  vendor: "juniper",
  os_family: "junos",
  os_version_raw: null,
  os_version_normalized: null,
  detection_confidence: 0.9,
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
  {
    id: "juniper-junos",
    vendor: "juniper",
    os_family: "junos",
    primary_role: "router",
    config_style: "junos",
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

const JUNOS_DETECTION: ConfigDetectionResult = {
  best_match: JUNOS_REF,
  candidates: [],
  evidence: [],
  confidence: 0.9,
  warnings: [],
  scanned_line_count: 3,
  total_line_count: 3,
};

const MULTI_RESULT: ConfigBatchSplitResult = {
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
      raw_text: "set system host-name r2\nset interfaces ge-0/0/0\n",
      confidence: 0.7,
      hint: { kind: "hostname_present", hostname: "r2" },
    },
  ],
  method: { kind: "heuristic" },
  warnings: [],
  total_line_count: 7,
  scanned_line_count: 7,
  splitter_version: "1",
};

const AMBIGUOUS_RESULT: ConfigBatchSplitResult = {
  ...MULTI_RESULT,
  warnings: [{ kind: "ambiguous_boundary", near_line: 4 }],
};

const DEVICE = { identity: { hostname: "r1" } } as unknown as DeviceModel;
const RECEIPT = {
  hostname: "r1",
  platform_id: "cisco-iosxe",
  os_version: "17.6.4",
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

function detectByText(text: string): Promise<ConfigDetectionResult> {
  if (text.includes("set system host-name")) return Promise.resolve(JUNOS_DETECTION);
  return Promise.resolve(CISCO_DETECTION);
}

function makeBatchApi(
  splitResult: ConfigBatchSplitResult,
  overrides: Partial<IntakeApi> = {},
): IntakeApi {
  return {
    listVendorPlatforms: vi.fn().mockResolvedValue(PLATFORMS),
    detectConfigPlatform: vi.fn((text: string) => detectByText(text)),
    parseDeviceConfig: vi.fn().mockResolvedValue(DEVICE),
    projectDeviceReceipt: vi.fn().mockResolvedValue(RECEIPT),
    splitConfigBatch: vi.fn().mockResolvedValue(splitResult),
    ...overrides,
  };
}

describe("IntakePanel — V1O-A batch flow", () => {
  it("multi-slice paste shows BatchSummaryView with per-slice cards", async () => {
    const user = userEvent.setup();
    const api = makeBatchApi(MULTI_RESULT);
    render(<IntakePanel api={api} />);

    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());
    await user.type(screen.getByLabelText("Config text"), "x");
    await user.click(screen.getByRole("button", { name: /Detect platform/i }));

    await waitFor(() =>
      expect(screen.getByLabelText("Batch summary")).toBeInTheDocument(),
    );
    expect(screen.getByText("slice-0")).toBeInTheDocument();
    expect(screen.getByText("slice-1")).toBeInTheDocument();
  });

  it("per-slice detection runs on render of batch view", async () => {
    const user = userEvent.setup();
    const api = makeBatchApi(MULTI_RESULT);
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());
    await user.type(screen.getByLabelText("Config text"), "x");
    await user.click(screen.getByRole("button", { name: /Detect platform/i }));

    await waitFor(() => {
      // 2 per-slice + 0 single = 2 calls to detect after split
      expect(api.detectConfigPlatform).toHaveBeenCalledTimes(2);
    });
  });

  it("drill-down triggers parse + project for the selected slice only", async () => {
    const user = userEvent.setup();
    const api = makeBatchApi(MULTI_RESULT);
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());
    await user.type(screen.getByLabelText("Config text"), "x");
    await user.click(screen.getByRole("button", { name: /Detect platform/i }));

    await waitFor(() =>
      expect(api.detectConfigPlatform).toHaveBeenCalledTimes(2),
    );

    await user.click(await screen.findByRole("button", { name: "Open slice-1" }));

    await user.click(screen.getByRole("button", { name: /Parse config/i }));

    await waitFor(() => {
      expect(api.parseDeviceConfig).toHaveBeenCalledTimes(1);
      const call = (api.parseDeviceConfig as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call?.[1]).toBe("set system host-name r2\nset interfaces ge-0/0/0\n");
    });
    await waitFor(() => expect(api.projectDeviceReceipt).toHaveBeenCalledTimes(1));
  });

  it("Back to batch returns from drilled view to batch summary", async () => {
    const user = userEvent.setup();
    const api = makeBatchApi(MULTI_RESULT);
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());
    await user.type(screen.getByLabelText("Config text"), "x");
    await user.click(screen.getByRole("button", { name: /Detect platform/i }));

    await user.click(await screen.findByRole("button", { name: "Open slice-0" }));
    expect(screen.getByLabelText("Drilled slice header")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to batch" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Batch summary")).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText("Drilled slice header")).toBeNull();
  });

  it("AmbiguousBoundary warning surfaces Treat-as-single-config button", async () => {
    const user = userEvent.setup();
    const api = makeBatchApi(AMBIGUOUS_RESULT);
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());
    await user.type(screen.getByLabelText("Config text"), "x");
    await user.click(screen.getByRole("button", { name: /Detect platform/i }));

    const btn = await screen.findByRole("button", {
      name: "Treat as single config",
    });
    await user.click(btn);
    // Returns to single-config flow with original text — batch chrome gone.
    await waitFor(() =>
      expect(screen.queryByLabelText("Batch summary")).toBeNull(),
    );
  });

  it("SingleConfig regression lock: never shows batch chrome", async () => {
    const user = userEvent.setup();
    const single: ConfigBatchSplitResult = {
      slices: [
        {
          slice_id: "slice-0",
          line_start: 1,
          line_end: 1,
          raw_text: "hostname r-solo\n",
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
    const api = makeBatchApi(single);
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());
    await user.type(screen.getByLabelText("Config text"), "hostname r1");
    await user.click(screen.getByRole("button", { name: /Detect platform/i }));

    // SingleConfig: detection runs once on the FULL text, not on slices.
    await waitFor(() =>
      expect(api.detectConfigPlatform).toHaveBeenCalledTimes(1),
    );
    expect(screen.queryByLabelText("Batch summary")).toBeNull();
    expect(screen.queryByLabelText("Drilled slice header")).toBeNull();
  });
});
