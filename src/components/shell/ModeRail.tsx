import type { JSX, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import {
  MODE_CATALOGUE,
  projectCatalogueGroups,
  propagateBadges,
  type ModeCatalogue,
} from "../../contracts/modeCatalogue";
import { AnthIcon } from "../icons/AnthIcon";

/**
 * ModeId: string-literal union of all catalogue mode + foot ids.
 * Derived from the v3 catalogue structure.
 *
 * NOTE: This list is manually maintained to match MODE_CATALOGUE.
 * Boot-time assertion in App.tsx guards catalogue ids ⊆ ModeId.
 */
export type ModeId =
  | "hierarchy"
  | "devices"
  | "intake"
  | "discovery"
  | "provisioning"
  | "operate"
  | "topology"
  | "diagnose"
  | "assess"
  | "events"
  | "security"
  | "dashboards"
  | "build"
  | "settings"
  | "opsConsole";

export type ModeRailVariant = "labeled" | "icons";

export interface ModeRailProps {
  readonly active: ModeId;
  readonly variant?: ModeRailVariant;
  readonly catalogue?: ModeCatalogue;
  readonly onChange?: (id: ModeId) => void;
  readonly alertCounts?: Readonly<Record<ModeId, number>>;
  /** D3C — When the operator presses Right on a rail row, focus moves into the sidebar (when present). */
  readonly onRequestSidebarFocus?: () => void;
}

/**
 * Build MODE_LABELS from the catalogue.
 * Used by App.tsx and other mode-aware components.
 */
function buildModeLabels(catalogue: ModeCatalogue): Record<ModeId, string> {
  const record: Record<string, string> = {};
  for (const mode of catalogue.modes) {
    record[mode.id] = mode.label;
  }
  for (const foot of catalogue.foot) {
    record[foot.id] = foot.label;
  }
  return record as Record<ModeId, string>;
}

export const MODE_LABELS: Record<ModeId, string> = buildModeLabels(MODE_CATALOGUE);

/**
 * Dev-only boot check: ensure all catalogue mode/foot ids are in the ModeId union.
 */
export function assertCatalogueIdsCoverModeId(catalogue: ModeCatalogue = MODE_CATALOGUE): void {
  const modeIdRecord: Record<string, true> = {
    hierarchy: true,
    devices: true,
    intake: true,
    discovery: true,
    provisioning: true,
    operate: true,
    topology: true,
    diagnose: true,
    assess: true,
    events: true,
    security: true,
    dashboards: true,
    build: true,
    settings: true,
    opsConsole: true,
  };

  for (const mode of catalogue.modes) {
    if (!(mode.id in modeIdRecord)) {
      throw new Error(`ModeRail: catalogue mode "${mode.id}" not in ModeId union`);
    }
  }

  for (const foot of catalogue.foot) {
    if (!(foot.id in modeIdRecord)) {
      throw new Error(`ModeRail: catalogue foot "${foot.id}" not in ModeId union`);
    }
  }
}

/**
 * ModeRail — catalogue-driven navigation.
 *
 * Renders:
 *   - Mode groups (Foundation, Run, Governance, Workshop) with sticky headers (labeled variant)
 *   - Mode rows with state LED, icon, label, optional alert badge
 *   - Foot section (Ops Console) at the bottom
 *   - Supports "labeled" (196px expanded) and "icons" (56px collapsed) variants
 *   - Group separator (1px) in icons variant
 *   - Keyboard: up/down traversal across modes (group headers skipped), Enter activates
 */
export function ModeRail({
  active,
  variant = "labeled",
  catalogue = propagateBadges(MODE_CATALOGUE),
  onChange,
  alertCounts,
  onRequestSidebarFocus,
}: ModeRailProps): JSX.Element {
  const groups = projectCatalogueGroups(catalogue);
  const allModes = catalogue.modes;
  const footEntries = catalogue.foot;

  // Flatten all focusable items (modes + foot) for keyboard navigation
  const focusableIds: ModeId[] = [
    ...allModes.map((m) => m.id as ModeId),
    ...footEntries.map((f) => f.id as ModeId),
  ];

  const handleKeyDown = (e: ReactKeyboardEvent): void => {
    const { key } = e;
    if (
      key !== "ArrowUp" &&
      key !== "ArrowDown" &&
      key !== "Home" &&
      key !== "End" &&
      key !== "Enter" &&
      key !== " " &&
      key !== "ArrowRight"
    ) {
      return;
    }
    e.preventDefault();

    if (key === "ArrowRight") {
      onRequestSidebarFocus?.();
      return;
    }
    if (key === "Enter" || key === " ") {
      onChange?.(active);
      return;
    }

    const currentIdx = focusableIds.indexOf(active);
    let nextIdx = currentIdx;

    if (key === "ArrowDown") {
      nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % focusableIds.length;
    } else if (key === "ArrowUp") {
      nextIdx = currentIdx === -1
        ? focusableIds.length - 1
        : (currentIdx - 1 + focusableIds.length) % focusableIds.length;
    } else if (key === "Home") {
      nextIdx = 0;
    } else if (key === "End") {
      nextIdx = focusableIds.length - 1;
    }

    const nextId = focusableIds[nextIdx];
    if (nextId) onChange?.(nextId);
  };

  return (
    <nav
      className={`anth-rail ${variant}`}
      aria-label="Workspace modes"
      onKeyDown={handleKeyDown}
      data-testid="nav-rail"
    >
      {groups.map((group) => (
        <RailGroup
          key={group.id}
          group={group}
          active={active}
          variant={variant}
          catalogue={catalogue}
          onChange={onChange}
          alertCounts={alertCounts}
        />
      ))}
      <div className="rail-foot">
        {footEntries.map((foot) => {
          const isActive = foot.id === active;
          return (
            <div
              key={foot.id}
              className={`item${isActive ? " active" : ""}`}
              role="button"
              tabIndex={isActive ? 0 : -1}
              aria-pressed={isActive}
              aria-current={isActive ? "page" : undefined}
              aria-label={foot.label}
              onClick={() => onChange?.(foot.id as ModeId)}
              data-testid={`nav-rail-foot-${foot.id}`}
              data-active={isActive ? "true" : undefined}
            >
              <AnthIcon id={foot.iconId} size={variant === "icons" ? "sm" : "sm"} />
              <span className="lbl">{foot.label}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

interface RailGroupProps {
  readonly group: { readonly id: string; readonly label: string; readonly modes: readonly any[] };
  readonly active: ModeId;
  readonly variant: ModeRailVariant;
  readonly catalogue: ModeCatalogue;
  readonly onChange?: (id: ModeId) => void;
  readonly alertCounts?: Readonly<Record<ModeId, number>>;
}

function RailGroup({
  group,
  active,
  variant,
  catalogue,
  onChange,
  alertCounts,
}: RailGroupProps): JSX.Element {
  const modes = catalogue.modes.filter((m) => m.group === group.label);

  return (
    <>
      {variant === "labeled" && (
        <div className="group-label" data-group={group.id}>{group.label}</div>
      )}
      {modes.map((mode) => {
        const isActive = mode.id === active;
        // Use override if provided; otherwise use catalogue badge
        const alertCount = alertCounts?.[mode.id as ModeId] ?? mode.badges?.alerts ?? 0;
        const cls = ["item", isActive ? "active" : "", alertCount > 0 ? "has-alert" : ""]
          .join(" ")
          .trim();

        const badgeNode: ReactNode =
          alertCount > 0 ? <span className="badge num">{alertCount}</span> : null;

        // State LED color from mode.state
        const stateLedClass = `led ${mode.state}`;

        return (
          <div
            key={mode.id}
            className={cls}
            role="button"
            tabIndex={isActive ? 0 : -1}
            aria-pressed={isActive}
            aria-current={isActive ? "page" : undefined}
            aria-label={mode.label}
            onClick={() => onChange?.(mode.id as ModeId)}
            data-testid={`nav-rail-mode-${mode.id}`}
            data-active={isActive ? "true" : undefined}
          >
            <div className={stateLedClass}></div>
            <AnthIcon id={mode.iconId} size="sm" />
            <span className="lbl">{mode.label}</span>
            {badgeNode}
          </div>
        );
      })}
      {variant === "icons" && modes.length > 0 && <div className="group-sep"></div>}
    </>
  );
}
