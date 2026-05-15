/**
 * HOME / Environment Centre.
 *
 * The front door of Anthracite. Per
 * `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §5, the operator
 * lands here — not in topology. This surface consumes the Environment
 * Engine via the typed Tauri command boundary in `src/api/environment.ts`.
 *
 * V1C scope:
 *   - Active environment, environment list, network scope summary.
 *   - Mode rail with placeholder links to BUILD, OPERATE, DIAGNOSE,
 *     INTELLIGENCE, FORGE, ASSESS.
 *   - No domain logic in this component. Reads + writes go through the
 *     Environment API.
 */

import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import type { Environment, EnvironmentStatus } from "../types/environment";
import {
  getActiveEnvironment,
  listEnvironments,
  setActiveEnvironment,
} from "../api/environment";
import "./HomeEnvironmentCentre.css";

type LoadState = "loading" | "ready" | "error";

interface ModeEntry {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
}

const MODES: readonly ModeEntry[] = [
  { id: "build", label: "BUILD", hint: "Architect's Desk" },
  { id: "operate", label: "OPERATE", hint: "War Room" },
  { id: "diagnose", label: "DIAGNOSE", hint: "Forensic Lab" },
  { id: "intelligence", label: "INTELLIGENCE", hint: "Forge Library" },
  { id: "forge", label: "FORGE", hint: "Protocol Workshop" },
  { id: "assess", label: "ASSESS", hint: "One-Button Assessment" },
];

const STATUS_LABEL: Record<EnvironmentStatus, string> = {
  healthy: "HEALTHY",
  degraded: "DEGRADED",
  offline: "OFFLINE",
  unknown: "UNKNOWN",
};

export function HomeEnvironmentCentre(): JSX.Element {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, active] = await Promise.all([
          listEnvironments(),
          getActiveEnvironment(),
        ]);
        if (cancelled) return;
        setEnvs(list);
        setActiveId(active?.id ?? list[0]?.id ?? null);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeEnv = useMemo<Environment | null>(
    () => envs.find((e) => e.id === activeId) ?? null,
    [envs, activeId],
  );

  const totals = useMemo(() => {
    const deviceTotal = envs.reduce((sum, e) => sum + e.device_count, 0);
    const byStatus: Record<EnvironmentStatus, number> = {
      healthy: 0,
      degraded: 0,
      offline: 0,
      unknown: 0,
    };
    for (const e of envs) byStatus[e.status] += 1;
    return { deviceTotal, envCount: envs.length, byStatus };
  }, [envs]);

  const onSelect = useCallback(
    async (id: string) => {
      if (id === activeId || switching !== null) return;
      setSwitching(id);
      try {
        const updated = await setActiveEnvironment(id);
        setActiveId(updated.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setState("error");
      } finally {
        setSwitching(null);
      }
    },
    [activeId, switching],
  );

  if (state === "loading") {
    return (
      <section className="home-centre home-centre--loading" aria-busy="true">
        <p className="home-centre__placeholder">LOADING ENVIRONMENT ENGINE …</p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="home-centre home-centre--error" role="alert">
        <h2 className="home-centre__title">ENVIRONMENT ENGINE — ERROR</h2>
        <p className="home-centre__placeholder">{error ?? "unknown error"}</p>
      </section>
    );
  }

  return (
    <section className="home-centre" aria-label="Home Environment Centre">
      <header className="home-centre__header">
        <div className="home-centre__heading">
          <span className="home-centre__eyebrow">HOME / ENVIRONMENT CENTRE</span>
          <h2 className="home-centre__title">
            {activeEnv ? activeEnv.name : "NO ENVIRONMENT SELECTED"}
          </h2>
          {activeEnv && (
            <p className="home-centre__meta">
              <span className="kv"><span className="kv__k">id</span><span className="kv__v">{activeEnv.id}</span></span>
              <span className="kv"><span className="kv__k">kind</span><span className="kv__v">{activeEnv.kind}</span></span>
              <span className="kv"><span className="kv__k">updated</span><span className="kv__v">{activeEnv.updated_at}</span></span>
              <span className={`status status--${activeEnv.status}`}>{STATUS_LABEL[activeEnv.status]}</span>
            </p>
          )}
        </div>
      </header>

      <div className="home-centre__body">
        <section className="centre-block centre-block--scope" aria-label="Network scope summary">
          <h3 className="centre-block__title">NETWORK SCOPE</h3>
          <dl className="scope-grid">
            <div className="scope-grid__cell">
              <dt>ENVIRONMENTS</dt>
              <dd>{totals.envCount}</dd>
            </div>
            <div className="scope-grid__cell">
              <dt>DEVICES</dt>
              <dd>{totals.deviceTotal.toLocaleString("en-US")}</dd>
            </div>
            <div className="scope-grid__cell">
              <dt>HEALTHY</dt>
              <dd className="status--healthy">{totals.byStatus.healthy}</dd>
            </div>
            <div className="scope-grid__cell">
              <dt>DEGRADED</dt>
              <dd className="status--degraded">{totals.byStatus.degraded}</dd>
            </div>
            <div className="scope-grid__cell">
              <dt>OFFLINE</dt>
              <dd className="status--offline">{totals.byStatus.offline}</dd>
            </div>
            <div className="scope-grid__cell">
              <dt>UNKNOWN</dt>
              <dd className="status--unknown">{totals.byStatus.unknown}</dd>
            </div>
          </dl>
        </section>

        <section className="centre-block centre-block--envs" aria-label="Environment selector">
          <h3 className="centre-block__title">ENVIRONMENTS</h3>
          <table className="env-table" role="grid">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">NAME</th>
                <th scope="col">KIND</th>
                <th scope="col" className="env-table__num">DEVICES</th>
                <th scope="col">STATUS</th>
                <th scope="col">UPDATED</th>
                <th scope="col" className="env-table__sel">SEL</th>
              </tr>
            </thead>
            <tbody>
              {envs.map((e) => {
                const isActive = e.id === activeId;
                const isSwitching = switching === e.id;
                return (
                  <tr
                    key={e.id}
                    className={isActive ? "env-row env-row--active" : "env-row"}
                    onClick={() => { void onSelect(e.id); }}
                    aria-selected={isActive}
                  >
                    <td className="env-table__id">{e.id}</td>
                    <td>{e.name}</td>
                    <td>{e.kind}</td>
                    <td className="env-table__num">{e.device_count.toLocaleString("en-US")}</td>
                    <td>
                      <span className={`status status--${e.status}`}>{STATUS_LABEL[e.status]}</span>
                    </td>
                    <td className="env-table__id">{e.updated_at}</td>
                    <td className="env-table__sel">
                      {isSwitching ? "…" : isActive ? "●" : "○"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {activeEnv && (
            <p className="env-summary">{activeEnv.summary}</p>
          )}
        </section>

        <section className="centre-block centre-block--modes" aria-label="Mode rail">
          <h3 className="centre-block__title">MODES</h3>
          <ul className="mode-rail">
            {MODES.map((m) => (
              <li key={m.id} className="mode-rail__item">
                <button
                  type="button"
                  className="mode-rail__btn"
                  disabled
                  aria-disabled="true"
                  title={`${m.hint} — not yet implemented`}
                >
                  <span className="mode-rail__label">{m.label}</span>
                  <span className="mode-rail__hint">{m.hint}</span>
                  <span className="mode-rail__state">PENDING</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
