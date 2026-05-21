/**
 * D1 — Chip primitive.
 *
 * Single component grammar for capability / readiness / risk / status
 * surfaces across modes. Consumes the chip semantic tokens from
 * `src/styles/tokens.css` only — no inline colors, no per-mode override.
 *
 * Variants:
 *   - capability: available | partial | deferred | blocked
 *   - readiness:  empty | partial | ready | blocked
 *   - risk:       info | warning | critical
 *   - status:     ok | warn | err | info | idle  (generic shell status)
 *
 * Tone is derived from variant + value. Callers pass the value, not raw
 * colors. Future redesign retunes tokens in one place.
 */

import type { JSX, ReactNode } from "react";
import "./Chip.css";

export type CapabilityTone = "available" | "partial" | "deferred" | "blocked";
export type ReadinessTone = "empty" | "partial" | "ready" | "blocked";
export type RiskTone = "info" | "warning" | "critical";
export type StatusTone = "ok" | "warn" | "err" | "info" | "idle";

export type ChipVariant = "capability" | "readiness" | "risk" | "status";

export type ChipTone =
  | CapabilityTone
  | ReadinessTone
  | RiskTone
  | StatusTone;

export interface ChipProps {
  readonly variant: ChipVariant;
  readonly tone: ChipTone;
  readonly children: ReactNode;
  /** Optional small leading dot for emphasis. */
  readonly dot?: boolean;
  /** Optional testid override; default `chip-{variant}-{tone}`. */
  readonly testid?: string;
}

export function Chip({
  variant,
  tone,
  children,
  dot = false,
  testid,
}: ChipProps): JSX.Element {
  const dataTestid = testid ?? `chip-${variant}-${tone}`;
  return (
    <span
      className={`anth-chip anth-chip--${variant} anth-chip--${variant}-${tone}`}
      data-variant={variant}
      data-tone={tone}
      data-testid={dataTestid}
    >
      {dot && <span className="anth-chip__dot" aria-hidden="true" />}
      <span className="anth-chip__label">{children}</span>
    </span>
  );
}
