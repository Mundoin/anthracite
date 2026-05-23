import type { EnvironmentCreationTypeId } from "../../../contracts/environmentCreationTypes";
import type { LocalEnvironmentRecord } from "../../../types/localEnvironment";

export type WizardStepId = "type" | "scenario" | "review" | "confirm";

export interface WizardState {
  readonly stepId: WizardStepId;
  readonly typeId: EnvironmentCreationTypeId | null;
  readonly scenarioId: string | null;
  readonly environmentName: string;
  readonly previewRecord: LocalEnvironmentRecord | null;
}
