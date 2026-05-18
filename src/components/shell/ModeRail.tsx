import type { JSX, ReactNode } from "react";
import {
  IcoAssess,
  IcoBuild,
  IcoDashboards,
  IcoDiagnose,
  IcoHierarchy,
  IcoIntake,
  IcoOperate,
  IcoProvision,
  IcoSecurity,
  IcoSettings,
  IcoTerminal,
  IcoTopology,
} from "./icons";

export type ModeId =
  | "hierarchy"
  | "intake"
  | "provisioning"
  | "operate"
  | "topology"
  | "diagnose"
  | "assess"
  | "security"
  | "dashboards"
  | "build"
  | "settings"
  | "opsConsole";

export type ModeGroupId = "foundation" | "run" | "governance" | "workshop";

interface ModeSpec {
  readonly id: ModeId;
  readonly label: string;
  readonly icon: (p: { size?: number; className?: string }) => JSX.Element;
}

interface ModeGroup {
  readonly id: ModeGroupId;
  readonly label: string;
  readonly modes: readonly ModeSpec[];
}

/** Mode catalogue grouped per Direction D shell contract. */
const MODE_GROUPS: readonly ModeGroup[] = [
  {
    id: "foundation",
    label: "Foundation",
    modes: [
      { id: "hierarchy",    label: "Hierarchy",    icon: IcoHierarchy },
      { id: "intake",       label: "Intake",       icon: IcoIntake },
      { id: "provisioning", label: "Provisioning", icon: IcoProvision },
    ],
  },
  {
    id: "run",
    label: "Run",
    modes: [
      { id: "operate",  label: "Operate",  icon: IcoOperate },
      { id: "topology", label: "Topology", icon: IcoTopology },
      { id: "diagnose", label: "Diagnose", icon: IcoDiagnose },
    ],
  },
  {
    id: "governance",
    label: "Governance",
    modes: [
      { id: "assess",     label: "Assess",     icon: IcoAssess },
      { id: "security",   label: "Security",   icon: IcoSecurity },
      { id: "dashboards", label: "Dashboards", icon: IcoDashboards },
    ],
  },
  {
    id: "workshop",
    label: "Workshop",
    modes: [
      { id: "build",    label: "Build",    icon: IcoBuild },
      { id: "settings", label: "Settings", icon: IcoSettings },
    ],
  },
];

export const MODE_LABELS: Record<ModeId, string> = Object.fromEntries(
  MODE_GROUPS.flatMap((g) => g.modes.map((m) => [m.id, m.label])),
) as Record<ModeId, string>;

export type ModeRailVariant = "labeled" | "icons";

export interface ModeRailProps {
  readonly active: ModeId;
  readonly variant?: ModeRailVariant;
  readonly badgeCounts?: Partial<Record<ModeId, number>>;
  readonly alertCounts?: Partial<Record<ModeId, number>>;
  readonly onChange?: (id: ModeId) => void;
}

export function ModeRail({
  active,
  variant = "labeled",
  badgeCounts,
  alertCounts,
  onChange,
}: ModeRailProps): JSX.Element {
  return (
    <nav className={`anth-rail ${variant}`} aria-label="Workspace modes">
      {MODE_GROUPS.map((group) => (
        <RailGroup
          key={group.id}
          group={group}
          active={active}
          variant={variant}
          badgeCounts={badgeCounts}
          alertCounts={alertCounts}
          onChange={onChange}
        />
      ))}
      <div className="rail-foot">
        <div
          className={`item${active === "opsConsole" ? " active" : ""}`}
          role="button"
          tabIndex={0}
          aria-pressed={active === "opsConsole"}
          aria-label="Ops Console"
          onClick={() => onChange?.("opsConsole")}
        >
          <IcoTerminal size={variant === "icons" ? 18 : 15} />
          <span className="lbl">Ops Console</span>
        </div>
      </div>
    </nav>
  );
}

interface RailGroupProps {
  readonly group: ModeGroup;
  readonly active: ModeId;
  readonly variant: ModeRailVariant;
  readonly badgeCounts?: Partial<Record<ModeId, number>>;
  readonly alertCounts?: Partial<Record<ModeId, number>>;
  readonly onChange?: (id: ModeId) => void;
}

function RailGroup({
  group,
  active,
  variant,
  badgeCounts,
  alertCounts,
  onChange,
}: RailGroupProps): JSX.Element {
  return (
    <>
      {variant === "labeled" && <div className="group-label">{group.label}</div>}
      {group.modes.map((m) => {
        const isActive = m.id === active;
        const alert = alertCounts?.[m.id] ?? 0;
        const badge = badgeCounts?.[m.id];
        const cls = ["item", isActive ? "active" : "", alert > 0 ? "has-alert" : ""].join(" ").trim();
        const badgeNode: ReactNode = alert > 0
          ? <span className="badge num">{alert}</span>
          : badge !== undefined && badge > 0
            ? <span className="badge num">{badge}</span>
            : null;
        return (
          <div
            key={m.id}
            className={cls}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={m.label}
            onClick={() => onChange?.(m.id)}
          >
            <m.icon size={variant === "icons" ? 18 : 15} />
            <span className="lbl">{m.label}</span>
            {badgeNode}
          </div>
        );
      })}
    </>
  );
}
