import type { JSX } from "react";
import {
  IcoExport,
  IcoFilter,
  IcoMore,
  IcoPlus,
  IcoRefresh,
  IcoSearch,
} from "../shell/icons";
import type { StatusSignal } from "../shell/StatusBar";

export interface KpiSpec {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  readonly delta?: string;
  readonly deltaDir?: "up" | "down" | "flat";
  readonly parts?: readonly [number, number, number];
}

export interface EnvRow {
  readonly id: string;
  readonly status: StatusSignal;
  readonly region: string;
  readonly scope: string;
  readonly devices: number;
  readonly sites: number;
  readonly readiness: number;
  readonly l2: number;
  readonly l3: number;
  readonly ebgp: number;
  readonly drift: number;
  readonly events: number;
  readonly owner: string;
  readonly last: string;
}

export interface EnvironmentCentreD1Props {
  readonly kpis: readonly KpiSpec[];
  readonly rows: readonly EnvRow[];
  readonly selectedRowId?: string;
  readonly onSelectRow?: (id: string) => void;
}

/** D1 Env Centre work area: KPI ribbon + filter toolbar + dense env table. */
export function EnvironmentCentreD1({
  kpis,
  rows,
  selectedRowId,
  onSelectRow,
}: EnvironmentCentreD1Props): JSX.Element {
  return (
    <div
      style={{
        overflow: "auto",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "var(--anth-bg-app)",
        flex: 1,
        minHeight: 0,
      }}
    >
      <KpiRibbon kpis={kpis} />
      <EnvTable rows={rows} selectedRowId={selectedRowId} onSelectRow={onSelectRow} />
    </div>
  );
}

function KpiRibbon({ kpis }: { kpis: readonly KpiSpec[] }): JSX.Element {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))`,
        gap: 8,
      }}
    >
      {kpis.map((k) => (
        <KpiCard key={k.id} spec={k} />
      ))}
    </div>
  );
}

function KpiCard({ spec }: { spec: KpiSpec }): JSX.Element {
  const dir = spec.deltaDir ?? "flat";
  return (
    <div className="anth-kpi">
      <div className="k-lbl">{spec.label}</div>
      <div className="k-row">
        <div className="k-val">{spec.value}</div>
        {spec.delta && <div className={`k-delta ${dir}`}>{spec.delta}</div>}
      </div>
      <div className="k-sub">{spec.sub}</div>
      {spec.parts && (
        <div className="k-bar">
          <div style={{ flex: spec.parts[0], background: "var(--anth-ok)" }} />
          <div style={{ flex: spec.parts[1], background: "var(--anth-warn)" }} />
          <div style={{ flex: spec.parts[2], background: "var(--anth-err)" }} />
        </div>
      )}
    </div>
  );
}

function EnvTable({
  rows,
  selectedRowId,
  onSelectRow,
}: {
  rows: readonly EnvRow[];
  selectedRowId?: string;
  onSelectRow?: (id: string) => void;
}): JSX.Element {
  return (
    <div className="anth-panel" style={{ flex: 1, minHeight: 0 }}>
      <div className="anth-toolbar">
        <div className="search">
          <IcoSearch size={12} />
          <span className="mono" style={{ color: "var(--anth-text)" }}>
            readiness:&lt;95 AND scope:production
          </span>
        </div>
        <div className="filter">
          scope <b>:</b> production
        </div>
        <div className="filter">
          readiness <b>:</b> &lt; 95
        </div>
        <div className="filter">+ filter</div>
        <div className="grow" />
        <span className="muted" style={{ fontSize: 11 }}>
          {rows.length} of {rows.length} · 1 selected
        </span>
        <span className="btn sm ghost" aria-label="Filter">
          <IcoFilter size={12} />
        </span>
        <span className="btn sm ghost" aria-label="Refresh">
          <IcoRefresh size={12} />
        </span>
        <span className="btn sm">Compare</span>
        <span className="btn sm">
          <IcoExport size={12} /> Export
        </span>
        <span className="btn sm primary">
          <IcoPlus size={12} /> New environment
        </span>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        <table className="anth-table">
          <thead>
            <tr>
              <th style={{ width: 24 }} />
              <th>Environment</th>
              <th>Scope</th>
              <th className="colhead-num">Devices</th>
              <th className="colhead-num">Sites</th>
              <th>Readiness</th>
              <th>L2</th>
              <th>L3</th>
              <th>eBGP</th>
              <th className="colhead-num">Drift</th>
              <th className="colhead-num">Events</th>
              <th>Owner</th>
              <th>Last poll</th>
              <th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const sel = e.id === selectedRowId;
              return (
                <tr
                  key={e.id}
                  className={sel ? "selected" : ""}
                  onClick={() => onSelectRow?.(e.id)}
                  aria-selected={sel}
                >
                  <td>
                    <span className={`dot ${e.status}`} />
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                      <span className="mono" style={{ fontWeight: 600 }}>{e.id}</span>
                      <span style={{ fontSize: 10.5, color: "var(--anth-text-3)" }}>{e.region}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 11, color: "var(--anth-text-2)" }}>{e.scope}</span>
                  </td>
                  <td className="num right">{e.devices.toLocaleString("en-US")}</td>
                  <td className="num right">{e.sites}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
                      <div className="anth-meter">
                        <div
                          className={
                            e.readiness >= 90 ? "v-ok" : e.readiness >= 70 ? "v-warn" : "v-err"
                          }
                          style={{ width: `${e.readiness}%` }}
                        />
                      </div>
                      <span
                        className="mono num"
                        style={{ fontSize: 11, color: "var(--anth-text-2)", minWidth: 28 }}
                      >
                        {e.readiness}%
                      </span>
                    </div>
                  </td>
                  <SubReadinessCell v={e.l2} />
                  <SubReadinessCell v={e.l3} />
                  <SubReadinessCell v={e.ebgp} />
                  <td
                    className="num right"
                    style={{ color: e.drift > 50 ? "var(--anth-warn)" : "var(--anth-text-2)" }}
                  >
                    {e.drift}
                  </td>
                  <td className="right">
                    {e.events > 0 ? (
                      <span
                        className={`chip ${e.events > 10 ? "err" : e.events > 3 ? "warn" : "info"}`}
                      >
                        {e.events}
                      </span>
                    ) : (
                      <span className="num muted">—</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: 11.5, color: "var(--anth-text-2)" }}>{e.owner}</span>
                  </td>
                  <td className="num">{e.last}</td>
                  <td>
                    <span style={{ color: "var(--anth-text-muted)" }}>
                      <IcoMore size={14} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubReadinessCell({ v }: { v: number }): JSX.Element {
  const tone =
    v >= 95 ? "ok" : v >= 85 ? "warn" : "err";
  const bg =
    tone === "ok" ? "var(--anth-ok-tint)" : tone === "warn" ? "var(--anth-warn-tint)" : "var(--anth-err-tint)";
  const ink =
    tone === "ok" ? "var(--anth-ok-ink)" : tone === "warn" ? "var(--anth-warn-ink)" : "var(--anth-err-ink)";
  return (
    <td>
      <span
        className="mono num"
        style={{
          fontSize: 10.5,
          padding: "1px 6px",
          borderRadius: 2,
          background: bg,
          color: ink,
        }}
      >
        {v}
      </span>
    </td>
  );
}
