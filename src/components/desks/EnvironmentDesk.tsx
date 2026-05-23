/**
 * Environment Desk — minimal UI for environment lifecycle management.
 *
 * Consumes EnvironmentLifecycleProvider via useEnvironmentLifecycle() hook.
 * Scenario picker row; environment table; configs preview panel.
 */

import { useState } from "react";
import { listScenarios } from "../../data/scenarioCatalogue";
import { useEnvironmentLifecycle } from "../../state/EnvironmentLifecycleContext";
import type { LocalEnvironmentRecord } from "../../types/localEnvironment";
import type { LabConfigArtifact, LabDevice } from "../../types/labEnvironment";
import { AnthButton } from "../shared/AnthButton";
import "./EnvironmentDesk.css";

// Helper: format saved timestamp for display
function formatSavedAt(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });
}

// Helper: group configs by vendor
function getConfigsByVendor(
  record: LocalEnvironmentRecord,
): Map<string, Array<{ device: LabDevice; config: LabConfigArtifact }>> {
  const result = new Map<string, Array<{ device: LabDevice; config: LabConfigArtifact }>>();
  for (const device of record.lab_payload.devices) {
    const config = record.lab_payload.configs.find((c) => c.device_id === device.id);
    if (!config) continue;
    const list = result.get(device.vendor) ?? [];
    list.push({ device, config });
    result.set(device.vendor, list);
  }
  return result;
}

