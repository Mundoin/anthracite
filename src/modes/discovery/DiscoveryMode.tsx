/**
 * Discovery Mode — target validation, planning, deferred attempt, and
 * real read-only SSH execution.
 *
 * V1AX shipped the Validate -> Plan -> Attempt (transport-deferred) flow.
 * V1AZ adds a session-only credential form and a real SSH execution path
 * via `executeDiscoveryRun`. Credentials live in component state only,
 * are scrubbed after every attempt, and are cleared on unmount.
 *
 * Doctrine:
 *   - docs/architecture/DISCOVERY_FOUNDATION_V1.md (V1AX)
 *   - docs/architecture/SSH_TRANSPORT_V1_CONTRACT.md (V1AZ)
 */

import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  DiscoveryRunPlan,
  DiscoveryRunReport,
  DiscoveryTarget,
  DiscoveryTargetValidation,
  DiscoveryCredentials,
  CommandExecutionResult,
  ServerKeyPin,
  ServerKeyPinStatus,
} from "../../types/discoveryRunner";
import type { LiveCollectionPlatform } from "../../types/liveCollection";
import type {
  RawNeighborEvidenceImportRequest,
  RawNeighborEvidenceImportResult,
} from "../../types/topology";
import {
  attemptDiscoveryRun,
  executeDiscoveryRun,
  planDiscoveryRun,
  validateDiscoveryTarget,
} from "../../api/discoveryRunner";
import { getServerKeyPin, pinServerKey } from "../../api/serverKey";
import { importTopologyNeighborOutput } from "../../api/topology";
import {
  buildEvidenceHandoff,
  buildImportRequest,
  type EvidenceHandoffCandidate,
} from "./sshEvidenceHandoff";
import {
  buildFieldReceipt,
  importDoneSummary,
  importFailedSummary,
  toReceiptJSON,
  toReceiptMarkdown,
  type FieldReceiptImportSummary,
} from "./sshFieldReceipt";
import {
  buildSshFieldValidationPack,
  toValidationPackMarkdown,
} from "./sshFieldValidationPack";
import "./DiscoveryMode.css";

export interface DiscoveryClock {
  /** Returns an ISO 8601 timestamp. Injectable for tests. */
  readonly now: () => string;
}

const DEFAULT_CLOCK: DiscoveryClock = {
  now: () => new Date().toISOString(),
};

export interface DiscoveryClipboard {
  readonly writeText: (text: string) => Promise<void>;
}

const DEFAULT_CLIPBOARD: DiscoveryClipboard = {
  writeText: async (text) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  },
};

export interface DiscoveryApi {
  readonly validateDiscoveryTarget: (
    target: DiscoveryTarget,
  ) => Promise<DiscoveryTargetValidation>;
  readonly planDiscoveryRun: (
    target: DiscoveryTarget,
  ) => Promise<DiscoveryRunPlan>;
  readonly attemptDiscoveryRun: (
    target: DiscoveryTarget,
  ) => Promise<DiscoveryRunReport>;
  readonly executeDiscoveryRun: (
    target: DiscoveryTarget,
    credentials: DiscoveryCredentials,
  ) => Promise<DiscoveryRunReport>;
  readonly importTopologyNeighborOutput: (
    request: RawNeighborEvidenceImportRequest,
  ) => Promise<RawNeighborEvidenceImportResult>;
  readonly getServerKeyPin: (host: string, port: number) => Promise<ServerKeyPin | null>;
  readonly pinServerKey: (
    host: string,
    port: number,
    algorithm: string,
    fingerprint_sha256: string,
    pinned_at: string,
  ) => Promise<ServerKeyPin>;
}

export interface DiscoveryModeProps {
  readonly api?: DiscoveryApi;
  /** Injectable clock for deterministic field-receipt timestamps in tests. */
  readonly clock?: DiscoveryClock;
  /** Injectable clipboard for testing the Copy buttons. */
  readonly clipboard?: DiscoveryClipboard;
}

const PLATFORMS: readonly LiveCollectionPlatform[] = [
  "iosxe",
  "nxos",
  "iosxr",
  "eos",
  "junos",
  "huawei_vrp",
  "nokia_sros",
  "fortios",
  "mikrotik",
];

const DEFAULT_API: DiscoveryApi = {
  validateDiscoveryTarget,
  planDiscoveryRun,
  attemptDiscoveryRun,
  executeDiscoveryRun,
  importTopologyNeighborOutput,
  getServerKeyPin,
  pinServerKey,
};

type ImportStatus =
  | { kind: "idle" }
  | { kind: "importing" }
  | { kind: "done"; result: RawNeighborEvidenceImportResult }
  | { kind: "failed"; reason: string };

