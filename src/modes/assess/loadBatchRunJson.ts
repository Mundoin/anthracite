/**
 * V1W-R — narrow load-from-file bridge over the browser File System
 * Access API.
 *
 * Uses `window.showOpenFilePicker` (available in Tauri v2 webview2
 * on Windows; mirrors V1S `saveToFile`'s usage of
 * `window.showSaveFilePicker`).
 *
 * Validates the parsed JSON against the V1R `BatchRunExport`
 * contract shape — not a full schema validator. The goal is to
 * reject "this is not a V1R BatchRunExport" cleanly with a
 * specific reason; deep leaf validation is out of scope.
 */

import type {
  BatchRunExport,
  BatchRunExportSummary,
} from "../../types/batchRunExport";
import type { LoadErrorReason } from "./assessTypes";

export type LoadResult =
  | {
      readonly kind: "ok";
      readonly artifact: BatchRunExport;
      readonly filename: string;
    }
  | {
      readonly kind: "error";
      readonly reason: LoadErrorReason;
      readonly message: string;
    }
  | { readonly kind: "cancelled" };

export type ValidationResult =
  | { readonly kind: "ok"; readonly artifact: BatchRunExport }
  | {
      readonly kind: "error";
      readonly reason: LoadErrorReason;
      readonly message: string;
    };

const REQUIRED_TOP_LEVEL_FIELDS: ReadonlyArray<keyof BatchRunExport> = [
  "export_version",
  "kind",
  "batch_run_status",
  "source",
  "summary",
  "generated_by",
  "versions",
  "devices",
  "omitted",
];

const REQUIRED_SUMMARY_COUNT_FIELDS: ReadonlyArray<keyof BatchRunExportSummary> = [
  "total_count",
  "parsed_count",
  "failed_count",
  "skipped_count",
  "pending_count",
  "with_findings_count",
  "clean_count",
];

const REQUIRED_SEVERITY_KEYS: ReadonlyArray<string> = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export async function loadBatchRunJson(): Promise<LoadResult> {
  if (
    typeof window === "undefined" ||
    typeof window.showOpenFilePicker !== "function"
  ) {
    return {
      kind: "error",
      reason: "read_failed",
      message: "File open API not available in this context.",
    };
  }

  let handle: FileSystemFileHandle;
  try {
    const handles = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: "JSON",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    if (!handles || handles.length === 0) {
      return { kind: "cancelled" };
    }
    handle = handles[0];
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { kind: "cancelled" };
    }
    return {
      kind: "error",
      reason: "read_failed",
      message: `Open dialog failed: ${describeError(err)}`,
    };
  }

  let text: string;
  let filename: string;
  try {
    const file = await handle.getFile();
    filename = file.name;
    text = await file.text();
  } catch (err: unknown) {
    return {
      kind: "error",
      reason: "read_failed",
      message: `Could not read file: ${describeError(err)}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err: unknown) {
    return {
      kind: "error",
      reason: "invalid_json",
      message: `File is not valid JSON: ${describeError(err)}`,
    };
  }

  const validated = validateBatchRunExport(parsed);
  if (validated.kind === "error") {
    return {
      kind: "error",
      reason: validated.reason,
      message: validated.message,
    };
  }
  return {
    kind: "ok",
    artifact: validated.artifact,
    filename,
  };
}

/**
 * Pure shape validator. Exposed so tests can exercise validation
 * without driving the FSA picker.
 */
export function validateBatchRunExport(parsed: unknown): ValidationResult {
  if (!isPlainObject(parsed)) {
    return {
      kind: "error",
      reason: "shape_mismatch",
      message: "Top-level value is not a JSON object.",
    };
  }

  if (!("export_version" in parsed)) {
    return {
      kind: "error",
      reason: "shape_mismatch",
      message: "Missing required field 'export_version'.",
    };
  }
  if (parsed.export_version !== 1) {
    return {
      kind: "error",
      reason: "wrong_export_version",
      message: `Unsupported export_version: ${JSON.stringify(
        parsed.export_version,
      )} (V1W-R consumes version 1 only).`,
    };
  }

  if (!("kind" in parsed)) {
    return {
      kind: "error",
      reason: "shape_mismatch",
      message: "Missing required field 'kind'.",
    };
  }
  if (parsed.kind !== "batch_run_export") {
    return {
      kind: "error",
      reason: "wrong_kind",
      message: `Unexpected kind: ${JSON.stringify(
        parsed.kind,
      )} (expected 'batch_run_export').`,
    };
  }

  for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
    if (!(field in parsed)) {
      return {
        kind: "error",
        reason: "shape_mismatch",
        message: `Missing required top-level field '${field}'.`,
      };
    }
  }

  const summary = (parsed as Record<string, unknown>).summary;
  if (!isPlainObject(summary)) {
    return {
      kind: "error",
      reason: "shape_mismatch",
      message: "Field 'summary' is not an object.",
    };
  }
  for (const f of REQUIRED_SUMMARY_COUNT_FIELDS) {
    if (typeof summary[f] !== "number") {
      return {
        kind: "error",
        reason: "shape_mismatch",
        message: `Field 'summary.${f}' is missing or not a number.`,
      };
    }
  }
  const sevCounts = summary.severity_counts;
  if (!isPlainObject(sevCounts)) {
    return {
      kind: "error",
      reason: "shape_mismatch",
      message: "Field 'summary.severity_counts' is missing or not an object.",
    };
  }
  for (const k of REQUIRED_SEVERITY_KEYS) {
    if (typeof sevCounts[k] !== "number") {
      return {
        kind: "error",
        reason: "shape_mismatch",
        message: `Field 'summary.severity_counts.${k}' is missing or not a number.`,
      };
    }
  }

  const devices = (parsed as Record<string, unknown>).devices;
  if (!Array.isArray(devices)) {
    return {
      kind: "error",
      reason: "shape_mismatch",
      message: "Field 'devices' is not an array.",
    };
  }

  const generatedBy = (parsed as Record<string, unknown>).generated_by;
  if (!isPlainObject(generatedBy)) {
    return {
      kind: "error",
      reason: "shape_mismatch",
      message: "Field 'generated_by' is missing or not an object.",
    };
  }
  if (generatedBy.app_name !== "Anthracite") {
    return {
      kind: "error",
      reason: "shape_mismatch",
      message: `Field 'generated_by.app_name' is ${JSON.stringify(
        generatedBy.app_name,
      )} (expected 'Anthracite').`,
    };
  }

  return {
    kind: "ok",
    artifact: parsed as unknown as BatchRunExport,
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
