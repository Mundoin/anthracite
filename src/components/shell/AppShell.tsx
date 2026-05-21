import type { CSSProperties, JSX, ReactNode } from "react";
import { TitleBar, type TitleBarEnv } from "./TitleBar";
import { ModeRail, type ModeId } from "./ModeRail";
import { OpsStrip } from "./OpsStrip";
import { StatusBar, type StatusCell } from "./StatusBar";
import { ModeErrorBoundary } from "./ModeErrorBoundary";

export interface AppShellProps {
  readonly env: TitleBarEnv | null;
  readonly crumbs: readonly string[];
  readonly activeMode: ModeId;
  readonly onModeChange?: (id: ModeId) => void;
  readonly onCortexOpen?: () => void;
  readonly onEnvSwitchOpen?: () => void;
  readonly onCrumbClick?: (index: number) => void;
  readonly subnav?: ReactNode;
  readonly contextSidebar?: ReactNode;
  readonly secondary?: ReactNode;
  readonly inspector?: ReactNode;
  readonly statusLeft?: readonly StatusCell[];
  readonly statusRight?: readonly StatusCell[];
  readonly overlay?: ReactNode;
  readonly children: ReactNode;
}

/** Direction D shell composition (titlebar · sub-nav · body · ops · status). */
export function AppShell({
  env,
  crumbs,
  activeMode,
  onModeChange,
  onCortexOpen,
  onEnvSwitchOpen,
  onCrumbClick,
  subnav,
  contextSidebar,
  secondary,
  inspector,
  statusLeft,
  statusRight,
  overlay,
  children,
}: AppShellProps): JSX.Element {
  const cols: string[] = ["196px"];

  // Grid layout: rail → (contextSidebar OR secondary) → main → inspector
  // - If secondary is supplied, it takes precedence (existing behavior).
  // - If only contextSidebar is supplied, use 260px.
  // - If both are supplied, render only secondary (existing behavior).
  // - If neither, just main.
  let sidebarNode: ReactNode;
  if (secondary) {
    cols.push("220px");
    sidebarNode = secondary;
  } else if (contextSidebar) {
    cols.push("260px");
    sidebarNode = contextSidebar;
  } else {
    sidebarNode = undefined;
  }

  cols.push("1fr");
  if (inspector) cols.push("340px");

  const style: CSSProperties = {
    gridTemplateColumns: cols.join(" "),
  };

  return (
    <div
      className={`anth anth-shell ${subnav ? "" : "anth-shell--no-subnav"}`}
      style={style}
      data-density="compact"
    >
      <TitleBar
        env={env}
        crumbs={crumbs}
        onCortexOpen={onCortexOpen}
        onEnvSwitchOpen={onEnvSwitchOpen}
        onCrumbClick={onCrumbClick}
      />

      {subnav}

      <ModeRail active={activeMode} onChange={onModeChange} />
      {sidebarNode}
      <main className="anth-work" aria-label="Workspace">
        <div className="anth-work__content">
          <ModeErrorBoundary key={activeMode} modeId={activeMode}>
            {children}
          </ModeErrorBoundary>
        </div>
      </main>
      {inspector}

      <OpsStrip />
      <StatusBar left={statusLeft} right={statusRight} />

      {overlay}
    </div>
  );
}
