import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  DiscoveryMode,
  type DiscoveryApi,
  type DiscoveryClipboard,
  type DiscoveryClock,
} from "../DiscoveryMode";
import type {
  CommandExecutionResult,
  DiscoveryRunOutcome,
  DiscoveryRunPlan,
  DiscoveryRunReport,
  DiscoveryTarget,
  DiscoveryTargetValidation,
  ServerKeyObservation,
  ServerKeyPin,
} from "../../../types/discoveryRunner";
import type {
  RawNeighborEvidenceImportRequest,
  RawNeighborEvidenceImportResult,
} from "../../../types/topology";

const VALID_TARGET: DiscoveryTarget = {
  host: "10.0.0.1",
  port: 22,
  username: "admin",
  platform_hint: "iosxe",
  transport: "ssh",
  data_source_label: "lab-spine-01",
};
const VALIDATION_OK: DiscoveryTargetValidation = { is_valid: true, issues: [] };
const PLAN_READ_ONLY: DiscoveryRunPlan = {
  target: VALID_TARGET,
  dry_run: {
    commands: [
      { command: "show lldp neighbors detail" },
      { command: "show version" },
    ],
  } as DiscoveryRunPlan["dry_run"],
  all_commands_read_only: true,
};
const IMPORT_OK: RawNeighborEvidenceImportResult = {
  parsed_entries_total: 3,
  accepted_evidence_count: 2,
  rejected_count: 1,
  unresolved_count: 0,
  stored_evidence_count: 2,
  evidence_set_id: "es-001",
  accepted_evidence: [],
  rejected_entries: [],
};
const PINNED_TS = "2026-05-19T13:00:00.000Z";

function makeReport(
  outcome: DiscoveryRunOutcome,
  server_key: ServerKeyObservation | null = null,
): DiscoveryRunReport {
  return {
    target_label: VALID_TARGET.data_source_label,
    platform_hint: VALID_TARGET.platform_hint,
    planned_command_count: 2,
    outcome,
    server_key,
  };
}

const OBSERVED_KEY: ServerKeyObservation = {
  algorithm: "ssh-ed25519",
  fingerprint_sha256: "SHA256:ui-test-fingerprint",
  trust_mode: "tofu_session",
};
function cr(
  command: string,
  stdout: string,
  truncated = false,
): CommandExecutionResult {
  return {
    command,
    exit_code: 0,
    duration_ms: 5,
    stdout,
    stderr: "",
    output_truncated: truncated,
  };
}

function makeApi(
  outcome: DiscoveryRunOutcome,
  importOverride?: (
    req: RawNeighborEvidenceImportRequest,
  ) => Promise<RawNeighborEvidenceImportResult>,
  server_key: ServerKeyObservation | null = null,
  storedPin: ServerKeyPin | null = null,
): DiscoveryApi {
  return {
    validateDiscoveryTarget: vi.fn(async () => VALIDATION_OK),
    planDiscoveryRun: vi.fn(async () => PLAN_READ_ONLY),
    attemptDiscoveryRun: vi.fn(async () =>
      makeReport({ kind: "transport_deferred", reason: "deferred" }),
    ),
    executeDiscoveryRun: vi.fn(async () => makeReport(outcome, server_key)),
    importTopologyNeighborOutput:
      importOverride ?? vi.fn(async () => IMPORT_OK),
    getServerKeyPin: vi.fn(async () => storedPin),
    pinServerKey: vi.fn(async (_host, _port, algorithm, fingerprint_sha256, pinned_at) => ({
      algorithm,
      fingerprint_sha256,
      first_seen_at: pinned_at,
      last_seen_at: pinned_at,
    })),
  };
}

function makeClock(): DiscoveryClock {
  return { now: () => PINNED_TS };
}
function makeClipboard(): DiscoveryClipboard & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    writeText: async (t: string) => {
      calls.push(t);
    },
  };
}

async function runUntilCaptured(api: DiscoveryApi, clip: DiscoveryClipboard, clock: DiscoveryClock): Promise<void> {
  render(<DiscoveryMode api={api} clock={clock} clipboard={clip} />);
  fireEvent.change(screen.getByLabelText("Host"), { target: { value: VALID_TARGET.host } });
  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: VALID_TARGET.username },
  });
  fireEvent.change(screen.getByLabelText("Data Source Label"), {
    target: { value: VALID_TARGET.data_source_label },
  });
  fireEvent.click(screen.getByTestId("discovery-validate-btn"));
  await waitFor(() => expect(screen.getByText("Valid")).toBeTruthy());
  fireEvent.click(screen.getByTestId("discovery-plan-btn"));
  await waitFor(() =>
    expect(screen.getByTestId("discovery-plan-summary")).toBeTruthy(),
  );
  fireEvent.change(screen.getByTestId("discovery-credential-password"), {
    target: { value: "secret-DO-NOT-LEAK" },
  });
  fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
  await waitFor(() =>
    expect(screen.getByTestId("discovery-run-outcome")).toBeTruthy(),
  );
}

