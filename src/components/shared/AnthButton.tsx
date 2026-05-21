/**
 * D1B — AnthButton primitive.
 *
 * Single button grammar across modes. Consumes D1 tokens
 * (focus/motion/elevation/accent-action). Preserves disabled, focus,
 * pressed/selected semantics. No navigation side effects beyond the
 * caller-provided onClick.
 *
 * Variants:
 *   primary | secondary | ghost | toolbar | danger | success
 *   rail | chip-action | icon-only
 */

import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";
import { AnthIcon, type AnthIconSize } from "../icons/AnthIcon";
import "./AnthButton.css";

export type AnthButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "toolbar"
  | "danger"
  | "success"
  | "rail"
  | "chip-action"
  | "icon-only";

export type AnthButtonSize = "sm" | "md" | "lg";

export interface AnthButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  readonly variant?: AnthButtonVariant;
  readonly size?: AnthButtonSize;
  readonly iconId?: string;
  readonly iconSize?: AnthIconSize;
  readonly trailingIconId?: string;
  readonly pressed?: boolean;
  readonly selected?: boolean;
  readonly type?: "button" | "submit" | "reset";
  readonly testid?: string;
  readonly children?: ReactNode;
}

export function AnthButton({
  variant = "secondary",
  size = "md",
  iconId,
  iconSize,
  trailingIconId,
  pressed,
  selected,
  type = "button",
  testid,
  children,
  className,
  disabled,
  ...rest
}: AnthButtonProps): JSX.Element {
  const dataTestid = testid ?? `anth-btn-${variant}`;
  const isIconOnly = variant === "icon-only";
  const computedIconSize: AnthIconSize =
    iconSize ?? (size === "lg" ? "lg" : size === "sm" ? "sm" : "md");

  const classes = [
    "anth-btn",
    `anth-btn--${variant}`,
    `anth-btn--size-${size}`,
    pressed ? "is-pressed" : "",
    selected ? "is-selected" : "",
    isIconOnly ? "anth-btn--icon-only" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-pressed={pressed}
      data-pressed={pressed ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-variant={variant}
      data-size={size}
      data-testid={dataTestid}
      className={classes}
    >
      {iconId && (
        <AnthIcon id={iconId} size={computedIconSize} testid={`${dataTestid}-icon`} />
      )}
      {!isIconOnly && children !== undefined && (
        <span className="anth-btn__label">{children}</span>
      )}
      {trailingIconId && !isIconOnly && (
        <AnthIcon
          id={trailingIconId}
          size={computedIconSize}
          testid={`${dataTestid}-trailing`}
        />
      )}
    </button>
  );
}
