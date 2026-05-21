/**
 * D1B — ActionTile primitive.
 *
 * Tile-style call-to-action used by dashboard cards, mode-tool
 * launchers, next-action prompts, deferred-feature placards, and
 * critical-state callouts. Composes AnthIcon + Chip + Surface.
 *
 * NO navigation side effects — caller passes onActivate; tile is a
 * presentational button. Disabled state respected. Status chip is
 * derived from variant by default; caller may override.
 */

import type { JSX, KeyboardEvent, ReactNode } from "react";
import { AnthIcon } from "../icons/AnthIcon";
import { Chip, type ChipTone, type ChipVariant } from "../shell/Chip";
import "./ActionTile.css";

export type ActionTileVariant =
  | "dashboard"
  | "mode-tool"
  | "next-action"
  | "deferred"
  | "critical";

export interface ActionTileChip {
  readonly variant: ChipVariant;
  readonly tone: ChipTone;
  readonly label: string;
}

export interface ActionTileProps {
  readonly variant?: ActionTileVariant;
  readonly title: string;
  readonly summary?: string;
  readonly iconId?: string;
  readonly chip?: ActionTileChip;
  readonly metric?: string;
  readonly secondaryMetric?: string;
  readonly disabled?: boolean;
  readonly onActivate?: () => void;
  readonly testid?: string;
  readonly children?: ReactNode;
}

function defaultChip(variant: ActionTileVariant): ActionTileChip | null {
  switch (variant) {
    case "deferred":
      return { variant: "capability", tone: "deferred", label: "Deferred" };
    case "critical":
      return { variant: "risk", tone: "critical", label: "Critical" };
    default:
      return null;
  }
}

export function ActionTile({
  variant = "dashboard",
  title,
  summary,
  iconId,
  chip,
  metric,
  secondaryMetric,
  disabled,
  onActivate,
  testid,
  children,
}: ActionTileProps): JSX.Element {
  const dataTestid = testid ?? `action-tile-${variant}`;
  const resolvedChip = chip ?? defaultChip(variant);
  const interactive = onActivate !== undefined && !disabled;

  const handleClick = (): void => {
    if (interactive && onActivate !== undefined) onActivate();
  };
  const handleKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (!interactive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate?.();
    }
  };

  return (
    <div
      className={`anth-action-tile anth-action-tile--${variant}${disabled ? " is-disabled" : ""}${interactive ? " is-interactive" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-disabled={disabled || undefined}
      data-variant={variant}
      data-testid={dataTestid}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={interactive ? handleKey : undefined}
    >
      <header className="anth-action-tile__hd">
        {iconId && (
          <span className="anth-action-tile__icon">
            <AnthIcon id={iconId} size="md" testid={`${dataTestid}-icon`} />
          </span>
        )}
        <h3 className="anth-action-tile__title">{title}</h3>
        {resolvedChip && (
          <span className="anth-action-tile__chip">
            <Chip variant={resolvedChip.variant} tone={resolvedChip.tone}>
              {resolvedChip.label}
            </Chip>
          </span>
        )}
      </header>
      {(metric !== undefined || secondaryMetric !== undefined) && (
        <div className="anth-action-tile__metrics">
          {metric !== undefined && (
            <span
              className="anth-action-tile__metric"
              data-testid={`${dataTestid}-metric`}
            >
              {metric}
            </span>
          )}
          {secondaryMetric !== undefined && (
            <span
              className="anth-action-tile__metric-sec"
              data-testid={`${dataTestid}-metric-sec`}
            >
              {secondaryMetric}
            </span>
          )}
        </div>
      )}
      {summary !== undefined && (
        <p className="anth-action-tile__summary">{summary}</p>
      )}
      {children !== undefined && (
        <div className="anth-action-tile__body">{children}</div>
      )}
    </div>
  );
}
