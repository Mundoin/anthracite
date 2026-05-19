import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DiscoveryMode, type DiscoveryApi } from "../DiscoveryMode";
import type {
  CommandExecutionResult,
  DiscoveryRunOutcome,
  DiscoveryRunPlan,
  DiscoveryRunReport,
  DiscoveryTarget,
  DiscoveryTargetValidation,
} from "../../../types/discoveryRunner";
import type {
  RawNeighborEvidenceImportRequest,
  RawNeighborEvidenceImportResult,
} from "../../../types/topology";

/**
 * V1BA — DiscoveryMode handoff section regression tests.
 *
 * Cover the UI contract: handoff appears only on captured, importable
 * candidates can be imported on explicit click, non-importable
 * candidates render a reason, import failure renders honest error.
 */

const VALID_TARGET: DiscoveryTarget = {
  host: "10.0.0.1",
  port: 22,
  username: "admin",
  platform_hint: "iosxe",
  transport: "ssh",
  data_source_label: "lab-spine-01",
};

const VALIDATION_OK: DiscoveryTargetValidation = {
  is_valid: true,
  issues: [],
};

const PLAN_READ_ONLY: DiscoveryRunPlan = {
  target: VALID_TARGET,
  dry_run: { commands: ["show lldp neighbors detail"] } as DiscoveryRunPlan["dry_run"],
  all_commands_read_only: true,
};

const IMPORT_OK_RESULT: RawNeighborEvidenceImportResult = {
  parsed_entries_total: 3,
  accepted_evidence_count: 2,
  rejected_count: 1,
  unresolved_count: 0,
  stored_evidence_count: 2,
  evidence_set_id: "es-001",
  accepted_evidence: [],
  rejected_entries: [],
};

function makeReport(outcome: DiscoveryRunOutcome): DiscoveryRunReport {
  return {
    target_label: VALID_TARGET.data_source_label,
    platform_hint: VALID_TARGET.platform_hint,
    planned_command_count: 1,
    outcome,
  };
}

function makeApi(
  capturedResults: CommandExecutionResult[],
  importOverride?: (
    req: RawNeighborEvidenceImportRequest,
  ) => Promise<RawNeighborEvidenceImportResult>,
): DiscoveryApi {
  return {
    validateDiscoveryTarget: vi.fn(async () => VALIDATION_OK),
    planDiscoveryRun: vi.fn(async () => PLAN_READ_ONLY),
    attemptDiscoveryRun: vi.fn(async () =>
      makeReport({ kind: "transport_deferred", reason: "deferred" }),
    ),
    executeDiscoveryRun: vi.fn(async () =>
      makeReport({ kind: "captured", command_results: capturedResults }),
    ),
    importTopologyNeighborOutput:
      importOverride ?? vi.fn(async () => IMPORT_OK_RESULT),
  };
}

async function runUntilCaptured(api: DiscoveryApi): Promise<void> {
  render(<DiscoveryMode api={api} />);
  fireEvent.change(screen.getByLabelText("Host"), {
    target: { value: VALID_TARGET.host },
  });
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
    target: { value: "secret" },
  });
  fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
  await waitFor(() =>
    expect(screen.getByTestId("discovery-ssh-captured")).toBeTruthy(),
  );
}

