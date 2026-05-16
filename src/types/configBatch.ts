/**
 * Config Splitter Engine — TypeScript surface (V1O-A).
 *
 * Mirrors `src-tauri/src/engines/config_splitter.rs`. Rust is
 * authoritative; this file describes the wire shape the Tauri command
 * boundary returns. Renaming a shipped field is forbidden.
 */

export interface ConfigSlice {
  readonly slice_id: string;
  readonly line_start: number;
  readonly line_end: number;
  readonly raw_text: string;
  readonly confidence: number;
  readonly hint: SliceHint;
}

export type SliceHint =
  | { readonly kind: "none" }
  | { readonly kind: "hostname_present"; readonly hostname: string }
  | { readonly kind: "vendor_header_detected"; readonly header: string };

export type SplitMethod =
  | { readonly kind: "explicit_separator"; readonly pattern: string }
  | { readonly kind: "heuristic" }
  | { readonly kind: "single_config" }
  | { readonly kind: "no_split_possible" };

export type BatchWarning =
  | { readonly kind: "empty_input" }
  | { readonly kind: "whitespace_only" }
  | { readonly kind: "input_truncated"; readonly scanned: number; readonly total: number }
  | { readonly kind: "no_split_possible" }
  | { readonly kind: "no_separators_found" }
  | { readonly kind: "ambiguous_boundary"; readonly near_line: number }
  | { readonly kind: "empty_slice_produced"; readonly slice_id: string }
  | { readonly kind: "low_confidence_split"; readonly slice_id: string }
  | { readonly kind: "unusually_large_batch"; readonly device_count: number };

export interface ConfigBatchSplitResult {
  readonly slices: ReadonlyArray<ConfigSlice>;
  readonly method: SplitMethod;
  readonly warnings: ReadonlyArray<BatchWarning>;
  readonly total_line_count: number;
  readonly scanned_line_count: number;
  readonly splitter_version: string;
}
