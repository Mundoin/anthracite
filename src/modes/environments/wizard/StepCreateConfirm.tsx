import { type JSX, useState } from "react";
import type { LocalEnvironmentRecord } from "../../../types/localEnvironment";
import { AnthButton } from "../../../components/shared/AnthButton";
import "./Wizard.css";

export interface StepCreateConfirmProps {
  readonly previewRecord: LocalEnvironmentRecord | null;
  readonly environmentName: string;
  readonly onCommit: (setActive: boolean) => void;
  readonly onBack: () => void;
  readonly onReset: () => void;
}

export function StepCreateConfirm({
  previewRecord,
  environmentName,
  onCommit,
  onBack,
  onReset,
}: StepCreateConfirmProps): JSX.Element {
  const [setActive, setSetActive] = useState(true);

  if (!previewRecord) {
    return (
      <div className="wizard-step">
        <div className="wizard-step__header">
          <h2 className="wizard-step__title">Create Environment</h2>
        </div>
        <div className="wizard-step__content">
          <p>No preview record available.</p>
        </div>
      </div>
    );
  }

  const displayName = environmentName || previewRecord.name;

  return (
    <div className="wizard-step" data-testid="wizard-confirm">
      <div className="wizard-step__header">
        <h2 className="wizard-step__title">Create Environment</h2>
        <p className="wizard-step__subtitle">Review and confirm.</p>
      </div>

      <div className="wizard-step__content">
        <div className="wizard-confirm">
          <div className="wizard-confirm__summary">
            <div className="wizard-confirm__field">
              <span className="wizard-confirm__field-label">Name</span>
              <span className="wizard-confirm__field-value">{displayName}</span>
            </div>
            <div className="wizard-confirm__field">
              <span className="wizard-confirm__field-label">Scenario</span>
              <span className="wizard-confirm__field-value">
                {previewRecord.scenario_name}
              </span>
            </div>
            <div className="wizard-confirm__field">
              <span className="wizard-confirm__field-label">Devices</span>
              <span className="wizard-confirm__field-value">
                {previewRecord.device_count}
              </span>
            </div>
            <div className="wizard-confirm__field">
              <span className="wizard-confirm__field-label">Links</span>
              <span className="wizard-confirm__field-value">
                {previewRecord.link_count}
              </span>
            </div>
            <div className="wizard-confirm__field">
              <span className="wizard-confirm__field-label">Configs</span>
              <span className="wizard-confirm__field-value">
                {previewRecord.config_count}
              </span>
            </div>
          </div>
          <label className="wizard-confirm__toggle">
            <input
              type="checkbox"
              className="wizard-confirm__toggle-input"
              checked={setActive}
              onChange={(e) => setSetActive(e.target.checked)}
            />
            <span className="wizard-confirm__toggle-label">Set as active environment</span>
          </label>
          <p className="wizard-confirm__toggle-hint">
            When set active, this environment becomes the working context for Hierarchy, Configs, and future Topology.
          </p>
        </div>
      </div>

      <div className="wizard-step__footer">
        <AnthButton variant="ghost" onClick={onReset}>
          Reset
        </AnthButton>
        <div className="wizard-step__footer-right">
          <AnthButton variant="secondary" onClick={onBack}>
            Back
          </AnthButton>
          <AnthButton
            variant="primary"
            onClick={() => onCommit(setActive)}
          >
            Create Environment
          </AnthButton>
        </div>
      </div>
    </div>
  );
}
