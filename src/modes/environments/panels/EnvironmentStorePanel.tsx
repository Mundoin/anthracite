import { type JSX, useState } from "react";
import { useEnvironmentLifecycle } from "../../../state/EnvironmentLifecycleContext";
import type { LocalEnvironmentRecord } from "../../../types/localEnvironment";
import { evaluateEnvironmentReadiness } from "../../../engines/environmentReadiness";
import { AnthButton } from "../../../components/shared/AnthButton";
import type { CreationNotice } from "../EnvironmentsMode";
import "./EnvironmentStorePanel.css";

export type EnvironmentStoreFilterType = "all" | "active" | "generated-lab" | "archived";

export interface EnvironmentStorePanelProps {
  readonly onNavigate?: (toolId: "overview" | "creator" | "store" | "configs" | "dossier" | "sync") => void;
  readonly creationNotice?: CreationNotice | null;
  readonly onDismissNotice?: () => void;
}

export function EnvironmentStorePanel({
  onNavigate,
  creationNotice,
  onDismissNotice,
}: EnvironmentStorePanelProps = {}): JSX.Element {
  const lifecycle = useEnvironmentLifecycle();
  const [filter, setFilter] = useState<EnvironmentStoreFilterType>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Derive includeArchived: show when toggle is on OR when archived filter is selected
  const includeArchived = showArchived || filter === "archived";
  const allEnvs = lifecycle.listAll(includeArchived);
  // Used to differentiate "store is truly empty" from "filter hides everything".
  const totalEnvsIncludingArchived = lifecycle.listAll(true).length;
  const active = lifecycle.active;

  const visibleEnvs = allEnvs.filter((env) => {
    switch (filter) {
      case "active":
        return active?.environment_id === env.environment_id;
      case "generated-lab":
        return env.kind === "generated-lab" || env.provenance === "generated-lab";
      case "archived":
        return env.lifecycle_state === "archived";
      case "all":
      default:
        // Toggle ON: include archived alongside non-archived. Toggle OFF: hide archived.
        return showArchived || env.lifecycle_state !== "archived";
    }
  });

  const handleSelectEnvironment = (id: string) => {
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

  return (
    <div className="environment-store-panel" data-testid="environments-store">
      <div className="environment-store-panel__container">
        {creationNotice && (
          <div className="environment-store-panel__created-banner" data-testid="environment-created-banner" role="status">
            <span className="environment-store-panel__created-icon" aria-hidden="true">✓</span>
            <div className="environment-store-panel__created-text">
              <strong>Environment created:</strong> {creationNotice.environmentName}
              {creationNotice.didSetActive ? " — set as active." : " — saved to Store."}
            </div>
            {onDismissNotice && (
              <AnthButton variant="ghost" onClick={onDismissNotice}>Dismiss</AnthButton>
            )}
          </div>
        )}
        <div className="environment-store-panel__header">
          <h2 className="environment-store-panel__title">Environment Store</h2>
        </div>

        <div className="environment-store-panel__filters">
          <div className="environment-store-panel__filter-pills">
            {(["all", "active", "generated-lab", "archived"] as const).map((filterOption) => (
              <button
                key={filterOption}
                className={`environment-store-panel__filter-pill ${
                  filter === filterOption ? "environment-store-panel__filter-pill--active" : ""
                }`}
                onClick={() => setFilter(filterOption)}
                data-testid={`store-filter-${filterOption}`}
              >
                {filterOption === "all"
                  ? "All"
                  : filterOption === "generated-lab"
                    ? "Generated Lab"
                    : filterOption === "active"
                      ? "Active"
                      : "Archived"}
              </button>
            ))}
          </div>
          <label className="environment-store-panel__archive-toggle">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setShowArchived(e.target.checked)
              }
              data-testid="archive-toggle"
            />
            <span>Show archived</span>
          </label>
        </div>

        {visibleEnvs.length === 0 ? (
          <div className="environment-store-panel__empty">
            {totalEnvsIncludingArchived === 0 ? (
              <>
                <p>Create your first Environment to start working.</p>
                {onNavigate && (
                  <AnthButton
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate("creator")}
                    style={{ marginTop: "1rem" }}
                  >
                    Go to Environment Creator
                  </AnthButton>
                )}
              </>
            ) : (
              <p>No environments match this filter.</p>
            )}
          </div>
        ) : (
          <div className="environment-store-panel__table-wrapper">
            <table className="anth-table environment-store-panel__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Scenario</th>
                  <th>Devices</th>
                  <th>Links</th>
                  <th>Configs</th>
                  <th>Readiness</th>
                  <th>Source</th>
                  <th>Revision</th>
                  <th>Last Saved</th>
                  <th>State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleEnvs.map((env) => {
                  const readiness = evaluateEnvironmentReadiness(env);
                  const lastSaved = env.last_saved_at || env.updated_at;
                  const lastSavedDate = lastSaved
                    ? new Date(lastSaved).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "2-digit",
                      })
                    : "—";

                  return (
                    <tr
                      key={env.environment_id}
                      className={active?.environment_id === env.environment_id ? "selected" : ""}
                      onClick={() => handleSelectEnvironment(env.environment_id)}
                      aria-selected={active?.environment_id === env.environment_id}
                    >
                      <td className="environment-store-panel__cell-name">
                        {renamingId === env.environment_id ? (
                          <span className="environment-store-panel__rename-inline">
                            <input
                              type="text"
                              className="environment-store-panel__rename-input"
                              value={renameValue}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setRenameValue(e.target.value)
                              }
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === "Enter") handleSaveRename();
                                if (e.key === "Escape") handleCancelRename();
                              }}
                              autoFocus
                            />
                            <AnthButton
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleSaveRename();
                              }}
                            >
                              Save
                            </AnthButton>
                            <AnthButton
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleCancelRename();
                              }}
                            >
                              Cancel
                            </AnthButton>
                          </span>
                        ) : (
                          <span className="environment-store-panel__name-text">
                            {active?.environment_id === env.environment_id && (
                              <span className="environment-store-panel__active-marker">Active</span>
                            )}
                            {env.name}
                          </span>
                        )}
                      </td>
                      <td>{env.scenario_name}</td>
                      <td>{env.device_count}</td>
                      <td>{env.link_count}</td>
                      <td>{env.config_count}</td>
                      <td>
                        <span
                          className={`environment-store-panel__chip ${
                            readiness.ready
                              ? "environment-store-panel__chip--ok"
                              : "environment-store-panel__chip--warn"
                          }`}
                        >
                          {readiness.ready ? "Ready" : "Blocked"}
                        </span>
                      </td>
                      <td>
                        <span className="environment-store-panel__chip environment-store-panel__chip--info">
                          {env.provenance}
                        </span>
                      </td>
                      <td>{env.revision}</td>
                      <td>{lastSavedDate}</td>
                      <td>
                        <div className="environment-store-panel__chips">
                          {env.sync_state === "dirty" ? (
                            <span className="environment-store-panel__chip environment-store-panel__chip--warn">
                              dirty
                            </span>
                          ) : (
                            <span className="environment-store-panel__chip environment-store-panel__chip--ok">
                              clean
                            </span>
                          )}
                          {env.lifecycle_state === "archived" && (
                            <span className="environment-store-panel__chip environment-store-panel__chip--gray">
                              archived
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="environment-store-panel__actions">
                        {!renamingId && (
                          <>
                            <AnthButton
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleStartRename(env);
                              }}
                            >
                              Rename
                            </AnthButton>
                            <AnthButton
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleDuplicate(env.environment_id);
                              }}
                            >
                              Duplicate
                            </AnthButton>
                            {env.lifecycle_state !== "archived" ? (
                              <AnthButton
                                variant="ghost"
                                size="sm"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleArchive(env.environment_id);
                                }}
                              >
                                Archive
                              </AnthButton>
                            ) : (
                              <AnthButton
                                variant="ghost"
                                size="sm"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleRestore(env.environment_id);
                                }}
                              >
                                Restore
                              </AnthButton>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
