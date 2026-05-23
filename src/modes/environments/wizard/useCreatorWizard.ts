import { useCallback, useState } from "react";
import type { EnvironmentCreationTypeId } from "../../../contracts/environmentCreationTypes";
import { useEnvironmentLifecycle } from "../../../state/EnvironmentLifecycleContext";
import type { WizardState } from "./types";

const INITIAL_STATE: WizardState = {
  stepId: "type",
  typeId: null,
  scenarioId: null,
  environmentName: "",
  previewRecord: null,
};

export interface UseCreatorWizardReturn {
  readonly state: WizardState;
  setType(id: EnvironmentCreationTypeId): void;
  setScenario(id: string): void;
  setName(name: string): void;
  buildPreview(): void;
  next(): void;
  back(): void;
  reset(): void;
  commit(setActive: boolean): void;
}

export function useCreatorWizard(): UseCreatorWizardReturn {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const lifecycle = useEnvironmentLifecycle();

  const setType = useCallback((id: EnvironmentCreationTypeId) => {
    setState((prev) => ({
      ...prev,
      typeId: id,
    }));
  }, []);

  const setScenario = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      scenarioId: id,
    }));
  }, []);

  const setName = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      environmentName: name,
    }));
  }, []);

  const buildPreview = useCallback(() => {
    if (!state.scenarioId) return;
    const preview = lifecycle.buildPreview(state.scenarioId, state.environmentName || undefined);
    setState((prev) => ({
      ...prev,
      previewRecord: preview,
    }));
  }, [state.scenarioId, state.environmentName, lifecycle]);

  const next = useCallback(() => {
    const { stepId, typeId, scenarioId, previewRecord } = state;

    switch (stepId) {
      case "type":
        // Only "generated-lab" can advance
        if (typeId === "generated-lab") {
          setState((prev) => ({ ...prev, stepId: "scenario" }));
        }
        break;

      case "scenario":
        // scenario step requires scenarioId
        if (scenarioId) {
          setState((prev) => ({ ...prev, stepId: "review" }));
        }
        break;

      case "review":
        // review step requires previewRecord; build if missing
        if (previewRecord) {
          setState((prev) => ({ ...prev, stepId: "confirm" }));
        } else if (scenarioId) {
          const preview = lifecycle.buildPreview(scenarioId, state.environmentName || undefined);
          setState((prev) => ({
            ...prev,
            previewRecord: preview,
            stepId: "confirm",
          }));
        }
        break;

      case "confirm":
        // no-op
        break;
    }
  }, [state, lifecycle]);

  const back = useCallback(() => {
    const { stepId } = state;

    switch (stepId) {
      case "type":
        // no-op
        break;
      case "scenario":
        setState((prev) => ({ ...prev, stepId: "type" }));
        break;
      case "review":
        setState((prev) => ({ ...prev, stepId: "scenario" }));
        break;
      case "confirm":
        setState((prev) => ({ ...prev, stepId: "review" }));
        break;
    }
  }, [state.stepId]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const commit = useCallback(
    (setActive: boolean) => {
      if (!state.previewRecord) return;
      const trimmed = state.environmentName.trim();
      const finalRecord = trimmed && trimmed !== state.previewRecord.name
        ? { ...state.previewRecord, name: trimmed }
        : state.previewRecord;
      lifecycle.commitEnvironment(finalRecord, { setActive });
      setState(INITIAL_STATE);
    },
    [state.previewRecord, state.environmentName, lifecycle],
  );

  return {
    state,
    setType,
    setScenario,
    setName,
    buildPreview,
    next,
    back,
    reset,
    commit,
  };
}
