/**
 * D3B — Cortex result row.
 *
 * Renders a single CortexEntry in the overlay result list:
 *   - LED (state)
 *   - kind icon
 *   - label
 *   - breadcrumb (mode ▸ group ▸ child)
 *   - scope chip
 *   - state chip (when not "available")
 *
 * Obeys D3_NAV_SPEC §7 result-row anatomy.
 */

import type { JSX, MouseEvent } from "react";
import type {
  CatalogueState,
  ChildKind,
} from "../../contracts/modeCatalogue";
import type { CortexEntry } from "../navigation/cortexCatalogueAdapter";
import { AnthIcon } from "../icons/AnthIcon";

const STATE_LED_CLASS: Record<CatalogueState, string> = {
  available: "cortex-led--available",
  partial:   "cortex-led--partial",
  deferred:  "cortex-led--deferred",
  blocked:   "cortex-led--blocked",
};

const STATE_CHIP_LABEL: Record<CatalogueState, string> = {
  available: "Available",
  partial:   "Partial",
  deferred:  "Deferred",
  blocked:   "Blocked",
};

const SCOPE_CHIP_LABEL: Record<string, string> = {
  modes:     "Mode",
  workflows: "Workflow",
  tools:     "Tool",
  surfaces:  "Surface",
  groups:    "Group",
  foot:      "Foot",
};

const CHILD_KIND_TO_SCOPE: Record<ChildKind, string> = {
  tool:     "tools",
  workflow: "workflows",
  surface:  "surfaces",
  group:    "groups",
};

export interface CortexResultRowProps {
  readonly entry: CortexEntry;
  readonly index: number;
  readonly isHighlighted: boolean;
  readonly onHover: (index: number) => void;
  readonly onActivate: () => void;
}

function scopeForEntry(entry: CortexEntry): string {
  if (entry.kind === "mode") return "modes";
  if (entry.kind === "foot") return "foot";
  return CHILD_KIND_TO_SCOPE[entry.childKind];
}

function rowClassName(entry: CortexEntry, isHighlighted: boolean): string {
  const parts = ["cortex-result"];
  if (isHighlighted) parts.push("cortex-result--highlighted");
  if (entry.state === "deferred") parts.push("cortex-result--deferred");
  if (entry.state === "blocked") parts.push("cortex-result--blocked");
  return parts.join(" ");
}

export function CortexResultRow({
  entry,
  index,
  isHighlighted,
  onHover,
  onActivate,
}: CortexResultRowProps): JSX.Element {
  const scope = scopeForEntry(entry);
  const ledClass = STATE_LED_CLASS[entry.state];
  // Drop the first two breadcrumb segments (group + mode) for mode-kind rows,
  // since the label already says the mode name. For child rows keep the
  // full mode▸group▸child trail. For foot rows show only the foot label.
  const breadcrumbSegments =
    entry.kind === "child"
      ? entry.breadcrumb.slice(0, -1) // omit the leaf (label shows it)
      : entry.kind === "mode"
        ? entry.breadcrumb.slice(0, 1) // just the group
        : [];

  const reason =
    entry.kind !== "foot"
      ? entry.state === "deferred"
        ? entry.deferredReason
        : entry.state === "blocked"
          ? entry.blockedReason
          : undefined
      : undefined;

  const handleClick = (e: MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    onActivate();
  };

  const handleMouseEnter = (): void => {
    onHover(index);
  };

  return (
    <div
      className={rowClassName(entry, isHighlighted)}
      role="option"
      aria-selected={isHighlighted}
      data-highlighted={isHighlighted ? "true" : undefined}
      data-kind={entry.kind}
      data-state={entry.state}
      data-testid={`cortex-result-${entry.entryId}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      title={reason}
    >
      <span className={`cortex-led ${ledClass}`} aria-hidden="true" />

      <span className="cortex-result__icon" aria-hidden="true">
        <AnthIcon id={entry.iconId} size="sm" />
      </span>

      <div className="cortex-result__body">
        <div className="cortex-result__primary">
          <span className="cortex-result__label">{entry.label}</span>
          <span className={`cortex-chip cortex-chip--scope cortex-chip--scope-${scope}`}>
            {SCOPE_CHIP_LABEL[scope] ?? scope}
          </span>
          {entry.state !== "available" && (
            <span className={`cortex-chip cortex-chip--state cortex-chip--state-${entry.state}`}>
              {STATE_CHIP_LABEL[entry.state]}
            </span>
          )}
        </div>
        {breadcrumbSegments.length > 0 && (
          <div className="cortex-result__breadcrumb">
            {breadcrumbSegments.map((seg, i) => (
              <span key={`${i}-${seg}`} className="cortex-result__crumb">
                {i > 0 && <span className="cortex-result__crumb-sep">›</span>}
                <span>{seg}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {entry.kind === "child" && typeof entry.badge === "number" && entry.badge > 0 && (
        <span className="cortex-result__badge">{entry.badge}</span>
      )}

      <span className="cortex-result__hint" aria-hidden="true">↵</span>
    </div>
  );
}
