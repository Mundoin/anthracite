import { type JSX } from "react";
import { ENVIRONMENT_CREATION_TYPES } from "../../../contracts/environmentCreationTypes";
import { AnthButton } from "../../../components/shared/AnthButton";
import "./Wizard.css";

export interface StepChooseTypeProps {
  readonly selectedTypeId: string | null;
  readonly onSelectType: (id: string) => void;
  readonly onNext: () => void;
  readonly onReset: () => void;
}

const TYPE_DISPLAY_NAMES: Record<string, string> = {
  "generated-lab": "Lab Environment",
};

export function StepChooseType({
  selectedTypeId,
  onSelectType,
  onNext,
  onReset,
}: StepChooseTypeProps): JSX.Element {
  return (
    <div className="wizard-step">
      <div className="wizard-step__header">
        <h2 className="wizard-step__title">Choose Environment Type</h2>
        <p className="wizard-step__subtitle">
          Select how you want to create your network environment
        </p>
      </div>

      <div className="wizard-step__content">
        <div className="wizard-cards">
          {ENVIRONMENT_CREATION_TYPES.map((type) => {
            const isSelected = selectedTypeId === type.id;
            const isEnabled = type.status === "available";
            const displayName = TYPE_DISPLAY_NAMES[type.id] || type.label;

            return (
              <button
                key={type.id}
                type="button"
                data-testid={`wizard-type-card-${type.id}`}
                className={`wizard-card ${isSelected ? "wizard-card--selected" : ""} ${!isEnabled ? "wizard-card--disabled" : ""}`}
                data-state={isSelected ? "selected" : isEnabled ? "available" : "disabled"}
                aria-pressed={isSelected}
                disabled={!isEnabled}
                onClick={() => {
                  if (isEnabled) {
                    onSelectType(type.id);
                  }
                }}
              >
                <div className="wizard-card__header">
                  <h3 className="wizard-card__title">{displayName}</h3>
                  <span
                    className={`wizard-chip ${!isEnabled ? "wizard-chip--planned" : isSelected ? "wizard-chip--selected" : ""}`}
                  >
                    {!isEnabled ? "Planned" : "Available"}
                  </span>
                </div>

                <span className="wizard-card__source-label">{type.id}</span>
                <p className="wizard-card__description">{type.description}</p>

                {!isEnabled && (
                  <p className="wizard-card__readiness-note">
                    {type.readiness_notes}
                  </p>
                )}

                {isEnabled && (
                  <div className="wizard-card__inputs">
                    <p className="wizard-card__input-label">
                      Required inputs: {type.required_inputs.join(", ")}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="wizard-step__footer">
        <AnthButton variant="ghost" onClick={onReset}>
          Reset
        </AnthButton>
        <AnthButton
          variant="primary"
          onClick={onNext}
          disabled={!selectedTypeId || selectedTypeId !== "generated-lab"}
        >
          Continue
        </AnthButton>
      </div>
    </div>
  );
}
