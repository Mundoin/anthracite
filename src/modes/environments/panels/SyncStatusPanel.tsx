import { type JSX, useMemo } from "react";
import { useEnvironmentLifecycle } from "../../../state/EnvironmentLifecycleContext";
import { useEnvSelectionStyle } from "../preferences/useEnvSelectionStyle";
import "./SyncStatusPanel.css";

function formatSavedAt(isoString: string | null): string {
  if (!isoString) return "never";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SyncStatusPanel(): JSX.Element {
  const lifecycle = useEnvironmentLifecycle();
  const active = lifecycle.active;
  const saveStatus = lifecycle.save_status;
  const { style: selectionStyle, setStyle: setSelectionStyle } = useEnvSelectionStyle();

  const statusLabel = useMemo(() => {
    if (!active) return "no active environment";
    if (active.sync_state === "dirty") return "dirty · unsaved changes";
    return "clean · all changes saved";
  }, [active]);

  const statusVariant = useMemo(() => {
    if (!active) return "gray";
    if (active.sync_state === "dirty") return "warn";
    return "ok";
  }, [active]);

  const lastSavedLabel = useMemo(() => {
    if (saveStatus.status === "saving") return "saving…";
    if (saveStatus.status === "error") return `error: ${saveStatus.error ?? "unknown"}`;
    if (saveStatus.status === "saved") {
      return `last saved ${formatSavedAt(saveStatus.last_saved_at)}`;
    }
    return "never saved to disk";
  }, [saveStatus]);

  return (
    <div className="sync-status-panel" data-testid="environments-sync">
      <div className="sync-status-panel__container">
        <div className="sync-status-panel__header">
          <h2 className="sync-status-panel__title">Sync Status</h2>
          <p className="sync-status-panel__subtitle">
            Local environment persistence and change tracking
          </p>
        </div>

        {!active ? (
          <div className="sync-status-panel__empty">
            <p>No active environment selected</p>
          </div>
        ) : (
          <>
            <div className="sync-status-panel__section">
              <h3 className="sync-status-panel__section-title">Environment</h3>
              <div className="sync-status-panel__details">
                <div className="sync-status-panel__detail-row">
                  <span className="sync-status-panel__detail-label">Name</span>
                  <span className="sync-status-panel__detail-value">{active.name}</span>
                </div>
                <div className="sync-status-panel__detail-row">
                  <span className="sync-status-panel__detail-label">ID</span>
                  <span className="sync-status-panel__detail-value sync-status-panel__detail-mono">
                    {active.environment_id}
                  </span>
                </div>
              </div>
            </div>

            <div className="sync-status-panel__section">
              <h3 className="sync-status-panel__section-title">Local Sync State</h3>
              <div className="sync-status-panel__status-card">
                <div className="sync-status-panel__status-badge" data-variant={statusVariant}>
                  {statusLabel}
                </div>
                <div className="sync-status-panel__status-details">
                  <div className="sync-status-panel__detail-row">
                    <span className="sync-status-panel__detail-label">State</span>
                    <span className="sync-status-panel__detail-value">
                      {active.sync_state === "dirty" ? "Dirty" : "Clean"}
                    </span>
                  </div>
                  <div className="sync-status-panel__detail-row">
                    <span className="sync-status-panel__detail-label">Disk</span>
                    <span className="sync-status-panel__detail-value">
                      {saveStatus.status === "saving" && "Saving…"}
                      {saveStatus.status === "saved" && "Saved"}
                      {saveStatus.status === "error" && "Error"}
                      {saveStatus.status === "never" && "Never saved"}
                    </span>
                  </div>
                  <div className="sync-status-panel__detail-row">
                    <span className="sync-status-panel__detail-label">Last saved</span>
                    <span className="sync-status-panel__detail-value">
                      {lastSavedLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sync-status-panel__section">
              <h3 className="sync-status-panel__section-title">Inventory</h3>
              <div className="sync-status-panel__inventory-grid">
                <div className="sync-status-panel__inventory-item">
                  <span className="sync-status-panel__inventory-label">Devices</span>
                  <span className="sync-status-panel__inventory-value">
                    {active.device_count}
                  </span>
                </div>
                <div className="sync-status-panel__inventory-item">
                  <span className="sync-status-panel__inventory-label">Links</span>
                  <span className="sync-status-panel__inventory-value">
                    {active.link_count}
                  </span>
                </div>
                <div className="sync-status-panel__inventory-item">
                  <span className="sync-status-panel__inventory-label">Configs</span>
                  <span className="sync-status-panel__inventory-value">
                    {active.config_count}
                  </span>
                </div>
              </div>
            </div>

            <div className="sync-status-panel__note">
              <p>
                Future remote sync capabilities (cloud integration, multi-device sync)
                will appear here.
              </p>
            </div>

            <div className="sync-status-panel__section">
              <h3 className="sync-status-panel__section-title">Selection Style</h3>
              <div className="sync-status-panel__segment" role="radiogroup" aria-label="Selection style">
                {(["border", "ring", "chip"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selectionStyle === s}
                    data-testid={`env-selection-style-${s}`}
                    className={`sync-status-panel__segment-btn ${selectionStyle === s ? "is-active" : ""}`}
                    onClick={() => setSelectionStyle(s)}
                  >
                    {s === "border" ? "Border" : s === "ring" ? "Ring" : "Chip"}
                  </button>
                ))}
              </div>
              <p className="sync-status-panel__hint">How selected cards and table rows are highlighted.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
