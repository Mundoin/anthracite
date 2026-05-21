/**
 * D2 — DashboardCard.
 *
 * Single card composing Surface + AnthIcon + Chip + primary/secondary
 * metrics + target meta. Consumes a V1CG DashboardCardContract entry
 * plus a resolved projection from cardMetricResolver. Click is optional;
 * default inert with target metadata visible.
 */

import type { JSX, KeyboardEvent } from "react";
import type { DashboardCardContract } from "../../state/designHandoffContract";
import { AnthIcon } from "../icons/AnthIcon";
import { Chip } from "../shell/Chip";
import type { DashboardCardProjection } from "./cardMetricResolver";
import "./DashboardCard.css";

export interface DashboardCardProps {
  readonly contract: DashboardCardContract;
  readonly projection: DashboardCardProjection;
  readonly onActivate?: (contract: DashboardCardContract) => void;
}

export function DashboardCard({
  contract,
  projection,
  onActivate,
}: DashboardCardProps): JSX.Element {
  const interactive = onActivate !== undefined && !projection.disabled;
  const testid = `dashboard-card-${contract.id}`;

  const handleClick = (): void => {
    if (interactive && onActivate !== undefined) onActivate(contract);
  };
  const handleKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (!interactive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate?.(contract);
    }
  };

  return (
    <div
      className={`anth-dashcard${projection.disabled ? " is-disabled" : ""}${interactive ? " is-interactive" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-disabled={projection.disabled || undefined}
      data-card-id={contract.id}
      data-target-mode={contract.target_mode}
      data-target-tool-id={contract.target_tool_id ?? ""}
      data-testid={testid}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={interactive ? handleKey : undefined}
    >
      <header className="anth-dashcard__hd">
        <span className="anth-dashcard__icon">
          <AnthIcon id={projection.iconId} size="md" testid={`${testid}-icon`} />
        </span>
        <h3 className="anth-dashcard__title">{contract.title}</h3>
        <span className="anth-dashcard__chip">
          <Chip
            variant={projection.chip.variant}
            tone={projection.chip.tone}
            testid={`${testid}-chip`}
          >
            {projection.chip.label}
          </Chip>
        </span>
      </header>

      <div className="anth-dashcard__metric-row">
        <span
          className="anth-dashcard__metric"
          data-testid={`${testid}-metric`}
        >
          {projection.metric}
        </span>
        {projection.secondaryMetric !== null && (
          <span
            className="anth-dashcard__metric-sec"
            data-testid={`${testid}-metric-sec`}
          >
            {projection.secondaryMetric}
          </span>
        )}
      </div>

      <p
        className="anth-dashcard__summary"
        data-testid={`${testid}-summary`}
      >
        {projection.summary}
      </p>

      <footer className="anth-dashcard__ft">
        <span
          className="anth-dashcard__target"
          data-testid={`${testid}-target`}
        >
          → {contract.target_mode}
          {contract.target_tool_id !== null && ` / ${contract.target_tool_id}`}
        </span>
      </footer>
    </div>
  );
}
