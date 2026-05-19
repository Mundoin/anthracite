import { useCallback, useEffect, useState, type JSX, type MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Wraps `getCurrentWindow()` so a missing or transient
 * `window.__TAURI_INTERNALS__` (e.g. dev HMR mid-reload, jsdom in
 * tests, broken bridge) returns null instead of throwing during
 * render/effect. Without this guard a throw here escapes the
 * ModeErrorBoundary (which lives below the shell) and unmounts the
 * whole React root to a blank window.
 */
function safeGetCurrentWindow(): ReturnType<typeof getCurrentWindow> | null {
  try {
    return getCurrentWindow();
  } catch (err) {
    console.error("[TitleBar] getCurrentWindow unavailable:", err);
    return null;
  }
}
import {
  AnthMark,
  IcoBell,
  IcoChevD,
  IcoMax,
  IcoMin,
  IcoSearch,
  IcoUser,
  IcoX,
} from "./icons";

export type EnvDotState = "ok" | "warn" | "err" | "info" | "idle";

export interface TitleBarEnv {
  readonly id: string;
  readonly scope: string;
  readonly state: EnvDotState;
}

export interface TitleBarProps {
  readonly env: TitleBarEnv | null;
  readonly crumbs: readonly string[];
  readonly onCortexOpen?: () => void;
  readonly onEnvSwitchOpen?: () => void;
  readonly onCrumbClick?: (index: number) => void;
}

/**
 * Anything that should *not* initiate a window drag — buttons, inputs, links,
 * and any interactive cluster marked `.anth-no-drag`. The check walks up the
 * DOM, so child icons inside a <button> also resolve as interactive.
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    target.closest(
      'button, a, input, select, textarea, [role="button"], .anth-no-drag',
    ) !== null
  );
}

export function TitleBar({
  env,
  crumbs,
  onCortexOpen,
  onEnvSwitchOpen,
  onCrumbClick,
}: TitleBarProps): JSX.Element {
  const [isMax, setIsMax] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const win = safeGetCurrentWindow();
    if (win === null) {
      return () => {
        cancelled = true;
      };
    }
    void win
      .isMaximized()
      .then((v) => {
        if (!cancelled) setIsMax(v);
      })
      .catch((err) => { console.error("[TitleBar] window call failed", err); });
    const unlistenP = win.onResized(() => {
      void win
        .isMaximized()
        .then((v) => {
          if (!cancelled) setIsMax(v);
        })
        .catch((err) => { console.error("[TitleBar] window call failed", err); });
    });
    return () => {
      cancelled = true;
      void unlistenP.then((un) => un()).catch((err) => { console.error("[TitleBar] window call failed", err); });
    };
  }, []);

  const onTitlebarMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (isInteractiveTarget(e.target)) return;
    e.preventDefault();
    const win = safeGetCurrentWindow();
    if (win === null) return;
    void win.startDragging().catch((err) => { console.error("[TitleBar] window call failed", err); });
  }, []);

  const onTitlebarDoubleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(e.target)) return;
    const win = safeGetCurrentWindow();
    if (win === null) return;
    void win.toggleMaximize().catch((err) => { console.error("[TitleBar] window call failed", err); });
  }, []);

  const onMinimize = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const win = safeGetCurrentWindow();
    if (win === null) return;
    void win.minimize().catch((err) => { console.error("[TitleBar] window call failed", err); });
  }, []);

  const onToggleMaximize = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const win = safeGetCurrentWindow();
    if (win === null) return;
    void win.toggleMaximize().catch((err) => { console.error("[TitleBar] window call failed", err); });
  }, []);

  const onClose = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const win = safeGetCurrentWindow();
    if (win === null) return;
    void win.close().catch((err) => { console.error("[TitleBar] window call failed", err); });
  }, []);

  return (
    <div
      className="anth-titlebar"
      onMouseDown={onTitlebarMouseDown}
      onDoubleClick={onTitlebarDoubleClick}
    >
      <div className="anth-tb-brand">
        <AnthMark size={18} />
        <div className="name">Anthracite</div>
      </div>

      <button
        type="button"
        className="anth-tb-env anth-no-drag"
        onClick={(e) => {
          e.stopPropagation();
          onEnvSwitchOpen?.();
        }}
        aria-label="Switch environment"
      >
        <span className={`env-dot ${env?.state ?? "idle"}`} />
        <span className="env-name mono">{env?.id ?? "—"}</span>
        <span className="env-scope">· {env?.scope ?? "no environment"}</span>
        <span className="chev">
          <IcoChevD size={12} />
        </span>
      </button>

      {crumbs.length > 0 && (
        <div className="anth-tb-crumbs">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            const clickable = !last && onCrumbClick !== undefined;
            if (clickable) {
              return (
                <span
                  key={`${i}-${c}`}
                  style={{ display: "inline-flex", gap: 6 }}
                >
                  {i > 0 && <span className="sep">/</span>}
                  <button
                    type="button"
                    className="anth-no-drag"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCrumbClick(i);
                    }}
                    style={{
                      all: "unset",
                      cursor: "default",
                      color: "inherit",
                      font: "inherit",
                      textDecoration: "underline",
                      textDecorationColor: "transparent",
                    }}
                    onMouseEnter={(ev) => {
                      (ev.currentTarget as HTMLButtonElement).style.textDecorationColor =
                        "var(--anth-text-muted)";
                    }}
                    onMouseLeave={(ev) => {
                      (ev.currentTarget as HTMLButtonElement).style.textDecorationColor =
                        "transparent";
                    }}
                  >
                    {c}
                  </button>
                </span>
              );
            }
            return (
              <span
                key={`${i}-${c}`}
                style={{ display: "inline-flex", gap: 6 }}
              >
                {i > 0 && <span className="sep">/</span>}
                <span className={last ? "last" : ""}>{c}</span>
              </span>
            );
          })}
        </div>
      )}

      <div className="anth-tb-spacer" />

      <button
        type="button"
        className="anth-tb-cortex anth-no-drag"
        onClick={(e) => {
          e.stopPropagation();
          onCortexOpen?.();
        }}
        aria-label="Open Cortex"
      >
        <span className="icon">
          <IcoSearch size={13} />
        </span>
        <span className="placeholder">Cortex — jump, search, run…</span>
        <span className="kbd">Ctrl</span>
        <span className="kbd">K</span>
      </button>

      <button
        type="button"
        className="anth-tb-icon anth-no-drag"
        aria-label="Notifications"
        onClick={(e) => e.stopPropagation()}
      >
        <IcoBell size={15} />
      </button>
      <button
        type="button"
        className="anth-tb-icon anth-no-drag"
        aria-label="Account"
        onClick={(e) => e.stopPropagation()}
      >
        <IcoUser size={15} />
      </button>

      <div className="anth-tb-winctrls anth-no-drag">
        <button type="button" aria-label="Minimize" onClick={onMinimize}>
          <IcoMin size={14} />
        </button>
        <button
          type="button"
          aria-label={isMax ? "Restore" : "Maximize"}
          onClick={onToggleMaximize}
        >
          <IcoMax size={11} />
        </button>
        <button
          type="button"
          className="close"
          aria-label="Close"
          onClick={onClose}
        >
          <IcoX size={13} />
        </button>
      </div>
    </div>
  );
}
