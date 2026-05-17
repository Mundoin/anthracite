/**
 * V1Q IntakePanel × BatchRun end-to-end integration tests.
 *
 * Walks the panel through a multi-device batch via mocked
 * Tauri API, clicks Analyse batch, asserts per-row state
 * transitions and drill-down read-from-store behaviour.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ConfigBatchSplitResult } from "../../../types/configBatch";
import type { ConfigDetectionResult } from "../../../types/configDetection";
import type { DeviceModel, PlatformRef } from "../../../types/networkModel";
import type { ReceiptView } from "../../../types/receipt";
import type {
  Finding,
  Severity,
  ValidationReport,
} from "../../../types/validator";
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

function reportWith(severities: ReadonlyArray<Severity>): ValidationReport {
  const findings: ReadonlyArray<Finding> = severities.map((sev, i) => ({
    finding_key: `R-${i}:a:b=${i}`,
    rule_id: `R-${i}`,
    rule_version: 1,
    severity: sev,
    signal: "hard",
    title: `t${i}`,
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
      parser_version: "v3",
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

function makeApi(overrides: Partial<IntakeApi> = {}): IntakeApi {
  return {
    listVendorPlatforms: vi.fn().mockResolvedValue(PLATFORMS),
    detectConfigPlatform: vi.fn().mockResolvedValue(DETECTION),
    parseDeviceConfig: vi.fn().mockResolvedValue(DEVICE),
    projectDeviceReceipt: vi.fn().mockResolvedValue(RECEIPT),
    splitConfigBatch: vi.fn().mockResolvedValue(MULTI_SPLIT),
    archiveIntake: vi.fn(),
    validateDeviceModel: vi.fn().mockResolvedValue(reportWith(["high"])),
    ...overrides,
  };
}

async function gotoBatchSummary(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.type(screen.getByLabelText("Config text"), "x");
  await user.click(
    screen.getByRole("button", { name: /Detect platform/i }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Batch summary")).toBeInTheDocument(),
  );
}

describe("IntakePanel × V1Q BatchRun", () => {
  it("paste multi-device → Analyse batch → all rows complete → RunSummaryStrip totals correct", async () => {
    const user = userEvent.setup();
    const api = makeApi();
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await gotoBatchSummary(user);

    // Pre-Analyse: Re-run button absent, Analyse visible.
    expect(
      screen.getByRole("button", { name: "Analyse batch" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Re-run analysis" }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Analyse batch" }));

    await waitFor(() =>
      expect(api.parseDeviceConfig).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(api.validateDeviceModel).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Re-run analysis" }),
      ).toBeInTheDocument(),
    );
    // Summary verbatim inside the strip (the section header carries
    // its own "BATCH SUMMARY · 2 devices" copy; scope to the strip).
    const strip = screen.getByLabelText("Batch run summary");
    expect(strip.textContent).toContain("2 devices");
    expect(strip.textContent).toContain("2 parsed");
    expect(strip.textContent).toContain("0 failed");
  });

  it("drill-down after Analyse uses stored results (no re-parse, no re-validate)", async () => {
    const user = userEvent.setup();
    const api = makeApi();
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await gotoBatchSummary(user);
    await user.click(screen.getByRole("button", { name: "Analyse batch" }));
    await waitFor(() =>
      expect(api.validateDeviceModel).toHaveBeenCalledTimes(2),
    );

    await user.click(
      await screen.findByRole("button", { name: "Open slice-0" }),
    );

    // V1P-A workspace renders with stored Findings + Receipt; no
    // additional parse / validate call beyond the 2-per-device run.
    expect(
      await screen.findByLabelText("Validation findings"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Parse receipt")).toBeInTheDocument();
    expect(api.parseDeviceConfig).toHaveBeenCalledTimes(2);
    expect(api.validateDeviceModel).toHaveBeenCalledTimes(2);
  });

  it("Re-run analysis fires parse + validate again per device", async () => {
    const user = userEvent.setup();
    const api = makeApi();
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await gotoBatchSummary(user);
    await user.click(screen.getByRole("button", { name: "Analyse batch" }));
    await waitFor(() =>
      expect(api.validateDeviceModel).toHaveBeenCalledTimes(2),
    );

    await user.click(screen.getByRole("button", { name: "Re-run analysis" }));
    await waitFor(() =>
      expect(api.parseDeviceConfig).toHaveBeenCalledTimes(4),
    );
    await waitFor(() =>
      expect(api.validateDeviceModel).toHaveBeenCalledTimes(4),
    );
  });

  it("one device fails parse → row shows failed: parse; RunSummaryStrip shows 1 failed", async () => {
    const user = userEvent.setup();
    const parseDeviceConfig = vi
      .fn()
      .mockImplementation((platform: PlatformRef, text: string) => {
        if (text.includes("hostname r2")) {
          return Promise.reject(new Error("parse broken"));
        }
        return Promise.resolve(DEVICE);
      });
    const api = makeApi({ parseDeviceConfig });
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await gotoBatchSummary(user);
    await user.click(screen.getByRole("button", { name: "Analyse batch" }));

    await waitFor(() => expect(screen.getByText("1 failed")).toBeInTheDocument());
    expect(screen.getByLabelText("failed: parse")).toBeInTheDocument();
  });

  it("Copy JSON writes deterministic export to clipboard and shows copied feedback", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const api = makeApi();
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await gotoBatchSummary(user);
    await user.click(screen.getByRole("button", { name: "Analyse batch" }));
    await waitFor(() =>
      expect(api.validateDeviceModel).toHaveBeenCalledTimes(2),
    );

    await user.click(await screen.findByRole("button", { name: "Copy JSON" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const exported = String(writeText.mock.calls[0][0]);
    expect(exported).toContain('"kind": "batch_run_export"');
    expect(exported).not.toContain("hostname r1");
    expect(screen.getByRole("status", { name: "Export copied" })).toHaveTextContent(
      "copied JSON",
    );
  });

  it("Copy Markdown reports clipboard failure without leaving the batch surface", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("clipboard denied")),
      },
    });
    const api = makeApi();
    render(<IntakePanel api={api} />);
    await waitFor(() => expect(api.listVendorPlatforms).toHaveBeenCalled());

    await gotoBatchSummary(user);
    await user.click(screen.getByRole("button", { name: "Analyse batch" }));
    await waitFor(() =>
      expect(api.validateDeviceModel).toHaveBeenCalledTimes(2),
    );

    await user.click(
      await screen.findByRole("button", { name: "Copy Markdown" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "failed Markdown: clipboard denied",
      ),
    );
    expect(screen.getByLabelText("Batch summary")).toBeInTheDocument();
  });

  // ClearAll mid-run is covered at the reducer level in
  // intakeReducer.batchRun.test.ts "BatchRunCancelled removes
  // batchRun entirely". The integration path is intentionally not
  // exercised here because the batch-summary view hides the
  // ConfigInputArea (and its Clear button) — clearing in the live
  // app happens via Treat-as-single-config OR by opening a fresh
  // archive / pasting new input through the workspace overlay.

  // Manual override + Re-run flow:
  //   - Override storage on the BatchRunDevice is locked at the
  //     reducer level in intakeReducer.batchRun.test.ts
  //     ("BatchRunReRunRequested preserves selected_platform +
  //     is_manual_override per device").
  //   - The runBatch orchestrator's "manual override device parses
  //     with overridden platform_ref" test in runBatch.test.ts
  //     locks the orchestrator's argument-passing.
  //   - Integration via clicking through drill-down → override →
  //     Back-to-batch → Re-run hits a brief intermediate state
  //     (one device pending, others complete, status in_progress
  //     per prompt §6.2 derivation) that hides the Re-run button
  //     until the orchestrator re-fires. The split-coverage above
  //     captures the binding behaviour without testing the
  //     intermediate render.
});
