/**
 * D2 — DashboardGrid.
 *
 * Renders the V1CG DesignHandoffContract.dashboard_cards as a
 * responsive grid of DashboardCards. Resolution is delegated to
 * cardMetricResolver.
 */

import type { JSX } from "react";
import type { DashboardCardContract } from "../../state/designHandoffContract";
import { DashboardCard } from "./DashboardCard";
import {
  resolveDashboardCard,
  type DashboardSpineBundle,
} from "./cardMetricResolver";
import "./DashboardGrid.css";

export interface DashboardGridProps {
  readonly cards: readonly DashboardCardContract[];
  readonly spines: DashboardSpineBundle;
  readonly onActivateCard?: (contract: DashboardCardContract) => void;
}

export function DashboardGrid({
  cards,
  spines,
  onActivateCard,
}: DashboardGridProps): JSX.Element {
  return (
    <div
      className="anth-dashboard-grid"
      data-testid="dashboard-grid"
      data-card-count={cards.length}
      role="list"
    >
      {cards.map((c) => {
        const projection = resolveDashboardCard(c.id, spines);
        return (
          <div
            key={c.id}
            className="anth-dashboard-grid__cell"
            role="listitem"
            data-testid={`dashboard-grid-cell-${c.id}`}
          >
            <DashboardCard
              contract={c}
              projection={projection}
              onActivate={onActivateCard}
            />
          </div>
        );
      })}
    </div>
  );
}
