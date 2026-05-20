/**
 * V1BL — Assess Pipeline Planner Panel.
 *
 * UI for the deterministic pipeline planner. Shows profile form, counts inputs,
 * 7-step pipeline table, missing inputs, warnings, and next-action callout.
 */

import { useCallback, useState, type JSX } from "react";
import {
  buildAssessPipelinePlan,
  toAssessPipelinePlanMarkdown,
  type AssessProfile,
  type AssessProfileCounts,
  type AssessSeedSource,
} from "./assessPipelinePlanner";
import "./AssessPipelinePlannerPanel.css";

export interface AssessPipelinePlannerPanelProps {
  readonly clock?: { now(): string };
  readonly clipboard?: { writeText(t: string): Promise<void> };
}

export function AssessPipelinePlannerPanel({
  clock = { now: () => new Date().toISOString() },
  clipboard = navigator.clipboard,
}: AssessPipelinePlannerPanelProps): JSX.Element {
  const [profile, setProfile] = useState<AssessProfile>({
    label: "",
    seed_source: "manual",
    include_snmp_poll: false,
    include_config_pull: false,
    include_compliance_scan: false,
    include_topology_map: false,
    include_anomaly_flag: false,
    include_report_export: false,
    credential_profile_label: "",
    snmp_profile_label: "",
    rule_pack_label: "",
    report_profile_label: "",
  });

  const [counts, setCounts] = useState<AssessProfileCounts>({
    seed_count: 0,
    expected_devices: 0,
    known_platforms: 0,
  });

  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  const plan = buildAssessPipelinePlan(profile, counts, clock.now());

  const handleProfileChange = useCallback(
    (updates: Partial<AssessProfile>) => {
      setProfile((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const handleCountsChange = useCallback(
    (updates: Partial<AssessProfileCounts>) => {
      setCounts((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const handleCopyMarkdown = useCallback(async (): Promise<void> => {
    const md = toAssessPipelinePlanMarkdown(plan);
    try {
      await clipboard.writeText(md);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      // Silent fail; button remains in idle state
    }
  }, [plan, clipboard]);

  return (
    <div className="ap-planner-root" data-testid="assess-pipeline-planner">
      <div className="ap-planner-container">
        {/* Profile Form Section */}
        <section className="ap-planner-section">
          <h3 className="ap-planner-section-title">Profile</h3>

          <div className="ap-planner-form-group">
            <label htmlFor="ap-label" className="ap-planner-label">
              Label
            </label>
            <input
              id="ap-label"
              type="text"
              className="ap-planner-input"
              value={profile.label}
              onChange={(e) => handleProfileChange({ label: e.target.value })}
              placeholder="e.g., prod-assessment-2026"
            />
          </div>

          <div className="ap-planner-form-group">
            <label htmlFor="ap-seed-source" className="ap-planner-label">
              Seed Source
            </label>
            <select
              id="ap-seed-source"
              className="ap-planner-select"
              value={profile.seed_source}
              onChange={(e) =>
                handleProfileChange({ seed_source: e.target.value as AssessSeedSource })
              }
            >
              <option value="manual">Manual</option>
              <option value="discovery_seed_plan">Discovery Seed Plan</option>
              <option value="crawl_preview">Crawl Preview</option>
            </select>
          </div>

          <fieldset className="ap-planner-fieldset">
            <legend className="ap-planner-legend">Include Steps</legend>
            <div className="ap-planner-checkbox-group">
              <label className="ap-planner-checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.include_snmp_poll}
                  onChange={(e) =>
                    handleProfileChange({ include_snmp_poll: e.target.checked })
                  }
                />
                SNMP Poll
              </label>
              <label className="ap-planner-checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.include_config_pull}
                  onChange={(e) =>
                    handleProfileChange({ include_config_pull: e.target.checked })
                  }
                />
                Config Pull
              </label>
              <label className="ap-planner-checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.include_compliance_scan}
                  onChange={(e) =>
                    handleProfileChange({ include_compliance_scan: e.target.checked })
                  }
                />
                Compliance Scan
              </label>
              <label className="ap-planner-checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.include_topology_map}
                  onChange={(e) =>
                    handleProfileChange({ include_topology_map: e.target.checked })
                  }
                />
                Topology Map
              </label>
              <label className="ap-planner-checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.include_anomaly_flag}
                  onChange={(e) =>
                    handleProfileChange({ include_anomaly_flag: e.target.checked })
                  }
                />
                Anomaly Flag
              </label>
              <label className="ap-planner-checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.include_report_export}
                  onChange={(e) =>
                    handleProfileChange({ include_report_export: e.target.checked })
                  }
                />
                Report Export
              </label>
            </div>
          </fieldset>

          <div className="ap-planner-form-group">
            <label htmlFor="ap-cred-label" className="ap-planner-label">
              Credential Profile Label
            </label>
            <input
              id="ap-cred-label"
              type="text"
              className="ap-planner-input"
              value={profile.credential_profile_label}
              onChange={(e) =>
                handleProfileChange({ credential_profile_label: e.target.value })
              }
              placeholder="e.g., prod-snmp-creds"
            />
          </div>

          <div className="ap-planner-form-group">
            <label htmlFor="ap-snmp-label" className="ap-planner-label">
              SNMP Profile Label
            </label>
            <input
              id="ap-snmp-label"
              type="text"
              className="ap-planner-input"
              value={profile.snmp_profile_label}
              onChange={(e) => handleProfileChange({ snmp_profile_label: e.target.value })}
              placeholder="e.g., snmp-v2c-profile"
            />
          </div>

          <div className="ap-planner-form-group">
            <label htmlFor="ap-rule-pack" className="ap-planner-label">
              Rule Pack Label
            </label>
            <input
              id="ap-rule-pack"
              type="text"
              className="ap-planner-input"
              value={profile.rule_pack_label}
              onChange={(e) => handleProfileChange({ rule_pack_label: e.target.value })}
              placeholder="e.g., nist-sp800-53"
            />
          </div>

          <div className="ap-planner-form-group">
            <label htmlFor="ap-report-label" className="ap-planner-label">
              Report Profile Label
            </label>
            <input
              id="ap-report-label"
              type="text"
              className="ap-planner-input"
              value={profile.report_profile_label}
              onChange={(e) => handleProfileChange({ report_profile_label: e.target.value })}
              placeholder="e.g., executive"
            />
          </div>
        </section>

        {/* Counts Section */}
        <section className="ap-planner-section">
          <h3 className="ap-planner-section-title">Counts</h3>

          <div className="ap-planner-form-group">
            <label htmlFor="ap-seed-count" className="ap-planner-label">
              Seed Count
            </label>
            <input
              id="ap-seed-count"
              type="number"
              className="ap-planner-input"
              min="0"
              value={counts.seed_count}
              onChange={(e) => handleCountsChange({ seed_count: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            />
          </div>

          <div className="ap-planner-form-group">
            <label htmlFor="ap-expected-devices" className="ap-planner-label">
              Expected Devices
            </label>
            <input
              id="ap-expected-devices"
              type="number"
              className="ap-planner-input"
              min="0"
              value={counts.expected_devices}
              onChange={(e) => handleCountsChange({ expected_devices: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            />
          </div>

          <div className="ap-planner-form-group">
            <label htmlFor="ap-known-platforms" className="ap-planner-label">
              Known Platforms
            </label>
            <input
              id="ap-known-platforms"
              type="number"
              className="ap-planner-input"
              min="0"
              value={counts.known_platforms}
              onChange={(e) => handleCountsChange({ known_platforms: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            />
          </div>
        </section>

        {/* Pipeline Steps Table */}
        <section className="ap-planner-section">
          <h3 className="ap-planner-section-title">Pipeline Steps</h3>
          <div className="ap-planner-table-wrapper">
            <table className="ap-planner-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Step</th>
                  <th>Readiness</th>
                  <th>Missing Inputs</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {plan.steps.map((step) => (
                  <tr key={step.id} data-step-id={step.id}>
                    <td>{step.order}</td>
                    <td>{step.label}</td>
                    <td>
                      <span className={`ap-planner-readiness ap-planner-readiness--${step.readiness}`}>
                        {step.readiness}
                      </span>
                    </td>
                    <td>
                      {step.missing_inputs.length > 0
                        ? step.missing_inputs.join("; ")
                        : "(none)"}
                    </td>
                    <td>{step.notes.length > 0 ? step.notes.join("; ") : "(none)"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Missing Inputs Panel */}
        {plan.missing_inputs.length > 0 && (
          <section className="ap-planner-section ap-planner-section--warning">
            <h3 className="ap-planner-section-title">Missing Inputs</h3>
            <ul className="ap-planner-list">
              {plan.missing_inputs.map((inp) => (
                <li key={inp}>{inp}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Warnings Panel */}
        {plan.warnings.length > 0 && (
          <section className="ap-planner-section ap-planner-section--caution">
            <h3 className="ap-planner-section-title">Warnings</h3>
            <ul className="ap-planner-list">
              {plan.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Next Action Callout */}
        <section className="ap-planner-section ap-planner-next-action">
          <h3 className="ap-planner-section-title">Next Action</h3>
          <div className="ap-planner-next-action-box">
            <strong className="ap-planner-next-action-title">
              {plan.next_action.replace(/_/g, " ").toUpperCase()}
            </strong>
            <p className="ap-planner-next-action-detail">
              {plan.next_action === "add_seeds"
                ? "No seeds provided. Add seeds via Discovery seed plan, crawl preview, or manual seed list."
                : plan.next_action === "attach_credentials"
                  ? "Config Pull is enabled but no credential profile is attached."
                  : plan.next_action === "attach_snmp_profile"
                    ? "SNMP Poll is enabled but no SNMP profile is attached."
                    : plan.next_action === "choose_rule_pack"
                      ? "Compliance Scan is enabled but no rule pack is selected."
                      : plan.next_action === "choose_report_profile"
                        ? "Report is enabled but no report profile is selected."
                        : "Pipeline configuration is complete. Ready to run assessment (when engines are wired)."}
            </p>
          </div>
        </section>

        {/* Copy Markdown Button */}
        <div className="ap-planner-actions">
          <button
            type="button"
            className="ap-planner-button ap-planner-button--primary"
            onClick={() => void handleCopyMarkdown()}
            aria-label="Copy Pipeline Plan as Markdown"
          >
            {copyStatus === "copied" ? "Copied!" : "Copy Pipeline Plan"}
          </button>
        </div>

        {/* Markdown Preview */}
        <details className="ap-planner-details">
          <summary className="ap-planner-details-summary">Markdown Preview</summary>
          <pre className="ap-planner-markdown-preview">
            {toAssessPipelinePlanMarkdown(plan)}
          </pre>
        </details>

        {/* Honesty Footer */}
        <div className="ap-planner-honesty-footer">
          <p>
            Local pipeline plan only — no live discovery, no config pull, no SNMP polling, no
            compliance execution, no PDF generated.
          </p>
        </div>
      </div>
    </div>
  );
}
