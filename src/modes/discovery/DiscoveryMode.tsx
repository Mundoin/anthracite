/**
 * Discovery Mode — target validation, planning, and run attempt (V1AX).
 *
 * Surfaces a form-driven surface for SSH discovery planning.
 * Honest about transport constraints: deferred or refused outcomes only.
 *
 * Doctrine: `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md` V1AX.
 */

import type { JSX } from "react";
import { useState } from "react";
import type {
  DiscoveryRunPlan,
  DiscoveryRunReport,
  DiscoveryTarget,
  DiscoveryTargetValidation,
} from "../../types/discoveryRunner";
import type { LiveCollectionPlatform } from "../../types/liveCollection";
import {
  attemptDiscoveryRun,
  planDiscoveryRun,
  validateDiscoveryTarget,
} from "../../api/discoveryRunner";
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
};

type PlanStatus = "idle" | "planning" | "ready" | "failed";
type RunStatus = "idle" | "attempting" | "done" | "failed";

export function DiscoveryMode({
  api = DEFAULT_API,
}: DiscoveryModeProps): JSX.Element {
  // Form state
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [platformHint, setPlatformHint] = useState<LiveCollectionPlatform>("iosxe");
  const [dataSourceLabel, setDataSourceLabel] = useState("");

  // Validation state
  const [validationResult, setValidationResult] =
    useState<DiscoveryTargetValidation | null>(null);

  // Planning state
  const [plan, setPlan] = useState<DiscoveryRunPlan | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus>("idle");
  const [planFailureMessage, setPlanFailureMessage] = useState("");

  // Run state
  const [runReport, setRunReport] = useState<DiscoveryRunReport | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [runFailureMessage, setRunFailureMessage] = useState("");

  const buildTarget = (): DiscoveryTarget => ({
    host,
    port: parseInt(port, 10) || 22,
    username,
    platform_hint: platformHint,
    transport: "ssh",
    data_source_label: dataSourceLabel,
  });

  const handleValidate = async () => {
    const target = buildTarget();
    const result = await api.validateDiscoveryTarget(target);
    setValidationResult(result);
  };

  const handlePlan = async () => {
    if (!validationResult?.is_valid) {
      return;
    }
    setPlanStatus("planning");
    setPlanFailureMessage("");
    setPlan(null);
    try {
      const target = buildTarget();
      const result = await api.planDiscoveryRun(target);
      setPlan(result);
      setPlanStatus("ready");
    } catch (err: unknown) {
      setPlanFailureMessage(
        err instanceof Error ? err.message : "Plan failed",
      );
      setPlanStatus("failed");
    }
  };

  const handleAttemptRun = async () => {
    if (!plan || !plan.all_commands_read_only) {
      return;
    }
    setRunStatus("attempting");
    setRunFailureMessage("");
    setRunReport(null);
    try {
      const target = buildTarget();
      const result = await api.attemptDiscoveryRun(target);
      setRunReport(result);
      setRunStatus("done");
    } catch (err: unknown) {
      setRunFailureMessage(
        err instanceof Error ? err.message : "Run failed",
      );
      setRunStatus("failed");
    }
  };

  const isValidationValid = validationResult?.is_valid ?? false;
  const isEmpty = !host && !username && !dataSourceLabel;

  return (
    <div className="discovery-mode">
      <header className="dx-header">
        <h2 className="dx-title">Discovery</h2>
        <p className="dx-tagline">
          Define a target, validate, plan, then attempt a read-only discovery run.
        </p>
      </header>

      {isEmpty ? (
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
      ) : (
        <section className="dx-body" data-testid="dx-form">
          <div className="dx-form" data-testid="dx-form">
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
                onChange={(e) => setPlatformHint(e.currentTarget.value as LiveCollectionPlatform)}
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
              <input
                id="dx-transport"
                type="text"
                value="SSH"
                disabled
                readOnly
              />
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
                <div
                  className="dx-issues"
                  data-testid="discovery-issues"
                >
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
            <section
              className="dx-plan-summary"
              data-testid="discovery-plan-summary"
            >
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
                disabled={runStatus === "attempting"}
                data-testid="discovery-attempt-btn"
              >
                {runStatus === "attempting" ? "Running..." : "Attempt Run"}
              </button>
            </div>
          )}

          {runStatus === "failed" && (
            <section className="dx-error" data-testid="discovery-run-error">
              <p>Run failed: {runFailureMessage}</p>
            </section>
          )}

          {runReport && (
            <section
              className="dx-run-outcome"
              data-testid="discovery-run-outcome"
            >
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
            </section>
          )}
        </section>
      )}
    </div>
  );
}