type PlanStatus = "idle" | "planning" | "ready" | "failed";
type RunStatus = "idle" | "attempting" | "executing" | "done" | "failed";
type CredentialMode = "password" | "private_key";

export function DiscoveryMode({
  api = DEFAULT_API,
  clock = DEFAULT_CLOCK,
  clipboard = DEFAULT_CLIPBOARD,
}: DiscoveryModeProps): JSX.Element {
  // Target form
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [platformHint, setPlatformHint] = useState<LiveCollectionPlatform>("iosxe");
  const [dataSourceLabel, setDataSourceLabel] = useState("");

  // Validation / plan / run state
  const [validationResult, setValidationResult] =
    useState<DiscoveryTargetValidation | null>(null);
  const [plan, setPlan] = useState<DiscoveryRunPlan | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus>("idle");
  const [planFailureMessage, setPlanFailureMessage] = useState("");
  const [runReport, setRunReport] = useState<DiscoveryRunReport | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [runFailureMessage, setRunFailureMessage] = useState("");

  // Session-only credential state.
  // INVARIANTS:
  //  - Never persisted anywhere.
  //  - Cleared immediately after every SSH attempt (success or failure).
  //  - Cleared on unmount.
  //  - Never rendered into JSX or attributes.
  const [credentialMode, setCredentialMode] = useState<CredentialMode>("password");
  const [password, setPassword] = useState("");
  const [privateKeyPem, setPrivateKeyPem] = useState("");
  const [passphrase, setPassphrase] = useState("");

  // V1BA — evidence handoff state.
  // Per-candidate import status is keyed by candidate index. Operator
  // can override the local-node label per candidate before import.
  const [handoffEnvId, setHandoffEnvId] = useState("");
  const [handoffLocalNodes, setHandoffLocalNodes] = useState<Record<number, string>>({});
  const [importStatuses, setImportStatuses] = useState<Record<number, ImportStatus>>({});

  // V1BB — field-receipt state.
  // Append-only chronological log of explicit operator import attempts.
  // Receipt view is rendered when a run report exists; copy buttons
  // call the injectable clipboard.
  const [importSummaries, setImportSummaries] = useState<
    ReadonlyArray<FieldReceiptImportSummary>
  >([]);
  const [receiptCopied, setReceiptCopied] = useState<"none" | "markdown" | "json">("none");
  const [validationPackCopied, setValidationPackCopied] = useState(false);

  // V1BD — server-key pin state.
  // Loaded after each run; cleared when host/port changes.
  const [serverKeyPin, setServerKeyPin] = useState<ServerKeyPin | null>(null);
  const [pinning, setPinning] = useState(false);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    return () => {
      // Defense in depth: scrub on unmount.
      setPassword("");
      setPrivateKeyPem("");
      setPassphrase("");
    };
  }, []);

  const buildTarget = (): DiscoveryTarget => ({
    host,
    port: parseInt(port, 10) || 22,
    username,
    platform_hint: platformHint,
    transport: "ssh",
    data_source_label: dataSourceLabel,
  });

  // V1BA — compute the evidence-handoff plan from the captured outcome.
  // Memoised on (runReport, target.platform_hint, target.data_source_label,
  // target.host) so per-render churn does not re-classify commands.
  const handoffPlan = useMemo(() => {
    if (!runReport) return null;
    return buildEvidenceHandoff(buildTarget(), runReport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runReport, platformHint, dataSourceLabel, host]);

  const handleImportCandidate = async (
    candidate: EvidenceHandoffCandidate,
    index: number,
  ): Promise<void> => {
    const local = handoffLocalNodes[index] ?? null;
    const request = buildImportRequest(candidate, handoffEnvId, local, null);
    if (request === null) return;
    setImportStatuses((prev) => ({ ...prev, [index]: { kind: "importing" } }));
    try {
      const result = await api.importTopologyNeighborOutput(request);
      setImportStatuses((prev) => ({
        ...prev,
        [index]: { kind: "done", result },
      }));
      setImportSummaries((prev) => [
        ...prev,
        importDoneSummary(candidate.command, result),
      ]);
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : "Import failed";
      setImportStatuses((prev) => ({
        ...prev,
        [index]: { kind: "failed", reason },
      }));
      setImportSummaries((prev) => [
        ...prev,
        importFailedSummary(candidate.command, reason),
      ]);
    }
  };

  // Approved commands list extracted from the V1AT-generated plan so
  // the receipt records what the operator authorised the runner to
  // attempt, regardless of which ones returned data.
  const approvedCommands: ReadonlyArray<string> = useMemo(() => {
    const dryRun = plan?.dry_run as { readonly commands?: ReadonlyArray<unknown> } | undefined;
    if (!dryRun || !Array.isArray(dryRun.commands)) return [];
    const out: string[] = [];
    for (const entry of dryRun.commands) {
      if (typeof entry === "string") {
        out.push(entry);
      } else if (entry && typeof entry === "object" && "command" in entry) {
        const c = (entry as { command: unknown }).command;
        if (typeof c === "string") out.push(c);
      }
    }
    return out;
  }, [plan]);

  const fieldReceipt = useMemo(() => {
    if (runReport === null) return null;
    return buildFieldReceipt({
      target: buildTarget(),
      approved_commands: approvedCommands,
      report: runReport,
      handoff: handoffPlan,
      imports: importSummaries,
      generated_at: clock.now(),
      server_key_pin: serverKeyPin,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    runReport,
    handoffPlan,
    importSummaries,
    approvedCommands,
    serverKeyPin,
    host,
    port,
    username,
    platformHint,
    dataSourceLabel,
    clock,
  ]);

  const receiptJson = useMemo(
    () => (fieldReceipt ? toReceiptJSON(fieldReceipt) : ""),
    [fieldReceipt],
  );
  const receiptMarkdown = useMemo(
    () => (fieldReceipt ? toReceiptMarkdown(fieldReceipt) : ""),
    [fieldReceipt],
  );

  const validationPack = useMemo(
    () =>
      buildSshFieldValidationPack({
        target: buildTarget(),
        report: runReport,
        serverKeyPin,
        handoff: handoffPlan,
        imports: importSummaries,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runReport, serverKeyPin, handoffPlan, importSummaries, host, port, platformHint, dataSourceLabel],
  );
  const validationPackMd = useMemo(
    () => toValidationPackMarkdown(validationPack),
    [validationPack],
  );

  const handleCopyValidationPack = async (): Promise<void> => {
    if (validationPackMd.length === 0) return;
    try {
      await clipboard.writeText(validationPackMd);
      setValidationPackCopied(true);
    } catch {
      setValidationPackCopied(false);
    }
  };

  const handleCopyReceipt = async (
    format: "markdown" | "json",
  ): Promise<void> => {
    const text = format === "markdown" ? receiptMarkdown : receiptJson;
    if (text.length === 0) return;
    try {
      await clipboard.writeText(text);
      setReceiptCopied(format);
    } catch {
      // Surfaces visually as no "Copied" indicator. Intentional —
      // a failed clipboard write should not crash the receipt view.
      setReceiptCopied("none");
    }
  };

  const buildCredentials = (): DiscoveryCredentials | null => {
    if (credentialMode === "password") {
      if (password.length === 0) return null;
      return { auth: { kind: "password", password } };
    }
    if (privateKeyPem.length === 0) return null;
    return {
      auth: {
        kind: "private_key",
        private_key_pem: privateKeyPem,
        passphrase: passphrase.length === 0 ? null : passphrase,
      },
    };
  };

  const scrubCredentials = (): void => {
    setPassword("");
    setPrivateKeyPem("");
    setPassphrase("");
  };

  const handleValidate = async (): Promise<void> => {
    const target = buildTarget();
    const result = await api.validateDiscoveryTarget(target);
    setValidationResult(result);
  };

  const handlePlan = async (): Promise<void> => {
    if (!validationResult?.is_valid) return;
    setPlanStatus("planning");
    setPlanFailureMessage("");
    setPlan(null);
    try {
      const result = await api.planDiscoveryRun(buildTarget());
      setPlan(result);
      setPlanStatus("ready");
    } catch (err: unknown) {
      setPlanFailureMessage(err instanceof Error ? err.message : "Plan failed");
      setPlanStatus("failed");
    }
  };

  const handleAttemptRun = async (): Promise<void> => {
    if (!plan || !plan.all_commands_read_only) return;
    setRunStatus("attempting");
    setRunFailureMessage("");
    setRunReport(null);
    setServerKeyPin(null);
    setPinError("");
    try {
      const target = buildTarget();
      const result = await api.attemptDiscoveryRun(target);
      setRunReport(result);
      setRunStatus("done");
      try {
        const pin = await api.getServerKeyPin(target.host, target.port);
        setServerKeyPin(pin);
      } catch {
        // Pin fetch is best-effort; UI degrades to "unavailable".
      }
    } catch (err: unknown) {
      setRunFailureMessage(err instanceof Error ? err.message : "Run failed");
      setRunStatus("failed");
    }
  };

  const handleSshRun = async (): Promise<void> => {
    if (!plan || !plan.all_commands_read_only) return;
    const credentials = buildCredentials();
    if (credentials === null) return;
    setRunStatus("executing");
    setRunFailureMessage("");
    setRunReport(null);
    setServerKeyPin(null);
    setPinError("");
    try {
      const target = buildTarget();
      const result = await api.executeDiscoveryRun(target, credentials);
      setRunReport(result);
      setRunStatus("done");
      try {
        const pin = await api.getServerKeyPin(target.host, target.port);
        setServerKeyPin(pin);
      } catch {
        // Pin fetch is best-effort; UI degrades to "unavailable".
      }
    } catch (err: unknown) {
      setRunFailureMessage(err instanceof Error ? err.message : "SSH run failed");
      setRunStatus("failed");
    } finally {
      // Hard invariant: credentials are scrubbed regardless of outcome.
      scrubCredentials();
    }
  };

  const handlePinKey = async (): Promise<void> => {
    const sk = runReport?.server_key;
    if (!sk) return;
    setPinning(true);
    setPinError("");
    try {
      const target = buildTarget();
      const pin = await api.pinServerKey(
        target.host,
        target.port,
        sk.algorithm,
        sk.fingerprint_sha256,
        clock.now(),
      );
      setServerKeyPin(pin);
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : "Pin failed");
    } finally {
      setPinning(false);
    }
  };

  const isValidationValid = validationResult?.is_valid ?? false;
  const isEmpty = !host && !username && !dataSourceLabel;
  const canSshRun =
    !!plan &&
    plan.all_commands_read_only &&
    runStatus !== "executing" &&
    ((credentialMode === "password" && password.length > 0) ||
      (credentialMode === "private_key" && privateKeyPem.length > 0));

  return (
    <div className="discovery-mode">
      <header className="dx-header">
        <h2 className="dx-title">Discovery</h2>
        <p className="dx-tagline">
          Define a target, validate, plan, then attempt a read-only discovery run.
        </p>
      </header>

      {isEmpty && (
        <section
          className="dx-body dx-body--empty"
          role="status"
          aria-label="Discovery empty"
          data-testid="dx-empty"
        >
          <p>
            Define a target, validate, plan, then attempt a read-only discovery run.
          </p>
        </section>
      )}
        <section className="dx-body" data-testid="dx-form">
          <div className="dx-form">
            <div className="form-group">
              <label htmlFor="dx-host">Host</label>
              <input
                id="dx-host"
                type="text"
                value={host}
                onChange={(e) => setHost(e.currentTarget.value)}
                placeholder="192.168.1.1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="dx-port">Port</label>
              <input
                id="dx-port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.currentTarget.value)}
                min="1"
                max="65535"
              />
            </div>

            <div className="form-group">
              <label htmlFor="dx-username">Username</label>
              <input
                id="dx-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                placeholder="admin"
              />
            </div>

            <div className="form-group">
              <label htmlFor="dx-platform">Platform</label>
              <select
                id="dx-platform"
                value={platformHint}
                onChange={(e) =>
                  setPlatformHint(e.currentTarget.value as LiveCollectionPlatform)
                }
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dx-transport">Transport</label>
              <input id="dx-transport" type="text" value="SSH" disabled readOnly />
            </div>

            <div className="form-group">
              <label htmlFor="dx-label">Data Source Label</label>
              <input
                id="dx-label"
                type="text"
                value={dataSourceLabel}
                onChange={(e) => setDataSourceLabel(e.currentTarget.value)}
                placeholder="e.g., lab-edge-1"
              />
            </div>
          </div>

          <div className="dx-actions">
            <button
              type="button"
              onClick={handleValidate}
              data-testid="discovery-validate-btn"
            >
              Validate
            </button>
          </div>

          {validationResult && (
            <section className="dx-validation" data-testid="discovery-validation">
              {validationResult.is_valid ? (
                <div className="dx-badge dx-badge--valid">Valid</div>
              ) : (
                <div className="dx-issues" data-testid="discovery-issues">
                  <h3>Issues:</h3>
                  <ul>
                    {validationResult.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {isValidationValid && (
            <div className="dx-actions">
              <button
                type="button"
                onClick={handlePlan}
                disabled={planStatus === "planning"}
                data-testid="discovery-plan-btn"
              >
                {planStatus === "planning" ? "Planning..." : "Plan"}
              </button>
            </div>
          )}

          {planStatus === "failed" && (
            <section className="dx-error" data-testid="discovery-plan-error">
              <p>Plan failed: {planFailureMessage}</p>
            </section>
          )}

          {plan && (
            <section className="dx-plan-summary" data-testid="discovery-plan-summary">
              <h3>Plan Summary</h3>
              <div
                className={
                  plan.all_commands_read_only
                    ? "dx-badge dx-badge--read-only"
                    : "dx-badge dx-badge--write"
                }
              >
                {plan.all_commands_read_only ? "Read-only" : "Has writes"}
              </div>
            </section>
          )}

          {plan && plan.all_commands_read_only && (
            <div className="dx-actions">
              <button
                type="button"
                onClick={handleAttemptRun}
                disabled={runStatus === "attempting" || runStatus === "executing"}
                data-testid="discovery-attempt-btn"
              >
                {runStatus === "attempting" ? "Running..." : "Attempt Run"}
              </button>
            </div>
          )}

          {plan && plan.all_commands_read_only && (
            <section className="dx-credentials" data-testid="discovery-credentials">
              <h3>Credentials (session only)</h3>
              <p className="dx-credentials-note">
                Held in memory only for this run. Never saved, never logged.
              </p>
              <div className="dx-credential-tabs">
                <button
                  type="button"
                  className={
                    credentialMode === "password"
                      ? "dx-tab dx-tab--active"
                      : "dx-tab"
                  }
                  onClick={() => setCredentialMode("password")}
                  data-testid="discovery-credential-mode-password"
                >
                  Password
                </button>
                <button
                  type="button"
                  className={
                    credentialMode === "private_key"
                      ? "dx-tab dx-tab--active"
                      : "dx-tab"
                  }
                  onClick={() => setCredentialMode("private_key")}
                  data-testid="discovery-credential-mode-key"
                >
                  Private key
                </button>
              </div>

              {credentialMode === "password" ? (
                <div className="form-group">
                  <label htmlFor="dx-password">Password</label>
                  <input
                    id="dx-password"
                    type="password"
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    data-testid="discovery-credential-password"
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="dx-key">Private key (PEM)</label>
                    <textarea
                      id="dx-key"
                      rows={6}
                      value={privateKeyPem}
                      onChange={(e) => setPrivateKeyPem(e.currentTarget.value)}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      data-testid="discovery-credential-key"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dx-passphrase">Passphrase (optional)</label>
                    <input
                      id="dx-passphrase"
                      type="password"
                      autoComplete="off"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.currentTarget.value)}
                      data-testid="discovery-credential-passphrase"
                    />
                  </div>
                </>
              )}

              <div className="dx-actions">
                <button
                  type="button"
                  onClick={handleSshRun}
                  disabled={!canSshRun}
                  data-testid="discovery-ssh-run-btn"
                >
                  {runStatus === "executing" ? "Running SSH..." : "Run via SSH"}
                </button>
              </div>
            </section>
          )}

          {runStatus === "failed" && (
            <section className="dx-error" data-testid="discovery-run-error">
              <p>Run failed: {runFailureMessage}</p>
            </section>
          )}

          <section
            className="dx-validation-pack"
            data-testid="discovery-validation-pack"
            aria-label="Field validation pack"
          >
            <h3>Field Validation Pack</h3>
            <dl className="dx-vpack-grid">
              <dt>Target</dt>
              <dd data-testid="discovery-vpack-target">{validationPack.target_identity}</dd>
              <dt>Platform</dt>
              <dd data-testid="discovery-vpack-platform">{validationPack.platform_hint}</dd>
              <dt>Run outcome</dt>
              <dd data-testid="discovery-vpack-outcome">
                <code>{validationPack.run_outcome ?? "no run"}</code>
              </dd>
              <dt>Server key</dt>
              <dd data-testid="discovery-vpack-key">
                {validationPack.server_key_observed ? (
                  <>
                    <code>{validationPack.server_key_algorithm}</code>{" "}
                    <code>{validationPack.server_key_fingerprint}</code>
                  </>
                ) : (
                  "not observed"
                )}
              </dd>
              {validationPack.server_key_observed && (
                <>
                  <dt>Pin status</dt>
                  <dd data-testid="discovery-vpack-pin-status">
                    <code>{validationPack.server_key_pin_status}</code>
                  </dd>
                </>
              )}
              <dt>Importable candidates</dt>
              <dd data-testid="discovery-vpack-importable">
                {validationPack.importable_candidate_count}
              </dd>
              <dt>Imports</dt>
              <dd data-testid="discovery-vpack-imports">
                {validationPack.import_success_count} done ·{" "}
                {validationPack.import_failure_count} failed
              </dd>
            </dl>

            <div
              className="dx-vpack-next-action"
              data-testid="discovery-vpack-next-action"
            >
              <strong>Next: </strong>
              <code>{validationPack.next_action}</code>
              {" — "}
              {validationPack.next_action_detail}
            </div>

            <div className="dx-actions">
              <button
                type="button"
                onClick={() => void handleCopyValidationPack()}
                data-testid="discovery-vpack-copy-btn"
              >
                {validationPackCopied ? "Copied (Markdown)" : "Copy Validation Pack"}
              </button>
            </div>

            <details className="dx-receipt-preview">
              <summary>Preview (Markdown)</summary>
              <pre
                className="dx-receipt-md"
                data-testid="discovery-vpack-md-preview"
              >
                {validationPackMd}
              </pre>
            </details>
          </section>

          {runReport && (
            <section className="dx-run-outcome" data-testid="discovery-run-outcome">
              <h3>Run Outcome</h3>
              <p>Target: {runReport.target_label}</p>
              <p>Platform: {runReport.platform_hint}</p>
              <p>Planned command count: {runReport.planned_command_count}</p>

              {runReport.outcome.kind === "transport_deferred" && (
                <div className="dx-deferred" data-testid="discovery-deferred">
                  <p className="dx-badge dx-badge--deferred">Transport Deferred</p>
                  <p className="dx-reason">{runReport.outcome.reason}</p>
                </div>
              )}

              {runReport.outcome.kind === "refused" && (
                <div className="dx-refused" data-testid="discovery-refused">
                  <p className="dx-badge dx-badge--refused">Refused</p>
                  <p className="dx-reason">{runReport.outcome.reason}</p>
                </div>
              )}

              {runReport.outcome.kind === "captured" && (
                <div className="dx-captured" data-testid="discovery-ssh-captured">
                  <p className="dx-badge dx-badge--captured">
                    Captured (live_ssh_captured)
                  </p>
                  <p className="dx-handoff" data-testid="discovery-ssh-handoff">
                    Next: import via Topology Evidence Import to attach this
                    raw output to the managed evidence store.
                  </p>
                  <ol className="dx-results">
                    {runReport.outcome.command_results.map(
                      (cr: CommandExecutionResult, i: number) => (
                        <li
                          key={`${i}:${cr.command}`}
                          className="dx-result"
                          data-testid={`discovery-ssh-result-${i}`}
                        >
                          <div className="dx-result-head">
                            <code>{cr.command}</code>
                            <span className="dx-result-exit">
                              exit={cr.exit_code ?? "?"}
                            </span>
                            <span className="dx-result-dur">
                              {cr.duration_ms} ms
                            </span>
                            {cr.output_truncated && (
                              <span
                                className="dx-result-trunc"
                                data-testid={`discovery-ssh-trunc-${i}`}
                              >
                                Output truncated
                              </span>
                            )}
                          </div>
                          <pre className="dx-stdout">{cr.stdout}</pre>
                          {cr.stderr.length > 0 && (
                            <pre className="dx-stderr">{cr.stderr}</pre>
                          )}
                        </li>
                      ),
                    )}
                  </ol>

                  {handoffPlan && handoffPlan.candidates.length > 0 && (
                    <section
                      className="dx-handoff-plan"
                      data-testid="discovery-handoff-plan"
                      aria-label="Evidence handoff plan"
                    >
                      <h3>Evidence handoff</h3>
                      <p className="dx-handoff-note">
                        Captured output is raw evidence, not verified
                        topology. Importing flows raw text through the
                        existing V1AP / V1AQ raw-import path; nothing is
                        mutated until you click <em>Import</em>.
                      </p>
                      <p data-testid="discovery-handoff-counts">
                        Importable: {handoffPlan.importable_count} ·
                        Not importable: {handoffPlan.not_importable_count}
                      </p>
                      <div className="form-group">
                        <label htmlFor="dx-handoff-env">Environment ID</label>
                        <input
                          id="dx-handoff-env"
                          type="text"
                          value={handoffEnvId}
                          onChange={(e) => setHandoffEnvId(e.currentTarget.value)}
                          placeholder="apex-prod-emea"
                          data-testid="discovery-handoff-env"
                        />
                      </div>
                      <ol className="dx-handoff-list">
                        {handoffPlan.candidates.map((c, i) => {
                          const status: ImportStatus =
                            importStatuses[i] ?? { kind: "idle" };
                          const localNode = handoffLocalNodes[i] ?? c.local_node_default;
                          const canImport =
                            c.importable &&
                            handoffEnvId.trim().length > 0 &&
                            localNode.trim().length > 0 &&
                            status.kind !== "importing" &&
                            status.kind !== "done";
                          return (
                            <li
                              key={`${i}:${c.command}`}
                              className={
                                c.importable
                                  ? "dx-handoff-row dx-handoff-row--importable"
                                  : "dx-handoff-row dx-handoff-row--non-importable"
                              }
                              data-testid={`discovery-handoff-candidate-${i}`}
                            >
                              <div className="dx-handoff-head">
                                <code>{c.command}</code>
                                <span
                                  className={
                                    c.importable
                                      ? "dx-handoff-badge dx-handoff-badge--importable"
                                      : "dx-handoff-badge dx-handoff-badge--non-importable"
                                  }
                                  data-testid={`discovery-handoff-kind-${i}`}
                                >
                                  {c.source_kind}
                                </span>
                              </div>
                              {!c.importable && c.reason !== null && (
                                <p
                                  className="dx-handoff-reason"
                                  data-testid={`discovery-handoff-reason-${i}`}
                                >
                                  Not importable: {c.reason}
                                </p>
                              )}
                              {c.importable && (
                                <>
                                  <div className="form-group">
                                    <label htmlFor={`dx-handoff-local-${i}`}>
                                      Local node
                                    </label>
                                    <input
                                      id={`dx-handoff-local-${i}`}
                                      type="text"
                                      value={localNode}
                                      onChange={(e) =>
                                        setHandoffLocalNodes((prev) => ({
                                          ...prev,
                                          [i]: e.currentTarget.value,
                                        }))
                                      }
                                      data-testid={`discovery-handoff-local-${i}`}
                                    />
                                  </div>
                                  <p
                                    className="dx-handoff-source-label"
                                    data-testid={`discovery-handoff-source-label-${i}`}
                                  >
                                    Source label: <code>{c.source_label}</code>
                                  </p>
                                  <div className="dx-actions">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleImportCandidate(c, i)
                                      }
                                      disabled={!canImport}
                                      data-testid={`discovery-handoff-import-${i}`}
                                    >
                                      {status.kind === "importing"
                                        ? "Importing..."
                                        : status.kind === "done"
                                          ? "Imported"
                                          : "Import"}
                                    </button>
                                  </div>
                                  {status.kind === "done" && (
                                    <div
                                      className="dx-handoff-imported"
                                      data-testid={`discovery-handoff-imported-${i}`}
                                    >
                                      <p>
                                        Accepted: {status.result.accepted_evidence_count}{" "}
                                        · Rejected: {status.result.rejected_count} ·
                                        Stored: {status.result.stored_evidence_count}
                                      </p>
                                      {status.result.evidence_set_id !== null && (
                                        <p>
                                          Evidence set:{" "}
                                          <code>
                                            {status.result.evidence_set_id}
                                          </code>
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {status.kind === "failed" && (
                                    <div
                                      className="dx-handoff-failed"
                                      data-testid={`discovery-handoff-failed-${i}`}
                                    >
                                      <p>Import failed: {status.reason}</p>
                                    </div>
                                  )}
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                      {handoffPlan.importable_count === 0 && (
                        <p
                          className="dx-handoff-empty"
                          data-testid="discovery-handoff-empty"
                        >
                          No commands in this capture map to a known
                          neighbour-evidence importer (LLDP / CDP). Review
                          the captured output, but no import is available.
                        </p>
                      )}
                    </section>
                  )}
                </div>
              )}

              {runReport.outcome.kind === "auth_failed" && (
                <div
                  className="dx-auth-failed"
                  data-testid="discovery-ssh-auth-failed"
                >
                  <p className="dx-badge dx-badge--auth-failed">Auth Failed</p>
                  <p className="dx-reason">{runReport.outcome.reason_redacted}</p>
                </div>
              )}

              {runReport.outcome.kind === "connection_failed" && (
                <div
                  className="dx-conn-failed"
                  data-testid="discovery-ssh-conn-failed"
                >
                  <p className="dx-badge dx-badge--conn-failed">
                    Connection Failed
                  </p>
                  <p className="dx-reason">{runReport.outcome.reason_redacted}</p>
                </div>
              )}

              {runReport.outcome.kind === "timeout" && (
                <div className="dx-timeout" data-testid="discovery-ssh-timeout">
                  <p className="dx-badge dx-badge--timeout">Timeout</p>
                  <p className="dx-reason">stage: {runReport.outcome.stage}</p>
                </div>
              )}

              {runReport.outcome.kind === "command_failed" && (
                <div
                  className="dx-cmd-failed"
                  data-testid="discovery-ssh-cmd-failed"
                >
                  <p className="dx-badge dx-badge--cmd-failed">Command Failed</p>
                  <p className="dx-reason">{runReport.outcome.reason_redacted}</p>
                  <ol className="dx-results">
                    {runReport.outcome.partial_results.map(
                      (cr: CommandExecutionResult, i: number) => (
                        <li
                          key={`${i}:${cr.command}`}
                          className="dx-result"
                          data-testid={`discovery-ssh-partial-${i}`}
                        >
                          <code>{cr.command}</code>
                          <pre className="dx-stdout">{cr.stdout}</pre>
                          {cr.stderr.length > 0 && (
                            <pre className="dx-stderr">{cr.stderr}</pre>
                          )}
                        </li>
                      ),
                    )}
                  </ol>
                </div>
              )}

              <section
                className="dx-server-key"
                data-testid="discovery-server-key"
                aria-label="Server key trust"
              >
                <h3>Server key trust</h3>
                {runReport.server_key ? (
                  <>
                    <p data-testid="discovery-server-key-observed">
                      Server key observed.
                    </p>
                    <dl className="dx-server-key-grid">
                      <dt>Algorithm</dt>
                      <dd data-testid="discovery-server-key-algorithm">
                        <code>{runReport.server_key.algorithm}</code>
                      </dd>
                      <dt>Fingerprint (SHA256)</dt>
                      <dd data-testid="discovery-server-key-fingerprint">
                        <code>{runReport.server_key.fingerprint_sha256}</code>
                      </dd>
                      <dt>Trust mode</dt>
                      <dd data-testid="discovery-server-key-trust-mode">
                        <code>{runReport.server_key.trust_mode}</code>
                      </dd>
                      <dt>Pin status</dt>
                      <dd data-testid="discovery-server-key-pin-status">
                        <code>
                          {((): ServerKeyPinStatus => {
                            if (!serverKeyPin) return "unpinned";
                            if (
                              serverKeyPin.fingerprint_sha256 ===
                                runReport.server_key!.fingerprint_sha256 &&
                              serverKeyPin.algorithm ===
                                runReport.server_key!.algorithm
                            )
                              return "matched";
                            return "changed";
                          })()}
                        </code>
                      </dd>
                    </dl>
                    {serverKeyPin &&
                      serverKeyPin.fingerprint_sha256 !==
                        runReport.server_key.fingerprint_sha256 && (
                        <p
                          className="dx-server-key-warn"
                          data-testid="discovery-server-key-changed-warning"
                        >
                          WARNING: fingerprint differs from stored pin.
                          Investigate before trusting this host.
                        </p>
                      )}
                    <p
                      className="dx-server-key-note"
                      data-testid="discovery-server-key-note"
                    >
                      TOFU session only — fingerprint observed for this
                      attempt and not persisted to known_hosts.
                    </p>
                    <div className="dx-actions">
                      <button
                        type="button"
                        onClick={() => void handlePinKey()}
                        disabled={pinning}
                        data-testid="discovery-server-key-pin-button"
                      >
                        {pinning ? "Pinning…" : "Pin this key"}
                      </button>
                    </div>
                    {pinError && (
                      <p
                        className="dx-error"
                        data-testid="discovery-server-key-pin-error"
                      >
                        {pinError}
                      </p>
                    )}
                  </>
                ) : (
                  <p
                    className="dx-server-key-note"
                    data-testid="discovery-server-key-absent"
                  >
                    No server key observed for this attempt (transport
                    stopped before the handshake).
                  </p>
                )}
              </section>

              {fieldReceipt && (
                <section
                  className="dx-receipt"
                  data-testid="discovery-receipt"
                  aria-label="Field smoke receipt"
                >
                  <h3>Field smoke receipt</h3>
                  <p className="dx-receipt-note">
                    Sanitized receipt of this SSH run + any operator
                    import attempts. Raw stdout / stderr and all
                    credential bytes are omitted. Safe to paste into
                    a ticket or chat.
                  </p>
                  <div className="dx-actions">
                    <button
                      type="button"
                      onClick={() => void handleCopyReceipt("markdown")}
                      data-testid="discovery-receipt-copy-md"
                    >
                      {receiptCopied === "markdown" ? "Copied (Markdown)" : "Copy Markdown"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyReceipt("json")}
                      data-testid="discovery-receipt-copy-json"
                    >
                      {receiptCopied === "json" ? "Copied (JSON)" : "Copy JSON"}
                    </button>
                  </div>
                  <details className="dx-receipt-preview">
                    <summary>Preview (Markdown)</summary>
                    <pre
                      className="dx-receipt-md"
                      data-testid="discovery-receipt-md"
                    >
                      {receiptMarkdown}
                    </pre>
                  </details>
                  <details className="dx-receipt-preview">
                    <summary>Preview (JSON)</summary>
                    <pre
                      className="dx-receipt-json"
                      data-testid="discovery-receipt-json"
                    >
                      {receiptJson}
                    </pre>
                  </details>
                </section>
              )}
            </section>
          )}
        </section>
    </div>
  );
}
