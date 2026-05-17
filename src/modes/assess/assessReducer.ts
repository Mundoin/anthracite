/**
 * Assess mode — pure reducer (V1W-R).
 *
 * Legal transitions only. Illegal actions return the prior state
 * reference unchanged so `Object.is` callers (tests, memoised
 * consumers) observe a no-op. Mirrors V1O `intakeReducer.ts`
 * discipline.
 *
 * Transition table:
 *   empty    + OpenRequested        → loading
 *   loading  + LoadSucceeded(a, f)  → loaded
 *   loading  + LoadFailed(r, m)     → error
 *   loading  + LoadCancelled        → empty
 *   loaded   + CloseRequested       → empty
 *   loaded   + OpenRequested        → loading
 *   error    + RetryRequested       → loading
 *   error    + CloseRequested       → empty
 *   anything else                   → state (no-op)
 */

import type { AssessAction, AssessState } from "./assessTypes";

export function assessReducer(
  state: AssessState,
  action: AssessAction,
): AssessState {
  switch (action.type) {
    case "OpenRequested":
      if (state.kind === "empty" || state.kind === "loaded") {
        return { kind: "loading" };
      }
      return state;

    case "LoadSucceeded":
      if (state.kind !== "loading") return state;
      return {
        kind: "loaded",
        artifact: action.artifact,
        filename: action.filename,
      };

    case "LoadFailed":
      if (state.kind !== "loading") return state;
      return {
        kind: "error",
        reason: action.reason,
        message: action.message,
      };

    case "LoadCancelled":
      if (state.kind !== "loading") return state;
      return { kind: "empty" };

    case "CloseRequested":
      if (state.kind === "loaded" || state.kind === "error") {
        return { kind: "empty" };
      }
      return state;

    case "RetryRequested":
      if (state.kind !== "error") return state;
      return { kind: "loading" };
  }
}
