import type { JSX } from "react";
import { MODE_STATUS } from "../../data/modeStatus";
import { MODE_LABELS, type ModeId } from "../../components/shell/ModeRail";
import { DataSourceTag } from "../../components/shell/DataSourceTag";
import "./OpsConsoleMode.css";

export function OpsConsoleMode(): JSX.Element {
  const engineEntries = (Object.keys(MODE_STATUS) as ModeId[]).filter((id) => id !== "opsConsole");

  return (
    <div className="ops-console-mode">
      <section className="ocm-section">
        <h3 className="ocm-heading">
          Engines <DataSourceTag state="real" />
        </h3>
        <p className="ocm-note">Engine readiness snapshot. Real-time wiring lands with each engine.</p>
        <ul className="ocm-engine-list">
          {engineEntries.map((id) => {
            const s = MODE_STATUS[id];
            return (
              <li key={id} className="ocm-engine-row">
                <span className="ocm-mode-label">{MODE_LABELS[id] ?? id}</span>
                <span className={`ocm-pill ocm-pill--${s.state}`}>
                  {s.state === "built" ? "connected" : "not connected"}
                </span>
                <span className="ocm-engine-name">{s.engineName}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
