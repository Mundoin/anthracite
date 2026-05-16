/**
 * Config Detection Engine — TypeScript surface (V1J).
 *
 * Mirrors `src-tauri/src/engines/config_detection.rs`. Rust is
 * authoritative; this file describes the wire shape the Tauri command
 * boundary returns. Renaming a shipped field is forbidden.
 */

import type { PlatformRef } from "./networkModel";

export type SignatureCategory =
  | "generic"
  | "distinctive"
  | "header"
  | "structural";

export interface DetectionCandidate {
  readonly platform_id: string;
  readonly score: number;
  readonly normalized_score: number;
  readonly match_count: number;
  readonly distinct_signature_count: number;
}

export interface DetectionEvidence {
  readonly platform_id: string;
  readonly signature_id: string;
  readonly category: SignatureCategory;
  readonly weight: number;
  readonly line_number: number;
  readonly preview: string;
  readonly reason: string;
}

export type DetectionWarning =
  | { readonly kind: "empty_input" }
  | {
      readonly kind: "input_truncated";
      readonly scanned: number;
      readonly total: number;
    }
  | { readonly kind: "low_confidence"; readonly best_score: number }
  | {
      readonly kind: "ambiguous";
      readonly top_score: number;
      readonly runner_up_score: number;
    }
  | { readonly kind: "no_signatures_matched" };

export interface ConfigDetectionResult {
  readonly best_match: PlatformRef | null;
  readonly candidates: ReadonlyArray<DetectionCandidate>;
  readonly evidence: ReadonlyArray<DetectionEvidence>;
  readonly confidence: number;
  readonly warnings: ReadonlyArray<DetectionWarning>;
  readonly scanned_line_count: number;
  readonly total_line_count: number;
}
