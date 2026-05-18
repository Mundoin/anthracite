/**
 * Live Collection Dry-Run Panel (V1AT).
 *
 * Pure-frontend safety surface: lets an operator compose a dry-run
 * collection plan for a future read-only live neighbour collection.
 * No device contact, no credentials, no polling. The panel calls a
 * planner callback (typically wired to `planLiveTopologyCollection`)
 * which returns a deterministic plan. The plan is rendered for
 * operator review; nothing is executed.
 *
 * Stage: V1AT. Doctrine: `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`.
 */

import type { JSX } from "react";
import { useState } from "react";
import type { TopologyEvidenceImportMode } from "../../types/topology";
import type {
  LiveCollectionDryRunPlan,
  LiveCollectionDryRunRequest,
  LiveCollectionSafetyWarning,
  LiveCollectionSourceKind,
} from "../../types/liveCollection";

const HONESTY_HEADER_NOTE =
  "No device contact is performed in this stage.";

const WARNING_LABELS: Readonly<Record<LiveCollectionSafetyWarning, string>> = {
  unsupported_platform: "Selected platform is not supported for live collection.",
  no_source_kind_selected: "No collection source kinds selected.",
  replace_import_mode_selected:
    "Replace mode discards prior evidence — merge or append is safer for ongoing collection.",
  unknown_platform_hint:
    "Platform hint is not recognised by the planner.",
  missing_target_identifier:
    "Target device label is missing — required for the operator review record.",
  empty_command_plan:
    "Plan produced zero commands; nothing can be collected.",
  no_source_kind_matches_platform:
    "None of the selected source kinds are supported on this platform.",
};

export interface LiveCollectionDryRunPanelProps {
  readonly environmentId: string | null;
  /** Pure callback. When omitted the Plan button is disabled and the
   *  panel renders only the form + honesty note. */
  readonly onPlan?: (
    request: LiveCollectionDryRunRequest,
  ) => Promise<LiveCollectionDryRunPlan>;
}

