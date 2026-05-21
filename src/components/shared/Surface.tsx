/**
 * D1B — Surface primitive.
 *
 * Single container grammar over the D1 elevation/density tokens.
 * Variants:
 *   - panel:   flat panel, --anth-elev-1
 *   - card:    raised card, --anth-elev-2
 *   - raised:  emphasized card, --anth-elev-2 + stronger border
 *   - inset:   sunken background (forms, code blocks)
 *   - toolbar: chrome strip (status/sub-nav adjacent surfaces)
 *   - overlay: floating overlay/modal, --anth-elev-3
 *
 * Consumers stay HTML-semantic (article/section/div) via `as` prop.
 */

import type { ElementType, JSX, ReactNode } from "react";
import "./Surface.css";

export type SurfaceVariant =
  | "panel"
  | "card"
  | "raised"
  | "inset"
  | "toolbar"
  | "overlay";

export type SurfacePadding = "none" | "tight" | "default" | "comfortable";

export interface SurfaceProps {
  readonly variant?: SurfaceVariant;
  readonly padding?: SurfacePadding;
  readonly as?: ElementType;
  readonly className?: string;
  readonly testid?: string;
  readonly children: ReactNode;
  readonly ariaLabel?: string;
}

export function Surface({
  variant = "panel",
  padding = "default",
  as,
  className,
  testid,
  children,
  ariaLabel,
}: SurfaceProps): JSX.Element {
  const Tag: ElementType = as ?? "div";
  const dataTestid = testid ?? `surface-${variant}`;
  const classes = [
    "anth-surface",
    `anth-surface--${variant}`,
    `anth-surface--pad-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      className={classes}
      data-variant={variant}
      data-padding={padding}
      data-testid={dataTestid}
      aria-label={ariaLabel}
    >
      {children}
    </Tag>
  );
}
