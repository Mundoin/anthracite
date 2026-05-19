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
import { importTopologyNeighborOutput } from "../../api/topology";
import {
  buildEvidenceHandoff,
  buildImportRequest,
  type EvidenceHandoffCandidate,
} from "./sshEvidenceHandoff";
import "./DiscoveryMode.css";

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
}

export interface DiscoveryModeProps {
  readonly api?: DiscoveryApi;
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
    } catch (err: unknown) {
      setImportStatuses((prev) => ({
        ...prev,
        [index]: {
          kind: "failed",
          reason: err instanceof Error ? err.message : "Import failed",
        },
      }));
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
    try {
      const result = await api.attemptDiscoveryRun(buildTarget());
      setRunReport(result);
      setRunStatus("done");
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
    try {
      const result = await api.executeDiscoveryRun(buildTarget(), credentials);
      setRunReport(result);
      setRunStatus("done");
    } catch (err: unknown) {
      setRunFailureMessage(err instanceof Error ? err.message : "SSH run failed");
      setRunStatus("failed");
    } finally {
      // Hard invariant: credentials are scrubbed regardless of outcome.
      scrubCredentials();
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
            </section>
          )}
        </section>
    </div>
  );
}