export function LiveCollectionDryRunPanel({
  environmentId,
  onPlan,
}: LiveCollectionDryRunPanelProps): JSX.Element {
  const [platformHint, setPlatformHint] = useState<string>("iosxe");
  const [includeLldp, setIncludeLldp] = useState(true);
  const [includeCdp, setIncludeCdp] = useState(false);
  const [importMode, setImportMode] =
    useState<TopologyEvidenceImportMode>("merge");
  const [targetLabel, setTargetLabel] = useState<string>("");
  const [plan, setPlan] = useState<LiveCollectionDryRunPlan | null>(null);
  const [errorText, setErrorText] = useState<string>("");
  const [isPlanning, setIsPlanning] = useState(false);

  const handlePlan = async () => {
    if (!onPlan) {
      return;
    }
    setIsPlanning(true);
    setErrorText("");
    try {
      const kinds: LiveCollectionSourceKind[] = [];
      if (includeLldp) kinds.push("lldp");
      if (includeCdp) kinds.push("cdp");
      const request: LiveCollectionDryRunRequest = {
        environment_id: environmentId,
        target_label: targetLabel.trim() === "" ? null : targetLabel.trim(),
        platform_hint: platformHint === "" ? null : platformHint,
        source_kinds: kinds,
        planned_import_mode: importMode,
      };
      const next = await onPlan(request);
      setPlan(next);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorText(`Planner failed: ${msg}`);
      setPlan(null);
    } finally {
      setIsPlanning(false);
    }
  };

  const planDisabled = onPlan === undefined || isPlanning;

  return (
    <section
      className="tm-live-collection"
      data-testid="tm-live-collection"
      aria-label="Live collection dry-run plan"
    >
      <header className="tm-live-collection-header">
        <h3 className="tm-section-heading">Dry-run collection plan</h3>
        <p
          className="tm-live-collection-honesty"
          data-testid="tm-live-collection-honesty"
        >
          {HONESTY_HEADER_NOTE}
        </p>
      </header>

      <div className="tm-live-collection-form" data-testid="tm-live-collection-form">
        <label className="tm-live-collection-field">
          <span className="tm-live-collection-label">Platform hint</span>
          <select
            data-testid="tm-live-collection-platform"
            className="tm-live-collection-select"
            value={platformHint}
            onChange={(e) => setPlatformHint(e.currentTarget.value)}
            disabled={isPlanning}
          >
            <option value="iosxe">Cisco IOS-XE</option>
            <option value="nxos">Cisco NX-OS</option>
            <option value="iosxr">Cisco IOS-XR</option>
            <option value="eos">Arista EOS</option>
            <option value="junos">Juniper Junos</option>
            <option value="huawei_vrp">Huawei VRP (deferred)</option>
            <option value="nokia_sros">Nokia SR OS (deferred)</option>
            <option value="fortios">FortiOS (unsupported)</option>
            <option value="mikrotik">MikroTik (unsupported)</option>
          </select>
        </label>

        <fieldset className="tm-live-collection-kinds">
          <legend className="tm-live-collection-label">Collection sources</legend>
          <label className="tm-live-collection-kind-label">
            <input
              type="checkbox"
              data-testid="tm-live-collection-source-lldp"
              checked={includeLldp}
              onChange={(e) => setIncludeLldp(e.currentTarget.checked)}
              disabled={isPlanning}
            />
            LLDP
          </label>
          <label className="tm-live-collection-kind-label">
            <input
              type="checkbox"
              data-testid="tm-live-collection-source-cdp"
              checked={includeCdp}
              onChange={(e) => setIncludeCdp(e.currentTarget.checked)}
              disabled={isPlanning}
            />
            CDP
          </label>
        </fieldset>

        <label className="tm-live-collection-field">
          <span className="tm-live-collection-label">Planned import mode</span>
          <select
            data-testid="tm-live-collection-import-mode"
            className="tm-live-collection-select"
            value={importMode}
            onChange={(e) =>
              setImportMode(
                e.currentTarget.value as TopologyEvidenceImportMode,
              )
            }
            disabled={isPlanning}
          >
            <option value="merge">Merge (recommended)</option>
            <option value="append">Append</option>
            <option value="replace">Replace (caution)</option>
          </select>
        </label>

        <label className="tm-live-collection-field">
          <span className="tm-live-collection-label">Target label</span>
          <input
            type="text"
            data-testid="tm-live-collection-target"
            className="tm-live-collection-input"
            value={targetLabel}
            onChange={(e) => setTargetLabel(e.currentTarget.value)}
            placeholder="e.g., router-a (display only — no host/IP used)"
            disabled={isPlanning}
          />
        </label>

        <button
          type="button"
          data-testid="tm-live-collection-plan-button"
          className="tm-live-collection-plan-button"
          onClick={handlePlan}
          disabled={planDisabled}
        >
          Plan (dry run)
        </button>
      </div>

      {errorText !== "" && (
        <p
          data-testid="tm-live-collection-error"
          className="tm-live-collection-error"
        >
          {errorText}
        </p>
      )}

      {plan !== null && (
        <section
          className="tm-live-collection-result"
          data-testid="tm-live-collection-result"
          aria-label="Live collection plan result"
        >
          <header className="tm-live-collection-result-header">
            <span
              className={`tm-live-collection-readiness tm-live-collection-readiness--${plan.readiness}`}
              data-testid="tm-live-collection-readiness"
            >
              Readiness: {plan.readiness}
            </span>
            <span
              className="tm-live-collection-import-mode-tag"
              data-testid="tm-live-collection-result-import-mode"
            >
              Planned import mode: {plan.planned_import_mode}
            </span>
          </header>

          <section
            className="tm-live-collection-commands"
            data-testid="tm-live-collection-commands"
          >
            <h4 className="tm-live-collection-subheading">Planned commands</h4>
            {plan.commands.length === 0 ? (
              <p
                className="tm-muted"
                data-testid="tm-live-collection-commands-empty"
              >
                No commands planned for this platform/source combination.
              </p>
            ) : (
              <ul className="tm-live-collection-command-list">
                {plan.commands.map((cmd, idx) => (
                  <li
                    key={`${cmd.source_kind}-${idx}`}
                    className="tm-live-collection-command-item"
                    data-testid={`tm-live-collection-command-${idx}`}
                  >
                    <code className="tm-live-collection-command-text">
                      {cmd.command}
                    </code>
                    <span
                      className="tm-live-collection-read-only-badge"
                      data-testid={`tm-live-collection-read-only-${idx}`}
                    >
                      read-only
                    </span>
                    <span className="tm-live-collection-route">
                      {cmd.source_kind.toUpperCase()} ·{" "}
                      {cmd.platform_hint} · {cmd.planned_import_function}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {plan.warnings.length > 0 && (
            <section
              className="tm-live-collection-warnings"
              data-testid="tm-live-collection-warnings"
            >
              <h4 className="tm-live-collection-subheading">Warnings</h4>
              <ul className="tm-live-collection-warning-list">
                {plan.warnings.map((w) => (
                  <li
                    key={w}
                    className="tm-live-collection-warning-item"
                    data-testid={`tm-live-collection-warning-${w}`}
                  >
                    {WARNING_LABELS[w] ?? w}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.unsupported_reason !== null && (
            <p
              className="tm-live-collection-unsupported"
              data-testid="tm-live-collection-unsupported"
            >
              Unsupported reason: {plan.unsupported_reason}
            </p>
          )}

          <section
            className="tm-live-collection-checklist"
            data-testid="tm-live-collection-checklist"
          >
            <h4 className="tm-live-collection-subheading">Safety checklist</h4>
            <ul className="tm-live-collection-checklist-list">
              {plan.safety_checklist.map((item, idx) => (
                <li
                  key={idx}
                  data-testid={`tm-live-collection-checklist-${idx}`}
                  className="tm-live-collection-checklist-item"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <p
            className="tm-live-collection-result-honesty"
            data-testid="tm-live-collection-result-honesty"
          >
            {plan.honesty_note} Operator review required before any future
            collection.
          </p>
        </section>
      )}
    </section>
  );
}
