import type { JSX } from "react";
import { IcoPlus, IcoSearch } from "./icons";
import type { StatusSignal } from "./StatusBar";

export interface SecondaryNavItem {
  readonly id: string;
  readonly label: string;
  readonly sub: string;
  readonly status: StatusSignal;
  readonly badge?: number | string;
}

export interface SecondaryNavGroup {
  readonly id: string;
  readonly heading: string;
  readonly items: readonly SecondaryNavItem[];
}

export interface SecondaryNavProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly groups: readonly SecondaryNavGroup[];
  readonly selectedId?: string;
  readonly onSelect?: (id: string) => void;
  readonly onCreate?: () => void;
}

/** Per-mode object list column (220 px, D1 production / non-prod / special). */
export function SecondaryNav({
  title,
  subtitle,
  groups,
  selectedId,
  onSelect,
  onCreate,
}: SecondaryNavProps): JSX.Element {
  return (
    <aside className="anth-secondary" aria-label="Secondary navigation">
      <div className="anth-secondary__head">
        <div className="micro" style={{ marginBottom: 3 }}>{title}</div>
        {subtitle && <div className="title">{subtitle}</div>}
        <div className="anth-secondary__search">
          <IcoSearch size={11} />
          <span style={{ flex: 1 }}>Filter…</span>
          <span className="kbd" style={{ fontSize: 9.5 }}>/</span>
        </div>
      </div>

      <div className="anth-secondary__list">
        {groups.map((g) => (
          <div key={g.id} className="anth-secondary__group">
            <div className="anth-secondary__group-hd">{g.heading}</div>
            {g.items.map((it) => {
              const sel = it.id === selectedId;
              return (
                <div
                  key={it.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={sel}
                  className={`anth-secondary__item ${sel ? "sel" : ""}`}
                  onClick={() => onSelect?.(it.id)}
                >
                  <span className={`dot ${it.status}`} />
                  <div className="body">
                    <div className="lbl">{it.label}</div>
                    <div className="sub">{it.sub}</div>
                  </div>
                  {it.badge !== undefined && (
                    <span
                      className="mono num"
                      style={{ fontSize: 10, color: "var(--anth-text-muted)" }}
                    >
                      {it.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="anth-secondary__foot">
        <span
          className="btn sm"
          role="button"
          tabIndex={0}
          onClick={onCreate}
          style={{ width: "100%", justifyContent: "center" }}
        >
          <IcoPlus size={12} /> New
        </span>
      </div>
    </aside>
  );
}