export function EnvironmentDesk(): JSX.Element {
  const lifecycle = useEnvironmentLifecycle();

  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [configPreviewOpen, setConfigPreviewOpen] = useState(false);

  const visibleEnvs = lifecycle.listAll(showArchived);
  const active = lifecycle.active;
  const scenarios = listScenarios();
  const selectedRecord = selectedId ? lifecycle.getById(selectedId) ?? null : null;

  const handleCreateFromScenario = (scenarioId: string) => {
    lifecycle.createFromScenario(scenarioId);
  };

  const handleSelectEnvironment = (id: string) => {
    setSelectedId(id);
    lifecycle.selectActive(id);
  };

  const handleStartRename = (env: LocalEnvironmentRecord) => {
    setRenamingId(env.environment_id);
    setRenameValue(env.name);
  };

  const handleSaveRename = () => {
    if (renamingId && renameValue.trim()) {
      lifecycle.rename(renamingId, renameValue.trim());
      setRenamingId(null);
      setRenameValue("");
    }
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const handleDuplicate = (id: string) => {
    lifecycle.duplicate(id);
  };

  const handleArchive = (id: string) => {
    lifecycle.archive(id);
  };

  const handleRestore = (id: string) => {
    lifecycle.restore(id);
  };

  const handleOpenConfigs = (e: React.MouseEvent, envId: string) => {
    e.stopPropagation();
    setSelectedId(envId);
    setConfigPreviewOpen(true);
  };

  return (
    <div className="env-desk">
      {/* Header */}
      <div className="env-desk__header">
        <h2 className="env-desk__title">Environment Creator</h2>
        <div className="env-desk__header-actions">
          {active && (
            <div className="env-desk__active-badge">
              Active: {active.name} — {active.device_count} devices · {active.link_count} links · {active.config_count} configs
            </div>
          )}
          <span className="env-desk__save-status" data-status={lifecycle.save_status.status}>
            {lifecycle.save_status.status === "saved" && `Saved · ${formatSavedAt(lifecycle.save_status.last_saved_at)}`}
            {lifecycle.save_status.status === "saving" && "Saving…"}
            {lifecycle.save_status.status === "error" && "Save error"}
            {lifecycle.save_status.status === "never" && "Unsaved"}
          </span>
          <AnthButton variant="ghost" size="sm" onClick={() => lifecycle.reloadFromDisk()}>
            Reload from disk
          </AnthButton>
        </div>
      </div>

      {/* Scenario Picker Row */}
      <div className="env-desk__picker">
        <div className="env-desk__picker-title">Scenario Catalogue</div>
        <div className="env-desk__picker-row">
          {scenarios.map((scenario) => (
            <div key={scenario.scenario_id} className="env-desk__scenario-card">
              <div className="env-desk__scenario-name">{scenario.name}</div>
              <div className="env-desk__scenario-meta">
                <span className="env-desk__scale-chip">
                  {scenario.scale_profile}
                </span>
              </div>
              <div className="env-desk__scenario-counts">
                {scenario.device_count} devices, {scenario.link_count} links
              </div>
              <div className="env-desk__scenario-capabilities">
                {scenario.capabilities.slice(0, 3).map((cap) => (
                  <span key={cap} className="env-desk__capability-chip">{cap}</span>
                ))}
              </div>
              <AnthButton
                variant="secondary"
                size="sm"
                onClick={() => handleCreateFromScenario(scenario.scenario_id)}
              >
                Create
              </AnthButton>
            </div>
          ))}
        </div>
      </div>

      {/* Environments Table */}
      <div className="env-desk__table-container">
        <table className="anth-table env-desk__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Scenario</th>
              <th>Devices</th>
              <th>Links</th>
              <th>Configs</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleEnvs.map((env) => (
              <tr
                key={env.environment_id}
                className={active?.environment_id === env.environment_id ? "selected" : ""}
                onClick={() => handleSelectEnvironment(env.environment_id)}
                aria-selected={active?.environment_id === env.environment_id}
              >
                <td className="env-desk__cell-name">
                  {renamingId === env.environment_id ? (
                    <span className="env-desk__rename-inline">
                      <input
                        type="text"
                        className="env-desk__rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </span>
                  ) : (
                    <>
                      {env.name}
                      <span className="env-desk__provenance-chip">{env.provenance}</span>
                      <span className="env-desk__sync-chip">{env.sync_state}</span>
                    </>
                  )}
                </td>
                <td>{env.scenario_name}</td>
                <td>{env.device_count}</td>
                <td>{env.link_count}</td>
                <td>{env.config_count}</td>
                <td>
                  <span className="env-desk__lifecycle-badge">
                    {env.lifecycle_state}
                  </span>
                </td>
                <td className="env-desk__cell-actions">
                  {renamingId === env.environment_id ? (
                    <>
                      <AnthButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveRename();
                        }}
                      >
                        Save
                      </AnthButton>
                      <AnthButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelRename();
                        }}
                      >
                        Cancel
                      </AnthButton>
                    </>
                  ) : (
                    <>
                      {env.lifecycle_state !== "archived" && (
                        <>
                          <AnthButton
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(env);
                            }}
                          >
                            Rename
                          </AnthButton>
                          <AnthButton
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(env.environment_id);
                            }}
                          >
                            Duplicate
                          </AnthButton>
                          <AnthButton
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(env.environment_id);
                            }}
                          >
                            Archive
                          </AnthButton>
                        </>
                      )}
                      {env.lifecycle_state === "archived" && (
                        <AnthButton
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(env.environment_id);
                          }}
                        >
                          Restore
                        </AnthButton>
                      )}
                      <AnthButton
                        variant="secondary"
                        size="sm"
                        onClick={(e) => handleOpenConfigs(e, env.environment_id)}
                      >
                        View Configs
                      </AnthButton>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visibleEnvs.length === 0 && (
          <div className="env-desk__empty">
            {showArchived ? "No lab environments" : "No active lab environments"}
          </div>
        )}
      </div>

      {/* Configs Preview Panel */}
      {configPreviewOpen && selectedRecord && (
        <div className="env-desk__configs-panel">
          <div className="env-desk__configs-header">
            <h3 className="env-desk__configs-title">Configs — {selectedRecord.name}</h3>
            <AnthButton
              variant="ghost"
              size="sm"
              onClick={() => setConfigPreviewOpen(false)}
            >
              Hide configs
            </AnthButton>
          </div>
          <div className="env-desk__configs-list">
            {Array.from(getConfigsByVendor(selectedRecord).entries()).map(([vendor, items]) => (
              <details key={vendor} className="env-desk__configs-vendor" open>
                <summary className="env-desk__configs-vendor-header">
                  {vendor} ({items.length})
                </summary>
                {items.map(({ device, config }) => (
                  <div key={device.id} className="env-desk__configs-device">
                    <div className="env-desk__configs-device-name">
                      {device.hostname} · {device.platform_id}
                    </div>
                    {config.config_kind === "cli_config" && config.config_text && (
                      <pre className="env-desk__config-text">{config.config_text}</pre>
                    )}
                    {(config.config_kind === "structured_profile" || config.config_kind === "appliance_manifest") &&
                      config.structured_profile && (
                        <pre className="env-desk__config-profile">
                          {JSON.stringify(config.structured_profile, null, 2)}
                        </pre>
                      )}
                    {config.parser_hint && (
                      <span className="env-desk__config-hint" title={config.parser_hint}>
                        {config.parser_hint}
                      </span>
                    )}
                  </div>
                ))}
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Archive Toggle */}
      <div className="env-desk__footer">
        <label className="env-desk__toggle-label">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>
    </div>
  );
}
