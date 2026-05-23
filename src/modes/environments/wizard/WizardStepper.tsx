import { type JSX } from "react";

export interface WizardStepperProps {
  readonly steps: ReadonlyArray<{ id: string; label: string }>;
  readonly currentStepId: string;
  readonly completedStepIds: ReadonlyArray<string>;
}

export function WizardStepper({
  steps,
  currentStepId,
  completedStepIds,
}: WizardStepperProps): JSX.Element {
  return (
    <ol className="wizard-stepper" data-testid="wizard-stepper">
      {steps.map((step, index) => {
        const isCompleted = completedStepIds.includes(step.id);
        const isCurrent = step.id === currentStepId;
        const state = isCurrent ? "current" : isCompleted ? "completed" : "upcoming";

        return (
          <li key={step.id} className={`wizard-stepper__item wizard-stepper__item--${state}`} data-state={state}>
            <span className="wizard-stepper__badge">{index + 1}</span>
            <span className="wizard-stepper__label">{step.label}</span>
            {index < steps.length - 1 && <span className="wizard-stepper__connector" />}
            {isCurrent && <span aria-current="step" />}
            {!isCurrent && <span aria-disabled={!isCompleted} />}
          </li>
        );
      })}
    </ol>
  );
}
