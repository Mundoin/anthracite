import { type JSX } from "react";
import { useCreatorWizard } from "../wizard/useCreatorWizard";
import { WizardStepper } from "../wizard/WizardStepper";
import { StepChooseType } from "../wizard/StepChooseType";
import { StepChooseScenario } from "../wizard/StepChooseScenario";
import { StepReviewContents } from "../wizard/StepReviewContents";
import { StepCreateConfirm } from "../wizard/StepCreateConfirm";
import "../wizard/WizardStepper.css";
import "./EnvironmentCreatorPanel.css";

export interface EnvironmentCreatorPanelProps {
  readonly onAfterCreate?: (environmentId: string, environmentName: string, didSetActive: boolean) => void;
}

export function EnvironmentCreatorPanel({
  onAfterCreate,
}: EnvironmentCreatorPanelProps): JSX.Element {
  const wizard = useCreatorWizard();
  const { state } = wizard;

  const STEPS = [
    { id: "type", label: "Type" },
    { id: "scenario", label: "Scenario" },
    { id: "review", label: "Review" },
    { id: "confirm", label: "Create" },
  ] as const;

  const currentStepIndex = STEPS.findIndex((s) => s.id === state.stepId);
  const completedStepIds = STEPS.slice(0, currentStepIndex).map((s) => s.id);

  const handleCommit = (setActive: boolean) => {
    if (state.previewRecord) {
      const trimmedName = state.environmentName.trim();
      const finalName = trimmedName || state.previewRecord.name;
      wizard.commit(setActive);
      onAfterCreate?.(state.previewRecord.environment_id, finalName, setActive);
    }
  };

  return (
    <div className="environment-creator-panel" data-testid="environments-creator">
      <div className="environment-creator-panel__container">
        <WizardStepper
          steps={STEPS}
          currentStepId={state.stepId}
          completedStepIds={completedStepIds}
        />

        {/* Step Content */}
        {state.stepId === "type" && (
          <StepChooseType
            selectedTypeId={state.typeId}
            onSelectType={(id) => wizard.setType(id as any)}
            onNext={wizard.next}
            onReset={wizard.reset}
          />
        )}

        {state.stepId === "scenario" && (
          <StepChooseScenario
            selectedScenarioId={state.scenarioId}
            onSelectScenario={wizard.setScenario}
            onNext={wizard.next}
            onBack={wizard.back}
            onReset={wizard.reset}
          />
        )}

        {state.stepId === "review" && (
          <StepReviewContents
            previewRecord={state.previewRecord}
            environmentName={state.environmentName}
            onNameChange={wizard.setName}
            onBuildPreview={wizard.buildPreview}
            onNext={wizard.next}
            onBack={wizard.back}
            onReset={wizard.reset}
          />
        )}

        {state.stepId === "confirm" && (
          <StepCreateConfirm
            previewRecord={state.previewRecord}
            environmentName={state.environmentName}
            onCommit={handleCommit}
            onBack={wizard.back}
            onReset={wizard.reset}
          />
        )}
      </div>
    </div>
  );
}
