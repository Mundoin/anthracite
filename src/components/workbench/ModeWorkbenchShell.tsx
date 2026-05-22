/**
 * V1BH — ModeWorkbenchShell.
 *
 * Renders a mode as a workbench: title + tool rail + active tool body.
 * Modes pass a `ModeWorkbenchModel`; the shell handles rail selection,
 * deferred-state rendering, and active-tool body composition. No engine
 * coupling, no data fetching.
 */

import type { FC } from "react";
import "./ModeWorkbenchShell.css";
import type {
  ModeTool,
  ModeWorkbenchModel,
} from "./types";
import { resolveActiveTool, statusChipLabel, statusChipMod } from "./types";

export interface ModeWorkbenchShellProps {
  model: ModeWorkbenchModel;
  onSelectTool: (toolId: string) => void;
  /**
   * D3T-P2 — When true, suppress the in-canvas header (title/tagline) and
   * tool rail. The toolbar is expected to be rendered externally (e.g. in
   * AppShell's subnav slot). Default false preserves legacy behavior.
   */
  noToolbar?: boolean;
}

export const ModeWorkbenchShell: FC<ModeWorkbenchShellProps> = ({
  model,
  onSelectTool,
  noToolbar = false,
}) => {
  const active = resolveActiveTool(model);

  return (
    <div className="mwb" data-testid="mode-workbench">
      {noToolbar ? null : (
        <>
          <header className="mwb-header">
            <h2 className="mwb-title">{model.title}</h2>
            {model.tagline ? (
              <p className="mwb-tagline">{model.tagline}</p>
            ) : null}
          </header>

          <nav
            className="mwb-rail"
            role="tablist"
            aria-label={`${model.title} tools`}
            data-testid="mode-workbench-rail"
          >
            {model.tools.map((tool) => {
              const isActive = active?.id === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`mwb-tool${isActive ? " is-active" : ""}`}
                  data-testid={`mwb-tool-${tool.id}`}
                  data-tool-status={tool.status}
                  onClick={() => onSelectTool(tool.id)}
                  disabled={tool.status === "blocked"}
                >
                  <span className="mwb-tool-label">{tool.label}</span>
                  <span
                    className={`mwb-tool-status mwb-tool-status--${statusChipMod(tool.status)}`}
                  >
                    {statusChipLabel(tool.status)}
                  </span>
                  {tool.badge !== undefined && tool.badge !== null ? (
                    <span className="mwb-tool-badge" aria-label="count">
                      {tool.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </>
      )}

      <section
        className="mwb-active"
        role="tabpanel"
        aria-label={active?.label ?? "tool"}
        data-testid="mode-workbench-active"
        data-active-tool={active?.id ?? ""}
      >
        {active ? <ActiveToolHeader tool={active} /> : null}
        <div className="mwb-active-body" data-testid="mode-workbench-body">
          {active ? renderToolBody(active) : <ToolMissingState />}
        </div>
      </section>
    </div>
  );
};

const ActiveToolHeader: FC<{ tool: ModeTool }> = ({ tool }) => (
  <div className="mwb-active-hd">
    <div className="mwb-active-hd-text">
      <h3 className="mwb-active-title">{tool.label}</h3>
      <p className="mwb-active-desc">{tool.description}</p>
    </div>
    <span
      className={`mwb-active-status mwb-active-status--${statusChipMod(tool.status)}`}
      data-testid="mode-workbench-active-status"
    >
      {statusChipLabel(tool.status)}
    </span>
  </div>
);

function renderToolBody(tool: ModeTool) {
  if (tool.kind === "live") {
    return tool.render();
  }
  return <DeferredToolBody tool={tool} />;
}

const DeferredToolBody: FC<{ tool: Extract<ModeTool, { kind: "deferred" }> }> = ({
  tool,
}) => {
  const { deferred } = tool;
  return (
    <div className="mwb-deferred" data-testid={`mwb-deferred-${tool.id}`}>
      <p className="mwb-deferred-reason">{deferred.reason}</p>

      {deferred.planned_inputs && deferred.planned_inputs.length > 0 ? (
        <section className="mwb-deferred-block" aria-label="planned inputs">
          <h4 className="mwb-deferred-block-title">Planned inputs</h4>
          <ul className="mwb-deferred-list">
            {deferred.planned_inputs.map((inp) => (
              <li key={inp}>{inp}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {deferred.planned_controls && deferred.planned_controls.length > 0 ? (
        <section className="mwb-deferred-block" aria-label="planned controls">
          <h4 className="mwb-deferred-block-title">Planned controls</h4>
          <ul className="mwb-deferred-list">
            {deferred.planned_controls.map((ctrl) => (
              <li key={ctrl}>{ctrl}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {deferred.route_hint ? (
        <p className="mwb-deferred-route">
          See: <strong>{deferred.route_hint.label}</strong>
        </p>
      ) : null}

      <p className="mwb-deferred-honesty">
        This tool is not yet implemented. No device contact, no engine wiring.
      </p>
    </div>
  );
};

const ToolMissingState: FC = () => (
  <div className="mwb-missing" data-testid="mode-workbench-missing">
    <p>No tool selected.</p>
  </div>
);
