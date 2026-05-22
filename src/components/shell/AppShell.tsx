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
  /** D3C — Right-arrow from rail requests focus into the context sidebar (when present). */
  readonly onRequestSidebarFocus?: () => void;
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
  onRequestSidebarFocus,
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

  // D3T-P2A — Subnav (mode-local top shelf) aligns with the work
  // surface: it starts at the column right of the NAVIGATION SHELL
  // (rail + chrome sidebar), not at the app left edge.
  //
  // D3T-P2C — Distinguish chrome sidebar vs content secondary:
  // - contextSidebar  : chrome — subnav starts at col 3, sidebar spans
  //                     row 2 / 4 to fill the band above its body.
  // - secondary (e.g. Hierarchy environments list): CONTENT — subnav
  //                     extends over col 2 (start col 2), and secondary
  //                     occupies only the body row (auto / row 3) so
  //                     it sits BELOW the shelf, not inside it.
  // - none            : subnav starts at col 2 (just right of the rail).
  const subnavStartCol = contextSidebar && !secondary ? 3 : 2;

  return (
    <div
      className="anth anth-shell"
      style={style}
      data-density="compact"
      data-subnav-start={subnavStartCol}
    >
      <TitleBar
        env={env}
        crumbs={crumbs}
        onCortexOpen={onCortexOpen}
        onEnvSwitchOpen={onEnvSwitchOpen}
        onCrumbClick={onCrumbClick}
      />

      {subnav ?? (
        <div
          className="anth-subnav anth-subnav--placeholder"
          role="tablist"
          aria-label={`${crumbs[crumbs.length - 1] ?? "Mode"} sections`}
        >
          <div className="seg seg--placeholder" aria-disabled="true">
            <span>{crumbs[crumbs.length - 1] ?? "Mode"}</span>
          </div>
          <div className="grow" />
          <div className="anth-subnav__hint mono">no sections yet</div>
        </div>
      )}

      <ModeRail
        active={activeMode}
        onChange={onModeChange}
        onRequestSidebarFocus={contextSidebar ? onRequestSidebarFocus : undefined}
      />
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
