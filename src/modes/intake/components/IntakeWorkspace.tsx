/**
 * V1P-A IntakeWorkspace — two-lane workspace primitive.
 *
 * Pure layout. Zero state, zero side effects. Renders a left
 * "work lane" (operator-facing) and a right "answer lane"
 * (engine-truth) separated by a 1px hairline seam.
 *
 * V1P-A refinement: when `answerLane` is null the workspace
 * collapses to a single full-width work lane — no empty-state
 * panel, no seam, no answer column. The answer lane only
 * materialises once the operator has produced engine-truth
 * content (validation in-flight, validation failure, or a
 * parsed receipt). Visibility is derived from the caller's
 * passed `answerLane` value; no new state.
 *
 * Narrow-width collapse (< ~1100px) is handled in intake.css
 * via media query against `.intake-workspace`. No JS layout
 * logic.
 *
 * Composition only: this component never wraps its children's
 * internal markup, only the lane containers. Per
 * `INTAKE_SURFACE_CONTRACT.md` "Workspace layout (V1P-A
 * overlay)", the lane-item rail is owned by the wrapper and
 * carries semantic meaning.
 */

import type { JSX, ReactNode } from "react";

export interface IntakeWorkspaceProps {
  /**
   * Left work-lane content. Operator-facing decisions:
   * Config Input, Detection, Manual Override, Parse Status.
   */
  readonly workLane: ReactNode;

  /**
   * Right answer-lane content. Engine-truth surface:
   * FindingsPanel, ReceiptDisplay, validator banners. When
   * null the workspace collapses to a single full-width work
   * lane — no answer column rendered.
   */
  readonly answerLane: ReactNode | null;

  /**
   * Optional aria-label override for the whole workspace.
   * Defaults to "Intake workspace".
   */
  readonly ariaLabel?: string;
}

export function IntakeWorkspace(props: IntakeWorkspaceProps): JSX.Element {
  const label = props.ariaLabel ?? "Intake workspace";
  const hasAnswer = props.answerLane != null;
  const rootClass = hasAnswer
    ? "intake-workspace"
    : "intake-workspace intake-workspace--single-lane";
  return (
    <section className={rootClass} aria-label={label}>
      <div
        className="intake-workspace__lane intake-workspace__lane--work"
        aria-label="Work lane"
      >
        {props.workLane}
      </div>
      {hasAnswer && (
        <>
          <div className="intake-workspace__seam" aria-hidden="true" />
          <div
            className="intake-workspace__lane intake-workspace__lane--answer"
            aria-label="Answer lane"
          >
            {props.answerLane}
          </div>
        </>
      )}
    </section>
  );
}
