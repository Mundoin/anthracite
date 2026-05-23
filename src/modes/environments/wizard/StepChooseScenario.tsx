import { type JSX } from "react";
import { listScenarios } from "../../../data/scenarioCatalogue";
import { AnthButton } from "../../../components/shared/AnthButton";
import "./Wizard.css";

export interface StepChooseScenarioProps {
  readonly selectedScenarioId: string | null;
  readonly onSelectScenario: (id: string) => void;
  readonly onNext: () => void;
  readonly onBack: () => void;
  readonly onReset: () => void;
}

export function StepChooseScenario({
  selectedScenarioId,
  onSelectScenario,
  onNext,
  onBack,
  onReset,
}: StepChooseScenarioProps): JSX.Element {
  const scenarios = listScenarios();

  return (
    <div className="wizard-step">
      <div className="wizard-step__header">
        <h2 className="wizard-step__title">Choose Scenario</h2>
        <p className="wizard-step__subtitle">
          Select a network scenario template
        </p>
      </div>

      <div className="wizard-step__content">
        <div className="wizard-cards wizard-cards--scenarios">
          {scenarios.map((scenario) => {
            const isSelected = selectedScenarioId === scenario.scenario_id;

            return (
              <button
                key={scenario.scenario_id}
                type="button"
                data-testid={`wizard-scenario-card-${scenario.scenario_id}`}
                className={`wizard-card ${isSelected ? "wizard-card--selected" : ""}`}
                data-state={isSelected ? "selected" : "available"}
                aria-pressed={isSelected}
                onClick={() => onSelectScenario(scenario.scenario_id)}
              >
                <div className="wizard-card__header">
                  <h3 className="wizard-card__title">{scenario.name}</h3>
                  <span className={`wizard-chip ${isSelected ? "wizard-chip--selected" : ""}`}>
                    {scenario.scale_profile}
                  </span>
                </div>

                <p className="wizard-card__description">{scenario.description}</p>

                <div className="wizard-card__counts">
                  <div className="wizard-card__count">
                    <span className="wizard-card__count-label">Devices</span>
                    <span className="wizard-card__count-value">
                      {scenario.device_count}
                    </span>
                  </div>
                  <div className="wizard-card__count">
                    <span className="wizard-card__count-label">Links</span>
                    <span className="wizard-card__count-value">
                      {scenario.link_count}
                    </span>
                  </div>
                </div>

                <div className="wizard-card__capabilities">
                  {scenario.capabilities.map((cap) => (
                    <span key={cap} className="wizard-chip">
                      {cap}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
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
            onClick={onNext}
            disabled={!selectedScenarioId}
          >
            Continue to Review
          </AnthButton>
        </div>
      </div>
    </div>
  );
}
