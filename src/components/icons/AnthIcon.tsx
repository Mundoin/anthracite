/**
 * D1B — AnthIcon component.
 *
 * Resolves semantic icon id → placeholder SVG from iconRegistry.tsx.
 * Unknown ids render a safe fallback square so missing artwork never
 * crashes the UI. Final artwork swaps via iconRegistry; consumers stay
 * stable.
 */

import type { JSX } from "react";
import { resolveIcon } from "./iconRegistry";

export type AnthIconSize = "sm" | "md" | "lg";

export interface AnthIconProps {
  readonly id: string;
  readonly size?: AnthIconSize;
  readonly title?: string;
  readonly testid?: string;
}

const SIZE_TOKEN: Record<AnthIconSize, string> = {
  sm: "var(--anth-icon-sm)",
  md: "var(--anth-icon-md)",
  lg: "var(--anth-icon-lg)",
};

export function AnthIcon({
  id,
  size = "md",
  title,
  testid,
}: AnthIconProps): JSX.Element {
  const descriptor = resolveIcon(id);
  const dim = SIZE_TOKEN[size];
  const dataTestid = testid ?? `anth-icon-${id}`;
  const isUnknown = descriptor === null;

  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-testid={dataTestid}
      data-icon-id={id}
      data-icon-unknown={isUnknown ? "true" : undefined}
      style={{ display: "inline-block", verticalAlign: "middle", flex: "0 0 auto" }}
    >
      {isUnknown ? (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="4" width="16" height="16" />
          <path d="m6 6 12 12M18 6 6 18" opacity="0.3" />
        </g>
      ) : (
        descriptor.render()
      )}
    </svg>
  );
}
