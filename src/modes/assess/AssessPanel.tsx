/**
 * V1W-R — ASSESS orchestrator panel.
 *
 * Owns the four-state reducer (empty / loading / loaded / error)
 * and dispatches to the FSA `loadBatchRunJson` helper. The picker
 * call lives at the panel level (not inside the reducer) — the
 * reducer remains pure.
 *
 * Tests inject the loader via `loader` prop so the FSA picker
 * never fires in unit tests.
 */

import { useCallback, useReducer, type JSX } from "react";

import { AssessEmptyState } from "./components/AssessEmptyState";
import { AssessErrorView } from "./components/AssessErrorView";
import { AssessLoadedView } from "./components/AssessLoadedView";
import { assessReducer } from "./assessReducer";
import { initialAssessState } from "./assessTypes";
import { loadBatchRunJson, type LoadResult } from "./loadBatchRunJson";

import "./assess.css";

export interface AssessPanelProps {
  /** Injectable loader for tests. Defaults to the real FSA picker. */
  readonly loader?: () => Promise<LoadResult>;
}

export function AssessPanel({
  loader = loadBatchRunJson,
}: AssessPanelProps = {}): JSX.Element {
  const [state, dispatch] = useReducer(assessReducer, initialAssessState);

  const runLoader = useCallback(async (): Promise<void> => {
    const result = await loader();
    if (result.kind === "cancelled") {
      dispatch({ type: "LoadCancelled" });
      return;
    }
    if (result.kind === "error") {
      dispatch({
        type: "LoadFailed",
        reason: result.reason,
        message: result.message,
      });
      return;
    }
    dispatch({
      type: "LoadSucceeded",
      artifact: result.artifact,
      filename: result.filename,
    });
  }, [loader]);

  const onOpen = useCallback((): void => {
    dispatch({ type: "OpenRequested" });
    void runLoader();
  }, [runLoader]);

  const onRetry = useCallback((): void => {
    dispatch({ type: "RetryRequested" });
    void runLoader();
  }, [runLoader]);

  const onClose = useCallback((): void => {
    dispatch({ type: "CloseRequested" });
  }, []);

  return (
    <div className="assess-root" aria-label="Assess">
      {state.kind === "empty" && <AssessEmptyState onOpen={onOpen} />}
      {state.kind === "loading" && (
        <AssessEmptyState onOpen={onOpen} disabled={true} />
      )}
      {state.kind === "loaded" && (
        <AssessLoadedView
          artifact={state.artifact}
          filename={state.filename}
          onClose={onClose}
        />
      )}
      {state.kind === "error" && (
        <AssessErrorView
          reason={state.reason}
          message={state.message}
          onRetry={onRetry}
          onClose={onClose}
        />
      )}
    </div>
  );
}
