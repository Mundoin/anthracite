/**
 * Environment Desk — minimal UI for environment lifecycle management.
 *
 * Consumes the environmentLifecycle store reducer functions.
 * Internal state via useReducer; scenario picker row; environment table.
 */

import { useReducer, useState } from "react";
import { listScenarios } from "../../data/scenarioCatalogue";
import {
  createInitialStore,
  createEnvironmentFromScenario,
  listEnvironments,
  getActiveEnvironment,
  selectActiveEnvironment,
  renameEnvironment,
  duplicateEnvironment,
  archiveEnvironment,
  restoreEnvironment,
} from "../../state/environmentLifecycle";
import type {
  EnvironmentLifecycleStoreState,
  LocalEnvironmentRecord,
} from "../../types/localEnvironment";
import { AnthButton } from "../shared/AnthButton";
import "./EnvironmentDesk.css";

type Action =
  | { type: "create"; scenarioId: string }
  | { type: "select"; id: string | null }
  | { type: "rename"; id: string; name: string }
  | { type: "duplicate"; id: string }
  | { type: "archive"; id: string }
  | { type: "restore"; id: string };

function reducer(
  state: EnvironmentLifecycleStoreState,
  action: Action,
): EnvironmentLifecycleStoreState {
  switch (action.type) {
    case "create":
      return createEnvironmentFromScenario(state, action.scenarioId);
    case "select":
      return selectActiveEnvironment(state, action.id);
    case "rename":
      return renameEnvironment(state, action.id, action.name);
    case "duplicate":
      return duplicateEnvironment(state, action.id);
    case "archive":
      return archiveEnvironment(state, action.id);
    case "restore":
      return restoreEnvironment(state, action.id);
  }
}

export interface EnvironmentDeskProps {
  readonly initialState?: EnvironmentLifecycleStoreState;
}

export function EnvironmentDesk({
  initialState,
}: EnvironmentDeskProps): JSX.Element {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => initialState ?? createInitialStore(),
  );

  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const visibleEnvs = listEnvironments(state, { includeArchived: showArchived });
  const active = getActiveEnvironment(state);
  const scenarios = listScenarios();

  const handleCreateFromScenario = (scenarioId: string) => {
    dispatch({ type: "create", scenarioId });
  };

  const handleSelectEnvironment = (id: string) => {
    dispatch({ type: "select", id });
  };

  const handleStartRename = (env: LocalEnvironmentRecord) => {
    setRenamingId(env.environment_id);
    setRenameValue(env.name);
  };

  const handleSaveRename = () => {
    if (renamingId && renameValue.trim()) {
      dispatch({ type: "rename", id: renamingId, name: renameValue.trim() });
      setRenamingId(null);
      setRenameValue("");
    }
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const handleDuplicate = (id: string) => {
    dispatch({ type: "duplicate", id });
  };

  const handleArchive = (id: string) => {
    dispatch({ type: "archive", id });
  };

  const handleRestore = (id: string) => {
    dispatch({ type: "restore", id });
  };

  return (
    <div className="env-desk">
      {/* Header */}
      <div className="env-desk__header">
        <h2 className="env-desk__title">Lab Generator</h2>
        {active && (
          <div className="env-desk__active-badge">
            Active: {active.name} — {active.device_count} devices · {active.link_count} links · {active.config_count} configs
          </div>
        )}
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
                      {env.sync_state === "local-only" && (
                        <span className="env-desk__sync-chip">local-only</span>
                      )}
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
                      <AnthButton
                        variant="icon-only"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(env);
                        }}
                        title="Rename"
                      >
                        ✎
                      </AnthButton>
                      {env.lifecycle_state !== "archived" && (
                        <>
                          <AnthButton
                            variant="icon-only"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(env.environment_id);
                            }}
                            title="Duplicate"
                          >
                            ⓒ
                          </AnthButton>
                          <AnthButton
                            variant="icon-only"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(env.environment_id);
                            }}
                            title="Archive"
                          >
                            📦
                          </AnthButton>
                        </>
                      )}
                      {env.lifecycle_state === "archived" && (
                        <AnthButton
                          variant="icon-only"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(env.environment_id);
                          }}
                          title="Restore"
                        >
                          ↻
                        </AnthButton>
                      )}
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
