import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { JSX } from "react";
import { DiscoveryMode, type DiscoveryApi } from "../DiscoveryMode";
import type {
  CommandExecutionResult,
  DiscoveryRunPlan,
  DiscoveryRunReport,
  DiscoveryRunOutcome,
  DiscoveryTarget,
  DiscoveryTargetValidation,
  DiscoveryCredentials,
} from "../../../types/discoveryRunner";

/**
 * V1AZ SSH transport regression tests.
 *
 * Cover the credential UX + per-outcome rendering + the credential
 * scrub-on-complete invariant. Secrets must never appear in DOM,
 * accessible text, or aria attributes.
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
  dry_run: { commands: ["show version"] } as DiscoveryRunPlan["dry_run"],
  all_commands_read_only: true,
};

const PLAN_WRITES: DiscoveryRunPlan = {
  target: VALID_TARGET,
  dry_run: { commands: ["configure terminal"] } as DiscoveryRunPlan["dry_run"],
  all_commands_read_only: false,
};

function makeReport(outcome: DiscoveryRunOutcome): DiscoveryRunReport {
  return {
    target_label: VALID_TARGET.data_source_label,
    platform_hint: VALID_TARGET.platform_hint,
    planned_command_count: 1,
    outcome,
  };
}

function captured(results: CommandExecutionResult[]): DiscoveryRunReport {
  return makeReport({ kind: "captured", command_results: results });
}

function makeApi(overrides: Partial<DiscoveryApi> = {}): DiscoveryApi {
  return {
    validateDiscoveryTarget: vi.fn(async () => VALIDATION_OK),
    planDiscoveryRun: vi.fn(async () => PLAN_READ_ONLY),
    attemptDiscoveryRun: vi.fn(async () =>
      makeReport({ kind: "transport_deferred", reason: "deferred" }),
    ),
    executeDiscoveryRun: vi.fn(async () =>
      captured([
        {
          command: "show version",
          exit_code: 0,
          duration_ms: 42,
          stdout: "Cisco IOS XE Software, Version 17.6.1",
          stderr: "",
          output_truncated: false,
        },
      ]),
    ),
    ...overrides,
  };
}

async function fillFormAndPlan(api: DiscoveryApi): Promise<void> {
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
}

describe("DiscoveryMode — V1AZ SSH execution", () => {
  it("renders credential section after a read-only plan is ready", async () => {
    const api = makeApi();
    await fillFormAndPlan(api);
    expect(screen.getByTestId("discovery-credentials")).toBeTruthy();
    expect(screen.getByTestId("discovery-credential-password")).toBeTruthy();
  });

  it("does not render credential section when no plan exists", () => {
    render(<DiscoveryMode api={makeApi()} />);
    expect(screen.queryByTestId("discovery-credentials")).toBeNull();
  });

  it("does not render the SSH run path when plan has non-read-only commands", async () => {
    const api = makeApi({
      planDiscoveryRun: vi.fn(async () => PLAN_WRITES),
    });
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
    expect(screen.queryByTestId("discovery-credentials")).toBeNull();
    expect(screen.queryByTestId("discovery-ssh-run-btn")).toBeNull();
  });

  it("SSH run button is disabled until a password is entered", async () => {
    const api = makeApi();
    await fillFormAndPlan(api);
    const btn = screen.getByTestId("discovery-ssh-run-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: "secret123" },
    });
    expect(btn.disabled).toBe(false);
  });

  it("SSH run button enables when a private key is provided", async () => {
    const api = makeApi();
    await fillFormAndPlan(api);
    fireEvent.click(screen.getByTestId("discovery-credential-mode-key"));
    const btn = screen.getByTestId("discovery-ssh-run-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("discovery-credential-key"), {
      target: { value: "-----BEGIN OPENSSH PRIVATE KEY-----\nkkk\n-----END OPENSSH PRIVATE KEY-----" },
    });
    expect(btn.disabled).toBe(false);
  });

  it("renders captured output with handoff hint on Success outcome", async () => {
    const api = makeApi();
    await fillFormAndPlan(api);
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-captured")).toBeTruthy(),
    );
    expect(screen.getByTestId("discovery-ssh-handoff")).toBeTruthy();
    expect(screen.getByTestId("discovery-ssh-result-0")).toBeTruthy();
    expect(screen.getByTestId("discovery-ssh-result-0").textContent).toContain(
      "Cisco IOS XE",
    );
  });

  it("renders auth-failed panel without exposing credential bytes", async () => {
    const api = makeApi({
      executeDiscoveryRun: vi.fn(async () =>
        makeReport({ kind: "auth_failed", reason_redacted: "authentication rejected" }),
      ),
    });
    await fillFormAndPlan(api);
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: "topsecret-password-do-not-leak" },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-auth-failed")).toBeTruthy(),
    );
    expect(document.body.textContent).not.toContain(
      "topsecret-password-do-not-leak",
    );
  });

  it("renders connection-failed panel", async () => {
    const api = makeApi({
      executeDiscoveryRun: vi.fn(async () =>
        makeReport({
          kind: "connection_failed",
          reason_redacted: "host unreachable",
        }),
      ),
    });
    await fillFormAndPlan(api);
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-conn-failed")).toBeTruthy(),
    );
  });

  it("renders timeout panel with stage label", async () => {
    const api = makeApi({
      executeDiscoveryRun: vi.fn(async () =>
        makeReport({ kind: "timeout", stage: "connect" }),
      ),
    });
    await fillFormAndPlan(api);
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-timeout")).toBeTruthy(),
    );
    expect(screen.getByTestId("discovery-ssh-timeout").textContent).toContain(
      "connect",
    );
  });

  it("renders command-failed panel with partial results", async () => {
    const api = makeApi({
      executeDiscoveryRun: vi.fn(async () =>
        makeReport({
          kind: "command_failed",
          reason_redacted: "channel closed",
          partial_results: [
            {
              command: "show version",
              exit_code: 0,
              duration_ms: 10,
              stdout: "first ok",
              stderr: "",
              output_truncated: false,
            },
          ],
        }),
      ),
    });
    await fillFormAndPlan(api);
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-cmd-failed")).toBeTruthy(),
    );
    expect(screen.getByTestId("discovery-ssh-partial-0")).toBeTruthy();
  });

  it("renders truncation badge when output_truncated is true", async () => {
    const api = makeApi({
      executeDiscoveryRun: vi.fn(async () =>
        captured([
          {
            command: "show running",
            exit_code: 0,
            duration_ms: 100,
            stdout: "x".repeat(50),
            stderr: "",
            output_truncated: true,
          },
        ]),
      ),
    });
    await fillFormAndPlan(api);
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-trunc-0")).toBeTruthy(),
    );
  });

  it("scrubs the password from component state after execution completes (success)", async () => {
    const api = makeApi();
    await fillFormAndPlan(api);
    const passwordInput = screen.getByTestId(
      "discovery-credential-password",
    ) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "secret-scrub-me" } });
    expect(passwordInput.value).toBe("secret-scrub-me");
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-captured")).toBeTruthy(),
    );
    expect(passwordInput.value).toBe("");
  });

  it("scrubs the password from component state after execution failure", async () => {
    const api = makeApi({
      executeDiscoveryRun: vi.fn(async () =>
        makeReport({ kind: "auth_failed", reason_redacted: "rejected" }),
      ),
    });
    await fillFormAndPlan(api);
    const passwordInput = screen.getByTestId(
      "discovery-credential-password",
    ) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "fail-scrub-me" } });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-auth-failed")).toBeTruthy(),
    );
    expect(passwordInput.value).toBe("");
  });

  it("scrubs the private key after execution completes", async () => {
    const api = makeApi();
    await fillFormAndPlan(api);
    fireEvent.click(screen.getByTestId("discovery-credential-mode-key"));
    const keyArea = screen.getByTestId(
      "discovery-credential-key",
    ) as HTMLTextAreaElement;
    fireEvent.change(keyArea, {
      target: {
        value:
          "-----BEGIN OPENSSH PRIVATE KEY-----\nsecret-key-bytes\n-----END OPENSSH PRIVATE KEY-----",
      },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-captured")).toBeTruthy(),
    );
    expect(keyArea.value).toBe("");
  });

  it("rapid double-click does not fire two attempts", async () => {
    const exec = vi.fn(async () =>
      captured([
        {
          command: "show version",
          exit_code: 0,
          duration_ms: 5,
          stdout: "ok",
          stderr: "",
          output_truncated: false,
        },
      ]),
    );
    const api = makeApi({ executeDiscoveryRun: exec });
    await fillFormAndPlan(api);
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: "x" },
    });
    const btn = screen.getByTestId("discovery-ssh-run-btn");
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-captured")).toBeTruthy(),
    );
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it("never exposes the password in the rendered DOM, even on auth_failed", async () => {
    const SECRET = "very-unique-secret-bytes-12345";
    const api = makeApi({
      executeDiscoveryRun: vi.fn(async (_t: DiscoveryTarget, c: DiscoveryCredentials) => {
        // make sure the api received the secret (would be sent to Rust),
        // but the test asserts it is not in any rendered output.
        expect(c.auth.kind).toBe("password");
        return makeReport({
          kind: "auth_failed",
          reason_redacted: "authentication rejected",
        });
      }),
    });
    await fillFormAndPlan(api);
    fireEvent.change(screen.getByTestId("discovery-credential-password"), {
      target: { value: SECRET },
    });
    fireEvent.click(screen.getByTestId("discovery-ssh-run-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("discovery-ssh-auth-failed")).toBeTruthy(),
    );
    expect(document.body.innerHTML).not.toContain(SECRET);
  });
});