describe("DiscoveryMode — V1BA evidence handoff", () => {
  it("renders the handoff section after a captured outcome", async () => {
    const api = makeApi([
      {
        command: "show lldp neighbors detail",
        exit_code: 0,
        duration_ms: 8,
        stdout: "Local Intf: Gi0/1\n",
        stderr: "",
        output_truncated: false,
      },
    ]);
    await runUntilCaptured(api);
    expect(screen.getByTestId("discovery-handoff-plan")).toBeTruthy();
    expect(screen.getByTestId("discovery-handoff-counts").textContent).toContain(
      "Importable: 1",
    );
  });

  it("does NOT render handoff on auth_failed outcome", async () => {
    const api = makeApi([]);
    api.executeDiscoveryRun = vi.fn(async () =>
      makeReport({ kind: "auth_failed", reason_redacted: "rejected" }),
    );
    render(<DiscoveryMode api={api} />);
    fireEvent.change(screen.getByLabelText("Host"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "x" },
    });
    fireEvent.change(screen.getByLabelText("Data Source Label"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByTestId("discovery-validate-btn"));
    await waitFor(() => expect(screen.getByText("Valid")).toBeTruthy());
    fireEvent.click(screen.getByTestId("discovery-plan-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-plan-summary")).toBeTruthy(),
    );
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-auth-failed")).toBeTruthy(),
    );
    expect(screen.queryByTestId("discovery-handoff-plan")).toBeNull();
  });

  it("does NOT render handoff on connection_failed / timeout / command_failed", async () => {
    for (const outcome of [
      { kind: "connection_failed", reason_redacted: "unreachable" } as DiscoveryRunOutcome,
      { kind: "timeout", stage: "connect" } as DiscoveryRunOutcome,
      {
        kind: "command_failed",
        reason_redacted: "channel closed",
        partial_results: [],
      } as DiscoveryRunOutcome,
    ]) {
      const api = makeApi([]);
      api.executeDiscoveryRun = vi.fn(async () => makeReport(outcome));
      const view = render(<DiscoveryMode api={api} />);
      fireEvent.change(screen.getByLabelText("Host"), {
        target: { value: "x" },
      });
      fireEvent.change(screen.getByLabelText("Username"), {
        target: { value: "x" },
      });
      fireEvent.change(screen.getByLabelText("Data Source Label"), {
        target: { value: "x" },
      });
      fireEvent.click(screen.getByTestId("discovery-validate-btn"));
      await waitFor(() => expect(screen.getByText("Valid")).toBeTruthy());
      fireEvent.click(screen.getByTestId("discovery-plan-btn"));
      await waitFor(() =>
        expect(screen.getByTestId("discovery-plan-summary")).toBeTruthy(),
      );
      fireEvent.change(screen.getByTestId("discovery-credential-password"), {
        target: { value: "x" },
      });
      fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
      await waitFor(() =>
        expect(screen.getByTestId("discovery-run-outcome")).toBeTruthy(),
      );
      expect(screen.queryByTestId("discovery-handoff-plan")).toBeNull();
      view.unmount();
    }
  });

  it("Import button is disabled until environment id is provided", async () => {
    const api = makeApi([
      {
        command: "show lldp neighbors detail",
        exit_code: 0,
        duration_ms: 8,
        stdout: "Local Intf: Gi0/1\n",
        stderr: "",
        output_truncated: false,
      },
    ]);
    await runUntilCaptured(api);
    const importBtn = screen.getByTestId(
      "discovery-handoff-import-0",
    ) as HTMLButtonElement;
    expect(importBtn.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("discovery-handoff-env"), {
      target: { value: "apex-prod-emea" },
    });
    expect(importBtn.disabled).toBe(false);
  });

  it("clicking Import calls the import API and renders imported state", async () => {
    const importFn = vi.fn(async () => IMPORT_OK_RESULT);
    const api = makeApi(
      [
        {
          command: "show lldp neighbors detail",
          exit_code: 0,
          duration_ms: 8,
          stdout: "Local Intf: Gi0/1\n",
          stderr: "",
          output_truncated: false,
        },
      ],
      importFn,
    );
    await runUntilCaptured(api);
    fireEvent.change(screen.getByTestId("discovery-handoff-env"), {
      target: { value: "apex-prod-emea" },
    });
    fireEvent.click(screen.getByTestId("discovery-handoff-import-0"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-handoff-imported-0")).toBeTruthy(),
    );
    expect(importFn).toHaveBeenCalledTimes(1);
    const arg = importFn.mock.calls[0]?.[0];
    expect(arg?.environment_id).toBe("apex-prod-emea");
    expect(arg?.source_kind).toBe("lldp");
    expect(arg?.local_node).toBe("lab-spine-01");
    expect(arg?.raw_text).toBe("Local Intf: Gi0/1\n");
    expect(arg?.source_label).toContain("live_ssh_captured:lab-spine-01");
  });

  it("renders honest import failure when API throws", async () => {
    const api = makeApi(
      [
        {
          command: "show lldp neighbors detail",
          exit_code: 0,
          duration_ms: 8,
          stdout: "Local Intf: Gi0/1\n",
          stderr: "",
          output_truncated: false,
        },
      ],
      vi.fn(async () => {
        throw new Error("evidence store unavailable");
      }),
    );
    await runUntilCaptured(api);
    fireEvent.change(screen.getByTestId("discovery-handoff-env"), {
      target: { value: "apex-prod-emea" },
    });
    fireEvent.click(screen.getByTestId("discovery-handoff-import-0"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-handoff-failed-0")).toBeTruthy(),
    );
    expect(
      screen.getByTestId("discovery-handoff-failed-0").textContent,
    ).toContain("evidence store unavailable");
  });

  it("renders non-importable candidate with reason and no Import button", async () => {
    const api = makeApi([
      {
        command: "show version",
        exit_code: 0,
        duration_ms: 5,
        stdout: "Cisco IOS XE Software",
        stderr: "",
        output_truncated: false,
      },
    ]);
    await runUntilCaptured(api);
    expect(screen.getByTestId("discovery-handoff-candidate-0")).toBeTruthy();
    expect(screen.getByTestId("discovery-handoff-reason-0").textContent).toContain(
      "non_neighbour_command",
    );
    expect(screen.queryByTestId("discovery-handoff-import-0")).toBeNull();
    // No importable commands → empty hint shown
    expect(screen.getByTestId("discovery-handoff-empty")).toBeTruthy();
  });

  it("import does not fire without explicit operator click", async () => {
    const importFn = vi.fn(async () => IMPORT_OK_RESULT);
    const api = makeApi(
      [
        {
          command: "show lldp neighbors detail",
          exit_code: 0,
          duration_ms: 8,
          stdout: "Local Intf: Gi0/1\n",
          stderr: "",
          output_truncated: false,
        },
      ],
      importFn,
    );
    await runUntilCaptured(api);
    // Set env id (sufficient prerequisite) but DO NOT click.
    fireEvent.change(screen.getByTestId("discovery-handoff-env"), {
      target: { value: "apex-prod-emea" },
    });
    // Wait a tick.
    await Promise.resolve();
    expect(importFn).toHaveBeenCalledTimes(0);
    expect(screen.queryByTestId("discovery-handoff-imported-0")).toBeNull();
  });

  it("DOM never contains the operator's password in the handoff section", async () => {
    const SECRET = "very-unique-handoff-password-13579";
    const api = makeApi([
      {
        command: "show lldp neighbors detail",
        exit_code: 0,
        duration_ms: 8,
        stdout: "neighbour-data",
        stderr: "",
        output_truncated: false,
      },
    ]);
    render(<DiscoveryMode api={api} />);
    fireEvent.change(screen.getByLabelText("Host"), {
      target: { value: VALID_TARGET.host },
    });
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
      target: { value: SECRET },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-handoff-plan")).toBeTruthy(),
    );
    expect(document.body.innerHTML).not.toContain(SECRET);
  });
});
