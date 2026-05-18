import type { JSX } from "react";
import { MODE_STATUS } from "../../data/modeStatus";
import { MODE_LABELS, type ModeId } from "../../components/shell/ModeRail";
import { DataSourceTag } from "../../components/shell/DataSourceTag";
import type { DiscoverySourceView } from "../../data/discoverySource";
import "./OpsConsoleMode.css";

export interface OpsConsoleModeProps {
  readonly discovery: DiscoverySourceView;
}

export function OpsConsoleMode({ discovery }: OpsConsoleModeProps): JSX.Element {
  const engineEntries = (Object.keys(MODE_STATUS) as ModeId[]).filter((id) => id !== "opsConsole");

  // Scope label: explicit env id when present, else "All environments".
  const scopeLabel = discovery.environmentId ?? "All environments";

  // State label: title-case the sourceState.
  const stateLabel =
    discovery.sourceState === "empty"
      ? "Empty"
      : discovery.sourceState === "real"
        ? "Real"
        : discovery.sourceState === "unavailable"
          ? "Unavailable"
          : "Not connected";

  // Records label: "—" when unavailable or not_connected, else localized count.
  const recordsLabel =
    discovery.sourceState === "unavailable" || discovery.sourceState === "not_connected"
      ? "—"
      : discovery.totalRecords.toLocaleString("en-US");

  return (
    <div className="ops-console-mode">
      <section className="ocm-section">
        <h3 className="ocm-heading">
          Engines <DataSourceTag state="real" />
        </h3>
        <p className="ocm-note">Engine readiness snapshot. Real-time wiring lands with each engine.</p>
        <ul className="ocm-engine-list" data-testid="ocm-engines">
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

      <section className="ocm-section" data-testid="ocm-discovery">
        <h3 className="ocm-heading">
          Discovery Inventory <DataSourceTag state={discovery.sourceState} />
        </h3>
        <p className="ocm-note">Live read from the Discovery Engine command.</p>
        <ul className="ocm-engine-list">
          <li className="ocm-engine-row">
            <span className="ocm-mode-label">Source</span>
            <span className="ocm-pill">Discovery Engine</span>
            <span className="ocm-engine-name">discovery_inventory</span>
          </li>
          <li className="ocm-engine-row">
            <span className="ocm-mode-label">Scope</span>
            <span className="ocm-pill">{scopeLabel}</span>
            <span className="ocm-engine-name">environment_id</span>
          </li>
          <li className="ocm-engine-row">
            <span className="ocm-mode-label">State</span>
            <span className="ocm-pill">{stateLabel}</span>
            <span className="ocm-engine-name">source_state</span>
          </li>
          <li className="ocm-engine-row">
            <span className="ocm-mode-label">Records</span>
            <span className="ocm-pill">{recordsLabel}</span>
            <span className="ocm-engine-name">total_records</span>
          </li>
          <li className="ocm-engine-row">
            <span className="ocm-mode-label">Message</span>
            <span className="ocm-pill" style={{ gridColumn: "2 / span 2" }}>
              {discovery.message}
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
