import type { JSX } from "react";
import { IcoMap, IcoMore, IcoTable } from "../shell/icons";
import type { StatusSignal } from "../shell/StatusBar";

export interface KpiMiniSpec {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  readonly delta?: string;
  readonly deltaDir?: "up" | "down" | "flat";
}

export interface ReadinessDomain {
  readonly id: string;
  readonly label: string;
  readonly pct: number;
  readonly fraction: string;
  readonly status: "ok" | "warn" | "err";
}

export interface EventRow {
  readonly id: string;
  readonly t: string;
  readonly sev: StatusSignal;
  readonly src: string;
  readonly cat: string;
  readonly msg: string;
}

export interface SiteRow {
  readonly id: string;
  readonly status: StatusSignal;
  readonly site: string;
  readonly region: string;
  readonly role: string;
  readonly devices: number;
  readonly reach: number;
  readonly readiness: number;
  readonly events: number;
  readonly maint: string;
}

export interface EnvironmentDetailD2Props {
  readonly kpis: readonly KpiMiniSpec[];
  readonly domains: readonly ReadinessDomain[];
  readonly events: readonly EventRow[];
  readonly sites: readonly SiteRow[];
  readonly siteCount: number;
}

/** D2 Environment Detail body: 6-KPI strip · readiness-by-domain · open events · sites. */
export function EnvironmentDetailD2({
  kpis,
  domains,
  events,
  sites,
  siteCount,
}: EnvironmentDetailD2Props): JSX.Element {
  return (
    <div className="anth-d2-body">
      <div className="anth-d2-kpi-strip">
        {kpis.map((k) => (
          <KpiMini key={k.id} spec={k} />
        ))}
      </div>

      <div className="anth-panel" style={{ minHeight: 250 }}>
        <div className="anth-panel-hd">
          <span className="ttl">Readiness — by domain</span>
          <span className="sub">{domains.length} baselines</span>
        </div>
        <div
          className="anth-panel-bd"
          style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}
        >
          {domains.map((d) => (
            <div key={d.id} className="anth-bar-row">
              <span className="lbl">{d.label}</span>
              <div className="meter">
                <div className={`v-${d.status}`} style={{ width: `${d.pct}%` }} />
              </div>
              <span className="pct">{d.pct}%</span>
              <span className="n">{d.fraction}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="anth-panel" style={{ minHeight: 250 }}>
        <div className="anth-panel-hd">
          <span className="ttl">Open events</span>
          <span className="sub">last 60 minutes</span>
        </div>
        <div className="anth-panel-bd" style={{ overflow: "auto" }}>
          <table className="anth-table">
            <thead>
              <tr>
                <th style={{ width: 22 }} />
                <th>Time</th>
                <th>Source</th>
                <th>Category</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className={`dot ${e.sev}`} />
                  </td>
                  <td className="num">{e.t}</td>
                  <td className="mono">{e.src}</td>
                  <td>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: "var(--anth-text-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {e.cat}
                    </span>
                  </td>
                  <td style={{ color: "var(--anth-text-2)", fontSize: 11.5 }}>{e.msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="anth-panel anth-d2-span2">
        <div className="anth-panel-hd">
          <span className="ttl">Sites · {siteCount}</span>
          <span className="sub">{regionsOf(sites)} regions</span>
          <span className="actions" style={{ display: "flex", gap: 4, marginLeft: "auto", color: "var(--anth-text-3)" }}>
            <span className="btn sm ghost" aria-label="Table view">
              <IcoTable size={13} />
            </span>
            <span className="btn sm ghost" aria-label="Map view">
              <IcoMap size={13} />
            </span>
            <span className="btn sm ghost" aria-label="More">
              <IcoMore size={14} />
            </span>
          </span>
        </div>
        <div className="anth-panel-bd" style={{ overflow: "auto" }}>
          <table className="anth-table">
            <thead>
              <tr>
                <th style={{ width: 22 }} />
                <th>Site</th>
                <th>Region</th>
                <th>Role</th>
                <th className="colhead-num">Devices</th>
                <th className="colhead-num">Reach</th>
                <th>Readiness</th>
                <th className="colhead-num">Events</th>
                <th>Maintenance</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className={`dot ${s.status}`} />
                  </td>
                  <td className="mono" style={{ fontWeight: 600 }}>{s.site}</td>
                  <td>{s.region}</td>
                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--anth-text-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {s.role}
                    </span>
                  </td>
                  <td className="num right">{s.devices}</td>
                  <td className="num right">{s.reach}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
                      <div className="anth-meter">
                        <div
                          className={
                            s.readiness >= 95 ? "v-ok" : s.readiness >= 85 ? "v-warn" : "v-err"
                          }
                          style={{ width: `${s.readiness}%` }}
                        />
                      </div>
                      <span className="mono num" style={{ fontSize: 11, color: "var(--anth-text-2)" }}>
                        {s.readiness}%
                      </span>
                    </div>
                  </td>
                  <td className="right">
                    {s.events > 0 ? (
                      <span className={`chip ${s.events > 1 ? "warn" : "info"}`}>{s.events}</span>
                    ) : (
                      <span className="num muted">—</span>
                    )}
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: "var(--anth-text-3)" }}>
                    {s.maint}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiMini({ spec }: { spec: KpiMiniSpec }): JSX.Element {
  const dir = spec.deltaDir ?? "flat";
  return (
    <div className="anth-kpi anth-kpi--mini">
      <div className="k-lbl">{spec.label}</div>
      <div className="k-row">
        <div className="k-val">{spec.value}</div>
        {spec.delta && <div className={`k-delta ${dir}`}>{spec.delta}</div>}
      </div>
      <div className="k-sub">{spec.sub}</div>
    </div>
  );
}

function regionsOf(sites: readonly SiteRow[]): number {
  const set = new Set<string>();
  for (const s of sites) set.add(s.region);
  return set.size;
}
