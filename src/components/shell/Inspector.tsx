import type { JSX, ReactNode } from "react";
import { IcoEye, IcoLink, IcoMore, IcoTerminal } from "./icons";
import type { StatusSignal } from "./StatusBar";
import { DataSourceTag } from "./DataSourceTag";
import type { DataSourceState } from "../../types/dataSource";

export interface InspectorTabSpec {
  readonly id: string;
  readonly label: string;
}

export interface InspectorIdentityRow {
  readonly k: string;
  readonly v: string;
}

export interface InspectorHealthCell {
  readonly label: string;
  readonly value: string;
  readonly pct?: number;
  readonly source?: DataSourceState;
}

export interface InspectorInterfaceRow {
  readonly status: StatusSignal;
  readonly name: string;
  readonly peer: string;
  readonly bw: string;
}

export interface InspectorBaselineRow {
  readonly tone: "ok" | "warn" | "err" | "info" | "idle";
  readonly label: string;
  readonly note?: string;
}

export interface InspectorSubject {
  readonly status: StatusSignal;
  readonly title: string;
  readonly subtitle: string;
}

export interface InspectorProps {
  readonly subject?: InspectorSubject;
  readonly tabs?: readonly InspectorTabSpec[];
  readonly activeTabId?: string;
  readonly onTabChange?: (id: string) => void;
  readonly identity?: readonly InspectorIdentityRow[];
  readonly health?: readonly InspectorHealthCell[];
  readonly interfaces?: readonly InspectorInterfaceRow[];
  readonly baselines?: readonly InspectorBaselineRow[];
  readonly events?: ReactNode;
  readonly source?: DataSourceState;
}

/** Right-docked inspector (340 px default). Empty state vs D2 subject view. */
export function Inspector({
  subject,
  tabs,
  activeTabId,
  onTabChange,
  identity,
  health,
  interfaces,
  baselines,
  events,
  source,
}: InspectorProps): JSX.Element {
  if (!subject) {
    return (
      <aside className="anth-inspector" aria-label="Inspector">
        <div className="anth-empty">
          <div className="glyph">·</div>
          <h2>No selection</h2>
          <p>
            Pick an environment or device to populate the inspector. Subject-
            specific tabs surface here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="anth-inspector" aria-label="Inspector">
      <div className="insp-header">
        <span
          className={`dot ${subject.status}`}
          style={{ width: 8, height: 8 }}
        />
        <div className="body">
          <div className="lbl">{subject.title}</div>
          <div className="sub">{subject.subtitle}</div>
        </div>
        <span className="btn sm ghost" aria-label="Pop out">
          <IcoLink size={12} />
        </span>
        <span className="btn sm ghost" aria-label="Dock options">
          <IcoMore size={13} />
        </span>
      </div>

      {tabs && tabs.length > 0 && (
        <div className="insp-tabs" role="tablist">
          {tabs.map((t) => (
            <div
              key={t.id}
              role="tab"
              tabIndex={0}
              aria-selected={t.id === activeTabId}
              className={`tab ${t.id === activeTabId ? "active" : ""}`}
              onClick={() => onTabChange?.(t.id)}
            >
              {t.label}
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto" }}>
        {identity && identity.length > 0 && (
          <div className="insp-section">
            <h4>Identity</h4>
            <dl className="kv">
              {identity.map((r) => (
                <FragmentDl key={r.k} k={r.k} v={r.v} />
              ))}
            </dl>
          </div>
        )}

        {health && health.length > 0 && (
          <div className="insp-section">
            <h4 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              Health · 1 m
              {source && <DataSourceTag state={source} />}
            </h4>
            <div className="health-grid">
              {health.map((h) => (
                <div key={h.label} className="health-cell">
                  <div className="h-lbl">{h.label}</div>
                  <div className="h-val">{h.value}</div>
                  {h.pct !== undefined && h.pct > 0 && (
                    <div className="h-bar">
                      <div style={{ width: `${h.pct}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {interfaces && interfaces.length > 0 && (
          <div className="insp-section">
            <h4>Top interfaces · 1 m</h4>
            {interfaces.map((r, i) => (
              <div key={`${r.name}-${i}`} className="iface-row">
                <span className={`dot ${r.status}`} />
                <span className="iname">{r.name}</span>
                <span className="ipeer">{r.peer}</span>
                <span className="ibw">{r.bw}</span>
              </div>
            ))}
          </div>
        )}

        {baselines && baselines.length > 0 && (
          <div className="insp-section">
            <h4>Baselines</h4>
            {baselines.map((b, i) => (
              <div
                key={`${b.label}-${i}`}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 11,
                  marginTop: i === 0 ? 0 : 6,
                }}
              >
                <span className={`chip ${b.tone}`}>{b.label}</span>
                {b.note && (
                  <span
                    style={{
                      flex: 1,
                      color: "var(--anth-text-3)",
                      fontSize: 10.5,
                    }}
                  >
                    {b.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {events && (
          <div className="insp-section" style={{ borderBottom: "none" }}>
            <h4>Recent events</h4>
            {events}
          </div>
        )}
      </div>

      <div className="insp-footer">
        <span className="btn sm" style={{ flex: 1, justifyContent: "center" }}>
          <IcoTerminal size={12} /> SSH
        </span>
        <span className="btn sm" style={{ flex: 1, justifyContent: "center" }}>
          <IcoEye size={12} /> Topology
        </span>
        <span className="btn sm primary" style={{ flex: 1, justifyContent: "center" }}>
          Run check
        </span>
      </div>
    </aside>
  );
}

function FragmentDl({ k, v }: { k: string; v: string }): JSX.Element {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}