describe("DiscoveryMode — V1BB field smoke receipt", () => {
  it("renders the receipt section for a captured outcome", async () => {
    const api = makeApi({
      kind: "captured",
      command_results: [cr("show lldp neighbors detail", "RAW-LLDP-OUTPUT-XYZ")],
    });
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    expect(screen.getByTestId("discovery-receipt")).toBeTruthy();
    expect(screen.getByTestId("discovery-receipt-md")).toBeTruthy();
    expect(screen.getByTestId("discovery-receipt-json")).toBeTruthy();
  });

  it.each<DiscoveryRunOutcome>([
    { kind: "auth_failed", reason_redacted: "rejected" },
    { kind: "connection_failed", reason_redacted: "unreachable" },
    { kind: "timeout", stage: "connect" },
    {
      kind: "command_failed",
      reason_redacted: "channel closed",
      partial_results: [],
    },
  ])("renders the receipt for failure outcome %j", async (outcome) => {
    const api = makeApi(outcome);
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    expect(screen.getByTestId("discovery-receipt")).toBeTruthy();
    expect(screen.getByTestId("discovery-receipt-md").textContent).toContain(
      outcome.kind,
    );
  });

  it("receipt never contains raw command stdout text", async () => {
    const SENSITIVE = "RAW-LLDP-OUTPUT-XYZ-987";
    const api = makeApi({
      kind: "captured",
      command_results: [cr("show lldp neighbors detail", SENSITIVE)],
    });
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    const md = screen.getByTestId("discovery-receipt-md").textContent ?? "";
    const json = screen.getByTestId("discovery-receipt-json").textContent ?? "";
    expect(md).not.toContain(SENSITIVE);
    expect(json).not.toContain(SENSITIVE);
  });

  it("receipt never contains the operator's password, even on failure", async () => {
    const PASSWORD = "secret-DO-NOT-LEAK";
    const api = makeApi({
      kind: "auth_failed",
      reason_redacted: "authentication rejected",
    });
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    const md = screen.getByTestId("discovery-receipt-md").textContent ?? "";
    const json = screen.getByTestId("discovery-receipt-json").textContent ?? "";
    expect(md).not.toContain(PASSWORD);
    expect(json).not.toContain(PASSWORD);
  });

  it("Copy Markdown button writes the markdown receipt to the injected clipboard", async () => {
    const api = makeApi({
      kind: "captured",
      command_results: [cr("show lldp neighbors detail", "data")],
    });
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    fireEvent.click(screen.getByTestId("discovery-receipt-copy-md"));
    await waitFor(() =>
      expect(
        screen.getByTestId("discovery-receipt-copy-md").textContent,
      ).toContain("Copied"),
    );
    expect(clip.calls).toHaveLength(1);
    expect(clip.calls[0]).toContain("# SSH Field Smoke Receipt");
    expect(clip.calls[0]).toContain("lab-spine-01");
  });

  it("Copy JSON button writes the JSON receipt to the injected clipboard", async () => {
    const api = makeApi({
      kind: "captured",
      command_results: [cr("show lldp neighbors detail", "data")],
    });
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    fireEvent.click(screen.getByTestId("discovery-receipt-copy-json"));
    await waitFor(() =>
      expect(
        screen.getByTestId("discovery-receipt-copy-json").textContent,
      ).toContain("Copied"),
    );
    expect(clip.calls[0]).toMatch(/^\{/);
    expect(clip.calls[0]).toContain('"schema_version"');
    expect(clip.calls[0]).toContain(PINNED_TS);
  });

  it("receipt records done + failed import attempts in the imports section", async () => {
    // First import: success. Second: failure.
    const calls: number[] = [];
    let n = 0;
    const importFn = vi.fn(async () => {
      n += 1;
      calls.push(n);
      if (n === 1) return IMPORT_OK;
      throw new Error("evidence store offline");
    });
    const api = makeApi(
      {
        kind: "captured",
        command_results: [
          cr("show lldp neighbors detail", "ok-lldp"),
          cr("show cdp neighbors detail", "ok-cdp"),
        ],
      },
      importFn,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    fireEvent.change(screen.getByTestId("discovery-handoff-env"), {
      target: { value: "apex-prod-emea" },
    });
    fireEvent.click(screen.getByTestId("discovery-handoff-import-0"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-handoff-imported-0")).toBeTruthy(),
    );
    fireEvent.click(screen.getByTestId("discovery-handoff-import-1"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-handoff-failed-1")).toBeTruthy(),
    );
    const md = screen.getByTestId("discovery-receipt-md").textContent ?? "";
    expect(md).toContain("show lldp neighbors detail");
    expect(md).toContain("show cdp neighbors detail");
    expect(md).toContain("es-001");
    expect(md).toContain("evidence store offline");
  });

  it("receipt is deterministic for the same input + injected clock", async () => {
    const api1 = makeApi({
      kind: "captured",
      command_results: [cr("show lldp neighbors detail", "data")],
    });
    const clock1 = makeClock();
    const clip1 = makeClipboard();
    const view1 = render(<DiscoveryMode api={api1} clock={clock1} clipboard={clip1} />);
    fireEvent.change(screen.getByLabelText("Host"), { target: { value: VALID_TARGET.host } });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: VALID_TARGET.username } });
    fireEvent.change(screen.getByLabelText("Data Source Label"), {
      target: { value: VALID_TARGET.data_source_label },
    });
    fireEvent.click(screen.getByTestId("discovery-validate-btn"));
    await waitFor(() => expect(screen.getByText("Valid")).toBeTruthy());
    fireEvent.click(screen.getByTestId("discovery-plan-btn"));
    await waitFor(() => expect(screen.getByTestId("discovery-plan-summary")).toBeTruthy());
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() => expect(screen.getByTestId("discovery-receipt-md")).toBeTruthy());
    const md1 = screen.getByTestId("discovery-receipt-md").textContent ?? "";
    view1.unmount();

    // Second identical run.
    const api2 = makeApi({
      kind: "captured",
      command_results: [cr("show lldp neighbors detail", "data")],
    });
    render(<DiscoveryMode api={api2} clock={makeClock()} clipboard={makeClipboard()} />);
    fireEvent.change(screen.getByLabelText("Host"), { target: { value: VALID_TARGET.host } });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: VALID_TARGET.username } });
    fireEvent.change(screen.getByLabelText("Data Source Label"), {
      target: { value: VALID_TARGET.data_source_label },
    });
    fireEvent.click(screen.getByTestId("discovery-validate-btn"));
    await waitFor(() => expect(screen.getByText("Valid")).toBeTruthy());
    fireEvent.click(screen.getByTestId("discovery-plan-btn"));
    await waitFor(() => expect(screen.getByTestId("discovery-plan-summary")).toBeTruthy());
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() => expect(screen.getByTestId("discovery-receipt-md")).toBeTruthy());
    const md2 = screen.getByTestId("discovery-receipt-md").textContent ?? "";
    expect(md1).toBe(md2);
  });

  it("V1BA no-click-no-import behavior is unchanged: receipt has zero imports until operator clicks Import", async () => {
    const importFn = vi.fn(async () => IMPORT_OK);
    const api = makeApi(
      {
        kind: "captured",
        command_results: [cr("show lldp neighbors detail", "data")],
      },
      importFn,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    fireEvent.change(screen.getByTestId("discovery-handoff-env"), {
      target: { value: "apex-prod-emea" },
    });
    // Set env id alone, but DO NOT click Import. Receipt must show no imports.
    await Promise.resolve();
    expect(importFn).toHaveBeenCalledTimes(0);
    const md = screen.getByTestId("discovery-receipt-md").textContent ?? "";
    expect(md).toContain("_(no operator import attempts recorded)_");
  });
});

