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

const DETECTION: ConfigDetectionResult = {
  best_match: CISCO_REF,
  candidates: [
    {
      platform_id: "cisco-iosxe",
      score: 12.5,
      normalized_score: 0.95,
      match_count: 8,
      distinct_signature_count: 5,
    },
  ],
  evidence: [],
  confidence: 0.95,
  warnings: [],
  scanned_line_count: 50,
  total_line_count: 50,
};

const DEVICE = { identity: { hostname: "r1" } } as unknown as DeviceModel;
const RECEIPT = {
  hostname: "r1",
  platform_id: "cisco-iosxe",
  os_version: "17.6.4",
  source: null,
  source_kind: null,
  byte_size: 64,
  line_count: 4,
  parser_version: "cisco-iosxe-v3",
  registry_version: "reg-v1",
  score: 0.92,
  coverage_ratio: 1,
  parsed_line_count: 4,
  unknown_line_count: 0,
  observed_maturity: "l2topology",
  areas: [],
  warnings: [],
  unknowns: [],
  unknowns_truncated: false,
} as unknown as ReceiptView;

function makeSingleConfigSplit(text: string): ConfigBatchSplitResult {
  return {
    slices: [
      {
        slice_id: "slice-0",
        line_start: 1,
        line_end: 1,
        raw_text: text,
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
}

function makeApi(overrides: Partial<IntakeApi> = {}): IntakeApi {
  return {
    listVendorPlatforms: vi.fn().mockResolvedValue(PLATFORMS),
    detectConfigPlatform: vi.fn().mockResolvedValue(DETECTION),
    parseDeviceConfig: vi.fn().mockResolvedValue(DEVICE),
    projectDeviceReceipt: vi.fn().mockResolvedValue(RECEIPT),
    splitConfigBatch: vi.fn((text: string) =>
      Promise.resolve(makeSingleConfigSplit(text)),
    ),
    ...overrides,
  };
}

describe("IntakePanel end-to-end (mocked)", () => {
  it("paste -> detect -> parse -> receipt", async () => {
    const user = userEvent.setup();
    const api = makeApi();
    render(<IntakePanel api={api} />);

    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await user.type(
      screen.getByLabelText("Config text"),
      "hostname r1",
    );

    await user.click(screen.getByRole("button", { name: /Detect platform/i }));

    await waitFor(() =>
      expect(api.detectConfigPlatform).toHaveBeenCalledWith("hostname r1"),
    );
    await waitFor(() =>
      expect(screen.getAllByText("cisco-iosxe").length).toBeGreaterThan(0),
    );

    await user.click(screen.getByRole("button", { name: /Parse config/i }));

    await waitFor(() =>
      expect(api.parseDeviceConfig).toHaveBeenCalledWith(CISCO_REF, "hostname r1"),
    );
    await waitFor(() =>
      expect(api.projectDeviceReceipt).toHaveBeenCalledWith(DEVICE),
    );
    await waitFor(() =>
      expect(screen.getByText(/cisco-iosxe-v3/)).toBeInTheDocument(),
    );
  });

  it("manual override sends the chosen platform to parseDeviceConfig", async () => {
    const user = userEvent.setup();
    const api = makeApi();
    render(<IntakePanel api={api} />);

    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await user.type(screen.getByLabelText("Config text"), "x");
    await user.click(screen.getByRole("button", { name: /Detect platform/i }));
    await waitFor(() => expect(api.detectConfigPlatform).toHaveBeenCalled());

    await user.click(
      await screen.findByRole("button", { name: "Select juniper-junos" }),
    );

    await user.click(screen.getByRole("button", { name: /Parse config/i }));

    await waitFor(() => {
      const callRef = (api.parseDeviceConfig as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(callRef?.platform_id).toBe("juniper-junos");
    });
  });

  it("surfaces a detection error in the parse status area", async () => {
    const user = userEvent.setup();
    const api = makeApi({
      detectConfigPlatform: vi.fn().mockRejectedValue(new Error("engine down")),
    });
    render(<IntakePanel api={api} />);

    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await user.type(screen.getByLabelText("Config text"), "x");
    await user.click(screen.getByRole("button", { name: /Detect platform/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("engine down"),
    );
  });
});
