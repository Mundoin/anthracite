/**
 * Assess mode — state types (V1W-R).
 *
 * Discriminated union over the four observable states of a viewer
 * around a single saved V1R BatchRun export JSON file. The reducer
 * (`assessReducer.ts`) owns transitions; illegal combinations return
 * the prior state reference unchanged, mirroring V1O discipline.
 */

import type { BatchRunExport } from "../../types/batchRunExport";

export type LoadErrorReason =
  | "read_failed"
  | "invalid_json"
  | "wrong_export_version"
  | "wrong_kind"
  | "shape_mismatch";

export type AssessState =
  | { readonly kind: "empty" }
  | { readonly kind: "loading" }
  | {
      readonly kind: "loaded";
      readonly artifact: BatchRunExport;
      readonly filename: string;
    }
  | {
      readonly kind: "error";
      readonly reason: LoadErrorReason;
      readonly message: string;
    };

export const initialAssessState: AssessState = { kind: "empty" };

export type AssessAction =
  | { readonly type: "OpenRequested" }
  | {
      readonly type: "LoadSucceeded";
      readonly artifact: BatchRunExport;
      readonly filename: string;
    }
  | {
      readonly type: "LoadFailed";
      readonly reason: LoadErrorReason;
      readonly message: string;
    }
  | { readonly type: "LoadCancelled" }
  | { readonly type: "CloseRequested" }
  | { readonly type: "RetryRequested" };