describe("DiscoveryMode — V1BC server key trust", () => {
  it("captured run with observed key shows algorithm + fingerprint + trust mode", async () => {
    const api = makeApi(
      {
        kind: "captured",
        command_results: [cr("show lldp neighbors detail", "data")],
      },
      undefined,
      OBSERVED_KEY,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    expect(screen.getByTestId("discovery-server-key-observed")).toBeTruthy();
    expect(
      screen.getByTestId("discovery-server-key-algorithm").textContent,
    ).toContain("ssh-ed25519");
    expect(
      screen.getByTestId("discovery-server-key-fingerprint").textContent,
    ).toContain("SHA256:ui-test-fingerprint");
    expect(
      screen.getByTestId("discovery-server-key-trust-mode").textContent,
    ).toContain("tofu_session");
    expect(
      screen.getByTestId("discovery-server-key-note").textContent,
    ).toMatch(/TOFU/);
  });

  it("auth_failed with observed key still renders fingerprint", async () => {
    const api = makeApi(
      { kind: "auth_failed", reason_redacted: "authentication rejected" },
      undefined,
      OBSERVED_KEY,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    expect(
      screen.getByTestId("discovery-server-key-fingerprint").textContent,
    ).toContain("SHA256:ui-test-fingerprint");
  });

  it("connection_failed with no observed key shows honest absent message", async () => {
    const api = makeApi(
      { kind: "connection_failed", reason_redacted: "host unreachable" },
      undefined,
      null,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    expect(screen.getByTestId("discovery-server-key-absent")).toBeTruthy();
    expect(screen.queryByTestId("discovery-server-key-fingerprint")).toBeNull();
  });

  it("receipt Markdown carries the fingerprint when observed", async () => {
    const api = makeApi(
      {
        kind: "captured",
        command_results: [cr("show lldp neighbors detail", "data")],
      },
      undefined,
      OBSERVED_KEY,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    const md = screen.getByTestId("discovery-receipt-md").textContent ?? "";
    expect(md).toContain("SHA256:ui-test-fingerprint");
    expect(md).toContain("tofu_session");
    expect(md).toContain("ssh-ed25519");
  });

  it("DOM never contains operator password even when server key is shown", async () => {
    const api = makeApi(
      {
        kind: "captured",
        command_results: [cr("show lldp neighbors detail", "data")],
      },
      undefined,
      OBSERVED_KEY,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    expect(screen.getByTestId("discovery-server-key-observed")).toBeTruthy();
    // runUntilCaptured types this password into the credential input.
    expect(document.body.innerHTML).not.toContain("secret-DO-NOT-LEAK");
  });
});

const STORED_PIN: ServerKeyPin = {
  algorithm: "ssh-ed25519",
  fingerprint_sha256: "SHA256:ui-test-fingerprint",
  first_seen_at: "2026-05-19T00:00:00.000Z",
  last_seen_at: "2026-05-19T00:00:00.000Z",
};

describe("DiscoveryMode — V1BD server key pinning", () => {
  it("no stored pin → pin status shows unpinned", async () => {
    const api = makeApi(
      { kind: "captured", command_results: [cr("show lldp neighbors detail", "data")] },
      undefined,
      OBSERVED_KEY,
      null,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    await waitFor(() => {
      expect(screen.getByTestId("discovery-server-key-pin-status").textContent).toContain(
        "unpinned",
      );
    });
  });

  it("stored pin with matching fingerprint → pin status shows matched", async () => {
    const api = makeApi(
      { kind: "captured", command_results: [cr("show lldp neighbors detail", "data")] },
      undefined,
      OBSERVED_KEY,
      STORED_PIN,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    await waitFor(() => {
      expect(screen.getByTestId("discovery-server-key-pin-status").textContent).toContain(
        "matched",
      );
    });
  });

  it("stored pin with different fingerprint → pin status shows changed + warning", async () => {
    const changedPin: ServerKeyPin = {
      ...STORED_PIN,
      fingerprint_sha256: "SHA256:old-different-fingerprint",
    };
    const api = makeApi(
      { kind: "captured", command_results: [cr("show lldp neighbors detail", "data")] },
      undefined,
      OBSERVED_KEY,
      changedPin,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    await waitFor(() => {
      expect(screen.getByTestId("discovery-server-key-pin-status").textContent).toContain(
        "changed",
      );
      expect(screen.getByTestId("discovery-server-key-changed-warning")).toBeTruthy();
    });
  });

  it("Pin this key button is present when server key observed", async () => {
    const api = makeApi(
      { kind: "captured", command_results: [cr("show lldp neighbors detail", "data")] },
      undefined,
      OBSERVED_KEY,
      null,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    expect(screen.getByTestId("discovery-server-key-pin-button")).toBeTruthy();
  });

  it("clicking Pin this key calls pinServerKey and updates status to matched", async () => {
    const api = makeApi(
      { kind: "captured", command_results: [cr("show lldp neighbors detail", "data")] },
      undefined,
      OBSERVED_KEY,
      null,
    );
    const clock = makeClock();
    const clip = makeClipboard();
    await runUntilCaptured(api, clip, clock);
    fireEvent.click(screen.getByTestId("discovery-server-key-pin-button"));
    await waitFor(() => {
      expect(api.pinServerKey).toHaveBeenCalledWith(
        VALID_TARGET.host,
        VALID_TARGET.port,
        OBSERVED_KEY.algorithm,
        OBSERVED_KEY.fingerprint_sha256,
        PINNED_TS,
      );
      expect(screen.getByTestId("discovery-server-key-pin-status").textContent).toContain(
        "matched",
      );
    });
  });
});
