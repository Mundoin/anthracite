/**
 * Receipt projection — TypeScript surface (V1L).
 *
 * Mirrors `src-tauri/src/engines/receipt.rs`. Receipts are a view over
 * `DeviceModel`, not a parallel truth. The Rust side is authoritative;
 * keep this in sync — renaming a shipped field is forbidden.
 */

import type {
  EvidenceSourceKind,
  ParserMaturityObserved,
  UnknownReason,
} from "./networkModel";

export type ReceiptAreaStatus =
  | "populated"
  | "absent"
  | "not_in_scope"
  | "warning";

export interface ReceiptArea {
  readonly name: string;
  readonly status: ReceiptAreaStatus;
  readonly populated_count: number;
}

export interface ReceiptUnknown {
  readonly line_start: number | null;
  readonly line_end: number | null;
  readonly context_path: string | null;
  readonly reason: UnknownReason | null;
  readonly raw: string;
}

export interface ReceiptView {
  readonly hostname: string | null;
  readonly platform_id: string | null;
  readonly os_version: string | null;
  readonly source: string | null;
  readonly source_kind: EvidenceSourceKind | null;
  readonly byte_size: number | null;
  readonly line_count: number | null;
  readonly parser_version: string | null;
  readonly registry_version: string | null;
  readonly score: number | null;
  readonly coverage_ratio: number;
  readonly parsed_line_count: number;
  readonly unknown_line_count: number;
  readonly observed_maturity: ParserMaturityObserved | null;
  readonly areas: ReadonlyArray<ReceiptArea>;
  readonly warnings: ReadonlyArray<string>;
  readonly unknowns: ReadonlyArray<ReceiptUnknown>;
  readonly unknowns_truncated: boolean;
}
