/**
 * V1BI — Inspection lock marks.
 *
 * Cyan radial reticles + corner lock brackets that fire during the
 * 240 ms forward tween and the 280 ms reverse tween. Pure SVG, no
 * Babylon, no runtime deps — drops into the receiver as an overlay
 * layer that pointer-events: none.
 */

import type { JSX } from "react";

export type LockMarksPhase = "map" | "entering" | "scene" | "exiting";

export interface InspectionLockMarksProps {
  readonly phase: LockMarksPhase;
}

const RETICLE_R = 28;
const RETICLE_TICK = 8;

export function InspectionLockMarks({
  phase,
}: InspectionLockMarksProps): JSX.Element | null {
  if (phase === "map") return null;

  const stage =
    phase === "entering"
      ? "lock"
      : phase === "scene"
        ? "settled"
        : "release";

  return (
    <div
      className="inspection-lock-marks"
      data-testid="inspection-lock-marks"
      data-stage={stage}
      aria-hidden="true"
    >
      <svg
        className="ilm-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* corner lock brackets — four 12-unit L-shaped ticks at viewport corners */}
        <g className="ilm-corner ilm-corner--tl">
          <path d="M 4 16 L 4 4 L 16 4" />
        </g>
        <g className="ilm-corner ilm-corner--tr">
          <path d="M 84 4 L 96 4 L 96 16" />
        </g>
        <g className="ilm-corner ilm-corner--bl">
          <path d="M 4 84 L 4 96 L 16 96" />
        </g>
        <g className="ilm-corner ilm-corner--br">
          <path d="M 96 84 L 96 96 L 84 96" />
        </g>

        {/* central stencil text strip — rendered via overlay element */}
      </svg>

      {/* central reticle — fixed-size SVG centred via CSS */}
      <svg
        className="ilm-reticle"
        viewBox={`-${RETICLE_R + 8} -${RETICLE_R + 8} ${(RETICLE_R + 8) * 2} ${(RETICLE_R + 8) * 2}`}
      >
        <circle className="ilm-reticle-ring" r={RETICLE_R} />
        <circle className="ilm-reticle-ring ilm-reticle-ring--inner" r={RETICLE_R / 2} />
        <g className="ilm-reticle-ticks">
          <line x1={0} y1={-RETICLE_R - RETICLE_TICK / 2} x2={0} y2={-RETICLE_R + RETICLE_TICK / 2} />
          <line x1={0} y1={RETICLE_R - RETICLE_TICK / 2} x2={0} y2={RETICLE_R + RETICLE_TICK / 2} />
          <line x1={-RETICLE_R - RETICLE_TICK / 2} y1={0} x2={-RETICLE_R + RETICLE_TICK / 2} y2={0} />
          <line x1={RETICLE_R - RETICLE_TICK / 2} y1={0} x2={RETICLE_R + RETICLE_TICK / 2} y2={0} />
        </g>
        <circle className="ilm-reticle-dot" r={1.6} />
      </svg>

      <div className="ilm-stencil" data-testid="ilm-stencil">
        {stage === "lock"
          ? "ENTERING HARDWARE INSPECTION"
          : stage === "release"
            ? "RELEASING INSPECTION"
            : ""}
      </div>
    </div>
  );
}
